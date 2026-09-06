'use client';

import { runBrain2ForegroundTask } from "./foregroundTaskGate";
import { brain2MRSError, brain2MRSLog } from "./mrsDebug";
import type {
  Brain2TransformersWorkerEvent,
  Brain2TransformersWorkerRequest,
  Brain2TransformersWorkerRequestPayload,
  Brain2WorkerProposal,
  Brain2WorkerResidualResult,
  Brain2WorkerSnapshot,
} from "./transformersWorkerProtocol";

export const BRAIN2_TRANSFORMERS_MODEL_ID = "onnx-community/granite-4.0-350m-ONNX-web";
export const BRAIN2_TRANSFORMERS_MODEL_FAMILY = "Granite 4.0 350M ONNX Web";
export const BRAIN2_TRANSFORMERS_WASM_DTYPE = "q4f16";
export const BRAIN2_TRANSFORMERS_CONTEXT_WINDOW = 4096;
export const BRAIN2_WASM_INPUT_TOKEN_BUDGET = 1024;
export const BRAIN2_WASM_EMERGENCY_TOKEN_BUDGET = 512;
export const BRAIN2_WASM_MAX_NEW_TOKENS = 192;
export const BRAIN2_MRS_REVIEW_CANDIDATE_LIMIT = 1;
export const BRAIN2_MRS_SELF_TEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const BRAIN2_MRS_SESSION_RESIDUAL_LIMIT = 4;
export const BRAIN2_MRS_MEMORY_PRESSURE_COOLDOWN_MS = 2 * 60 * 1000;

export type Brain2TransformersState = "UNINITIALIZED" | "CHECKING" | "LOADING" | "READY" | "ERROR";
export type Brain2MRSState = "INACTIVE" | "ACTIVATING" | "ACTIVE" | "SELF_TESTING" | "ERROR";
export type Brain2TransformersBackend = "wasm";
export type Brain2TransformersSnapshot = {
  state: Brain2TransformersState;
  mrsState: Brain2MRSState;
  progress: number;
  text: string;
  detail?: string;
  error?: string;
  modelId: string;
  backend?: Brain2TransformersBackend;
  dtype?: string;
  activationMode?: "MANUAL" | "AUTO_ON_DEMAND";
  cacheState?: "UNKNOWN" | "CHECKING_CACHE" | "INITIALIZING_CACHE" | "DOWNLOADING" | "READY_CACHED" | "READY_FRESH";
  lastReadyAt?: string;
  lastSelfTest?: { ok: boolean; text: string; at: string };
  budget?: {
    residualCalls: number;
    residualLimit: number;
    coolingDownUntil?: string;
  };
};

type Proposal = Brain2WorkerProposal;
type RuntimeMeta = {
  modelId: string;
  dtype: string;
  backend: Brain2TransformersBackend;
  lastReadyAt?: string;
  lastSelfTest?: { ok: boolean; text: string; at: string };
};
type ResidualBudget = { residualCalls: number; residualLimit: number; coolingDownUntil?: string };
type LoadOptions = { reason?: "manual" | "residual" | "semantic-review" | "auto-cache"; forceSelfTest?: boolean };
export type Brain2ResidualReasonerOutput = Brain2WorkerResidualResult;
export type Brain2RuntimeAvailabilityHint = {
  hasCachedRuntime: boolean;
  hasRecentSelfTest: boolean;
  lastReadyAt?: string;
  lastSelfTestAt?: string;
};
type WorkerEndpoint = {
  kind: "shared" | "dedicated";
  postMessage(message: Brain2TransformersWorkerRequest): void;
  onMessage(listener: (event: MessageEvent<Brain2TransformersWorkerEvent>) => void): void;
  onError(listener: (event: ErrorEvent) => void): void;
  destroy(): void;
};

const META_KEY = "brain2-transformers-runtime-meta-v1";
const BUDGET_KEY = "brain2-transformers-session-budget-v1";

let workerInstance: WorkerEndpoint | null = null;
let workerPromise: Promise<WorkerEndpoint> | null = null;
let runtimeWarmPromise: Promise<unknown> | null = null;
let workerRequestSequence = 0;
const workerRequests = new Map<
  string,
  {
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
    request: Brain2TransformersWorkerRequest;
    startedAt: number;
    slowTimer?: number;
  }
