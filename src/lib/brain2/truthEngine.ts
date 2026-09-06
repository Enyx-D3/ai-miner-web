import type { AtomRecord, TruthRecord, TruthRelation } from "./types";
import { BRAIN2_SCHEMA_VERSION, BRAIN2_TRUTH_VERSION } from "./contracts";
import { canonicalId, jaccard, keywords, normalizeText, tokenOverlap } from "./identity";

const UPDATE_CUE = /\b(now|going forward|from now on|replace(?:d)?|instead|switch(?:ed)?|changed? to|set to|updated? to|no longer|we(?:'ll| will) use|we decided|final(?:ly)?|canonical)\b/i;
const SPECULATIVE_CUE = /\b(maybe|perhaps|might|could|should|consider|possibly|in some cases?)\b/i;

function normalizedValue(atom: AtomRecord | TruthRecord): string {
  return normalizeText(atom.value ?? "").toLowerCase();
}

function subjectTerms(atom: AtomRecord | TruthRecord): string[] {
  return keywords(atom.canonicalSubject || ("subject" in atom ? atom.subject : atom.text), 8);
}

function textSimilarity(a: string, b: string): number {
  return jaccard(keywords(a, 18), keywords(b, 18));
}

function valueRelationship(aValue: string, bValue: string): "SAME" | "REFINES" | "CONFLICTS" {
  if (aValue === bValue) return "SAME";
  if (aValue.includes(bValue) || bValue.includes(aValue)) return "REFINES";
  return "CONFLICTS";
}

function relationFor(atom: AtomRecord, current: TruthRecord): TruthRelation {
  if (atom.conversationId && current.conversationId && atom.conversationId !== current.conversationId) return "UNCERTAIN";
  const aText = normalizeText(atom.text).toLowerCase();
  const bText = normalizeText(current.text).toLowerCase();
  if (aText === bText) return "SAME";

  const atomStrictRules = new Set(atom.ruleTrace?.filter((item)=>item.startsWith("strict_truth:")) ?? []);
  const currentStrictRule = current.strictTruthRootKey?.split(":")[0];
  const atomQA = atomStrictRules.has("strict_truth:explicit_qa_selection");
  const currentQA = currentStrictRule === "explicit_qa_selection";
  const atomConfig = atomStrictRules.has("strict_truth:corroborated_exact_config");
  const currentConfig = currentStrictRule === "corroborated_exact_config";
  if ((atomQA || currentQA || atomConfig || currentConfig) && normalizeText(atom.canonicalSubject ?? "").toLowerCase() !== normalizeText(current.canonicalSubject ?? "").toLowerCase()) {
    return "UNCERTAIN";
  }

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
  const valueRelation = aValue && bValue ? valueRelationship(aValue, bValue) : undefined;
  const valueConflict = valueRelation === "CONFLICTS";
  const oppositePolarity = Boolean(atom.polarity && current.polarity && atom.polarity !== "NEUTRAL" && current.polarity !== "NEUTRAL" && atom.polarity !== current.polarity);
  const explicitUpdate = UPDATE_CUE.test(atom.text);
  const speculative = SPECULATIVE_CUE.test(atom.text);

  if (speculative && !explicitUpdate) return "UNCERTAIN";
  if (oppositePolarity) return explicitUpdate ? "SUPERSEDES" : "CONTRADICTS";
  if (valueConflict) return explicitUpdate ? "SUPERSEDES" : "CONTRADICTS";
  if (valueRelation === "REFINES" && subject >= 0.45) return explicitUpdate ? "SUPERSEDES" : "REFINES";
  if (explicitUpdate && subject >= 0.45) return "SUPERSEDES";
  if (similarity >= 0.82) return "SAME";
  if ((aText.includes(bText) || similarity >= 0.58) && aText.length > bText.length) return "REFINES";
  return "UNCERTAIN";
}

function truthKey(atom: AtomRecord): string {
  const subject = atom.canonicalSubject || atom.keywords.slice(0, 4).sort().join("-") || atom.subject;
  const scope = atom.conversationId ? `${atom.projectId}:${atom.conversationId}` : atom.projectId;
  return `${scope}:${atom.kind}:${normalizeText(subject).toLowerCase()}`;
}

function strictTruthRootKey(atom: AtomRecord): string {
  const strictRules = atom.ruleTrace?.filter((item)=>item.startsWith("strict_truth:") && !item.endsWith(":eligible") && !item.endsWith(":residual")) ?? [];
  const rule = strictRules.at(-1)?.replace(/^strict_truth:/,"") ?? "legacy";
  const subject = normalizeText(atom.canonicalSubject || atom.subject).toLowerCase();
  const value = normalizeText(atom.value ?? "").toLowerCase();
  const polarity = atom.polarity ?? "NEUTRAL";
  const scope = normalizeText(atom.scope ?? "").toLowerCase();
  return `${rule}:${atom.kind}:${subject}:${value}:${polarity}:${scope}`;
}

function strictRuleFromAtom(atom: AtomRecord): string | undefined {
  return atom.ruleTrace?.filter((item)=>item.startsWith("strict_truth:") && !item.endsWith(":eligible") && !item.endsWith(":residual")).at(-1)?.replace(/^strict_truth:/,"");
}

function strictRuleFromTruth(truth: TruthRecord): string | undefined {
  return truth.strictTruthRootKey?.split(":")[0];
}

function strictFamilyCompatible(atom: AtomRecord, truth: TruthRecord): boolean {
  const atomRule = strictRuleFromAtom(atom);
  const truthRule = strictRuleFromTruth(truth);
  const atomSubject = normalizeText(atom.canonicalSubject ?? atom.subject).toLowerCase();
  const truthSubject = normalizeText(truth.canonicalSubject ?? "").toLowerCase();
  if ((atomRule === "explicit_qa_selection" || truthRule === "explicit_qa_selection") && atomSubject !== truthSubject) return false;
  if ((atomRule === "corroborated_exact_config" || truthRule === "corroborated_exact_config") && atomSubject !== truthSubject) return false;
  return true;
}

export type TruthReconciliation = {
  writes: TruthRecord[];
  created?: TruthRecord;
  relation: TruthRelation;
};

export async function reconcileAtomToTruth(atom: AtomRecord, role: string, truths: TruthRecord[]): Promise<TruthReconciliation> {
  if (!["user","human"].includes(normalizeText(role).toLowerCase()) || !["decision","constraint","fact"].includes(atom.kind)) return { writes: [], relation: "UNCERTAIN" };
  const candidates = truths
    .filter((truth) => truth.projectId === atom.projectId && truth.kind === atom.kind && (!truth.conversationId || !atom.conversationId || truth.conversationId === atom.conversationId) && strictFamilyCompatible(atom,truth) && ["CURRENT","CONFLICTING","PENDING_REVIEW"].includes(truth.status))
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
    conversationId: atom.conversationId,
    sourceId: atom.sourceId,
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
    strictTruthRootKey: strictTruthRootKey(atom),
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
