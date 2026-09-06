/// <reference lib="webworker" />

import { env, pipeline } from "@huggingface/transformers";
import type {
  Brain2TransformersWorkerEvent,
  Brain2TransformersWorkerRequest,
  Brain2WorkerProposal,
  Brain2WorkerResidualResult,
} from "../lib/brain2/transformersWorkerProtocol";

const MODEL_ID = "onnx-community/granite-4.0-350m-ONNX-web";
const DTYPE = "q4f16";
const INPUT_TOKEN_BUDGET = 1024;
const EMERGENCY_TOKEN_BUDGET = 512;
const MAX_NEW_TOKENS = 192;
const REVIEW_INPUT_TOKEN_BUDGET = 220;
const REVIEW_MAX_NEW_TOKENS = 6;

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope & {
  onconnect?: (event: MessageEvent) => void;
};

let generatorPromise: Promise<any> | null = null;
let generatorInstance: any = null;
let queue: Promise<void> = Promise.resolve();

const ports = new Set<MessagePort>();

function postToClients(message: Brain2TransformersWorkerEvent) {
  if (ports.size) {
    for (const port of ports) port.postMessage(message);
    return;
  }
  ctx.postMessage(message);
}

function postLog(level: "info" | "error", event: string, detail?: Record<string, unknown>, port?: MessagePort) {
  const message = { type: "log", level, event, detail } satisfies Brain2TransformersWorkerEvent;
  if (port) {
    port.postMessage(message);
    return;
  }
  postToClients(message);
}

function postSnapshot(snapshot: Extract<Brain2TransformersWorkerEvent, { type: "snapshot" }>["snapshot"]) {
  postToClients({
    type: "snapshot",
    snapshot,
  } satisfies Extract<Brain2TransformersWorkerEvent, { type: "snapshot" }>);
}

async function requestPersistentStorage() {
  try {
    const nav = self.navigator as Navigator & {
      storage?: { persist?: () => Promise<boolean> };
    };
    if (nav.storage?.persist) await nav.storage.persist();
  } catch {
    // Optional optimization only.
  }
}

function hasBrowserCacheSupport() {
  return typeof caches !== "undefined";
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 2);
}

function clipTextToEstimatedTokens(text: string, budget: number) {
  const clean = String(text ?? "").trim();
  if (estimateTokens(clean) <= budget) return clean;
  const maxChars = Math.max(256, budget * 3);
  const head = Math.floor(maxChars * 0.68);
  const tail = Math.max(0, maxChars - head - 120);
  return `${clean.slice(0, head)}\n\n[...Brain2 context compacted for WASM memory safety...]\n\n${clean.slice(-tail)}`;
}

function boundMessages(messages: ChatMessage[], tokenBudget: number) {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n")
    .trim();
  const rest = messages.filter((message) => message.role !== "system");
  const systemBudget = Math.min(320, Math.max(128, Math.floor(tokenBudget * 0.22)));
  const boundedSystem = clipTextToEstimatedTokens(system, systemBudget);
  const remaining = Math.max(256, tokenBudget - estimateTokens(boundedSystem) - 64);
  if (!rest.length) return [{ role: "system" as const, content: boundedSystem }];
  const per = Math.max(128, Math.floor(remaining / rest.length));
  return [
    { role: "system" as const, content: boundedSystem },
    ...rest.map((message) => ({ ...message, content: clipTextToEstimatedTokens(message.content, per) })),
  ];
}

function generatedText(output: any): string {
  const first = Array.isArray(output) ? output[0] : output;
  const value = first?.generated_text ?? first?.text ?? "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      const content = value[index]?.content;
      if (typeof content === "string" && content.trim()) return content;
    }
  }
  return String(value ?? "");
}

function parseJSON(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

function parseReviewVerdict(text: string): "PROMOTE" | "REJECT" | null {
  const upper = text.toUpperCase();
  const verdictTail = upper.includes("VERDICT:") ? upper.slice(upper.lastIndexOf("VERDICT:") + "VERDICT:".length) : upper;
  const compact = verdictTail.trim().split(/\s+/).slice(0, 8).join(" ");
  if (/\b(?:KEEP|PROMOTE|YES|IMPORTANT)\b/.test(compact)) return "PROMOTE";
  if (/\b(?:DROP|REJECT|NO|NOISE)\b/.test(compact)) return "REJECT";
  return null;
}

function isMemoryPressureError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /std::bad_alloc|out of memory|oom|failed to call OrtRun|allocation/i.test(message);
}