>();
let sharedWorkerUnavailable = false;

let snapshot: Brain2TransformersSnapshot = {
  state: "UNINITIALIZED",
  mrsState: "INACTIVE",
  progress: 0,
  text: "AI runtime waiting to initialize",
  modelId: BRAIN2_TRANSFORMERS_MODEL_ID,
  activationMode: "MANUAL",
  cacheState: "UNKNOWN",
  budget: { residualCalls: 0, residualLimit: BRAIN2_MRS_SESSION_RESIDUAL_LIMIT },
};

const listeners = new Set<(value: Brain2TransformersSnapshot) => void>();

function publish(next: Partial<Brain2TransformersSnapshot>) {
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener(snapshot);
}

function publishWorkerSnapshot(next: Brain2WorkerSnapshot) {
  publish({
    ...next,
    budget: loadResidualBudget(),
  });
}

export function getBrain2TransformersSnapshot() {
  return snapshot;
}

export function subscribeBrain2Transformers(listener: (value: Brain2TransformersSnapshot) => void) {
  listeners.add(listener);
  listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
}

export function isBrain2MRSReady(snapshotLike: Brain2TransformersSnapshot = snapshot) {
  return snapshotLike.state === "READY" && snapshotLike.mrsState === "ACTIVE";
}

function safeWindow() {
  return typeof window !== "undefined" ? window : undefined;
}

