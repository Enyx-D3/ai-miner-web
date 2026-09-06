import http from "node:http";
import process from "node:process";

const MODEL_ID = process.env.BRAIN2_MRS_MODEL_ID || "onnx-community/granite-4.0-350m-ONNX-web";
const DTYPE = process.env.BRAIN2_MRS_DTYPE || "q4f16";
const HOST = process.env.BRAIN2_MRS_HOST || "127.0.0.1";
const PORT = Number(process.env.BRAIN2_MRS_PORT || 4317);
const TOKEN = process.env.BRAIN2_MRS_SERVICE_TOKEN || "";
const INPUT_TOKEN_BUDGET = Math.max(256, Number(process.env.BRAIN2_MRS_INPUT_TOKEN_BUDGET || 1024));
const EMERGENCY_TOKEN_BUDGET = Math.max(128, Number(process.env.BRAIN2_MRS_EMERGENCY_TOKEN_BUDGET || 512));
const MAX_NEW_TOKENS = Math.max(32, Number(process.env.BRAIN2_MRS_MAX_NEW_TOKENS || 192));

let transformersPromise = null;
let generatorPromise = null;
let generatorInstance = null;
let queue = Promise.resolve();
let runtimeState = "UNINITIALIZED";
let lastError = undefined;
let lastReadyAt = undefined;
let lastSelfTest = undefined;

function nowIso() {
  return new Date().toISOString();
}

