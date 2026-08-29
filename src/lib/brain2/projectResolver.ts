import type { NormalizedConversationInput } from "./contracts";
import type { ProjectRecord } from "./types";
import { jaccard, keywords, normalizeText, slugify, tokenOverlap } from "./identity";

const GENERIC_TITLES = /^(new chat|chat|conversation|untitled(?: conversation| project)?|claude conversation \d+|gemini conversation \d+|conversation \d+)$/i;

export type ProjectFingerprint = {
  titleTerms: string[];
  contentTerms: string[];
  entityTerms: string[];
  allTerms: string[];
  genericTitle: boolean;
};

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
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0])).slice(0, 16).map(([value])=>value);
}

export function fingerprintConversation(input: Pick<NormalizedConversationInput, "title" | "messages">): ProjectFingerprint {
  const genericTitle = titleIsGeneric(input.title);
  const titleTerms = genericTitle ? [] : keywords(input.title, 12);
  const userText = input.messages.filter((message) => message.role === "user").map((message) => message.text).join("\n");
  const allText = input.messages.map((message) => message.text).join("\n");
  const contentTerms = keywords(`${userText}\n${allText}`, 28);
  const entityTerms = extractEntities(`${input.title}\n${allText}`);
  const allTerms = [...new Set([...titleTerms, ...contentTerms, ...entityTerms.flatMap((entity) => keywords(entity, 4))])];
  return { titleTerms, contentTerms, entityTerms, allTerms, genericTitle };
}

export function scoreProject(fingerprint: ProjectFingerprint, project: ProjectRecord): number {
  const projectTerms = [...new Set([...(project.tags ?? []), ...(project.entityTerms ?? []).flatMap((entity) => keywords(entity, 4)), ...keywords(project.name, 8)])];
  const titleScore = fingerprint.genericTitle ? 0 : tokenOverlap(fingerprint.titleTerms, projectTerms);
  const contentScore = jaccard(fingerprint.contentTerms.slice(0, 20), projectTerms);
  const entityScore = jaccard(fingerprint.entityTerms, project.entityTerms ?? []);
  const aliasScore = (project.aliases ?? []).some((alias) => normalizeText(alias).toLowerCase() === normalizeText(project.name).toLowerCase()) ? 0 : 0;
  const evidence = Math.max(contentScore, tokenOverlap(fingerprint.contentTerms.slice(0, 12), projectTerms));
  const score = (fingerprint.genericTitle ? 0 : titleScore * 0.25) + evidence * 0.55 + entityScore * 0.18 + aliasScore * 0.02;
  return Math.max(0, Math.min(1, score));
}

export function chooseProject(fingerprint: ProjectFingerprint, projects: ProjectRecord[]): { project?: ProjectRecord; score: number } {
  const ranked = projects.map((project) => ({ project, score: scoreProject(fingerprint, project) })).sort((a,b)=>b.score-a.score || b.project.updatedAt.localeCompare(a.project.updatedAt));
  const best = ranked[0];
  if (!best) return { score: 0 };
  // Generic titles require stronger content evidence to avoid "New chat" collapse.
  const threshold = fingerprint.genericTitle ? 0.40 : 0.34;
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
