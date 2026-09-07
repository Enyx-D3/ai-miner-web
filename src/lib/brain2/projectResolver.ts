import type { NormalizedConversationInput } from "./contracts";
import type { ProjectRecord } from "./types";
import { jaccard, keywords, normalizeText, slugify, tokenOverlap } from "./identity";

const GENERIC_TITLES = /^(new chat|chat|conversation|untitled(?: conversation| project)?|claude conversation \d+|gemini conversation \d+|conversation \d+)$/i;
const PROJECT_STOP_TERMS = new Set(["project","work","works","working","thing","things","stuff","issue","issues","problem","problems","update","follow","follow-up","help","page","data","file","chat","conversation","assistant","user","need","needs","want","make","made","good","better","right","wrong"]);

export type ProjectFingerprint = {
  titleTerms: string[];
  contentTerms: string[];
  entityTerms: string[];
  allTerms: string[];
  genericTitle: boolean;
};

function cleanProjectTerms(terms: string[]): string[] {
  return [...new Set(terms.map((term)=>normalizeText(term).toLowerCase()).filter((term)=>term.length>=4&&!PROJECT_STOP_TERMS.has(term)&&!/^\d+$/.test(term)))];
}

function phrasePresent(haystack: string, phrase: string): boolean {
  const cleanPhrase=normalizeText(phrase).toLowerCase();
  if(cleanPhrase.length<4)return false;
  return normalizeText(haystack).toLowerCase().includes(cleanPhrase);
}

function roleIsHuman(role: string): boolean {
  const normalized=normalizeText(role).toLowerCase();
  return normalized==="user"||normalized==="human";
}

function projectTerms(project: ProjectRecord): string[] {
  const aliasTerms = (project.aliases ?? []).flatMap((alias) => keywords(alias, 8));
  const summaryTerms = keywords(project.summary ?? "", 12);
  const entityKeywordTerms = (project.entityTerms ?? []).flatMap((entity) => keywords(entity, 4));
  return cleanProjectTerms([...(project.tags ?? []), ...entityKeywordTerms, ...aliasTerms, ...summaryTerms, ...keywords(project.name, 8)]);
}

function titleIsGeneric(title: string): boolean {
  const value = normalizeText(title).replace(/\s*\(\d{4}-\d{2}-\d{2}\)$/, "");
  return !value || GENERIC_TITLES.test(value);
}

