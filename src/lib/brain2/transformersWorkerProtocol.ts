"use client";

export type Brain2WorkerProposal = {
  candidateId: string;
  importance?: number;
  novelty?: number;
  classification?: string;
  rationale?: string;
  evidenceIds?: string[];
};

export type Brain2WorkerResidualEvidence = {
  id: string;
  type: string;
  text: string;
  score: number;
  truthStatus?: string;
};

export type Brain2WorkerResidualResult = {
  answer: string;
  evidenceIds: string[];
  confidence: number;
  residuals: string[];
  terminationReason: string;
};

export type Brain2WorkerSnapshot = {
  state?: "UNINITIALIZED" | "CHECKING" | "LOADING" | "READY" | "ERROR";
  mrsState?: "INACTIVE" | "ACTIVATING" | "ACTIVE" | "SELF_TESTING" | "ERROR";
  progress?: number;
  text?: string;
  detail?: string;
  error?: string;
  backend?: "wasm";
  dtype?: string;
  cacheState?: "UNKNOWN" | "CHECKING_CACHE" | "INITIALIZING_CACHE" | "DOWNLOADING" | "READY_CACHED" | "READY_FRESH";
};

export type Brain2TransformersWorkerRequest =
  | { type: "preload"; requestId: string; runSelfTest: boolean; reason: "manual" | "residual" | "semantic-review" | "auto-cache" }
  | { type: "self-test"; requestId: string }
  | {
      type: "review";
      requestId: string;
      input: {
        project: { id: string; name: string };
        candidates: Array<{
          id: string;
          kind: string;
          statement: string;
          evidenceIds: string[];
          importance: number;
          novelty: number;
          truthConfidence: number;
        }>;
      };
    }
  | { type: "hard-residual"; requestId: string; input: { task: string; context: string; maxTokens?: number } }
  | {
      type: "residual";
      requestId: string;
      input: {
        task: string;
        context: string;
        evidence: Brain2WorkerResidualEvidence[];
        maxTokens?: number;
      };
    };

export type Brain2TransformersWorkerRequestPayload =
  | Omit<Extract<Brain2TransformersWorkerRequest, { type: "preload" }>, "requestId">
  | Omit<Extract<Brain2TransformersWorkerRequest, { type: "self-test" }>, "requestId">
  | Omit<Extract<Brain2TransformersWorkerRequest, { type: "review" }>, "requestId">
  | Omit<Extract<Brain2TransformersWorkerRequest, { type: "hard-residual" }>, "requestId">
  | Omit<Extract<Brain2TransformersWorkerRequest, { type: "residual" }>, "requestId">;

export type Brain2TransformersWorkerEvent =
  | { type: "snapshot"; snapshot: Brain2WorkerSnapshot }
  | { type: "log"; level: "info" | "error"; event: string; detail?: Record<string, unknown> }
  | { type: "result"; requestId: string; payload: unknown }
  | { type: "error"; requestId: string; error: string };