function progressCallback(progressLike: any) {
  const raw = Number(progressLike?.progress ?? 0);
  const progress = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw > 1 ? raw / 100 : raw)) : 0;
  const file = String(progressLike?.file ?? "").trim();
  const status = String(progressLike?.status ?? "").trim();
  const reportText = [status, file].filter(Boolean).join(" · ");
  postSnapshot({
    state: "LOADING",
    mrsState: "ACTIVATING",
    progress,
    text: `Downloading AI model… ${Math.round(progress * 100)}%`,
    detail: reportText || "Downloading and preparing Granite ONNX model artifacts in browser cache",
    backend: "wasm",
    dtype: DTYPE,
    cacheState: "DOWNLOADING",
    error: undefined,
  });
}

async function buildGenerator() {
  await requestPersistentStorage();
  const hasCache = hasBrowserCacheSupport();
  env.useBrowserCache = hasCache;
  env.useWasmCache = hasCache;
  postSnapshot({
    state: "LOADING",
    mrsState: "ACTIVATING",
    progress: 0,
    text: "Initializing cached AI model…",
    detail: hasCache
      ? "Transformers.js / WASM worker — checking browser cache and initializing the q4f16 Granite 4.0 350M ONNX runtime."
      : "Transformers.js / WASM worker — browser cache is unavailable here, so Brain2 is initializing the q4f16 Granite 4.0 350M ONNX runtime without cache reuse.",
    backend: "wasm",
    dtype: DTYPE,
    cacheState: "INITIALIZING_CACHE",
    error: undefined,
  });
  return pipeline("text-generation", MODEL_ID, {
    device: "wasm",
    dtype: DTYPE,
    progress_callback: progressCallback,
  });
}

