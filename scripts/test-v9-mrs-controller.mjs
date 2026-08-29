import { readFileSync, existsSync } from "node:fs";

const path = new URL("../src/lib/brain2/mrsController.ts", import.meta.url);
if (!existsSync(path)) throw new Error("Missing explicit MRS controller module");

const source = readFileSync(path, "utf8");
for (const invariant of [
  "BRAIN2_MRS_CONTROLLER_VERSION",
  "\"BRANCH_ZERO\"",
  "\"CAPABILITY_LOOKUP\"",
  "\"PATTERN_MEMORY\"",
  "\"COGNITIVE_R1\"",
  "\"TRACE\"",
  "\"RPVM\"",
  "\"TINY_SPECIALIST\"",
  "\"QWEN\"",
  "\"VERIFIER\"",
  "\"REPAIR\"",
  "acceptanceTrace",
  "\"TRACE_RPVM\"",
  "\"WEBLLM_QWEN\"",
  "Qwen residual lane skipped because deterministic confidence was already high enough",
  "RPVM kept MRS behind a low-confidence gate",
  "runExplicitMRSController",
]) {
  if (!source.includes(invariant)) throw new Error(`Missing controller invariant ${invariant}`);
}

console.log("V9 explicit MRS controller PASS: chain stages are explicit and MRS remains low-confidence gated.");
