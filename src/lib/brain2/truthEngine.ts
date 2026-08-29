import type { AtomRecord, TruthRecord, TruthRelation } from "./types";
import { BRAIN2_SCHEMA_VERSION, BRAIN2_TRUTH_VERSION } from "./contracts";
import { canonicalId, jaccard, keywords, normalizeText, tokenOverlap } from "./identity";

const UPDATE_CUE = /\b(now|going forward|from now on|replace(?:d)?|instead|switch(?:ed)?|changed? to|set to|updated? to|no longer|we(?:'ll| will) use|we decided|final(?:ly)?|canonical)\b/i;

function normalizedValue(atom: AtomRecord | TruthRecord): string {
  return normalizeText(atom.value ?? "").toLowerCase();
}

function subjectTerms(atom: AtomRecord | TruthRecord): string[] {
  return keywords(atom.canonicalSubject || ("subject" in atom ? atom.subject : atom.text), 8);
}

function textSimilarity(a: string, b: string): number {
  return jaccard(keywords(a, 18), keywords(b, 18));
}

function relationFor(atom: AtomRecord, current: TruthRecord): TruthRelation {
  const aText = normalizeText(atom.text).toLowerCase();
  const bText = normalizeText(current.text).toLowerCase();
  if (aText === bText) return "SAME";

  const subject = Math.max(
    tokenOverlap(subjectTerms(atom), subjectTerms(current)),
    tokenOverlap(atom.keywords.slice(0, 6), keywords(current.text, 10)),
  );
  if (subject < 0.32) return "UNCERTAIN";

  const atomScope=normalizeText(atom.scope??"").toLowerCase();
  const truthScope=normalizeText(current.scope??"").toLowerCase();
  if((atomScope||truthScope)&&atomScope!==truthScope)return "DIFFERENT_SCOPE";

  const similarity = textSimilarity(atom.text, current.text);
  const aValue = normalizedValue(atom);
  const bValue = normalizedValue(current);
  const valueConflict = Boolean(aValue && bValue && aValue !== bValue);
  const oppositePolarity = Boolean(atom.polarity && current.polarity && atom.polarity !== "NEUTRAL" && current.polarity !== "NEUTRAL" && atom.polarity !== current.polarity);
  const explicitUpdate = UPDATE_CUE.test(atom.text);

  if (oppositePolarity) return explicitUpdate ? "SUPERSEDES" : "CONTRADICTS";
  if (valueConflict) return explicitUpdate ? "SUPERSEDES" : "CONTRADICTS";
  if (explicitUpdate && subject >= 0.45) return "SUPERSEDES";
  if (similarity >= 0.82) return "SAME";
  if ((aText.includes(bText) || similarity >= 0.58) && aText.length > bText.length) return "REFINES";
  return "UNCERTAIN";
}

function truthKey(atom: AtomRecord): string {
  const subject = atom.canonicalSubject || atom.keywords.slice(0, 4).sort().join("-") || atom.subject;
  return `${atom.projectId}:${atom.kind}:${normalizeText(subject).toLowerCase()}`;
}

export type TruthReconciliation = {
  writes: TruthRecord[];
  created?: TruthRecord;
  relation: TruthRelation;
};

export async function reconcileAtomToTruth(atom: AtomRecord, role: string, truths: TruthRecord[]): Promise<TruthReconciliation> {
  if (role !== "user" || !["decision","constraint","fact","task"].includes(atom.kind)) return { writes: [], relation: "UNCERTAIN" };
  const candidates = truths
    .filter((truth) => truth.projectId === atom.projectId && truth.kind === atom.kind && ["CURRENT","CONFLICTING","PENDING_REVIEW"].includes(truth.status))
    .map((truth) => ({ truth, overlap: Math.max(tokenOverlap(subjectTerms(atom), subjectTerms(truth)), tokenOverlap(atom.keywords.slice(0,6), keywords(truth.text,10))) }))
    .filter((entry) => entry.overlap >= 0.25)
    .sort((a,b)=>b.overlap-a.overlap || b.truth.updatedAt.localeCompare(a.truth.updatedAt));

  const current = candidates[0]?.truth;
  const relation: TruthRelation = current ? relationFor(atom, current) : "NEW";
  const key = truthKey(atom);
  const id = await canonicalId("truth", key, atom.id);
  const updatedAt = new Date().toISOString();
  const base: TruthRecord = {
    id,
    key,
    projectId: atom.projectId,
    atomId: atom.id,
    text: atom.text,
    kind: atom.kind,
    status: "CURRENT",
    confidence: atom.confidence,
    createdAt: atom.createdAt,
    updatedAt,
    relation,
    relatedTruthIds: current ? [current.id] : [],
    evidenceAtomIds: [atom.id],
    canonicalSubject: atom.canonicalSubject,
    value: atom.value,
    polarity: atom.polarity,
    scope: atom.scope,
    reconciliationVersion: BRAIN2_TRUTH_VERSION,
    schemaVersion: BRAIN2_SCHEMA_VERSION,
  };

  if (!current) return { writes: [base], created: base, relation };

  if (relation === "SAME") {
    const mergedCurrent: TruthRecord = {
      ...current,
      confidence: Math.max(current.confidence, atom.confidence),
      evidenceAtomIds: [...new Set([...(current.evidenceAtomIds ?? [current.atomId]), atom.id])],
      updatedAt,
      relation: "SAME",
      reconciliationVersion: BRAIN2_TRUTH_VERSION,
      schemaVersion: BRAIN2_SCHEMA_VERSION,
    };
    const historical: TruthRecord = { ...base, status: "HISTORICAL", relatedTruthIds: [current.id] };
    return { writes: [mergedCurrent, historical], created: historical, relation };
  }

  if (relation === "SUPERSEDES" || relation === "REFINES") {
    const previous: TruthRecord = { ...current, status: "SUPERSEDED", updatedAt, relatedTruthIds: [...new Set([...(current.relatedTruthIds ?? []), id])] };
    const next: TruthRecord = { ...base, supersedes: current.id };
    return { writes: [previous, next], created: next, relation };
  }

  if (relation === "DIFFERENT_SCOPE") {
    const scoped: TruthRecord = { ...base, status: "CURRENT", relation: "DIFFERENT_SCOPE", relatedTruthIds: [current.id] };
    return { writes: [scoped], created: scoped, relation };
  }

  if (relation === "CONTRADICTS") {
    const previous: TruthRecord = { ...current, status: "CONFLICTING", updatedAt, relation: "CONTRADICTS", relatedTruthIds: [...new Set([...(current.relatedTruthIds ?? []), id])] };
    const conflicting: TruthRecord = { ...base, status: "CONFLICTING", relatedTruthIds: [current.id] };
    return { writes: [previous, conflicting], created: conflicting, relation };
  }

  // We preserve the prior current truth and refuse a silent last-write-wins update.
  const uncertain: TruthRecord = { ...base, status: "PENDING_REVIEW", relation: "UNCERTAIN", relatedTruthIds: [current.id] };
  return { writes: [uncertain], created: uncertain, relation: "UNCERTAIN" };
}
