"use strict";

const path = require("path");
const { spawn } = require("child_process");
const {
  daemonEntryPath,
  packagedNodeModulesPath,
  repoRoot,
} = require("./runtimePaths.cjs");

const DEFAULT_HOST = process.env.AI_MINER_MRS_HOST || "127.0.0.1";
const DEFAULT_PORT = Number(process.env.AI_MINER_MRS_PORT || 4317);
const DEFAULT_URL = `http://${DEFAULT_HOST}:${DEFAULT_PORT}`;
const DEFAULT_MODEL_ID =
  process.env.AI_MINER_MRS_MODEL_ID ||
  "onnx-community/granite-4.0-350m-ONNX-web";

let companionProcess = null;
let startingPromise = null;

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function healthCheck(baseUrl = DEFAULT_URL) {
  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return { ok: false, detail: `HTTP ${response.status}` };
    const body = await readJson(response);
    return { ok: Boolean(body.ok), detail: body.detail, body };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function spawnCompanion(baseUrl, modelId) {
  const daemonScript = daemonEntryPath();
  if (!daemonScript) {
    throw new Error("Could not find Brain2 MRS daemon entry script.");
  }
  const nodeModulesPath = packagedNodeModulesPath();
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    NODE_PATH: nodeModulesPath
      ? [nodeModulesPath, process.env.NODE_PATH].filter(Boolean).join(path.delimiter)
      : process.env.NODE_PATH,
    BRAIN2_MRS_HOST: new URL(baseUrl).hostname,
    BRAIN2_MRS_PORT: String(new URL(baseUrl).port || DEFAULT_PORT),
    BRAIN2_MRS_MODEL_ID: modelId || DEFAULT_MODEL_ID,
  };

  const child = spawn(process.execPath, [daemonScript], {
    env,
    cwd: repoRoot(),
    detached: false,
    stdio: "ignore",
    windowsHide: true,
  });

  child.on("exit", () => {
    if (companionProcess === child) companionProcess = null;
  });

  companionProcess = child;
  return child;
}

async function ensureCompanion(options = {}) {
  const host = options.host || DEFAULT_HOST;
  const port = Number(options.port || DEFAULT_PORT);
  const modelId = options.modelId || DEFAULT_MODEL_ID;
  const retries = Math.max(1, Number(options.retries || 6));
  const retryDelayMs = Math.max(250, Number(options.retryDelayMs || 1000));
  const baseUrl = `http://${host}:${port}`;

  const healthy = await healthCheck(baseUrl);
  if (healthy.ok) {
    return {
      ok: true,
      started: false,
      detail: healthy.detail || "Local AI helper already running.",
    };
  }

  if (startingPromise) return startingPromise;

  startingPromise = (async () => {
    try {
      if (!companionProcess || companionProcess.exitCode !== null) {
        spawnCompanion(baseUrl, modelId);
      }
      for (let attempt = 0; attempt < retries; attempt += 1) {
        await sleep(retryDelayMs);
        const probe = await healthCheck(baseUrl);
        if (probe.ok) {
          return {
            ok: true,
            started: true,
            detail: probe.detail || "Local AI helper started successfully.",
          };
        }
      }
      return {
        ok: false,
        started: true,
        detail:
          "Local AI helper did not become healthy after startup attempts.",
      };
    } finally {
      startingPromise = null;
    }
  })();

  return startingPromise;
}

function stopCompanion() {
  if (!companionProcess || companionProcess.exitCode !== null) return;
  try {
    companionProcess.kill();
  } catch {
    // Best-effort shutdown.
  } finally {
    companionProcess = null;
  }
}

module.exports = {
  DEFAULT_HOST,
  DEFAULT_PORT,
  DEFAULT_URL,
  DEFAULT_MODEL_ID,
  ensureCompanion,
  healthCheck,
  stopCompanion,
};
