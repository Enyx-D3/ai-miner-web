"use client";

export type RuntimeExecutionEvidence = {
  format: "B2_RUNTIME_EVIDENCE";
  version: 1;
  runtimeJobId: string;
  projectId: string;
  capability: string;
  hypothesisId?: string;
  hypothesis?: string;
  observedStatement: string;
  evidenceIds: string[];
  executionResult: {
    format: "B2_EXECUTION_RESULT";
    version: 1;
    jobId: string;
    state: "COMPLETED";
    startedAt?: string;
    finishedAt?: string;
    inputHashes: string[];
    outputHashes: string[];
    outputs?: unknown[];
    measurements?: unknown[];
    verifierResult: { verdict: "PASS"; authorization?: string; [key: string]: unknown };
    [key: string]: unknown;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function parseRuntimeExecutionEvidence(value: unknown): RuntimeExecutionEvidence | null {
  if (!isRecord(value)) return null;
  const runtime = value.runtimeExecution;
  if (runtime === undefined) return null;
  if (!isRecord(runtime)) throw new Error("runtimeExecution must be an object.");
  if (runtime.format !== "B2_RUNTIME_EVIDENCE" || runtime.version !== 1) throw new Error("Unsupported runtime execution evidence envelope.");
  for (const field of ["runtimeJobId", "projectId", "capability", "observedStatement"] as const) {
    if (typeof runtime[field] !== "string" || !runtime[field]) throw new Error(`runtimeExecution.${field} is required.`);
  }
  if (!stringArray(runtime.evidenceIds) || runtime.evidenceIds.length === 0) throw new Error("runtimeExecution requires bounded B2JOB evidence IDs.");
  if (!isRecord(runtime.executionResult)) throw new Error("runtimeExecution.executionResult is required.");
  const execution = runtime.executionResult;
  if (execution.format !== "B2_EXECUTION_RESULT" || execution.version !== 1) throw new Error("Unsupported Brain2 execution result.");
  if (execution.jobId !== runtime.runtimeJobId) throw new Error("Runtime job identity mismatch.");
  if (execution.state !== "COMPLETED") throw new Error("Only completed runtime executions can become evidence.");
  if (!isRecord(execution.verifierResult) || execution.verifierResult.verdict !== "PASS") throw new Error("Runtime verifier must PASS before canonical evidence commit.");
  if (!stringArray(execution.inputHashes) || !stringArray(execution.outputHashes)) throw new Error("Runtime execution hashes are required.");
  const resultEvidence = stringArray(value.evidenceIds) ? new Set(value.evidenceIds) : new Set<string>();
  for (const evidenceId of runtime.evidenceIds) {
    if (!resultEvidence.has(evidenceId)) throw new Error("Runtime evidence IDs must be a subset of the B2RESULT evidence IDs.");
  }
  return runtime as RuntimeExecutionEvidence;
}