function loadRuntimeMeta(): RuntimeMeta | undefined {
  const win = safeWindow();
  if (!win) return undefined;
  try {
    const raw = win.localStorage.getItem(META_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as RuntimeMeta;
    return parsed?.modelId === BRAIN2_TRANSFORMERS_MODEL_ID ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function saveRuntimeMeta(meta: RuntimeMeta) {
  const win = safeWindow();
  if (!win) return;
  try {
    win.localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Best-effort only.
  }
}

function loadResidualBudget(): ResidualBudget {
  const win = safeWindow();
  if (!win) return { residualCalls: 0, residualLimit: BRAIN2_MRS_SESSION_RESIDUAL_LIMIT };
  try {
    const raw = win.sessionStorage.getItem(BUDGET_KEY);
    if (!raw) return { residualCalls: 0, residualLimit: BRAIN2_MRS_SESSION_RESIDUAL_LIMIT };
    const parsed = JSON.parse(raw) as Partial<ResidualBudget>;
    return {
      residualCalls: Math.max(0, Number(parsed.residualCalls ?? 0) || 0),
      residualLimit: BRAIN2_MRS_SESSION_RESIDUAL_LIMIT,
      coolingDownUntil: typeof parsed.coolingDownUntil === "string" ? parsed.coolingDownUntil : undefined,
    };
  } catch {
    return { residualCalls: 0, residualLimit: BRAIN2_MRS_SESSION_RESIDUAL_LIMIT };
  }
}

function saveResidualBudget(budget: ResidualBudget) {
  const win = safeWindow();
  if (!win) return;
  try {
    win.sessionStorage.setItem(BUDGET_KEY, JSON.stringify(budget));
  } catch {
    // Best-effort only.
  }
}

function syncBudgetSnapshot(partial?: Partial<ResidualBudget>) {
  const next = {
    ...loadResidualBudget(),
    ...partial,
    residualLimit: BRAIN2_MRS_SESSION_RESIDUAL_LIMIT,
  };
  saveResidualBudget(next);
  publish({ budget: next });
  return next;
}

function shouldReuseSelfTest(meta?: RuntimeMeta) {
  if (!meta?.lastSelfTest?.ok || !meta.lastSelfTest.at) return false;
  const age = Date.now() - Date.parse(meta.lastSelfTest.at);
  return Number.isFinite(age) && age >= 0 && age <= BRAIN2_MRS_SELF_TEST_TTL_MS;
}

function nowIso() {
  return new Date().toISOString();
}

function noteReady(meta?: RuntimeMeta, detail?: string) {
  const next: RuntimeMeta = {
    modelId: BRAIN2_TRANSFORMERS_MODEL_ID,
    dtype: BRAIN2_TRANSFORMERS_WASM_DTYPE,
    backend: "wasm",
    lastReadyAt: nowIso(),
    lastSelfTest: meta?.lastSelfTest,
  };
  saveRuntimeMeta(next);
  publish({
    state: "READY",
    mrsState: meta?.lastSelfTest?.ok ? "ACTIVE" : "INACTIVE",
    text: meta?.lastSelfTest?.ok ? "Cached AI model ready" : "AI model initialized",
    detail:
      detail ??
      (meta?.lastSelfTest?.ok
        ? "Cached Granite runtime restored without rerunning the self-test."
        : "Worker-backed browser MRS initialized and waiting for an explicit self-test or residual task."),
    backend: "wasm",
    dtype: BRAIN2_TRANSFORMERS_WASM_DTYPE,
    cacheState: meta?.lastSelfTest?.ok ? "READY_CACHED" : "READY_FRESH",
    lastReadyAt: next.lastReadyAt,
    lastSelfTest: meta?.lastSelfTest,
    budget: loadResidualBudget(),
    error: undefined,
    progress: 1,
  });
}

function noteInferenceSuccess(detail?: string) {
  const existing = loadRuntimeMeta();
  const inferredSelfTest = existing?.lastSelfTest?.ok
    ? existing.lastSelfTest
    : { ok: true, text: "Browser worker inference completed.", at: nowIso() };
  saveRuntimeMeta({
    modelId: BRAIN2_TRANSFORMERS_MODEL_ID,
    dtype: BRAIN2_TRANSFORMERS_WASM_DTYPE,
    backend: "wasm",
    lastReadyAt: nowIso(),
    lastSelfTest: inferredSelfTest,
  });
  publish({
    state: "READY",
    mrsState: "ACTIVE",
    backend: "wasm",
    dtype: BRAIN2_TRANSFORMERS_WASM_DTYPE,
    cacheState: "READY_FRESH",
    lastReadyAt: nowIso(),
    lastSelfTest: inferredSelfTest,
    detail: detail ?? "Browser-worker MRS inference completed successfully.",
    error: undefined,
    progress: 1,
    budget: loadResidualBudget(),
  });
}

function destroyWorker(error?: unknown) {
  brain2MRSLog("worker.destroy", { reason: error instanceof Error ? error.message : String(error ?? "manual") });
  if (workerInstance) {
    workerInstance.destroy();
    workerInstance = null;
  }
  workerPromise = null;
  runtimeWarmPromise = null;
  const reason = error instanceof Error ? error : new Error(String(error ?? "Brain2 worker was reset."));
  for (const request of workerRequests.values()) request.reject(reason);
  workerRequests.clear();
}

function createWorkerEndpoint(forceDedicated = false): WorkerEndpoint {
  if (!forceDedicated && !sharedWorkerUnavailable && typeof SharedWorker !== "undefined") {
    const worker = new SharedWorker(new URL("../../workers/brain2Transformers.worker.ts", import.meta.url), {
      type: "module",
      name: "brain2-transformers-runtime",
    });
    worker.port.start();
    return {
      kind: "shared",
      postMessage: (message) => worker.port.postMessage(message),
      onMessage: (listener) => worker.port.addEventListener("message", listener as EventListener),
      onError: (listener) => worker.addEventListener("error", listener),
      destroy: () => worker.port.close(),
    };
  }
  const worker = new Worker(new URL("../../workers/brain2Transformers.worker.ts", import.meta.url), { type: "module" });
  return {
    kind: "dedicated",
    postMessage: (message) => worker.postMessage(message),
    onMessage: (listener) => worker.addEventListener("message", listener as EventListener),
    onError: (listener) => worker.addEventListener("error", listener),
    destroy: () => worker.terminate(),
  };
}

async function replayPendingRequestsOnDedicatedWorker(failedWorker: WorkerEndpoint, error: unknown) {
  if (failedWorker.kind !== "shared" || workerInstance !== failedWorker) return false;
  sharedWorkerUnavailable = true;
  brain2MRSLog("worker.fallback-dedicated", {
    reason: error instanceof Error ? error.message : String(error || "SharedWorker failed"),
    pendingRequests: workerRequests.size,
  });
  failedWorker.destroy();
  workerInstance = null;
  workerPromise = null;
  const worker = createWorkerEndpoint(true);
  workerInstance = worker;
  brain2MRSLog("worker.created", { kind: worker.kind, fallback: true });
  attachWorkerHandlers(worker);
  for (const request of workerRequests.values()) worker.postMessage(request.request);
  return true;
}

async function getWorker(): Promise<WorkerEndpoint> {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    throw new Error("Browser workers are unavailable in this environment.");
  }
  if (workerInstance) return workerInstance;
  if (workerPromise) return workerPromise;
  workerPromise = Promise.resolve(
    createWorkerEndpoint(),
  )
    .then((worker) => {
      workerInstance = worker;
      workerPromise = null;
      brain2MRSLog("worker.created", { kind: worker.kind });
      attachWorkerHandlers(worker);
      return worker;
    })
    .catch((error) => {
      workerPromise = null;
      throw error;
    });
  return workerPromise;
}

function attachWorkerHandlers(worker: WorkerEndpoint) {
  worker.onMessage((event: MessageEvent<Brain2TransformersWorkerEvent>) => {
        const data = event.data;
        if (data.type === "snapshot") {
          brain2MRSLog("worker.snapshot", {
            state: data.snapshot.state,
            mrsState: data.snapshot.mrsState,
            progress: data.snapshot.progress,
            text: data.snapshot.text,
          });
          publishWorkerSnapshot(data.snapshot);
          return;
        }
        if (data.type === "log") {
          if (data.level === "error") brain2MRSError(data.event, data.detail);
          else brain2MRSLog(data.event, data.detail);
          return;
        }
        const request = workerRequests.get(data.requestId);
        if (!request) return;
        workerRequests.delete(data.requestId);
        if (request.slowTimer) window.clearTimeout(request.slowTimer);
        if (data.type === "result") {
          brain2MRSLog("worker.done", {
            requestId: data.requestId,
            durationMs: Math.round(performance.now() - request.startedAt),
          });
          request.resolve(data.payload);
          return;
        }
        brain2MRSError("worker.error-result", { requestId: data.requestId, error: data.error });
        request.reject(new Error(data.error));
      });
      worker.onError((event) => {
        const error = event.error ?? event.message;
        void replayPendingRequestsOnDedicatedWorker(worker, error).then((replayed) => {
          if (replayed) return;
        brain2MRSError("worker.error", {
          error: event.error instanceof Error ? event.error.message : event.message,
        });
        publish({
          state: "ERROR",
          mrsState: "ERROR",
          text: "AI model worker failed",
          detail: "The browser MRS worker crashed or could not be initialized.",
          error: event.error instanceof Error ? event.error.message : event.message,
          budget: loadResidualBudget(),
        });
          destroyWorker(error);
        });
      });
}

async function callWorker<T>(request: Brain2TransformersWorkerRequestPayload): Promise<T> {
  const worker = await getWorker();
  const requestId = `mrs_${++workerRequestSequence}_${Date.now()}`;
  const workerRequest = { ...request, requestId } as Brain2TransformersWorkerRequest;
  brain2MRSLog("worker.request", { requestId, type: request.type });
  return new Promise<T>((resolve, reject) => {
    const startedAt = performance.now();
    const slowTimer = window.setInterval(() => {
      brain2MRSLog("worker.still-running", {
        requestId,
        type: request.type,
        seconds: Math.round((performance.now() - startedAt) / 1000),
      });
    }, 15000);
    workerRequests.set(requestId, { resolve: resolve as (value: unknown) => void, reject, request: workerRequest, startedAt, slowTimer });
    worker.postMessage(workerRequest);
  });
}

export function getBrain2RuntimeAvailabilityHint(): Brain2RuntimeAvailabilityHint {
  const meta = loadRuntimeMeta();
  return {
    hasCachedRuntime: Boolean(meta?.lastReadyAt),
    hasRecentSelfTest: shouldReuseSelfTest(meta),
    lastReadyAt: meta?.lastReadyAt,
    lastSelfTestAt: meta?.lastSelfTest?.at,
  };
}

async function ensureBrowserRuntime(options: LoadOptions = {}) {
  if (runtimeWarmPromise) {
    brain2MRSLog("runtime.ensure.reuse-pending", { reason: options.reason ?? "manual" });
    return runtimeWarmPromise;
  }
  const meta = loadRuntimeMeta();
  const activationMode = options.reason === "manual" ? "MANUAL" : "AUTO_ON_DEMAND";
  brain2MRSLog("runtime.ensure.start", {
    reason: options.reason ?? "manual",
    forceSelfTest: Boolean(options.forceSelfTest),
    hasCachedRuntime: Boolean(meta?.lastReadyAt),
    hasRecentSelfTest: shouldReuseSelfTest(meta),
  });
  publish({
    state: "CHECKING",
    mrsState: "ACTIVATING",
    progress: 0,
    text: "Checking cached AI model…",
    detail: "Preparing the worker-backed Transformers.js / WASM browser runtime.",
    activationMode,
    backend: "wasm",
    dtype: BRAIN2_TRANSFORMERS_WASM_DTYPE,
    cacheState: "CHECKING_CACHE",
    error: undefined,
    budget: loadResidualBudget(),
  });
  runtimeWarmPromise = runBrain2ForegroundTask("MODEL_INIT", async () => {
    const result = await callWorker<{ ok: boolean; text: string; at: string }>({
      type: "preload",
      reason: options.reason ?? "manual",
      runSelfTest: options.forceSelfTest || !shouldReuseSelfTest(meta),
    });
    const readyAt = nowIso();
    if (options.forceSelfTest || !shouldReuseSelfTest(meta)) {
      const testedMeta: RuntimeMeta = {
        modelId: BRAIN2_TRANSFORMERS_MODEL_ID,
        dtype: BRAIN2_TRANSFORMERS_WASM_DTYPE,
        backend: "wasm",
        lastReadyAt: readyAt,
        lastSelfTest: { ok: result.ok, text: result.text, at: result.at },
      };
      saveRuntimeMeta(testedMeta);
      brain2MRSLog("runtime.ensure.ready", {
        selfTestOk: result.ok,
        cacheState: meta?.lastReadyAt ? "READY_CACHED" : "READY_FRESH",
        text: result.text,
      });
      publish({
        state: "READY",
        mrsState: result.ok ? "ACTIVE" : "ERROR",
        text: meta ? "Cached AI model ready" : "AI model downloaded & ready",
        detail: result.ok
          ? "Brain2 MRS ACTIVE — real Granite ONNX inference completed through a browser worker."
          : "Browser-worker MRS self-test produced no output.",
        backend: "wasm",
        dtype: BRAIN2_TRANSFORMERS_WASM_DTYPE,
        cacheState: meta?.lastReadyAt ? "READY_CACHED" : "READY_FRESH",
        lastReadyAt: readyAt,
        lastSelfTest: testedMeta.lastSelfTest,
        error: result.ok ? undefined : "MRS self-test produced no generated output.",
        progress: 1,
        budget: loadResidualBudget(),
      });
      return result.ok;
    }
    const selfTestAt = meta?.lastSelfTest?.at ? new Date(meta.lastSelfTest.at).toLocaleString() : "a previous verified run";
    brain2MRSLog("runtime.ensure.ready", { reusedSelfTestAt: meta?.lastSelfTest?.at });
    noteReady(meta, `Granite ONNX loaded through a browser worker from cache. Reusing the self-test from ${selfTestAt}.`);
    return true;
  }).catch((error) => {
    runtimeWarmPromise = null;
    brain2MRSError("runtime.ensure.error", { error: error instanceof Error ? error.message : String(error) });
    publish({
      state: "ERROR",
      mrsState: "ERROR",
      progress: 0,
      text: "AI model download/load failed",
      detail: "Brain2 browser MRS could not activate. Retry after checking browser network/storage/console.",
      error: error instanceof Error ? error.message : String(error),
      budget: loadResidualBudget(),
    });
    throw error;
  });
  try {
    return await runtimeWarmPromise;
  } finally {
    runtimeWarmPromise = null;
  }
}

export async function preloadBrain2Transformers() {
  return ensureBrowserRuntime({ reason: "manual" });
}

export async function autoWarmBrain2TransformersFromCache() {
  const meta = loadRuntimeMeta();
  if (!meta?.lastReadyAt) return false;
  await ensureBrowserRuntime({ reason: "auto-cache" });
  return true;
}

export async function retryBrain2Transformers() {
  destroyWorker();
  publish({
    state: "UNINITIALIZED",
    mrsState: "INACTIVE",
    progress: 0,
    text: "Retrying AI runtime…",
    detail: "Restarting the browser-worker MRS runtime.",
    activationMode: "MANUAL",
    backend: "wasm",
    dtype: BRAIN2_TRANSFORMERS_WASM_DTYPE,
    cacheState: "UNKNOWN",
    error: undefined,
    budget: loadResidualBudget(),
  });
  return ensureBrowserRuntime({ reason: "manual", forceSelfTest: true });
}

function clipTextToEstimatedTokens(text: string, budget: number) {
  const clean = String(text ?? "").trim();
  if (Math.ceil(clean.length / 2) <= budget) return clean;
  const maxChars = Math.max(256, budget * 3);
  const head = Math.floor(maxChars * 0.68);
  const tail = Math.max(0, maxChars - head - 120);
  return `${clean.slice(0, head)}\n\n[...Brain2 context compacted for WASM memory safety...]\n\n${clean.slice(-tail)}`;
}

export async function reviewBrain2Intelligence(input: {
  project: { id: string; name: string };
  candidates: Array<{ id: string; kind: string; statement: string; evidenceIds: string[]; importance: number; novelty: number; truthConfidence: number }>;
}): Promise<Proposal[]> {
  const payload = input.candidates.slice(0, BRAIN2_MRS_REVIEW_CANDIDATE_LIMIT).map((candidate) => ({
    ...candidate,
    statement: clipTextToEstimatedTokens(candidate.statement, 36),
    evidenceIds: candidate.evidenceIds.slice(0, 3),
  }));
  if (!payload.length) return [];
  brain2MRSLog("review.start", { projectId: input.project.id, candidates: payload.length });
  await ensureBrowserRuntime({ reason: "semantic-review" });
  const proposals = await callWorker<Proposal[]>({
    type: "review",
    input: { project: input.project, candidates: payload },
  });
  noteInferenceSuccess("Browser-worker MRS semantic review completed.");
  brain2MRSLog("review.done", { projectId: input.project.id, proposals: Array.isArray(proposals) ? proposals.length : 0 });
  return Array.isArray(proposals) ? proposals : [];
}

export async function runBrain2HardResidual(input: { task: string; context: string; maxTokens?: number }) {
  const task = clipTextToEstimatedTokens(input.task, 220);
  const context = clipTextToEstimatedTokens(input.context, 700);
  await ensureBrowserRuntime({ reason: "residual" });
  const text = await callWorker<string>({
    type: "hard-residual",
    input: { task, context, maxTokens: input.maxTokens },
  });
  noteInferenceSuccess("Browser-worker hard-residual lane completed.");
  return text;
}

export async function runBrain2StructuredResidualReasoner(input: {
  task: string;
  context: string;
  evidence: Array<{ id: string; type: string; text: string; score: number; truthStatus?: string }>;
  maxTokens?: number;
}): Promise<Brain2ResidualReasonerOutput> {
  const budget = syncBudgetSnapshot();
  if (budget.coolingDownUntil && Date.parse(budget.coolingDownUntil) > Date.now()) {
    throw new Error(`MRS is cooling down after browser memory pressure until ${new Date(budget.coolingDownUntil).toLocaleTimeString()}.`);
  }
  if (budget.residualCalls >= budget.residualLimit) {
    throw new Error(`MRS session budget reached: ${budget.residualCalls}/${budget.residualLimit} residual calls used in this browser session.`);
  }
  const compactEvidence = input.evidence.slice(0, 10).map((item) => ({
    id: item.id,
    type: item.type,
    truthStatus: item.truthStatus,
    score: item.score,
    text: clipTextToEstimatedTokens(item.text, 72),
  }));
  brain2MRSLog("residual.start", {
    evidence: compactEvidence.length,
    residualCalls: budget.residualCalls,
    residualLimit: budget.residualLimit,
  });
  await ensureBrowserRuntime({ reason: "residual" });
  syncBudgetSnapshot({ residualCalls: budget.residualCalls + 1 });
  try {
    const result = await callWorker<Brain2ResidualReasonerOutput>({
      type: "residual",
      input: { task: input.task, context: input.context, evidence: compactEvidence, maxTokens: input.maxTokens },
    });
    noteInferenceSuccess("Browser-worker residual reasoning completed.");
    brain2MRSLog("residual.done", { hasAnswer: Boolean(result?.answer), confidence: result?.confidence });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    brain2MRSError("residual.error", { error: message });
    if (/std::bad_alloc|out of memory|oom|failed to call OrtRun|allocation/i.test(message)) {
      const coolingDownUntil = new Date(Date.now() + BRAIN2_MRS_MEMORY_PRESSURE_COOLDOWN_MS).toISOString();
      syncBudgetSnapshot({ coolingDownUntil });
      publish({
        state: "READY",
        mrsState: "ERROR",
        text: "AI model ready · MRS memory pressure",
        detail: "Granite is loaded, but this residual still exceeded the browser WASM memory budget after compaction.",
        error: "MRS_MEMORY_PRESSURE",
        budget: loadResidualBudget(),
      });
    }
    throw error;
  }
}

export async function runBrain2MRSSelfTest() {
  brain2MRSLog("selftest.start");
  await ensureBrowserRuntime({ reason: "manual" });
  try {
    const result = await callWorker<{ ok: boolean; text: string; at: string }>({ type: "self-test" });
    const nextMeta: RuntimeMeta = {
      modelId: BRAIN2_TRANSFORMERS_MODEL_ID,
      dtype: BRAIN2_TRANSFORMERS_WASM_DTYPE,
      backend: "wasm",
      lastReadyAt: nowIso(),
      lastSelfTest: { ok: result.ok, text: result.text, at: result.at },
    };
    saveRuntimeMeta(nextMeta);
    publish({
      state: "READY",
      mrsState: result.ok ? "ACTIVE" : "ERROR",
      text: "Cached AI model ready",
      detail: result.ok ? "MRS self-test passed via a browser worker." : "MRS self-test produced no output.",
      backend: "wasm",
      dtype: BRAIN2_TRANSFORMERS_WASM_DTYPE,
      cacheState: "READY_FRESH",
      lastReadyAt: nextMeta.lastReadyAt,
      lastSelfTest: nextMeta.lastSelfTest,
      error: result.ok ? undefined : "MRS self-test produced no generated output.",
      budget: loadResidualBudget(),
    });
    brain2MRSLog("selftest.done", { ok: result.ok, text: result.text });
    return { ok: result.ok, text: result.text };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    brain2MRSError("selftest.error", { error: message });
    publish({
      state: "READY",
      mrsState: "ERROR",
      detail: "MRS self-test failed.",
      error: message,
      lastSelfTest: { ok: false, text: message, at: nowIso() },
      budget: loadResidualBudget(),
    });
    return { ok: false, text: message };
  }
}

export function getBrain2ResidualBudget() {
  return loadResidualBudget();
}

export function getBrain2MRSDebugRuntimeSummary() {
  return {
    snapshot,
    workerKind: workerInstance?.kind,
    activeRequests: [...workerRequests.entries()].map(([requestId, request]) => ({
      requestId,
      type: request.request.type,
      elapsedMs: Math.round(performance.now() - request.startedAt),
    })),
    hasRuntimeWarmPromise: Boolean(runtimeWarmPromise),
    sharedWorkerUnavailable,
    budget: loadResidualBudget(),
  };
}

export function resetBrain2ResidualBudget() {
  return syncBudgetSnapshot({ residualCalls: 0, coolingDownUntil: undefined });
}
