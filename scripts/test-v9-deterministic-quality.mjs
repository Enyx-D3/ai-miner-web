import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import process from "node:process";

const root = process.cwd();
const out = path.join(root, ".v9-deterministic-test-dist");
const srcOut = path.join(root, ".v9-deterministic-test-src");
const tscCli = path.join(root, "node_modules", "typescript", "bin", "tsc");
fs.rmSync(out, { recursive: true, force: true });
fs.rmSync(srcOut, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(srcOut, { recursive: true });

const sourceFiles = [
  "contracts.ts",
  "identity.ts",
  "types.ts",
  "atomizationStack.ts",
  "atomizer.ts",
  "canonicalTruth.ts",
  "truthEngine.ts",
  "projectResolver.ts",
  "patternLab.ts",
  "patternEngine.ts",
  "intelligenceLayer.ts",
];

for (const file of sourceFiles) {
  const sourcePath = path.join(root, "src", "lib", "brain2", file);
  let text = fs.readFileSync(sourcePath, "utf8");
  if (file === "intelligenceLayer.ts") {
    text = text.replace("from './transformersRuntime';", "from './transformersRuntimeStub';");
  }
  fs.writeFileSync(path.join(srcOut, file), text, "utf8");
}

fs.writeFileSync(
  path.join(srcOut, "transformersRuntimeStub.ts"),
  `export const BRAIN2_MRS_REVIEW_CANDIDATE_LIMIT = 1;
export function getBrain2RuntimeAvailabilityHint(){return {hasCachedRuntime:false,hasRecentSelfTest:false};}
export async function reviewBrain2Intelligence(_input?: unknown){return [];}
`,
  "utf8",
);
fs.writeFileSync(
  path.join(srcOut, "mrsDebug.ts"),
  `export function brain2MRSLog(_event?: unknown,_detail?: unknown){}
export function brain2MRSError(_event?: unknown,_detail?: unknown){}
`,
  "utf8",
);

execFileSync(
  process.execPath,
  [
    tscCli,
    "--target", "ES2022",
    "--module", "commonjs",
    "--moduleResolution", "node",
    "--skipLibCheck",
    "--esModuleInterop",
    "--outDir", out,
    path.join(srcOut, "contracts.ts"),
    path.join(srcOut, "identity.ts"),
    path.join(srcOut, "types.ts"),
    path.join(srcOut, "atomizationStack.ts"),
    path.join(srcOut, "atomizer.ts"),
    path.join(srcOut, "canonicalTruth.ts"),
    path.join(srcOut, "truthEngine.ts"),
    path.join(srcOut, "projectResolver.ts"),
    path.join(srcOut, "patternLab.ts"),
    path.join(srcOut, "patternEngine.ts"),
    path.join(srcOut, "intelligenceLayer.ts"),
    path.join(srcOut, "mrsDebug.ts"),
    path.join(srcOut, "transformersRuntimeStub.ts"),
  ],
  { stdio: "inherit" },
);

const require = createRequire(import.meta.url);
const { atomizeMessage } = require(path.join(out, "atomizer.js"));
const { buildCurrentTruthRoot, buildSourceEvidenceRoot, createStrictCurrentTruthContext, deriveStrictCurrentTruthCandidates, evaluateStrictCurrentTruthCandidate, noteStrictAssistantMessage, toCanonicalTruthMessages } = require(path.join(out, "canonicalTruth.js"));
const { reconcileAtomToTruth } = require(path.join(out, "truthEngine.js"));
const { fingerprintConversation, chooseProject } = require(path.join(out, "projectResolver.js"));
const { buildPatterns } = require(path.join(out, "patternEngine.js"));
const { buildDeterministicProjectIntelligence } = require(path.join(out, "intelligenceLayer.js"));

function ok(value, message) {
  if (!value) throw new Error(message);
}

function equal(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\nexpected: ${expected}\nactual: ${actual}`);
  }
}

function atomFixture(overrides = {}) {
  return {
    id: "atom-1",
    messageId: "msg-1",
    conversationId: "conv-1",
    projectId: "proj-1",
    sourceId: "src-1",
    kind: "fact",
    subject: "Brain2 runtime",
    canonicalSubject: "brain2 runtime",
    value: "enabled",
    polarity: "POSITIVE",
    scope: undefined,
    text: "Brain2 runtime is enabled.",
    createdAt: "2026-08-30T09:00:00.000Z",
    confidence: 0.9,
    provenance: ["msg-1"],
    keywords: ["brain2", "runtime", "enabled"],
    hash: "hash-1",
    truthStatus: "CURRENT",
    ...overrides,
  };
}

function truthFixture(overrides = {}) {
  return {
    id: "truth-1",
    key: "proj-1:fact:brain2-runtime",
    projectId: "proj-1",
    atomId: "atom-1",
    text: "Brain2 runtime is enabled.",
    kind: "fact",
    status: "CURRENT",
    confidence: 0.92,
    createdAt: "2026-08-30T09:00:00.000Z",
    updatedAt: "2026-08-30T09:00:00.000Z",
    relation: "NEW",
    relatedTruthIds: [],
    evidenceAtomIds: ["atom-1"],
    canonicalSubject: "brain2 runtime",
    value: "enabled",
    polarity: "POSITIVE",
    scope: undefined,
    ...overrides,
  };
}

function projectFixture(overrides = {}) {
  return {
    id: "proj-1",
    slug: "brain2-runtime",
    name: "Brain2 Runtime",
    summary: "Runtime work",
    createdAt: "2026-08-29T00:00:00.000Z",
    updatedAt: "2026-08-30T09:00:00.000Z",
    conversationIds: [],
    atomIds: [],
    openTickIds: [],
    tags: ["brain2", "runtime", "transformers"],
    aliases: ["Brain2 Runtime"],
    entityTerms: ["brain2 runtime", "transformers"],
    resolutionConfidence: 0.8,
    ...overrides,
  };
}

function strictDecisionForText(text, overrides = {}) {
  const canonicalMessages = toCanonicalTruthMessages(
    {
      provider: "chatgpt",
      sourceLabel: "ChatGPT export",
      sourceType: "history export",
      externalId: overrides.externalId ?? "strict-classifier",
      title: overrides.title ?? "Strict classifier",
      messages: [
        {
          externalId: "m1",
          sequence: 0,
          role: overrides.role ?? "user",
          text,
          occurredAt: "2026-09-01T10:00:00.000Z",
        },
      ],
    },
    overrides.conversationId ?? "conv-strict-classifier",
  );
  return evaluateStrictCurrentTruthCandidate(
    {
      kind: overrides.kind ?? "fact",
      subject: overrides.subject ?? "Brain2",
      canonicalSubject: overrides.canonicalSubject ?? "brain2",
      text,
      keywords: overrides.keywords ?? ["brain2", "runtime"],
      value: overrides.value,
    },
    canonicalMessages[0],
    createStrictCurrentTruthContext(),
  );
}

async function strictTruthRootForProvider(provider) {
  const canonicalMessages = toCanonicalTruthMessages(
    {
      provider,
      sourceLabel: `${provider} fixture`,
      sourceType: "history export",
      externalId: `${provider}-strict-root-fixture`,
      title: "Shared strict truth fixture",
      messages: [
        {
          externalId: "u1",
          sequence: 0,
          role: provider === "claude" ? "human" : "user",
          text: "We want Brain2 MRS to run automatically in the web app.",
          occurredAt: "2026-09-01T10:00:00.000Z",
        },
        {
          externalId: "u2",
          sequence: 1,
          role: provider === "claude" ? "human" : "user",
          text: "Do not use a desktop helper for Brain2 MRS.",
          occurredAt: "2026-09-01T10:01:00.000Z",
        },
        {
          externalId: "u3",
          sequence: 2,
          role: provider === "claude" ? "human" : "user",
          text: "Q: What are you using for local storage? A: ObjectBox",
          occurredAt: "2026-09-01T10:02:00.000Z",
        },
      ],
    },
    `${provider}-canonical-conv`,
  );
  const derivedCandidates = deriveStrictCurrentTruthCandidates(canonicalMessages);
  const context = createStrictCurrentTruthContext();
  const truthsById = new Map();
  for (const [index, message] of canonicalMessages.entries()) {
    const candidates = [
      {
        kind: "task",
        subject: "Brain2 MRS",
        canonicalSubject: "brain2 mrs",
        text: message.text,
        keywords: ["brain2", "mrs", "web", "app"],
        confidence: 0.9,
      },
      ...(derivedCandidates.get(message.messageKey) ?? []),
    ];
    for (const candidate of candidates) {
      const decision = evaluateStrictCurrentTruthCandidate(candidate, message, context);
      if (!decision.eligible) continue;
      const effectiveKind = decision.truthKind ?? candidate.kind;
      const atom = atomFixture({
        id: `${provider}-fixture-atom-${index}-${truthsById.size}`,
        messageId: `${provider}-fixture-message-${index}`,
        conversationId: message.conversationId,
        sourceId: `${provider}-fixture-source`,
        projectId: "shared-project",
        kind: effectiveKind,
        subject: candidate.subject,
        canonicalSubject: candidate.canonicalSubject,
        value: candidate.value,
        polarity: candidate.polarity,
        text: candidate.text,
        confidence: candidate.confidence ?? 0.9,
        keywords: candidate.keywords ?? ["brain2"],
        ruleTrace: [...(candidate.ruleTrace ?? []), `strict_truth:${decision.ruleFamily}`, "strict_truth:eligible"],
        hash: `${provider}-fixture-hash-${index}-${truthsById.size}`,
      });
      const result = await reconcileAtomToTruth(atom, message.source.role, [...truthsById.values()]);
      for (const truth of result.writes) truthsById.set(truth.id, truth);
    }
  }
  return buildCurrentTruthRoot([...truthsById.values()], { providerNeutral: true });
}

const strictResidualCases = [
  ["A: Yes, fully set up", "labelled_answer"],
  ['"The base AI model can remain frozen."', "quoted_text"],
  ["lets fix this first", "meta_task"],
  ['import { motion } from "framer-motion"', "code_or_log"],
  ["Why is the widget failing?", "question"],
  ["I think Gemma 270 should be enough.", "speculation"],
  ["We have already implemented the Brain2 import flow.", "state_assertion"],
  ["The page is not working and shows errors.", "observation"],
  ["page width is too narrow", "transient_observation"],
  ["give me a long article about this", "chat_task"],
  ["No no, I want nothing there.", "anaphora"],
];

for (const [text, expectedRule] of strictResidualCases) {
  const decision = strictDecisionForText(text, {
    subject: "Brain2 widget",
    canonicalSubject: expectedRule === "anaphora" ? "there" : "brain2 widget",
    keywords: expectedRule === "anaphora" ? [] : ["brain2", "widget"],
  });
  ok(!decision.eligible, `${text} should be residual, not Current Truth`);
  equal(decision.ruleFamily, expectedRule, `${text} should route to ${expectedRule}`);
}

const providerRoots = new Map();
for (const provider of ["chatgpt", "claude", "gemini"]) {
  providerRoots.set(provider, await strictTruthRootForProvider(provider));
}
equal(
  providerRoots.get("chatgpt"),
  providerRoots.get("claude"),
  "ChatGPT and Claude should produce the same provider-neutral Current Truth root for the shared fixture",
);
equal(
  providerRoots.get("chatgpt"),
  providerRoots.get("gemini"),
  "ChatGPT and Gemini should produce the same provider-neutral Current Truth root for the shared fixture",
);

function summarizeStrictDiagnosticsForTest(atoms, messages) {
  const messageById = new Map(messages.map((message) => [message.id, message]));
  let humanEligible = 0;
  let humanResidual = 0;
  let assistantOrUnknownStrictAtoms = 0;
  for (const atom of atoms) {
    const traces = atom.ruleTrace ?? [];
    const strictTrace = traces.find((trace) => trace.startsWith("strict_truth:") && !["strict_truth:eligible", "strict_truth:residual"].includes(trace));
    if (!strictTrace) continue;
    const message = messageById.get(atom.messageId);
    const role = String(message?.role ?? "").toLowerCase();
    const humanAuthored = role === "user" || role === "human";
    if (!humanAuthored) {
      assistantOrUnknownStrictAtoms += 1;
      continue;
    }
    if (traces.includes("strict_truth:eligible")) humanEligible += 1;
    else humanResidual += 1;
  }
  return { humanEligible, humanResidual, assistantOrUnknownStrictAtoms, mrsPressureResidual: humanResidual };
}

{
  const diagnostics = summarizeStrictDiagnosticsForTest(
    [
      atomFixture({
        id: "diag-human-eligible",
        messageId: "diag-user",
        ruleTrace: ["strict_truth:explicit_first_person_requirement", "strict_truth:eligible"],
      }),
      atomFixture({
        id: "diag-human-residual",
        messageId: "diag-user",
        ruleTrace: ["strict_truth:not_strict_truth", "strict_truth:residual"],
      }),
      atomFixture({
        id: "diag-assistant-residual",
        messageId: "diag-assistant",
        ruleTrace: ["strict_truth:assistant_or_unknown_author", "strict_truth:residual"],
      }),
    ],
    [
      { id: "diag-user", role: "user" },
      { id: "diag-assistant", role: "assistant" },
    ],
  );
  equal(diagnostics.humanEligible, 1, "diagnostics should count human eligible atoms");
  equal(diagnostics.mrsPressureResidual, 1, "diagnostics should treat only human residuals as MRS pressure");
  equal(diagnostics.assistantOrUnknownStrictAtoms, 1, "diagnostics should separate assistant residuals from MRS pressure");
}

for (const provider of ["chatgpt", "claude", "gemini"]) {
  const canonicalMessages = toCanonicalTruthMessages(
    {
      provider,
      sourceLabel: `${provider} export`,
      sourceType: "history export",
      externalId: `${provider}-conversation-1`,
      title: "Runtime truth",
      messages: [
        {
          externalId: "m1",
          sequence: 0,
          role: "user",
          text: "We want Brain2 MRS to run automatically in the web app.",
          occurredAt: "2026-09-01T10:00:00.000Z",
        },
      ],
    },
    `conv-${provider}`,
  );
  const strictContext = createStrictCurrentTruthContext();
  const decision = evaluateStrictCurrentTruthCandidate(
    {
      kind: "task",
      subject: "Brain2 MRS",
      canonicalSubject: "brain2 mrs",
      text: "We want Brain2 MRS to run automatically in the web app.",
      keywords: ["brain2", "mrs", "automatically", "web"],
    },
    canonicalMessages[0],
    strictContext,
  );
  ok(decision.eligible, `${provider} explicit human requirement should pass the shared strict truth gate`);
  equal(decision.ruleFamily, "explicit_first_person_requirement", `${provider} should use the same strict rule family`);
  equal(decision.truthKind, "decision", `${provider} requirement should normalize to decision truth`);
}

const widenedStrictCases = [
  ["MRS should be auto attached after the model is ready.", "explicit_architecture_decision", "decision"],
  ["After download the Brain2 model should auto initialize under the hood.", "bounded_project_requirement", "decision"],
  ["Deterministic truth extraction quality comes first before MRS.", "deterministic_priority_decision", "decision"],
  ["The web app architecture should keep browser MRS automatic.", "explicit_architecture_decision", "decision"],
  ["The runtime path must stay web-app only.", "explicit_architecture_decision", "decision"],
  ["deterministic results are bad", "confirmed_project_issue", "fact"],
  ["calculations plus MRS causing freeze UI", "confirmed_project_issue", "fact"],
  ["every time I refresh or go to new page the model loads again", "confirmed_project_issue", "fact"],
  ["all verification of MRS should be queued immediately after data upload", "explicit_architecture_decision", "decision"],
  ["deterministic ratio should be way more than MRS to reduce MRS dependency", "deterministic_priority_decision", "decision"],
  ["the deterministic gate is too broad now and needs middle ground", "confirmed_project_issue", "fact"],
];

for (const [text, expectedRule, expectedKind] of widenedStrictCases) {
  const decision = strictDecisionForText(text, {
    kind: "statement",
    subject: "Brain2 architecture",
    canonicalSubject: "brain2 architecture",
    keywords: ["brain2", "mrs", "architecture", "runtime"],
  });
  ok(decision.eligible, `${text} should now pass the strict deterministic gate`);
  equal(decision.ruleFamily, expectedRule, `${text} should use ${expectedRule}`);
  equal(decision.truthKind, expectedKind, `${text} should normalize to ${expectedKind}`);
}

const stillResidualMiddleGroundCases = [
  ["The page is not working and shows errors.", "observation"],
  ["given a lot of time, not update", "not_strict_truth"],
  ["i am kinda confused what is going on", "not_strict_truth"],
  ["what the fuck is going on", "question"],
  ["Download the React DevTools for a better development experience", "not_strict_truth"],
];

for (const [text, expectedRule] of stillResidualMiddleGroundCases) {
  const decision = strictDecisionForText(text, {
    kind: "statement",
    subject: "Brain2 diagnostics",
    canonicalSubject: "brain2 diagnostics",
    keywords: ["brain2", "diagnostics"],
  });
  ok(!decision.eligible, `${text} should stay residual after middle-ground tuning`);
  equal(decision.ruleFamily, expectedRule, `${text} should use ${expectedRule}`);
}

const providerStyleFixtures = {
  chatgpt: {
    provider: "chatgpt",
    sourceLabel: "conversations.json",
    sourceType: "ChatGPT data export",
    externalId: "chatgpt-realish-conversation",
    title: "Brain2 architecture",
    messages: [
      { externalId: "mapping-user-1", providerMessageId: "mapping-user-1", sequence: 0, role: "user", text: "MRS should be auto attached after the model is ready.", occurredAt: "2026-09-01T12:00:00.000Z" },
    ],
  },
  claude: {
    provider: "claude",
    sourceLabel: "conversations.json",
    sourceType: "Claude data export",
    externalId: "claude-realish-conversation",
    title: "Brain2 architecture",
    messages: [
      { externalId: "uuid-user-1", providerMessageId: "uuid-user-1", sequence: 0, role: "human", text: "MRS should be auto attached after the model is ready.", occurredAt: "2026-09-01T12:00:00.000Z" },
    ],
  },
  gemini: {
    provider: "gemini",
    sourceLabel: "Takeout/Assistant",
    sourceType: "Gemini Takeout export",
    externalId: "gemini-realish-conversation",
    title: "Brain2 architecture",
    messages: [
      { externalId: "turn-user-1", providerMessageId: "turn-user-1", sequence: 0, role: "user", text: "MRS should be auto attached after the model is ready.", occurredAt: "2026-09-01T12:00:00.000Z" },
    ],
  },
};

for (const [provider, fixture] of Object.entries(providerStyleFixtures)) {
  const messages = toCanonicalTruthMessages(fixture, `${provider}-realish-canonical`);
  const decision = evaluateStrictCurrentTruthCandidate(
    {
      kind: "statement",
      subject: "Brain2 MRS",
      canonicalSubject: "brain2 mrs",
      text: messages[0].text,
      keywords: ["brain2", "mrs", "model", "ready"],
    },
    messages[0],
    createStrictCurrentTruthContext(),
  );
  ok(decision.eligible, `${provider} real-ish adapter fixture should promote the bounded MRS requirement`);
  equal(decision.ruleFamily, "explicit_architecture_decision", `${provider} fixture should use provider-neutral strict rule family`);
}

for (const provider of ["chatgpt", "claude", "gemini"]) {
  const canonicalMessages = toCanonicalTruthMessages(
    {
      provider,
      sourceLabel: `${provider} export`,
      sourceType: "history export",
      externalId: `${provider}-conversation-2`,
      title: "Assistant echo",
      messages: [
        {
          externalId: "a1",
          sequence: 0,
          role: "assistant",
          text: "Brain2 should use a hidden desktop helper.",
          occurredAt: "2026-09-01T10:00:00.000Z",
        },
        {
          externalId: "u1",
          sequence: 1,
          role: "user",
          text: "Brain2 should use a hidden desktop helper.",
          occurredAt: "2026-09-01T10:01:00.000Z",
        },
      ],
    },
    `conv-echo-${provider}`,
  );
  const strictContext = createStrictCurrentTruthContext();
  noteStrictAssistantMessage(strictContext, canonicalMessages[0]);
  const decision = evaluateStrictCurrentTruthCandidate(
    {
      kind: "fact",
      subject: "Brain2 helper",
      canonicalSubject: "brain2 helper",
      text: "Brain2 should use a hidden desktop helper.",
      keywords: ["brain2", "helper"],
    },
    canonicalMessages[1],
    strictContext,
  );
  ok(!decision.eligible, `${provider} assistant echo should not promote into Current Truth`);
  equal(decision.ruleFamily, "assistant_echo", `${provider} assistant echo should fail with explicit reason`);
}

{
  const canonicalMessages = toCanonicalTruthMessages(
    {
      provider: "chatgpt",
      sourceLabel: "ChatGPT export",
      sourceType: "history export",
      externalId: "missing-timestamp",
      title: "Timestamp gate",
      messages: [
        {
          externalId: "m1",
          sequence: 0,
          role: "user",
          text: "We want Brain2 truth extraction to stay deterministic.",
        },
      ],
    },
    "conv-missing-timestamp",
  );
  const decision = evaluateStrictCurrentTruthCandidate(
    {
      kind: "task",
      subject: "Brain2 truth extraction",
      canonicalSubject: "brain2 truth extraction",
      text: "We want Brain2 truth extraction to stay deterministic.",
      keywords: ["brain2", "truth", "deterministic"],
    },
    canonicalMessages[0],
    createStrictCurrentTruthContext(),
  );
  ok(!decision.eligible, "missing provider timestamp should fail closed for production Current Truth");
  equal(decision.ruleFamily, "invalid_timestamp", "missing timestamp should expose strict failure reason");
}

{
  const canonicalMessages = toCanonicalTruthMessages(
    {
      provider: "claude",
      sourceLabel: "Claude export",
      sourceType: "history export",
      externalId: "duplicate-message",
      title: "Duplicate message validation",
      messages: [
        {
          externalId: "same-id",
          sequence: 0,
          role: "user",
          text: "We want Brain2 truth extraction to stay deterministic.",
          occurredAt: "2026-09-01T10:00:00.000Z",
        },
        {
          externalId: "same-id",
          sequence: 1,
          role: "user",
          text: "We want Brain2 MRS to run automatically.",
          occurredAt: "2026-09-01T10:01:00.000Z",
        },
      ],
    },
    "conv-duplicate-message",
  );
  ok(canonicalMessages.every((message) => !message.sourceValid), "duplicate message identities should invalidate strict source messages");
  const decision = evaluateStrictCurrentTruthCandidate(
    {
      kind: "task",
      subject: "Brain2 truth extraction",
      canonicalSubject: "brain2 truth extraction",
      text: canonicalMessages[0].text,
      keywords: ["brain2", "truth", "deterministic"],
    },
    canonicalMessages[0],
    createStrictCurrentTruthContext(),
  );
  ok(!decision.eligible, "duplicate source message should not promote Current Truth");
  equal(decision.ruleFamily, "invalid_source", "duplicate source message should report invalid source");
}

{
  const canonicalMessages = toCanonicalTruthMessages(
    {
      provider: "gemini",
      sourceLabel: "Gemini export",
      sourceType: "history export",
      externalId: "unknown-role",
      title: "Unknown role validation",
      messages: [
        {
          externalId: "m1",
          sequence: 0,
          role: "system",
          text: "We want Brain2 truth extraction to stay deterministic.",
          occurredAt: "2026-09-01T10:00:00.000Z",
        },
      ],
    },
    "conv-unknown-role",
  );
  const decision = evaluateStrictCurrentTruthCandidate(
    {
      kind: "task",
      subject: "Brain2 truth extraction",
      canonicalSubject: "brain2 truth extraction",
      text: canonicalMessages[0].text,
      keywords: ["brain2", "truth", "deterministic"],
    },
    canonicalMessages[0],
    createStrictCurrentTruthContext(),
  );
  ok(!decision.eligible, "unsupported sender role should not promote Current Truth");
  equal(decision.ruleFamily, "invalid_source", "unsupported sender role should report invalid source");
}

{
  const canonicalMessages = toCanonicalTruthMessages(
    {
      provider: "chatgpt",
      sourceLabel: "ChatGPT export",
      sourceType: "history export",
      externalId: "",
      title: "Missing conversation validation",
      messages: [
        {
          externalId: "m1",
          sequence: 0,
          role: "user",
          text: "We want Brain2 truth extraction to stay deterministic.",
          occurredAt: "2026-09-01T10:00:00.000Z",
        },
      ],
    },
    "",
  );
  const decision = evaluateStrictCurrentTruthCandidate(
    {
      kind: "task",
      subject: "Brain2 truth extraction",
      canonicalSubject: "brain2 truth extraction",
      text: canonicalMessages[0].text,
      keywords: ["brain2", "truth", "deterministic"],
    },
    canonicalMessages[0],
    createStrictCurrentTruthContext(),
  );
  ok(!decision.eligible, "missing conversation identity should not promote Current Truth");
  equal(decision.ruleFamily, "invalid_source", "missing conversation identity should report invalid source");
}

{
  const canonicalMessages = toCanonicalTruthMessages(
    {
      provider: "claude",
      sourceLabel: "Claude export",
      sourceType: "history export",
      externalId: "non-monotonic",
      title: "Non-monotonic timestamp validation",
      messages: [
        {
          externalId: "m1",
          sequence: 0,
          role: "user",
          text: "We want Brain2 truth extraction to stay deterministic.",
          occurredAt: "2026-09-01T10:02:00.000Z",
        },
        {
          externalId: "m2",
          sequence: 1,
          role: "user",
          text: "We want Brain2 MRS to run automatically.",
          occurredAt: "2026-09-01T10:01:00.000Z",
        },
      ],
    },
    "conv-non-monotonic",
  );
  ok(canonicalMessages[0].sourceValid, "first monotonic source message should remain valid");
  ok(!canonicalMessages[1].sourceValid, "backward timestamp should invalidate strict source message");
  const decision = evaluateStrictCurrentTruthCandidate(
    {
      kind: "task",
      subject: "Brain2 MRS",
      canonicalSubject: "brain2 mrs",
      text: canonicalMessages[1].text,
      keywords: ["brain2", "mrs", "automatically"],
    },
    canonicalMessages[1],
    createStrictCurrentTruthContext(),
  );
  ok(!decision.eligible, "non-monotonic source message should not promote Current Truth");
  equal(decision.ruleFamily, "invalid_timestamp", "non-monotonic timestamp should report timestamp validation failure");
}

{
  const canonicalMessages = toCanonicalTruthMessages(
    {
      provider: "claude",
      sourceLabel: "Claude export",
      sourceType: "history export",
      externalId: "stable-qa",
      title: "Stable QA",
      messages: [
        {
          externalId: "m1",
          sequence: 0,
          role: "user",
          text: "Q: What are you using for local storage? A: ObjectBox",
          occurredAt: "2026-09-01T10:00:00.000Z",
        },
      ],
    },
    "conv-stable-qa",
  );
  const derived = deriveStrictCurrentTruthCandidates(canonicalMessages);
  const candidates = derived.get(canonicalMessages[0].messageKey) ?? [];
  equal(candidates.length, 1, "stable Q/A should derive one strict truth candidate");
  const decision = evaluateStrictCurrentTruthCandidate(candidates[0], canonicalMessages[0], createStrictCurrentTruthContext());
  ok(decision.eligible, "stable Q/A should pass strict truth gate");
  equal(decision.ruleFamily, "explicit_qa_selection", "stable Q/A should use explicit QA rule family");
}

{
  const canonicalMessages = toCanonicalTruthMessages(
    {
      provider: "gemini",
      sourceLabel: "Gemini export",
      sourceType: "history export",
      externalId: "volatile-qa",
      title: "Volatile QA",
      messages: [
        {
          externalId: "m1",
          sequence: 0,
          role: "user",
          text: "Q: Liquid glass style preference? A: Light glass, white frosted, soft shadows",
          occurredAt: "2026-09-01T10:00:00.000Z",
        },
      ],
    },
    "conv-volatile-qa",
  );
  const derived = deriveStrictCurrentTruthCandidates(canonicalMessages);
  equal((derived.get(canonicalMessages[0].messageKey) ?? []).length, 0, "volatile Q/A should not derive Current Truth candidates");
}

{
  const canonicalMessages = toCanonicalTruthMessages(
    {
      provider: "chatgpt",
      sourceLabel: "ChatGPT export",
      sourceType: "history export",
      externalId: "multiselect-qa",
      title: "Multi-select QA",
      messages: [
        {
          externalId: "m1",
          sequence: 0,
          role: "user",
          text: "Q: Which screens get voice input? (Select all that apply) A: Add Task sheet, Add List sheet, Global chat input",
          occurredAt: "2026-09-01T10:00:00.000Z",
        },
      ],
    },
    "conv-multiselect-qa",
  );
  const derived = deriveStrictCurrentTruthCandidates(canonicalMessages);
  const candidates = derived.get(canonicalMessages[0].messageKey) ?? [];
  equal(candidates.length, 3, "multi-select Q/A should split into property-level candidates");
  ok(candidates.some((item) => item.text.includes("Add Task sheet")), "multi-select Q/A should include Add Task sheet");
  ok(candidates.some((item) => item.text.includes("Add List sheet")), "multi-select Q/A should include Add List sheet");
  ok(candidates.some((item) => item.text.includes("Global chat input")), "multi-select Q/A should include Global chat input");
}

{
  const canonicalMessages = toCanonicalTruthMessages(
    {
      provider: "claude",
      sourceLabel: "Claude export",
      sourceType: "history export",
      externalId: "corrob-config",
      title: "Corroborated config",
      messages: [
        {
          externalId: "u1",
          sequence: 0,
          role: "user",
          text: "com.enyxd.autolist i have already replaced",
          occurredAt: "2026-09-01T10:00:00.000Z",
        },
        {
          externalId: "u2",
          sequence: 1,
          role: "user",
          text: "package com.enyxd.autolist",
          occurredAt: "2026-09-01T10:01:00.000Z",
        },
      ],
    },
    "conv-corrob-config",
  );
  const derived = deriveStrictCurrentTruthCandidates(canonicalMessages);
  const candidates = [...derived.values()].flat();
  equal(candidates.length, 1, "corroborated exact package identifier should derive one strict candidate");
  const decision = evaluateStrictCurrentTruthCandidate(candidates[0], canonicalMessages[0], createStrictCurrentTruthContext());
  ok(decision.eligible, "corroborated exact package identifier should pass strict truth gate");
  equal(decision.ruleFamily, "corroborated_exact_config", "corroborated config should use DVI config rule family");
}

{
  const canonicalMessages = toCanonicalTruthMessages(
    {
      provider: "chatgpt",
      sourceLabel: "ChatGPT export",
      sourceType: "history export",
      externalId: "tainted-config",
      title: "Tainted config",
      messages: [
        {
          externalId: "a1",
          sequence: 0,
          role: "assistant",
          text: "Maybe use com.example.newapp.",
          occurredAt: "2026-09-01T10:00:00.000Z",
        },
        {
          externalId: "u1",
          sequence: 1,
          role: "user",
          text: "I have replaced the package with com.example.newapp",
          occurredAt: "2026-09-01T10:01:00.000Z",
        },
        {
          externalId: "u2",
          sequence: 2,
          role: "user",
          text: "package com.example.newapp",
          occurredAt: "2026-09-01T10:02:00.000Z",
        },
      ],
    },
    "conv-tainted-config",
  );
  const derived = deriveStrictCurrentTruthCandidates(canonicalMessages);
  const candidates = [...derived.values()].flat();
  equal(candidates.length, 1, "tainted assistant-origin config should require later user artifact before deriving");
}

{
  const canonicalMessages = toCanonicalTruthMessages(
    {
      provider: "chatgpt",
      sourceLabel: "ChatGPT export",
      sourceType: "history export",
      externalId: "tainted-config-no-artifact",
      title: "Tainted config without later artifact",
      messages: [
        {
          externalId: "a1",
          sequence: 0,
          role: "assistant",
          text: "Maybe use com.example.newapp.",
          occurredAt: "2026-09-01T10:00:00.000Z",
        },
        {
          externalId: "u1",
          sequence: 1,
          role: "user",
          text: "I have replaced the package with com.example.newapp",
          occurredAt: "2026-09-01T10:01:00.000Z",
        },
      ],
    },
    "conv-tainted-config-no-artifact",
  );
  const derived = deriveStrictCurrentTruthCandidates(canonicalMessages);
  equal([...derived.values()].flat().length, 0, "tainted assistant-origin config without later artifact should abstain");
}

const junkFiltered = atomizeMessage(
  "Brain2 AI Runtime. Download local MRS. Going forward Brain2 runtime is Transformers.js WASM in this release.",
  "user",
);
ok(junkFiltered.length >= 1, "atomizer dropped all candidate content");
ok(
  junkFiltered.every((item) => !/download local mrs|brain2 ai runtime/i.test(item.text)),
  "UI/runtime chrome leaked into deterministic atoms",
);
ok(
  junkFiltered.some((item) => item.value?.includes("transformers.js wasm")),
  "structured assignment was not preserved after junk filtering",
);

const baseTruth = await reconcileAtomToTruth(
  atomFixture({
    id: "atom-base",
    messageId: "msg-base",
    text: "Brain2 runtime is WebLLM.",
    canonicalSubject: "brain2 runtime",
    subject: "Brain2 runtime",
    value: "webllm",
    keywords: ["brain2", "runtime", "webllm"],
    hash: "hash-base",
  }),
  "user",
  [],
);
const supersedingTruth = await reconcileAtomToTruth(
  atomFixture({
    id: "atom-next",
    messageId: "msg-next",
    text: "Going forward Brain2 runtime is Transformers.js WASM.",
    canonicalSubject: "brain2 runtime",
    subject: "Brain2 runtime",
    value: "transformers.js wasm",
    keywords: ["brain2", "runtime", "transformers"],
    hash: "hash-next",
  }),
  "user",
  baseTruth.writes,
);
equal(supersedingTruth.relation, "SUPERSEDES", "explicit runtime migration should supersede prior current truth");

const conflictingTruth = await reconcileAtomToTruth(
  atomFixture({
    id: "atom-conflict",
    messageId: "msg-conflict",
    text: "Brain2 runtime is ONNX q8.",
    canonicalSubject: "brain2 runtime",
    subject: "Brain2 runtime",
    value: "onnx q8",
    keywords: ["brain2", "runtime", "onnx"],
    hash: "hash-conflict",
  }),
  "user",
  baseTruth.writes,
);
equal(conflictingTruth.relation, "CONTRADICTS", "unqualified competing value should conflict rather than silently overwrite");

const scopedTruth = await reconcileAtomToTruth(
  atomFixture({
    id: "atom-scoped",
    messageId: "msg-scoped",
    text: "Brain2 runtime is WebLLM in Experiment Alpha.",
    canonicalSubject: "brain2 runtime",
    subject: "Brain2 runtime",
    value: "webllm",
    scope: "experiment alpha",
    keywords: ["brain2", "runtime", "webllm", "experiment"],
    hash: "hash-scoped",
  }),
  "user",
  baseTruth.writes,
);
equal(scopedTruth.relation, "DIFFERENT_SCOPE", "scoped truth should not overwrite the global current truth");

const refinedTruth = await reconcileAtomToTruth(
  atomFixture({
    id: "atom-refined",
    messageId: "msg-refined",
    text: "Brain2 runtime is Transformers.js WASM with q8 weights.",
    canonicalSubject: "brain2 runtime",
    subject: "Brain2 runtime",
    value: "transformers.js wasm with q8 weights",
    keywords: ["brain2", "runtime", "transformers", "weights"],
    hash: "hash-refined",
  }),
  "user",
  [
    truthFixture({
      id: "truth-ref-base",
      atomId: "atom-ref-base",
      text: "Brain2 runtime is Transformers.js WASM.",
      canonicalSubject: "brain2 runtime",
      value: "transformers.js wasm",
      evidenceAtomIds: ["atom-ref-base"],
    }),
  ],
);
ok(
  ["REFINES", "SUPERSEDES"].includes(refinedTruth.relation),
  "more specific same-direction runtime detail should refine/supersede instead of conflicting",
);

const requestTaskTruth = await reconcileAtomToTruth(
  atomFixture({
    id: "atom-request-task",
    messageId: "msg-request-task",
    kind: "task",
    text: "Please switch the runtime to Transformers.js WASM.",
    canonicalSubject: "runtime switch request",
    subject: "Runtime switch request",
    value: "transformers.js wasm",
    keywords: ["please", "switch", "runtime", "transformers"],
    hash: "hash-request-task",
  }),
  "user",
  [],
);
equal(
  requestTaskTruth.writes.length,
  0,
  "request-like task text should not be promoted into Current Truth records",
);

const uncertainTruth = await reconcileAtomToTruth(
  atomFixture({
    id: "atom-uncertain",
    messageId: "msg-uncertain",
    text: "Maybe the runtime should use ONNX in some cases.",
    canonicalSubject: "brain2 runtime",
    subject: "Brain2 runtime",
    value: "onnx in some cases",
    keywords: ["maybe", "runtime", "onnx", "cases"],
    hash: "hash-uncertain",
  }),
  "user",
  [
    truthFixture({
      id: "truth-current-runtime",
      atomId: "atom-current-runtime",
      text: "Brain2 runtime is Transformers.js WASM.",
      canonicalSubject: "brain2 runtime",
      value: "transformers.js wasm",
      evidenceAtomIds: ["atom-current-runtime"],
    }),
  ],
);
equal(
  uncertainTruth.relation,
  "UNCERTAIN",
  "ambiguous speculative updates should preserve contradiction uncertainty instead of forcing a hard conflict",
);

const runtimeProject = projectFixture();
const bitcoinProject = projectFixture({
  id: "proj-2",
  slug: "bitcoin-trading",
  name: "Bitcoin Trading",
  summary: "Trading work",
  tags: ["bitcoin", "trading", "signals"],
  aliases: ["BTC Trading"],
  entityTerms: ["bitcoin", "trading"],
  updatedAt: "2026-08-30T08:00:00.000Z",
});
const renamedRuntimeProject = projectFixture({
  id: "proj-3",
  slug: "brain2-runtime-ops",
  name: "Runtime Ops",
  summary: "Brain2 runtime responsiveness and model lane work",
  tags: ["brain2", "runtime", "responsiveness"],
  aliases: ["Brain2 Runtime", "Brain2 Runtime Ops"],
  entityTerms: ["brain2 runtime", "runtime ops", "transformers"],
  updatedAt: "2026-08-30T07:00:00.000Z",
});
const splitImportProject = projectFixture({
  id: "proj-4",
  slug: "archive-import",
  name: "Archive Import",
  summary: "Import pipeline and ingestion throughput",
  tags: ["archive", "import", "ingestion"],
  aliases: ["Import Pipeline"],
  entityTerms: ["archive import", "ingestion"],
  updatedAt: "2026-08-30T06:00:00.000Z",
});

const genericRuntimeConversation = fingerprintConversation({
  title: "New chat",
  messages: [
    { role: "user", text: "We switched Brain2 runtime to Transformers.js WASM and need import responsiveness fixed." },
    { role: "assistant", text: "Transformers.js WASM should stay the browser runtime path." },
  ],
});
equal(
  chooseProject(genericRuntimeConversation, [bitcoinProject, runtimeProject]).project?.id,
  runtimeProject.id,
  "generic runtime conversation should resolve to the runtime project from content evidence",
);

const weakGenericConversation = fingerprintConversation({
  title: "New chat",
  messages: [
    { role: "user", text: "hello there" },
    { role: "assistant", text: "how can I help?" },
  ],
});
ok(
  !chooseProject(weakGenericConversation, [bitcoinProject, runtimeProject]).project,
  "generic low-signal chat should not collapse into an unrelated existing project",
);

const assistantOnlyRuntimeConversation = fingerprintConversation({
  title: "New chat",
  messages: [
    { role: "assistant", text: "Brain2 Runtime Ops Transformers.js responsiveness import pipeline architecture." },
  ],
});
ok(
  !chooseProject(assistantOnlyRuntimeConversation, [bitcoinProject, renamedRuntimeProject, splitImportProject]).project,
  "assistant-only project hints should not merge a conversation into an existing project",
);

const vagueProjectUpdateConversation = fingerprintConversation({
  title: "Project update",
  messages: [
    { role: "user", text: "The page has some issues and needs better data." },
    { role: "assistant", text: "We can inspect project runtime or import details." },
  ],
});
ok(
  !chooseProject(vagueProjectUpdateConversation, [bitcoinProject, renamedRuntimeProject, splitImportProject]).project,
  "vague generic project words should not merge into a specific project",
);

const renamedConversation = fingerprintConversation({
  title: "Runtime responsiveness follow-up",
  messages: [
    { role: "user", text: "Brain2 Runtime Ops still needs Transformers.js responsiveness work." },
    { role: "assistant", text: "The renamed runtime project should keep the same lineage." },
  ],
});
equal(
  chooseProject(renamedConversation, [bitcoinProject, renamedRuntimeProject, splitImportProject]).project?.id,
  renamedRuntimeProject.id,
  "renamed project should still resolve from alias/entity continuity",
);

const exactAliasConversation = fingerprintConversation({
  title: "New chat",
  messages: [
    { role: "user", text: "Archive Import should keep ZIP restore evidence and ingestion throughput separate from runtime work." },
  ],
});
equal(
  chooseProject(exactAliasConversation, [renamedRuntimeProject, splitImportProject]).project?.id,
  splitImportProject.id,
  "exact project alias in human text should preserve project lineage",
);

const splitConversation = fingerprintConversation({
  title: "Import throughput regression",
  messages: [
    { role: "user", text: "The archive import pipeline is slowing ingestion throughput during ZIP restore." },
    { role: "assistant", text: "This should stay in the import pipeline project, not runtime ops." },
  ],
});
equal(
  chooseProject(splitConversation, [renamedRuntimeProject, splitImportProject]).project?.id,
  splitImportProject.id,
  "split project topics should resolve to the more specific ingestion/import project",
);

const intelligence = await buildDeterministicProjectIntelligence({
  project: runtimeProject,
  atoms: [
    atomFixture({
      id: "atom-truth",
      text: "Brain2 runtime is Transformers.js WASM.",
      canonicalSubject: "brain2 runtime",
      subject: "Brain2 runtime",
      value: "transformers.js wasm",
      keywords: ["brain2", "runtime", "transformers", "wasm"],
      hash: "hash-truth",
      truthStatus: "CURRENT",
    }),
    atomFixture({
      id: "atom-idea",
      kind: "idea",
      text: "Deterministic intelligence should stay cached-only on screen open to protect responsiveness.",
      canonicalSubject: "deterministic intelligence",
      subject: "Deterministic intelligence",
      value: undefined,
      polarity: "POSITIVE",
      keywords: ["deterministic", "cached", "screen", "responsiveness"],
      hash: "hash-idea",
      confidence: 0.88,
      truthStatus: "UNKNOWN",
    }),
    atomFixture({
      id: "atom-request",
      kind: "idea",
      text: "Please write a long article on browser performance.",
      canonicalSubject: "browser performance article",
      subject: "Browser performance article",
      value: undefined,
      keywords: ["please", "write", "article", "performance"],
      hash: "hash-request",
      confidence: 0.94,
      truthStatus: "UNKNOWN",
    }),
    atomFixture({
      id: "atom-ui-junk",
      kind: "fact",
      text: "Download local MRS",
      canonicalSubject: "download local mrs",
      subject: "Download local MRS",
      value: undefined,
      keywords: ["download", "local", "mrs"],
      hash: "hash-ui-junk",
      confidence: 0.9,
      truthStatus: "UNKNOWN",
    }),
    atomFixture({
      id: "atom-abandoned-idea",
      kind: "idea",
      text: "We should switch the browser runtime back to WebLLM immediately.",
      canonicalSubject: "browser runtime switch",
      subject: "Browser runtime switch",
      value: undefined,
      polarity: "POSITIVE",
      keywords: ["browser", "runtime", "switch", "webllm"],
      hash: "hash-abandoned-idea",
      confidence: 0.91,
      truthStatus: "SUPERSEDED",
    }),
    atomFixture({
      id: "atom-trivial-fact",
      kind: "fact",
      text: "Transformers.js version is 4.2.0.",
      canonicalSubject: "transformers.js version",
      subject: "Transformers.js version",
      value: "4.2.0",
      polarity: "POSITIVE",
      keywords: ["transformers", "version", "4.2.0"],
      hash: "hash-trivial-fact",
      confidence: 0.96,
      truthStatus: "CURRENT",
    }),
  ],
  truths: [
    truthFixture({
      id: "truth-runtime",
      atomId: "atom-truth",
      text: "Brain2 runtime is Transformers.js WASM.",
      canonicalSubject: "brain2 runtime",
      value: "transformers.js wasm",
      evidenceAtomIds: ["atom-truth"],
    }),
  ],
  decisions: [],
  patterns: [],
  experiments: [],
  ticks: [],
});

ok(
  intelligence.currentTruth.some((item) => /transformers\.js wasm/i.test(item.statement)),
  "deterministic intelligence missed the grounded current truth",
);
ok(
  intelligence.importantIdeas.some((item) => /cached-only on screen open/i.test(item.statement)),
  "grounded important idea was not promoted",
);
equal(
  intelligence.importantIdeas[0]?.statement,
  "Deterministic intelligence should stay cached-only on screen open to protect responsiveness.",
  "trivial facts should not outrank the more operationally important grounded idea",
);
ok(
  intelligence.importantIdeas.every((item) => !/please write a long article/i.test(item.statement)),
  "request-like junk leaked into important ideas",
);
ok(
  intelligence.currentTruth.every((item) => !/download local mrs/i.test(item.statement)),
  "UI junk leaked into current truth",
);
ok(
  intelligence.importantIdeas.every((item) => !/switch the browser runtime back to webllm/i.test(item.statement)),
  "superseded/abandoned idea leaked into important ideas",
);
equal(
  intelligence.connections.length,
  0,
  "deterministic intelligence should not invent connections without Pattern Lab evidence",
);

const weakPatternIntelligence = await buildDeterministicProjectIntelligence({
  project: runtimeProject,
  atoms: [
    atomFixture({
      id: "atom-connection-base",
      text: "Background derivations should stay off the immediate UI path.",
      canonicalSubject: "background derivations",
      subject: "Background derivations",
      value: undefined,
      keywords: ["background", "derivations", "ui", "path"],
      hash: "hash-connection-base",
      truthStatus: "CURRENT",
    }),
  ],
  truths: [],
  decisions: [],
  patterns: [
    {
      id: "pattern-weak",
      label: "ui path overlap",
      status: "CANDIDATE",
      strength: 0.08,
      projectIds: [runtimeProject.id],
      atomIds: ["atom-connection-base"],
      evidenceCount: 1,
      counterexamples: 0,
      updatedAt: "2026-08-30T09:00:00.000Z",
    },
  ],
  experiments: [],
  ticks: [],
});
equal(
  weakPatternIntelligence.connections.length,
  0,
  "very weak pattern signals should not be promoted as deterministic connections",
);

const partialSupersession = await reconcileAtomToTruth(
  atomFixture({
    id: "atom-partial",
    messageId: "msg-partial",
    text: "Going forward Brain2 runtime is Transformers.js WASM in the browser.",
    canonicalSubject: "brain2 runtime",
    subject: "Brain2 runtime",
    value: "transformers.js wasm in the browser",
    scope: "browser",
    keywords: ["brain2", "runtime", "transformers", "browser"],
    hash: "hash-partial",
  }),
  "user",
  [
    truthFixture({
      id: "truth-global-runtime",
      atomId: "atom-global-runtime",
      text: "Brain2 runtime is Transformers.js WASM.",
      canonicalSubject: "brain2 runtime",
      value: "transformers.js wasm",
      evidenceAtomIds: ["atom-global-runtime"],
    }),
  ],
);
ok(
  ["DIFFERENT_SCOPE", "REFINES", "SUPERSEDES"].includes(partialSupersession.relation),
  "scoped runtime refinement should stay lineage-safe instead of becoming a hard contradiction",
);

const contradictionLineage = await reconcileAtomToTruth(
  atomFixture({
    id: "atom-lineage",
    messageId: "msg-lineage",
    text: "Brain2 runtime is disabled.",
    canonicalSubject: "brain2 runtime",
    subject: "Brain2 runtime",
    value: "disabled",
    polarity: "NEGATIVE",
    keywords: ["brain2", "runtime", "disabled"],
    hash: "hash-lineage",
  }),
  "user",
  [
    truthFixture({
      id: "truth-lineage-current",
      atomId: "atom-lineage-current",
      text: "Brain2 runtime is enabled.",
      canonicalSubject: "brain2 runtime",
      value: "enabled",
      polarity: "POSITIVE",
      evidenceAtomIds: ["atom-lineage-current"],
    }),
  ],
);
equal(
  contradictionLineage.relation,
  "CONTRADICTS",
  "direct opposite runtime claims should remain explicit contradictions",
);
ok(
  contradictionLineage.writes.every((truth) => truth.relatedTruthIds?.length),
  "contradiction lineage should preserve related truth linkage for review",
);

const crossConversationBase = await reconcileAtomToTruth(
  atomFixture({
    id: "atom-cross-base",
    messageId: "msg-cross-base",
    conversationId: "conv-a",
    text: "Brain2 runtime is Transformers.js WASM.",
    canonicalSubject: "brain2 runtime",
    subject: "Brain2 runtime",
    value: "transformers.js wasm",
    keywords: ["brain2", "runtime", "transformers"],
    hash: "hash-cross-base",
  }),
  "user",
  [],
);
const crossConversationNext = await reconcileAtomToTruth(
  atomFixture({
    id: "atom-cross-next",
    messageId: "msg-cross-next",
    conversationId: "conv-b",
    text: "Going forward Brain2 runtime is Granite.",
    canonicalSubject: "brain2 runtime",
    subject: "Brain2 runtime",
    value: "granite",
    keywords: ["brain2", "runtime", "granite"],
    hash: "hash-cross-next",
  }),
  "user",
  crossConversationBase.writes,
);
equal(
  crossConversationNext.relation,
  "NEW",
  "truth reconciliation should not supersede across different conversations",
);

const qaOne = await reconcileAtomToTruth(
  atomFixture({
    id: "atom-qa-one",
    messageId: "msg-qa-one",
    conversationId: "conv-qa",
    kind: "decision",
    text: "What are you using for local storage? -> ObjectBox",
    canonicalSubject: "what are you using for local storage?",
    subject: "What are you using for local storage?",
    value: "ObjectBox",
    ruleTrace: ["strict_truth:explicit_qa_selection", "strict_truth:eligible"],
    keywords: ["local", "storage", "objectbox"],
    hash: "hash-qa-one",
  }),
  "user",
  [],
);
const qaTwo = await reconcileAtomToTruth(
  atomFixture({
    id: "atom-qa-two",
    messageId: "msg-qa-two",
    conversationId: "conv-qa",
    kind: "decision",
    text: "What is your ObjectBox version? -> ^5.1.0",
    canonicalSubject: "what is your objectbox version?",
    subject: "What is your ObjectBox version?",
    value: "^5.1.0",
    ruleTrace: ["strict_truth:explicit_qa_selection", "strict_truth:eligible"],
    keywords: ["objectbox", "version"],
    hash: "hash-qa-two",
  }),
  "user",
  qaOne.writes,
);
equal(
  qaTwo.relation,
  "NEW",
  "unrelated strict Q/A truths should not supersede each other",
);

const truthRootA = await buildCurrentTruthRoot([
  truthFixture({
    id: "truth-root-a",
    atomId: "atom-root-a",
    conversationId: "conv-root",
    text: "Do not change the Services header.",
    kind: "constraint",
    canonicalSubject: "services header",
    value: "do not change",
    polarity: "NEGATIVE",
    evidenceAtomIds: ["atom-root-a"],
    strictTruthRootKey: "explicit_negative_constraint:constraint:services header:do not change:NEGATIVE:",
  }),
]);
const truthRootB = await buildCurrentTruthRoot([
  truthFixture({
    id: "truth-root-different-id",
    atomId: "atom-root-different-id",
    conversationId: "conv-root",
    text: "Do not change the Services header.",
    kind: "constraint",
    canonicalSubject: "services header",
    value: "do not change",
    polarity: "NEGATIVE",
    evidenceAtomIds: ["different-evidence"],
    strictTruthRootKey: "explicit_negative_constraint:constraint:services header:do not change:NEGATIVE:",
  }),
]);
equal(
  truthRootA,
  truthRootB,
  "Current Truth root should ignore truth IDs, atom IDs, and evidence-only replay",
);

const evidenceRootA = await buildSourceEvidenceRoot([
  {
    id: "msg-root-a",
    conversationId: "conv-root",
    sourceId: "src-root",
    provider: "claude",
    externalId: "m1",
    role: "user",
    text: "Do not change the Services header.",
    occurredAt: "2026-09-01T10:00:00.000Z",
    hash: "hash-message-a",
    wordCount: 6,
  },
]);
const evidenceRootB = await buildSourceEvidenceRoot([
  {
    id: "msg-root-b",
    conversationId: "conv-root",
    sourceId: "src-root",
    provider: "claude",
    externalId: "m2",
    role: "user",
    text: "Do not change the Services header.",
    occurredAt: "2026-09-01T10:00:00.000Z",
    hash: "hash-message-b",
    wordCount: 6,
  },
]);
ok(
  evidenceRootA !== evidenceRootB,
  "Source evidence root should change when message provenance changes",
);

const noisyPatterns = await buildPatterns(
  [
    ...Array.from({ length: 6 }, (_, index) =>
      atomFixture({
        id: `noise-assistant-${index}`,
        kind: "idea",
        text: "That said, this underlying idea is legitimate and worth taking seriously.",
        canonicalSubject: "underlying idea",
        subject: "Underlying idea",
        keywords: ["underlying", "idea", "legitimate"],
        confidence: 0.94,
        projectId: `project-${index % 2}`,
        truthStatus: "UNKNOWN",
        ruleTrace: ["strict_truth:assistant_or_unknown_author", "strict_truth:residual"],
      }),
    ),
    ...Array.from({ length: 5 }, (_, index) =>
      atomFixture({
        id: `noise-treated-${index}`,
        kind: "constraint",
        text: "Constraint: Adversarial against concrete design least must must be treated as 3.",
        canonicalSubject: "adversarial concrete design",
        subject: "Adversarial concrete design",
        keywords: ["adversarial", "concrete", "design"],
        confidence: 0.91,
        projectId: "single-project",
      }),
    ),
    ...Array.from({ length: 5 }, (_, index) =>
      atomFixture({
        id: `noise-code-${index}`,
        kind: "fact",
        text: "import { motion } from \"framer-motion\"",
        canonicalSubject: "motion import",
        subject: "Motion import",
        keywords: ["motion", "import"],
        confidence: 0.9,
        projectId: "single-project",
      }),
    ),
    ...Array.from({ length: 6 }, (_, index) =>
      atomFixture({
        id: `noise-one-term-${index}`,
        kind: "fact",
        text: "Runtime keeps changing during reload.",
        canonicalSubject: "runtime",
        subject: "Runtime",
        value: undefined,
        keywords: ["runtime"],
        confidence: 0.9,
        projectId: `project-${index % 2}`,
      }),
    ),
    ...Array.from({ length: 6 }, (_, index) =>
      atomFixture({
        id: `noise-weak-two-term-${index}`,
        kind: "idea",
        text: "Model cache seems interesting.",
        canonicalSubject: "model cache",
        subject: "Model cache",
        value: undefined,
        keywords: ["model", "cache"],
        confidence: 0.9,
        projectId: `project-${index % 2}`,
        truthStatus: "UNKNOWN",
      }),
    ),
  ],
  [],
);
equal(noisyPatterns.length, 0, "pattern engine should not build patterns from assistant/code/malformed/weak-term atom noise");

const cleanPatterns = await buildPatterns(
  Array.from({ length: 8 }, (_, index) =>
    atomFixture({
      id: `clean-pattern-${index}`,
      kind: "decision",
      text: "Browser runtime should keep deterministic work off the immediate UI path.",
      canonicalSubject: "browser runtime deterministic work",
      subject: "Browser runtime deterministic work",
      keywords: ["browser", "runtime", "deterministic", "ui"],
      confidence: 0.9,
      projectId: `project-${index % 2}`,
      truthStatus: "CURRENT",
      ruleTrace: ["strict_truth:bounded_project_requirement", "strict_truth:eligible"],
      relationSafe: true,
    }),
  ),
  [],
);
ok(cleanPatterns.some((pattern) => /browser runtime deterministic work/i.test(pattern.label)), "pattern engine missed clean repeated project/runtime evidence");

const strongTwoTermPattern = await buildPatterns(
  Array.from({ length: 6 }, (_, index) =>
    atomFixture({
      id: `strong-two-term-${index}`,
      kind: "constraint",
      text: "Model cache must persist for the whole browser session.",
      canonicalSubject: "model cache",
      subject: "Model cache",
      value: "persist for browser session",
      keywords: ["model", "cache", "session"],
      confidence: 0.9,
      projectId: `project-${index % 2}`,
      truthStatus: "CURRENT",
      ruleTrace: ["strict_truth:bounded_project_requirement", "strict_truth:eligible"],
    }),
  ),
  [],
);
ok(strongTwoTermPattern.some((pattern) => /model cache/i.test(pattern.label)), "pattern engine should allow strong structured two-term subjects");

console.log("V9 deterministic quality regressions PASS");
fs.rmSync(srcOut, { recursive: true, force: true });
fs.rmSync(out, { recursive: true, force: true });
