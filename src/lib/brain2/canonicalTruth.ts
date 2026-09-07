import type { NormalizedConversationInput, NormalizedMessageInput } from "./contracts";
import { keywords, normalizeText, sha256, words } from "./identity";
import type { AtomKind, Brain2Provider, MessageRecord, TruthRecord } from "./types";

export type CanonicalTruthRole = "human" | "assistant";

export type CanonicalTruthMessage = {
  provider: Brain2Provider;
  conversationId: string;
  conversationExternalId: string;
  messageKey: string;
  role: CanonicalTruthRole | null;
  sequence: number;
  text: string;
  occurredAt?: string;
  timestampValid: boolean;
  sourceValid: boolean;
  sourceInvalidReason?: string;
  branchId?: string;
  source: NormalizedMessageInput;
};

export type StrictCurrentTruthDecision = {
  eligible: boolean;
  tier: "D0" | "D1" | "D2" | "RESIDUAL";
  ruleFamily: string;
  reason: string;
  atomType?: "REQUIREMENT" | "PREFERENCE" | "NEGATIVE_CONSTRAINT" | "PROJECT_FACT" | "CONFIG_ASSERTION";
  truthKind?: AtomKind;
};

export type StrictCurrentTruthContext = {
  previousAssistantTextsByConversation: Map<string, string[]>;
  seenHumanClaimsByConversation: Map<string, Set<string>>;
};

type AtomCandidateLike = {
  kind: AtomKind;
  text: string;
  subject?: string;
  canonicalSubject?: string;
  value?: string;
  polarity?: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  scope?: string;
  keywords?: string[];
  ruleTrace?: string[];
  boundarySignals?: string[];
  confidence?: number;
};

export type StrictTruthAtomCandidate = AtomCandidateLike & {
  subject: string;
  canonicalSubject: string;
  confidence: number;
  sourceStart?: number;
  sourceEnd?: number;
  semanticSubtype?: string;
  relationSafe?: boolean;
  atomizationArm?: "G_ADAPTIVE_HETEROGENEOUS";
  boundarySignals?: string[];
  hierarchyRole?: "PARENT" | "CHILD" | "LEAF";
  sequenceIndex?: number;
  cohesionType?: "PROCEDURE" | "NARRATIVE" | "CAUSAL" | "NONE";
  intrinsicSufficiency?: number;
  fallbackPolicy?: "B_250_CHUNK";
  extractionVersion?: string;
  evidenceMessageKeys?: string[];
};

