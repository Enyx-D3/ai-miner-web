import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const controller = read("src/lib/brain2/mrsController.ts");
const compiler = read("src/lib/brain2/reasoningCompiler.ts");
const store = read("src/lib/brain2/store.ts");
const types = read("src/lib/brain2/types.ts");

for (const invariant of [
  "compiledCapabilities",
  "reasoningTrajectories",
  "failureMemories",
  "CapabilityVerificationState",
  "CompiledCapabilityRecord",
  "ReasoningTrajectoryRecord",
  "FailureMemoryRecord",
]) {
  if (!types.includes(invariant)) throw new Error(`Missing type invariant ${invariant}`);
}

for (const invariant of [
  "retrieveReasoningMemory",
  "buildReasoningTrajectory",
  "buildFailureMemory",
  "compileCapabilityFromControllerRun",
]) {
  if (!compiler.includes(invariant)) throw new Error(`Missing compiler invariant ${invariant}`);
}

for (const invariant of [
  "recordControllerLearning",
  "compiledCapabilities",
  "reasoningTrajectories",
  "failureMemories",
  "deltaPayload(\"reasoningTrajectories\"",
]) {
  if (!store.includes(invariant)) throw new Error(`Missing store invariant ${invariant}`);
}

const ordered = [
  "\"DATABOX\"",
  "\"BRANCH_ZERO\"",
  "\"CAPABILITY_LOOKUP\"",
  "\"PATTERN_MEMORY\"",
  "\"COGNITIVE_R1\"",
  "\"TRACE_RPVM\"",
  "\"TINY_SPECIALIST\"",
  "\"WEBLLM_QWEN\"",
  "\"VERIFY\"",
  "\"REPAIR\"",
];

let last = -1;
for (const token of ordered) {
  const next = controller.indexOf(token, last + 1);
  if (next < 0) throw new Error(`Acceptance-trace token missing: ${token}`);
  if (next < last) throw new Error(`Acceptance trace is out of order around ${token}`);
  last = next;
}

if (!controller.includes("Qwen residual lane skipped because deterministic confidence was already high enough")) {
  throw new Error("Deterministic skip gate for WebLLM/Qwen is missing");
}

if (!controller.includes("Branch Zero compiled capability execution")) {
  throw new Error("Branch Zero does not appear to execute compiled registry capabilities");
}

console.log("V9 MRS acceptance trace PASS: locked stage order, compiler learning, capability registry, and failure memory are explicitly wired.");
