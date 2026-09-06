"use strict";

const path = require("path");
const { spawn } = require("child_process");
const {
  packagedNodeModulesPath,
  standaloneServerEntryPath,
} = require("./runtimePaths.cjs");

const DEFAULT_PORT = Number(process.env.PORT || 3000);
const DEFAULT_HOST = process.env.HOSTNAME || "127.0.0.1";

let appServerProcess = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function waitForHealth(url, retries = 60, retryDelayMs = 1000) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (response.ok) return true;
      await readJson(response);
    } catch {
      // Keep waiting for the packaged web server.
    }
    await sleep(retryDelayMs);
  }
  return false;
}

function startStandaloneServer(options = {}) {
  if (appServerProcess && appServerProcess.exitCode === null) return appServerProcess;

  const serverEntry = standaloneServerEntryPath();
  if (!serverEntry) {
    throw new Error("Could not find packaged Next standalone server.js.");
  }
  const nodeModulesPath = packagedNodeModulesPath();

  const child = spawn(process.execPath, [serverEntry], {
    cwd: path.dirname(serverEntry),
    stdio: "ignore",
    windowsHide: true,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_PATH: nodeModulesPath
        ? [nodeModulesPath, process.env.NODE_PATH].filter(Boolean).join(path.delimiter)
        : process.env.NODE_PATH,
      PORT: String(options.port || DEFAULT_PORT),
      HOSTNAME: options.host || DEFAULT_HOST,
      NODE_ENV: process.env.NODE_ENV || "production",
    },
  });

  child.on("exit", () => {
    if (appServerProcess === child) appServerProcess = null;
  });

  appServerProcess = child;
  return child;
}

async function ensurePackagedAppServer(options = {}) {
  const host = options.host || DEFAULT_HOST;
  const port = Number(options.port || DEFAULT_PORT);
  const baseUrl = `http://${host}:${port}`;

  if (await waitForHealth(baseUrl, 1, 100)) return baseUrl;

  startStandaloneServer({ host, port });
  const healthy = await waitForHealth(baseUrl, options.retries || 60, options.retryDelayMs || 1000);
  if (!healthy) {
    throw new Error("Packaged AI Miner app server did not become ready.");
  }
  return baseUrl;
}

function stopAppServer() {
  if (!appServerProcess || appServerProcess.exitCode !== null) return;
  try {
    appServerProcess.kill();
  } catch {
    // Best-effort shutdown.
  } finally {
    appServerProcess = null;
  }
}

module.exports = {
  DEFAULT_HOST,
  DEFAULT_PORT,
  ensurePackagedAppServer,
  startStandaloneServer,
  stopAppServer,
};