async function ensureGenerator() {
  if (generatorInstance) return generatorInstance;
  if (!generatorPromise) {
    generatorPromise = buildGenerator()
      .then((generator) => {
        generatorInstance = generator;
        postSnapshot({
          state: "READY",
          mrsState: "INACTIVE",
          progress: 1,
          text: "AI model initialized",
          detail: "Worker-backed browser MRS runtime is ready for inference.",
          backend: "wasm",
          dtype: DTYPE,
          cacheState: "READY_FRESH",
          error: undefined,
        });
        return generator;
      })
      .catch((error) => {
        generatorPromise = null;
        generatorInstance = null;
        postSnapshot({
          state: "ERROR",
          mrsState: "ERROR",
          progress: 0,
          text: "AI model download/load failed",
          detail: "Brain2 browser MRS could not activate in the worker.",
          backend: "wasm",
          dtype: DTYPE,
          cacheState: "UNKNOWN",
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      });
  }
  return generatorPromise;
}

async function generate(messages: ChatMessage[], options: { maxNewTokens?: number; temperature?: number; inputTokenBudget?: number } = {}) {
  const generator = await ensureGenerator();
  const temperature = options.temperature ?? 0.2;
  const maxNewTokens = Math.min(options.maxNewTokens ?? 128, MAX_NEW_TOKENS);
  const primaryBudget = Math.min(options.inputTokenBudget ?? INPUT_TOKEN_BUDGET, INPUT_TOKEN_BUDGET);

  const invoke = async (tokenBudget: number) => {
    const bounded = boundMessages(messages, tokenBudget);
    return generator(bounded, {
      max_new_tokens: maxNewTokens,
      temperature,
      do_sample: temperature > 0,
      return_full_text: false,
    });
  };

  try {
    return generatedText(await invoke(primaryBudget)).trim();
  } catch (error) {
    if (!isMemoryPressureError(error)) throw error;
    postSnapshot({
      state: "READY",
      mrsState: "ACTIVATING",
      progress: 1,
      text: "AI model ready · reducing MRS context",
      detail: `Browser worker memory pressure detected. Retrying the residual with a ${EMERGENCY_TOKEN_BUDGET}-token input budget.`,
      backend: "wasm",
      dtype: DTYPE,
      cacheState: "READY_FRESH",
      error: undefined,
    });
    const recovered = await invoke(EMERGENCY_TOKEN_BUDGET);
    postSnapshot({
      state: "READY",
      mrsState: "ACTIVE",
      progress: 1,
      text: "AI model downloaded & ready",
      detail: "Worker-backed browser MRS recovered from memory pressure using the compact residual budget.",
      backend: "wasm",
      dtype: DTYPE,
      cacheState: "READY_FRESH",
      error: undefined,
    });
    return generatedText(recovered).trim();
  }
}

async function runSelfTest() {
  postSnapshot({
    state: "READY",
    mrsState: "SELF_TESTING",
    progress: 1,
    text: "Cached AI model ready",
    detail: "Running a real Brain2 MRS inference probe inside the browser worker…",
    backend: "wasm",
    dtype: DTYPE,
    cacheState: "READY_FRESH",
    error: undefined,
  });
  const text = await generate(
    [
      { role: "system", content: "You are running a local Brain2 runtime health check. Give a very short acknowledgement." },
      { role: "user", content: "Runtime health check." },
    ],
    { temperature: 0, maxNewTokens: 12, inputTokenBudget: 256 },
  );
  const clean = text.trim();
  const ok = clean.length > 0;
  if (!ok) throw new Error("MRS activation probe completed without generated output.");
  postSnapshot({
    state: "READY",
    mrsState: "ACTIVE",
    progress: 1,
    text: "Cached AI model ready",
    detail: "Brain2 MRS ACTIVE — real Granite ONNX inference completed through a browser worker.",
    backend: "wasm",
    dtype: DTYPE,
    cacheState: "READY_FRESH",
    error: undefined,
  });
  return { ok: true, text: clean.slice(0, 200), at: new Date().toISOString() };
}

async function preload(runSelfTestAfterLoad: boolean) {
  postSnapshot({
    state: "CHECKING",
    mrsState: "ACTIVATING",
    progress: 0,
    text: "Checking cached AI model…",
    detail: "Starting the worker-backed Transformers.js / WASM browser runtime and checking cached model artifacts.",
    backend: "wasm",
    dtype: DTYPE,
    cacheState: "CHECKING_CACHE",
    error: undefined,
  });
  await ensureGenerator();
  if (runSelfTestAfterLoad) return runSelfTest();
  return { ok: true, text: "Model initialized without running a fresh self-test.", at: new Date().toISOString() };
}

async function handleReview(input: Extract<Brain2TransformersWorkerRequest, { type: "review" }>["input"], port?: MessagePort) {
  const candidate = input.candidates[0];
  if (!candidate) return [];
  const system = "Brain2 MRS binary reviewer. Decide if the candidate is a genuinely important project idea worth keeping. Output one token only after the verdict cue: KEEP for important, DROP for weak/noisy.";
  const user = [
    `Project: ${input.project.name}`,
    `Candidate ID: ${candidate.id}`,
    `Kind: ${candidate.kind}`,
    `Statement: ${candidate.statement}`,
    `Evidence IDs: ${candidate.evidenceIds.join(", ") || "none"}`,
    "Weak examples: UI noise, fragments, repeated facts, malformed import text, low-value operational details.",
    "Verdict:",
  ].join("\n");
  const text = await generate(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0, maxNewTokens: REVIEW_MAX_NEW_TOKENS, inputTokenBudget: REVIEW_INPUT_TOKEN_BUDGET },
  );
  const verdict = parseReviewVerdict(text);
  postLog(verdict ? "info" : "error", verdict ? "review.verdict" : "review.unrecognized-verdict", {
    verdict: verdict ?? "UNRECOGNIZED",
    candidateId: candidate.id,
    projectId: input.project.id,
    preview: text.slice(0, 240),
  }, port);
  if (verdict !== "PROMOTE") {
    return [];
  }
  return [{
    candidateId: candidate.id,
    classification: candidate.kind,
    importance: Math.max(0.7, Number(candidate.importance) || 0.7),
    novelty: Math.max(0.3, Number(candidate.novelty) || 0.3),
    rationale: "MRS binary reviewer promoted this candidate as a meaningful project intelligence item.",
    evidenceIds: candidate.evidenceIds,
  } satisfies Brain2WorkerProposal];
}

async function handleHardResidual(input: Extract<Brain2TransformersWorkerRequest, { type: "hard-residual" }>["input"]) {
  return generate(
    [
      {
        role: "system",
        content:
          "You are the Brain2 Granite hard-residual lane. Work only on the unresolved residual provided. Do not claim evidence beyond the verified Databox context. Return a concise proposal for the independent verifier.",
      },
      { role: "user", content: `TASK\n${input.task}\n\nVERIFIED DATABOX / RESIDUAL CONTEXT\n${input.context}` },
    ],
    {
      temperature: 0.35,
      maxNewTokens: Math.min(input.maxTokens ?? 128, MAX_NEW_TOKENS),
      inputTokenBudget: INPUT_TOKEN_BUDGET,
    },
  );
}

async function handleResidual(input: Extract<Brain2TransformersWorkerRequest, { type: "residual" }>["input"]): Promise<Brain2WorkerResidualResult> {
  const allowedEvidenceIds = input.evidence.map((item) => item.id);
  const system =
    'You are the Brain2 residual reasoning lane. Work only inside the provided Databox evidence. Do not invent facts or evidence IDs. Return ONLY JSON: {"answer":"string","evidenceIds":["subset of provided IDs"],"confidence":0..1,"residuals":["brief unresolved items"],"terminationReason":"short grounded reason"}.';
  const user = JSON.stringify({
    format: "B2_RESIDUAL_REASON",
    version: 1,
    task: input.task,
    context: input.context,
    evidence: input.evidence,
    allowedEvidenceIds,
  });
  const text = await generate(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    {
      temperature: 0.25,
      maxNewTokens: Math.min(input.maxTokens ?? 176, MAX_NEW_TOKENS),
      inputTokenBudget: INPUT_TOKEN_BUDGET,
    },
  );
  try {
    const parsed = parseJSON(text) as Partial<Brain2WorkerResidualResult>;
    return {
      answer: typeof parsed.answer === "string" && parsed.answer.trim() ? parsed.answer.trim() : text.trim(),
      evidenceIds: Array.isArray(parsed.evidenceIds)
        ? parsed.evidenceIds.filter((id): id is string => typeof id === "string" && allowedEvidenceIds.includes(id)).slice(0, 6)
        : [],
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.45) || 0.45)),
      residuals: Array.isArray(parsed.residuals)
        ? parsed.residuals.filter((item): item is string => typeof item === "string").slice(0, 4)
        : [],
      terminationReason:
        typeof parsed.terminationReason === "string" && parsed.terminationReason.trim()
          ? parsed.terminationReason.trim()
          : "Granite produced a bounded residual proposal from the Databox.",
    };
  } catch {
    return {
      answer: text.trim(),
      evidenceIds: [],
      confidence: 0.4,
      residuals: ["Structured residual output could not be parsed as JSON."],
      terminationReason: "Granite returned an unstructured residual answer, so local repair may be required.",
    };
  }
}