function extractEntities(text: string): string[] {
  // Conservative deterministic entity hints. This is not a claim of full NER.
  const matches = text.match(/\b(?:[A-Z][A-Za-z0-9.+#-]{2,})(?:\s+[A-Z][A-Za-z0-9.+#-]{2,}){0,3}\b/g) ?? [];
  const counts = new Map<string, number>();
  for (const match of matches) {
    const normalized = normalizeText(match).toLowerCase();
    if (normalized.length < 4) continue;
    const terms=cleanProjectTerms(keywords(normalized, 8));
    if(!terms.length)continue;
    if(terms.length===1&&/^[a-z]+$/.test(terms[0])&&!/[0-9.+#-]/.test(normalized))continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0])).slice(0, 16).map(([value])=>value);
}

export function fingerprintConversation(input: Pick<NormalizedConversationInput, "title" | "messages">): ProjectFingerprint {
  const genericTitle = titleIsGeneric(input.title);
  const titleTerms = genericTitle ? [] : cleanProjectTerms(keywords(input.title, 12));
  const userText = input.messages.filter((message) => roleIsHuman(message.role)).map((message) => message.text).join("\n");
  const contentTerms = cleanProjectTerms(keywords(userText, 32));
  const entityTerms = extractEntities(`${input.title}\n${userText}`);
  const allTerms = cleanProjectTerms([...titleTerms, ...contentTerms, ...entityTerms.flatMap((entity) => keywords(entity, 4))]);
  return { titleTerms, contentTerms, entityTerms, allTerms, genericTitle };
}

export function scoreProject(fingerprint: ProjectFingerprint, project: ProjectRecord): number {
  const terms = projectTerms(project);
  const aliasTerms = cleanProjectTerms((project.aliases ?? []).flatMap((alias) => keywords(alias, 8)));
  const normalizedAllTerms = new Set(fingerprint.allTerms.map((term) => normalizeText(term).toLowerCase()));
  const humanSignalText = [fingerprint.titleTerms.join(" "), fingerprint.contentTerms.join(" "), fingerprint.entityTerms.join(" ")].join(" ");
  const phraseMatch = Math.max(
    ...(project.aliases ?? []).map((alias) => phrasePresent(humanSignalText, alias) ? 1 : 0),
    ...(project.entityTerms ?? []).map((entity) => phrasePresent(humanSignalText, entity) ? 1 : 0),
    phrasePresent(humanSignalText, project.name) ? 1 : 0,
    0,
  );
  const exactAliasOrEntity = Math.max(
    ...(project.aliases ?? []).map((alias) => normalizedAllTerms.has(normalizeText(alias).toLowerCase()) ? 1 : 0),
    ...(project.entityTerms ?? []).map((entity) => normalizedAllTerms.has(normalizeText(entity).toLowerCase()) ? 1 : 0),
    0,
  );
  const titleScore = fingerprint.genericTitle ? 0 : tokenOverlap(fingerprint.titleTerms, terms);
  const contentScore = jaccard(fingerprint.contentTerms.slice(0, 20), terms);
  const entityScore = jaccard(fingerprint.entityTerms, project.entityTerms ?? []);
  const aliasScore = Math.max(
    0,
    ...(project.aliases ?? []).map((alias) => tokenOverlap(fingerprint.contentTerms.slice(0, 12), keywords(alias, 8))),
    tokenOverlap(fingerprint.contentTerms.slice(0, 12), aliasTerms),
  );
  const evidence = Math.max(contentScore, tokenOverlap(fingerprint.contentTerms.slice(0, 12), terms));
  const score = (fingerprint.genericTitle ? 0 : titleScore * 0.18) + evidence * 0.42 + entityScore * 0.16 + aliasScore * 0.08 + exactAliasOrEntity * 0.08 + phraseMatch * 0.24;
  return Math.max(0, Math.min(1, score));
}

export function chooseProject(fingerprint: ProjectFingerprint, projects: ProjectRecord[]): { project?: ProjectRecord; score: number } {
  const ranked = projects.map((project) => ({ project, score: scoreProject(fingerprint, project) })).sort((a,b)=>b.score-a.score || b.project.updatedAt.localeCompare(a.project.updatedAt));
  const best = ranked[0];
  if (!best) return { score: 0 };
  // Generic titles should prefer strong relative content evidence without collapsing low-signal chats.
  const bestTerms = new Set(projectTerms(best.project));
  const overlap = fingerprint.contentTerms.filter((term) => bestTerms.has(term)).length;
  const phraseScore = scoreProject({ ...fingerprint, contentTerms: fingerprint.contentTerms, allTerms: fingerprint.allTerms }, best.project);
  if (fingerprint.genericTitle) {
    const runnerUp = ranked[1];
    const clearLead = !runnerUp || best.score >= runnerUp.score + 0.1;
    if (best.score >= 0.22 && overlap >= 3 && clearLead) return best;
    return { score: best.score };
  }
  const threshold = overlap>=2||phraseScore>=0.46 ? 0.34 : 0.4;
  return best.score >= threshold ? best : { score: best.score };
}

export function deriveProjectName(title: string, fingerprint: ProjectFingerprint): string {
  if (!fingerprint.genericTitle) return normalizeText(title || "Untitled project");
  const terms = fingerprint.contentTerms.slice(0, 4);
  if (!terms.length) return "Unresolved conversation";
  return terms.map((term) => term.charAt(0).toUpperCase() + term.slice(1)).join(" · ");
}

export function projectSlug(name: string): string {
  return slugify(name || "Unresolved conversation");
}