const QUESTION_RE = /^\s*(what|why|how|when|where|who|which|can|could|would|should|is|are|do|does|did)\b|[?]\s*$/i;
const SPECULATIVE_RE = /\b(maybe|might|could be|possibly|probably|i think|i guess|not sure|seems like|wonder if)\b/i;
const CHAT_TASK_RE = /\b(give me|write|find|search|show me|explain|summari[sz]e|review|audit|analy[sz]e|create|generate|make a|make me|tell me|help me)\b/i;
const CODE_OR_LOG_RE = /(```|^\s*(import|export|const|let|var|function|class|def|from)\b|function\s+\w+\s*\(|const\s+\w+\s*=|let\s+\w+\s*=|class\s+\w+|npm\s+run|GET\s+\/|POST\s+\/|stack trace|console\.log|error:|warning:)/i;
const TRANSIENT_UI_RE = /\b(freeze|frozen|unresponsive|loading|downloading|pending|console error|not seeing|showing same|reload|refresh|tab|popup|window|too narrow|too wide|too light|too dark|missing|not showing|can't see|cant see|doesn't show|doesnt show|never sends|not sending)\b/i;
const ANAPHORA_RE = /^(this|that|these|those|it|they|them|same thing|the above)\b/i;
const VAGUE_ANAPHORA_RE = /\b(i|we)\s+want\s+(nothing|that|this|it|them)\s+(there|here|in there|on there)\b|\b(nothing|that|this|it|them)\s+(there|here)\b/i;
const FIRST_PERSON_REQUIREMENT_RE = /\b(i|we)\s+(want|need|prefer|must|should|will|am going to|are going to)\b/i;
const NEGATIVE_CONSTRAINT_RE = /\b(do not|don't|dont|never|must not|should not|cannot|can't|no\s+manual|without\s+manual|avoid)\b/i;
const PREFERENCE_RE = /\b(i|we)\s+(prefer|like|want)\b/i;
const EXPLICIT_CONFIG_RE = /\b(runtime|model|backend|provider|architecture|schema|adapter|engine|cache|worker|mrs|dvi|brain2|gemini|claude|chatgpt)\b.{0,80}\b(is|are|uses|use|must use|should use|equals|=|:)\b/i;
const SHORT_DIRECTIVE_RE = /^(keep|use|switch|replace|remove|add|make|move|stick to|preserve|disable|enable)\b/i;
const BOUNDED_PROJECT_REQUIREMENT_RE = /\b(model|backend|provider|schema|adapter|engine|cache|worker|mrs|dvi|brain2|life wiki|import|export|truth|deterministic)\b.{0,120}\b(should|must|needs?\s+to|has\s+to|have\s+to|will|auto[-\s]?(?:attach|attached|initialize|run|start)|fire[-\s]and[-\s]forget)\b|\b(should|must|needs?\s+to|has\s+to|have\s+to|will)\b.{0,120}\b(model|backend|provider|schema|adapter|engine|cache|worker|mrs|dvi|brain2|life wiki|import|export|truth|deterministic)\b/i;
const DETERMINISTIC_PRIORITY_RE = /\b(deterministic|current truth|truth extraction|truth engine|dvi|brain2)\b.{0,80}\b(first|priority|before mrs|without mrs|reduce mrs|less mrs|quality)\b|\b(first|priority)\b.{0,80}\b(deterministic|current truth|truth extraction|truth engine|dvi|brain2)\b/i;
const DETERMINISTIC_MRS_BALANCE_RE = /\b(deterministic|current truth|truth extraction|truth engine|dvi)\b.{0,120}\b(ratio|more than mrs|less mrs|mrs dependency|pressure|middle ground|not too broad|not too narrow)\b|\b(mrs dependency|mrs pressure|middle ground|not too broad|not too narrow)\b.{0,120}\b(deterministic|current truth|truth extraction|truth engine|dvi)\b/i;
const ARCHITECTURE_DECISION_RE = /\b(architecture|runtime path|product path|web app|browser|worker|model page|mrs)\b.{0,120}\b(should|must|stays?|keep|remove|use|uses|replace|replacing|switch|moved|changed|auto[-\s]?(?:attach|attached|initialize|run|start))\b/i;
const CONFIRMED_PROJECT_ISSUE_RE = /\b(deterministic|current truth|truth extraction|truth engine|dvi|mrs|life wiki|model|runtime|worker|import|export|upload|download|cache)\b.{0,140}\b(bad|weak|wrong|freeze|freezes|freezing|unresponsive|slow|reloads?|loads?\s+again|pending|not update|not updating|not working|failing|fails|too much|too broad|too narrow)\b|\b(bad|weak|wrong|freeze|freezes|freezing|unresponsive|slow|reloads?|loads?\s+again|pending|not update|not updating|not working|failing|fails|too much|too broad|too narrow)\b.{0,140}\b(deterministic|current truth|truth extraction|truth engine|dvi|mrs|life wiki|model|runtime|worker|import|export|upload|download|cache)\b/i;
const PROJECT_ANCHOR_RE = /\b(app|web app|brain2|mrs|dvi|truth|engine|architecture|model|runtime|worker|life wiki|import|export|provider|adapter|chatgpt|claude|gemini)\b/i;
const QA_PAIR_RE = /Q:\s*(.*?)\s*A:\s*(.*?)(?=\s+Q:|$)/gis;
const QA_EPHEMERAL_RE = /\b(want to start|want to proceed|how do you want to proceed|what to build first|can you share|can you run|ever load successfully|explore|more detail|visuali[sz]ed|where do you want to start)\b/i;
const QA_VOLATILE_RE = /\b(vibe|liquid glass style|right side show|adding tasks from widget|routing work from widget|what should the widget do|what goes in settings initially|renaming a list update)\b/i;
const QA_UNCERTAIN_ANSWER_RE = /^(not sure|i don'?t know|unknown|maybe|unsure|i'?ll paste it here|yes i can run it)$/i;
const QA_DURABLE_RE = /\b(using for local storage|objectbox version|voice input|where does chat live|chat history|what actions should chat|where does settings live|model be downloaded|which platforms|applicationid|application id|package|bundle id|runtime|model|backend|provider|adapter|architecture|database|storage)\b/i;
const PACKAGE_IDENTIFIER_RE = /\b[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){2,}\b/g;
const CONFIG_ADOPTION_RE = /\b(i|we|my|our)\b.{0,80}\b(use|using|set|changed|change|replaced|replace|keep|package|applicationid|application id|bundle id)\b|\b(i|we)\s+(?:have|already)\b/i;
const CONFIG_ARTIFACT_RE = /\b(package\s+|applicationId\s*[=:]|application id\s*[=:]|bundle id\s*[=:]|namespace\s*[=:])\b/i;
const LABELLED_ANSWER_RE = /^\s*[A-Z]\s*:\s*\S.{0,160}$/i;
const QUOTED_WHOLE_RE = /^\s*["'“”‘’`].+["'“”‘’`]\s*$/s;
const META_TASK_RE = /\b(let['’]?s|lets|lats)\s+(fix|polish|study|review|go|continue|start|do)|\bi need\s+(good\s+)?(name|details|more details|document|guide|article|report)|\bgive\s+(me\s+)?(necessary\s+)?files\b|\bstudy the project\b|\bwhat i want you to do\b/i;
const IMPLEMENTATION_CLAIM_RE = /\b(i|we)\s+(have|already)\b.{0,80}\b(implemented|finished|completed|done|deployed|installed|fixed|added|removed|built|working|passed)\b|\b(implemented|finished|completed|done|deployed|installed|fixed|added|removed|built|working|passed)\b/i;
const OBSERVATION_RE = /\b(not working|doesn't work|doesnt work|can't load|cant load|crash(?:es|ed|ing)?|error|failed|failing|showing|appears|happens|worked before|working now|slow|hot|issue|problem)\b/i;

function canonicalRole(role: string): CanonicalTruthRole | null {
  const value = normalizeText(role).toLowerCase();
  if (["user", "human"].includes(value)) return "human";
  if (["assistant", "model", "ai"].includes(value)) return "assistant";
  return null;
}

function isValidIsoTimestamp(value?: string): boolean {
  if (!value) return false;
  const time = Date.parse(value);
  return Number.isFinite(time);
}

function canonicalSourceInvalidReason(message: Omit<CanonicalTruthMessage, "sourceValid" | "sourceInvalidReason">, duplicateMessageKey: boolean): string | undefined {
  if (!message.provider) return "missing provider";
  if (!message.conversationId || !message.conversationExternalId) return "missing conversation identity";
  if (!message.messageKey) return "missing message identity";
  if (duplicateMessageKey) return "duplicate message identity";
  if (!message.role) return "unsupported sender role";
  if (!message.timestampValid) return "missing or invalid provider timestamp";
  return undefined;
}

function compactClaimKey(text: string): string {
  return words(text).slice(0, 48).join(" ");
}

function hasAssistantEcho(text: string, previousAssistantTexts: string[]): boolean {
  const normalized = normalizeText(text).toLowerCase();
  if (normalized.length < 16) return false;
  return previousAssistantTexts.some((assistantText) => {
    const assistant = normalizeText(assistantText).toLowerCase();
    return assistant.includes(normalized) || normalized.includes(assistant);
  });
}

function hasStrictDerivedRule(candidate: AtomCandidateLike, ruleFamily: string): boolean {
  return (candidate.ruleTrace ?? []).includes(`strict_truth:${ruleFamily}`);
}

function hasProjectAnchor(candidate: AtomCandidateLike): boolean {
  const haystack = [
    candidate.text,
    candidate.subject,
    candidate.canonicalSubject,
    candidate.value,
    candidate.scope,
    ...(candidate.keywords ?? []),
  ].filter(Boolean).join(" ");
  return PROJECT_ANCHOR_RE.test(haystack) || keywords(haystack, 8).length >= 2;
}

export function toCanonicalTruthMessages(input: NormalizedConversationInput, conversationId: string): CanonicalTruthMessage[] {
  const base = input.messages.map((message, index) => ({
    provider: input.provider,
    conversationId,
    conversationExternalId: input.externalId || conversationId,
    messageKey: message.providerMessageId || message.providerNodeId || message.externalId || `${conversationId}:${index}`,
    role: canonicalRole(message.role),
    sequence: Number.isFinite(message.sequence) ? message.sequence : index,
    text: normalizeText(message.text),
    occurredAt: message.occurredAt,
    timestampValid: isValidIsoTimestamp(message.occurredAt),
    branchId: message.branchId,
    source: message,
  }));
  const counts = new Map<string, number>();
  for (const message of base) counts.set(message.messageKey, (counts.get(message.messageKey) ?? 0) + 1);
  let previousTime = -Infinity;
  return base.map((message) => {
    const invalidReason = canonicalSourceInvalidReason(message, (counts.get(message.messageKey) ?? 0) > 1);
    const time = message.timestampValid ? Date.parse(message.occurredAt as string) : NaN;
    const orderReason = Number.isFinite(time) && time < previousTime ? "non-monotonic provider timestamp order" : undefined;
    if (Number.isFinite(time)) previousTime = Math.max(previousTime, time);
    const sourceInvalidReason = invalidReason ?? orderReason;
    return { ...message, sourceValid: !sourceInvalidReason, sourceInvalidReason };
  });
}

export function createStrictCurrentTruthContext(): StrictCurrentTruthContext {
  return {
    previousAssistantTextsByConversation: new Map(),
    seenHumanClaimsByConversation: new Map(),
  };
}

export function noteStrictAssistantMessage(context: StrictCurrentTruthContext, message?: CanonicalTruthMessage): void {
  if (!message || message.role !== "assistant" || !message.text) return;
  const existing = context.previousAssistantTextsByConversation.get(message.conversationId) ?? [];
  existing.push(message.text);
  context.previousAssistantTextsByConversation.set(message.conversationId, existing.slice(-16));
}

function extractQAPairs(text: string): Array<{ question: string; answer: string }> {
  const out: Array<{ question: string; answer: string }> = [];
  for (const match of text.matchAll(QA_PAIR_RE)) {
    const question = normalizeText(match[1] ?? "");
    const answer = normalizeText(match[2] ?? "");
    if (question && answer) out.push({ question, answer });
  }
  return out;
}

function qaIsDurable(question: string, answer: string): boolean {
  if (QA_EPHEMERAL_RE.test(question) || QA_VOLATILE_RE.test(question)) return false;
  if (QA_UNCERTAIN_ANSWER_RE.test(answer)) return false;
  return QA_DURABLE_RE.test(question);
}

function qaAtomicAnswers(question: string, answer: string): string[] {
  if (!/\bselect all that apply\b/i.test(question) || !answer.includes(",")) return [answer];
  const values = answer.split(",").map((item) => normalizeText(item)).filter(Boolean);
  return values.length > 1 && values.length <= 8 ? values : [answer];
}

function normalizeForEcho(value: string): string {
  return normalizeText(value).toLowerCase().replace(/[`*_>#]+/g, " ").replace(/\s+/g, " ").trim();
}

function messageEchoesPriorAssistant(message: CanonicalTruthMessage, previousAssistantTexts: string[]): boolean {
  const text = normalizeForEcho(message.text);
  if (text.length < 24) return false;
  return previousAssistantTexts.some((assistantText) => {
    const assistant = normalizeForEcho(assistantText);
    return assistant === text || assistant.includes(text);
  });
}

function packageValues(text: string): string[] {
  return [...new Set([...text.matchAll(PACKAGE_IDENTIFIER_RE)].map((match) => match[0]))];
}

export function deriveStrictCurrentTruthCandidates(messages: CanonicalTruthMessage[]): Map<string, StrictTruthAtomCandidate[]> {
  const byMessageKey = new Map<string, StrictTruthAtomCandidate[]>();
  const add = (message: CanonicalTruthMessage, candidate: StrictTruthAtomCandidate) => {
    const existing = byMessageKey.get(message.messageKey) ?? [];
    existing.push(candidate);
    byMessageKey.set(message.messageKey, existing);
  };

  const seenQA = new Set<string>();
  for (const message of messages) {
    if (message.role !== "human" || !message.sourceValid) continue;
    for (const { question, answer } of extractQAPairs(message.text)) {
      const durable = qaIsDurable(question, answer);
      for (const value of qaAtomicAnswers(question, answer)) {
        const duplicateKey = `${message.conversationId}|qa|${normalizeText(question).toLowerCase()}|${normalizeText(value).toLowerCase()}`;
        const duplicate = seenQA.has(duplicateKey);
        seenQA.add(duplicateKey);
        if (!durable || duplicate) continue;
        const text = value === answer ? `${question} -> ${value}` : `${question} -> includes ${value}`;
        add(message, {
          kind: "decision",
          subject: question,
          canonicalSubject: normalizeText(question).toLowerCase(),
          value,
          polarity: "POSITIVE",
          text,
          confidence: 0.94,
          keywords: keywords(`${question} ${value}`, 12),
          semanticSubtype: "strict_qa_selection",
          relationSafe: true,
          atomizationArm: "G_ADAPTIVE_HETEROGENEOUS",
          boundarySignals: ["strict derived durable Q/A selection"],
          ruleTrace: ["strict_truth:explicit_qa_selection"],
          intrinsicSufficiency: 0.94,
          extractionVersion: "DVI_CURRENT_TRUTH_V1_PORT",
          evidenceMessageKeys: [message.messageKey],
        });
      }
    }
  }

  const messagesByConversation = new Map<string, CanonicalTruthMessage[]>();
  for (const message of messages) {
    const existing = messagesByConversation.get(message.conversationId) ?? [];
    existing.push(message);
    messagesByConversation.set(message.conversationId, existing);
  }
  for (const conversationMessages of messagesByConversation.values()) {
    const ordered = [...conversationMessages].sort((a, b) => (a.occurredAt ?? "").localeCompare(b.occurredAt ?? "") || a.sequence - b.sequence || a.messageKey.localeCompare(b.messageKey));
    const assistantByValue = new Map<string, string[]>();
    const priorAssistantTextsByKey = new Map<string, string[]>();
    const priorAssistantTexts: string[] = [];
    for (const message of ordered) {
      priorAssistantTextsByKey.set(message.messageKey, [...priorAssistantTexts]);
      if (message.role === "assistant") {
        for (const value of packageValues(message.text)) {
          const existing = assistantByValue.get(value) ?? [];
          if (message.occurredAt) existing.push(message.occurredAt);
          assistantByValue.set(value, existing);
        }
        priorAssistantTexts.push(message.text);
      }
    }

    const humanOccurrences = new Map<string, CanonicalTruthMessage[]>();
    const seenHumanTextByValue = new Map<string, Set<string>>();
    for (const message of ordered) {
      if (message.role !== "human" || !message.sourceValid) continue;
      const priorAssistant = priorAssistantTextsByKey.get(message.messageKey) ?? [];
      if (messageEchoesPriorAssistant(message, priorAssistant)) continue;
      for (const value of packageValues(message.text)) {
        const normalizedMessage = normalizeForEcho(message.text);
        const seenTexts = seenHumanTextByValue.get(value) ?? new Set<string>();
        if (seenTexts.has(normalizedMessage)) continue;
        seenTexts.add(normalizedMessage);
        seenHumanTextByValue.set(value, seenTexts);
        const existing = humanOccurrences.get(value) ?? [];
        existing.push(message);
        humanOccurrences.set(value, existing);
      }
    }

    for (const [value, occurrences] of humanOccurrences.entries()) {
      if (occurrences.length < 2) continue;
      const explicitAdoptions = occurrences.filter((message) => CONFIG_ADOPTION_RE.test(message.text) && message.text.includes(value) && !CODE_OR_LOG_RE.test(message.text.slice(0, 160)));
      if (!explicitAdoptions.length) continue;
      let chosen: { adoption: CanonicalTruthMessage; tainted: boolean; corroborators: CanonicalTruthMessage[] } | null = null;
      for (const adoption of [...explicitAdoptions].reverse()) {
        const assistantTimes = assistantByValue.get(value) ?? [];
        const tainted = Boolean(adoption.occurredAt && assistantTimes.some((time) => time < adoption.occurredAt!));
        const corroborators = occurrences.filter((message) => {
          if (message.messageKey === adoption.messageKey) return false;
          if (tainted && adoption.occurredAt && message.occurredAt && message.occurredAt <= adoption.occurredAt) return false;
          return !tainted || CONFIG_ARTIFACT_RE.test(message.text);
        });
        if (corroborators.length) {
          chosen = { adoption, tainted, corroborators };
          break;
        }
      }
      if (!chosen) continue;
      add(chosen.adoption, {
        kind: "fact",
        subject: "Application/package identifier",
        canonicalSubject: "application package identifier",
        value,
        polarity: "POSITIVE",
        text: `Application/package identifier -> ${value}`,
        confidence: 0.98,
        keywords: keywords(`application package identifier ${value}`, 12),
        semanticSubtype: "strict_corrob_config",
        relationSafe: true,
        atomizationArm: "G_ADAPTIVE_HETEROGENEOUS",
        boundarySignals: [
          chosen.tainted ? "assistant-origin value required human adoption plus later artifact" : "user adoption plus independent human corroboration",
        ],
        ruleTrace: ["strict_truth:corroborated_exact_config"],
        intrinsicSufficiency: 0.98,
        extractionVersion: "DVI_CURRENT_TRUTH_V1_PORT",
        evidenceMessageKeys: [chosen.adoption.messageKey, ...chosen.corroborators.map((message) => message.messageKey)],
      });
    }
  }

  return byMessageKey;
}

export async function buildCurrentTruthRoot(truths: TruthRecord[], options: { providerNeutral?: boolean } = {}): Promise<string> {
  const rows = truths
    .filter((truth) => truth.status === "CURRENT")
    .map((truth) => ({
      conversationId: options.providerNeutral ? "" : truth.conversationId ?? "",
      projectId: options.providerNeutral ? "" : truth.projectId,
      kind: truth.kind,
      canonicalSubject: normalizeText(truth.canonicalSubject ?? "").toLowerCase(),
      value: normalizeText(truth.value ?? "").toLowerCase(),
      polarity: truth.polarity ?? "NEUTRAL",
      scope: normalizeText(truth.scope ?? "").toLowerCase(),
      text: normalizeText(truth.text).toLowerCase(),
      strictTruthRootKey: truth.strictTruthRootKey ?? "",
      relation: truth.relation ?? "NEW",
    }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return sha256(JSON.stringify(rows));
}

export async function buildSourceEvidenceRoot(messages: MessageRecord[]): Promise<string> {
  const rows = messages
    .map((message) => ({
      id: message.id,
      provider: message.provider,
      conversationId: message.conversationId,
      externalId: message.externalId,
      role: message.role,
      occurredAt: message.occurredAt ?? message.createdAt ?? "",
      text: normalizeText(message.text),
      parentProviderNodeId: message.parentProviderNodeId ?? "",
      branchId: message.branchId ?? "",
    }))
    .sort((a, b) => `${a.occurredAt}:${a.id}`.localeCompare(`${b.occurredAt}:${b.id}`));
  return sha256(JSON.stringify(rows));
}

function reject(reason: string, ruleFamily = "strict_abstain"): StrictCurrentTruthDecision {
  return { eligible: false, tier: "RESIDUAL", ruleFamily, reason };
}

export function evaluateStrictCurrentTruthCandidate(
  candidate: AtomCandidateLike,
  message: CanonicalTruthMessage | undefined,
  context: StrictCurrentTruthContext,
): StrictCurrentTruthDecision {
  const text = normalizeText(candidate.text);
  if (!message) return reject("missing canonical message", "invalid_source");
  if (!message.sourceValid) {
    const reason = message.sourceInvalidReason ?? "invalid canonical source";
    return reject(reason, reason.includes("timestamp") ? "invalid_timestamp" : "invalid_source");
  }
  if (message.role !== "human") return reject("only human-authored messages can promote Current Truth", "assistant_or_unknown_author");
  if (!text) return reject("empty candidate", "empty_candidate");
  if (!message.timestampValid) return reject("missing or invalid provider timestamp", "invalid_timestamp");
  if (hasStrictDerivedRule(candidate, "explicit_qa_selection")) {
    return { eligible: true, tier: "D1", ruleFamily: "explicit_qa_selection", reason: "explicit durable human Q/A selection", atomType: "PROJECT_FACT", truthKind: "decision" };
  }
  if (hasStrictDerivedRule(candidate, "corroborated_exact_config")) {
    return { eligible: true, tier: "D0", ruleFamily: "corroborated_exact_config", reason: "exact config identifier has provenance-safe human corroboration", atomType: "CONFIG_ASSERTION", truthKind: "fact" };
  }
  if (LABELLED_ANSWER_RE.test(text)) return reject("labelled answer requires deterministic question binding before promotion", "labelled_answer");
  if (QUOTED_WHOLE_RE.test(text)) return reject("quoted text is evidence until explicitly adopted", "quoted_text");
  if (META_TASK_RE.test(text)) return reject("meta/chat task is tracked outside Current Truth", "meta_task");
  if (CODE_OR_LOG_RE.test(text)) return reject("code/log text is residual evidence, not Current Truth", "code_or_log");
  if (QUESTION_RE.test(text)) return reject("questions do not become Current Truth", "question");
  if (SPECULATIVE_RE.test(text)) return reject("speculative language is not strict truth", "speculation");
  if (CONFIRMED_PROJECT_ISSUE_RE.test(text) && hasProjectAnchor(candidate)) {
    return { eligible: true, tier: "D1", ruleFamily: "confirmed_project_issue", reason: "human-authored concrete project issue", atomType: "PROJECT_FACT", truthKind: "fact" };
  }
  if (OBSERVATION_RE.test(text) && !EXPLICIT_CONFIG_RE.test(text)) return reject("observation/status requires later-state clearance before promotion", "observation");
  if (IMPLEMENTATION_CLAIM_RE.test(text) && !hasStrictDerivedRule(candidate, "corroborated_exact_config")) return reject("implementation/status assertion needs independent confirmation", "state_assertion");
  if (TRANSIENT_UI_RE.test(text) && !EXPLICIT_CONFIG_RE.test(text)) return reject("transient UI/runtime complaint is residual evidence", "transient_observation");
  if (CHAT_TASK_RE.test(text) && !FIRST_PERSON_REQUIREMENT_RE.test(text) && !EXPLICIT_CONFIG_RE.test(text)) return reject("chat task/request is residual evidence", "chat_task");
  if (VAGUE_ANAPHORA_RE.test(text)) return reject("anaphoric claim lacks standalone subject", "anaphora");
  if (ANAPHORA_RE.test(text) && !hasProjectAnchor(candidate)) return reject("anaphoric claim lacks standalone subject", "anaphora");

  const previousAssistantTexts = context.previousAssistantTextsByConversation.get(message.conversationId) ?? [];
  if (hasAssistantEcho(text, previousAssistantTexts)) return reject("candidate repeats prior assistant text without safe adoption", "assistant_echo");

  const seenClaims = context.seenHumanClaimsByConversation.get(message.conversationId) ?? new Set<string>();
  const claimKey = compactClaimKey(text);
  if (claimKey && seenClaims.has(claimKey)) return reject("duplicate same-conversation claim is evidence only", "duplicate_claim");
  if (claimKey) {
    seenClaims.add(claimKey);
    context.seenHumanClaimsByConversation.set(message.conversationId, seenClaims);
  }

  if (NEGATIVE_CONSTRAINT_RE.test(text) && hasProjectAnchor(candidate)) {
    return { eligible: true, tier: "D1", ruleFamily: "explicit_negative_constraint", reason: "human-authored bounded negative constraint", atomType: "NEGATIVE_CONSTRAINT", truthKind: "constraint" };
  }
  if (FIRST_PERSON_REQUIREMENT_RE.test(text) && hasProjectAnchor(candidate)) {
    return { eligible: true, tier: "D1", ruleFamily: "explicit_first_person_requirement", reason: "human-authored explicit requirement", atomType: "REQUIREMENT", truthKind: "decision" };
  }
  if (PREFERENCE_RE.test(text) && hasProjectAnchor(candidate)) {
    return { eligible: true, tier: "D1", ruleFamily: "explicit_preference", reason: "human-authored explicit preference", atomType: "PREFERENCE", truthKind: "decision" };
  }
  if (DETERMINISTIC_PRIORITY_RE.test(text) && hasProjectAnchor(candidate)) {
    return { eligible: true, tier: "D1", ruleFamily: "deterministic_priority_decision", reason: "human-authored deterministic-first priority decision", atomType: "REQUIREMENT", truthKind: "decision" };
  }
  if (DETERMINISTIC_MRS_BALANCE_RE.test(text) && hasProjectAnchor(candidate)) {
    return { eligible: true, tier: "D1", ruleFamily: "deterministic_mrs_balance_decision", reason: "human-authored deterministic/MRS balance decision", atomType: "REQUIREMENT", truthKind: "decision" };
  }
  if (ARCHITECTURE_DECISION_RE.test(text) && hasProjectAnchor(candidate)) {
    return { eligible: true, tier: "D1", ruleFamily: "explicit_architecture_decision", reason: "human-authored bounded architecture decision", atomType: "REQUIREMENT", truthKind: "decision" };
  }
  if (BOUNDED_PROJECT_REQUIREMENT_RE.test(text) && hasProjectAnchor(candidate)) {
    return { eligible: true, tier: "D1", ruleFamily: "bounded_project_requirement", reason: "human-authored bounded project requirement", atomType: "REQUIREMENT", truthKind: "decision" };
  }
  if (EXPLICIT_CONFIG_RE.test(text) && hasProjectAnchor(candidate)) {
    return { eligible: true, tier: "D1", ruleFamily: "explicit_project_config", reason: "human-authored bounded project/config assertion", atomType: "CONFIG_ASSERTION", truthKind: "fact" };
  }
  if (SHORT_DIRECTIVE_RE.test(text) && text.length <= 220 && hasProjectAnchor(candidate)) {
    return { eligible: true, tier: "D2", ruleFamily: "calibrated_short_component_directive", reason: "short bounded project directive", atomType: "REQUIREMENT", truthKind: "decision" };
  }

  return reject("candidate did not match strict Current Truth promotion rules", "not_strict_truth");
}