function enqueue<T>(work: () => Promise<T>) {
  const run = queue.then(work, work);
  queue = run.then(() => undefined, () => undefined);
  return run;
}

function handleRequest(request: Brain2TransformersWorkerRequest, port?: MessagePort) {
  void enqueue(async () => {
    try {
      let payload: unknown;
      if (request.type === "preload") payload = await preload(request.runSelfTest);
      if (request.type === "self-test") payload = await runSelfTest();
      if (request.type === "review") payload = await handleReview(request.input, port);
      if (request.type === "hard-residual") payload = await handleHardResidual(request.input);
      if (request.type === "residual") payload = await handleResidual(request.input);
      const message = { type: "result", requestId: request.requestId, payload } satisfies Brain2TransformersWorkerEvent;
      if (port) port.postMessage(message);
      else postToClients(message);
    } catch (error) {
      const message = {
        type: "error",
        requestId: request.requestId,
        error: error instanceof Error ? error.message : String(error),
      } satisfies Brain2TransformersWorkerEvent;
      if (port) port.postMessage(message);
      else postToClients(message);
    }
  });
}

ctx.onmessage = (event: MessageEvent<Brain2TransformersWorkerRequest>) => {
  handleRequest(event.data);
};

ctx.onconnect = (event: MessageEvent) => {
  const port = event.ports[0];
  if (!port) return;
  ports.add(port);
  port.onmessage = (message: MessageEvent<Brain2TransformersWorkerRequest>) => {
    handleRequest(message.data, port);
  };
  port.start();
};