function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  response.end(JSON.stringify(body));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error(`Invalid JSON body: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
    request.on("error", reject);
  });
}

function authorized(request) {
  if (!TOKEN) return true;
  const auth = String(request.headers.authorization || "");
  return auth === `Bearer ${TOKEN}`;
}

function clipTextToEstimatedTokens(text, budget) {
  const clean = String(text ?? "").trim();
  if (Math.ceil(clean.length / 2) <= budget) return clean;
  const maxChars = Math.max(256, budget * 3);
  const head = Math.floor(maxChars * 0.68);
  const tail = Math.max(0, maxChars - head - 120);
  return `${clean.slice(0, head)}\n\n[...Brain2 daemon context compacted...]\n\n${clean.slice(-tail)}`;
}

function boundMessages(messages, tokenBudget) {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n").trim();
  const rest = messages.filter((m) => m.role !== "system");
  const systemBudget = Math.min(320, Math.max(128, Math.floor(tokenBudget * 0.22)));
  const boundedSystem = clipTextToEstimatedTokens(system, systemBudget);
  const remaining = Math.max(256, tokenBudget - Math.ceil(boundedSystem.length / 2) - 64);
  if (!rest.length) return [{ role: "system", content: boundedSystem }];
  const per = Math.max(128, Math.floor(remaining / rest.length));
  return [{ role: "system", content: boundedSystem }, ...rest.map((m) => ({ ...m, content: clipTextToEstimatedTokens(m.content, per) }))];
}

function generatedText(output) {
  const first = Array.isArray(output) ? output[0] : output;
  const value = first?.generated_text ?? first?.text ?? "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i -= 1) {
      const content = value[i]?.content;
      if (typeof content === "string" && content.trim()) return content;
    }
  }
  return String(value ?? "");
}

function parseJsonText(text) {
  const cleaned = String(text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

function isMemoryPressureError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /std::bad_alloc|out of memory|oom|failed to call OrtRun|allocation/i.test(message);
}

async function ensureTransformers() {
  if (!transformersPromise) transformersPromise = import("@huggingface/transformers");
  return transformersPromise;
}

async function buildGenerator() {
  runtimeState = "LOADING";
  const transformers = await ensureTransformers();
  if (transformers.env) {
    transformers.env.useBrowserCache = false;
    transformers.env.useWasmCache = false;
  }
  const generator = await transformers.pipeline("text-generation", MODEL_ID, { device: "wasm", dtype: DTYPE });
  return generator;
}

async function loadGenerator() {
  if (generatorInstance) return generatorInstance;
  if (generatorPromise) return generatorPromise;
  generatorPromise = (async () => {
    try {
      const generator = await buildGenerator();
      generatorInstance = generator;
      runtimeState = "READY";
      lastReadyAt = nowIso();
      lastError = undefined;
      return generator;
    } catch (error) {
      runtimeState = "ERROR";
      lastError = error instanceof Error ? error.message : String(error);
      generatorPromise = null;
      generatorInstance = null;
      throw error;
    }
  })();
  return generatorPromise;
}

async function generate(messages, options = {}) {
  const generator = await loadGenerator();
  const maxNewTokens = Math.min(Number(options.maxNewTokens || 128), MAX_NEW_TOKENS);
  const temperature = Number(options.temperature ?? 0.2);
  const tokenBudget = Math.min(Number(options.inputTokenBudget || INPUT_TOKEN_BUDGET), INPUT_TOKEN_BUDGET);
  const invoke = async (budget) => {
    const bounded = boundMessages(messages, budget);
    return generator(bounded, {
      max_new_tokens: maxNewTokens,
      temperature,
      do_sample: temperature > 0,
      return_full_text: false,
    });
  };
  try {
    return generatedText(await invoke(tokenBudget)).trim();
  } catch (error) {
    if (!isMemoryPressureError(error)) throw error;
    return generatedText(await invoke(EMERGENCY_TOKEN_BUDGET)).trim();
  }
}

function enqueue(work) {
  const run = queue.then(work, work);
  queue = run.then(() => undefined, () => undefined);
  return run;
}

async function runSelfTestInternal() {
  const text = await generate(
    [
      { role: "system", content: "You are running a Brain2 local MRS daemon health check. Give a very short acknowledgement." },
      { role: "user", content: "Runtime health check." },
    ],
    { temperature: 0, maxNewTokens: 12, inputTokenBudget: 256 },
  );
  const result = { ok: text.trim().length > 0, text: text.trim().slice(0, 200), at: nowIso() };
  if (!result.ok) throw new Error("MRS daemon self-test returned no output.");
  lastSelfTest = result;
  runtimeState = "READY";
  return result;
}

async function handleReview(input) {
  const payload = Array.isArray(input.candidates)
    ? input.candidates.slice(0, 8).map((candidate) => ({
        ...candidate,
        statement: clipTextToEstimatedTokens(candidate.statement, 90),
        evidenceIds: Array.isArray(candidate.evidenceIds) ? candidate.evidenceIds.slice(0, 6) : [],
      }))
    : [];
  if (!payload.length) return { proposals: [] };
  const system =
    'You are the Brain2 MRS semantic reviewer. You receive already-retrieved evidence candidates. You may classify/rank them, but you MUST NOT invent evidence IDs, facts, or Current Truth. Return ONLY JSON: {"proposals":[{"candidateId":"...","classification":"TRUTH|IMPORTANT_IDEA|NOVELTY|CONNECTION|CHANGE|OPEN_QUESTION","importance":0..1,"novelty":0..1,"rationale":"brief evidence-grounded reason","evidenceIds":["only IDs already attached to that candidate"]}]}. Omit candidates that do not deserve semantic promotion.';
  const user = JSON.stringify({ format: "B2_INTELLIGENCE_REVIEW", version: 3, project: input.project, candidates: payload });
  const text = await generate(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.2, maxNewTokens: 192, inputTokenBudget: INPUT_TOKEN_BUDGET },
  );
  const parsed = parseJsonText(text);
  return { proposals: Array.isArray(parsed?.proposals) ? parsed.proposals : [] };
}

async function handleHardResidual(input) {
  const task = clipTextToEstimatedTokens(input.task, 220);
  const context = clipTextToEstimatedTokens(input.context, 700);
  const text = await generate(
    [
      {
        role: "system",
        content:
          "You are the Brain2 Granite hard-residual lane. Work only on the unresolved residual provided. Do not claim evidence beyond the verified Databox context. Return a concise proposal for the independent verifier.",
      },
      { role: "user", content: `TASK\n${task}\n\nVERIFIED DATABOX / RESIDUAL CONTEXT\n${context}` },
    ],
    { temperature: 0.35, maxNewTokens: Math.min(Number(input.maxTokens || 128), MAX_NEW_TOKENS), inputTokenBudget: INPUT_TOKEN_BUDGET },
  );
  return { text };
}

async function handleResidual(input) {
  const allowedEvidenceIds = Array.isArray(input.evidence) ? input.evidence.map((item) => item.id) : [];
  const compactEvidence = Array.isArray(input.evidence)
    ? input.evidence.slice(0, 10).map((item) => ({
        id: item.id,
        type: item.type,
        truthStatus: item.truthStatus,
        score: item.score,
        text: clipTextToEstimatedTokens(item.text, 72),
      }))
    : [];
  const system =
    'You are the Brain2 residual reasoning lane. Work only inside the provided Databox evidence. Do not invent facts or evidence IDs. Return ONLY JSON: {"answer":"string","evidenceIds":["subset of provided IDs"],"confidence":0..1,"residuals":["brief unresolved items"],"terminationReason":"short grounded reason"}.';
  const user = JSON.stringify({
    format: "B2_RESIDUAL_REASON",
    version: 1,
    task: input.task,
    context: input.context,
    evidence: compactEvidence,
    allowedEvidenceIds,
  });
  const text = await generate(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.25, maxNewTokens: Math.min(Number(input.maxTokens || 176), MAX_NEW_TOKENS), inputTokenBudget: INPUT_TOKEN_BUDGET },
  );
  try {
    const parsed = parseJsonText(text);
    return {
      answer: typeof parsed?.answer === "string" && parsed.answer.trim() ? parsed.answer.trim() : text.trim(),
      evidenceIds: Array.isArray(parsed?.evidenceIds) ? parsed.evidenceIds.filter((id) => typeof id === "string" && allowedEvidenceIds.includes(id)).slice(0, 6) : [],
      confidence: Math.max(0, Math.min(1, Number(parsed?.confidence ?? 0.45) || 0.45)),
      residuals: Array.isArray(parsed?.residuals) ? parsed.residuals.filter((item) => typeof item === "string").slice(0, 4) : [],
      terminationReason:
        typeof parsed?.terminationReason === "string" && parsed.terminationReason.trim()
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

function healthPayload() {
  return {
    ok: runtimeState === "READY" || runtimeState === "UNINITIALIZED",
    backend: "service",
    modelId: MODEL_ID,
    detail:
      runtimeState === "READY"
        ? "Brain2 local MRS daemon is ready."
        : runtimeState === "LOADING"
          ? "Brain2 local MRS daemon is loading the model."
          : runtimeState === "ERROR"
            ? lastError || "Brain2 local MRS daemon is in an error state."
            : "Brain2 local MRS daemon is configured and waiting for the first request.",
    lastReadyAt,
    lastSelfTest,
  };
}

const server = http.createServer(async (request, response) => {
  try {
    if (!request.url) {
      json(response, 404, { error: "Missing request URL." });
      return;
    }
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
      });
      response.end();
      return;
    }
    if (!authorized(request)) {
      json(response, 401, { error: "Unauthorized Brain2 MRS daemon request." });
      return;
    }
    const url = new URL(request.url, `http://${request.headers.host || `${HOST}:${PORT}`}`);
    if (request.method === "GET" && url.pathname === "/health") {
      json(response, 200, healthPayload());
      return;
    }
    if (request.method === "POST" && url.pathname === "/self-test") {
      const result = await enqueue(() => runSelfTestInternal());
      json(response, 200, result);
      return;
    }
    if (request.method === "POST" && url.pathname === "/review") {
      const body = await readRequestBody(request);
      const result = await enqueue(() => handleReview(body));
      json(response, 200, result);
      return;
    }
    if (request.method === "POST" && url.pathname === "/hard-residual") {
      const body = await readRequestBody(request);
      const result = await enqueue(() => handleHardResidual(body));
      json(response, 200, result);
      return;
    }
    if (request.method === "POST" && url.pathname === "/residual") {
      const body = await readRequestBody(request);
      const result = await enqueue(() => handleResidual(body));
      json(response, 200, result);
      return;
    }
    json(response, 404, { error: `Unsupported Brain2 MRS daemon route: ${request.method} ${url.pathname}` });
  } catch (error) {
    runtimeState = "ERROR";
    lastError = error instanceof Error ? error.message : String(error);
    json(response, 500, { error: lastError });
  }
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`Brain2 MRS daemon listening on http://${HOST}:${PORT}\n`);
  process.stdout.write(`Model: ${MODEL_ID} (${DTYPE})\n`);
});
