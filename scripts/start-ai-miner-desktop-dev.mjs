import { spawn } from "node:child_process";
import process from "node:process";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHttp(url, retries = 60) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) return true;
    } catch {
      // Keep polling until Next is up.
    }
    await wait(1000);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

const next = spawn("npm", ["run", "dev"], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: true,
});

let exiting = false;

function shutdown(code = 0) {
  if (exiting) return;
  exiting = true;
  try {
    next.kill();
  } catch {
    // Best-effort shutdown.
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

next.on("exit", (code) => {
  if (!exiting) process.exit(code ?? 0);
});

await waitForHttp("http://127.0.0.1:3000");

const electron = spawn(
  "npx",
  ["electron", "desktop/electron/main.cjs"],
  {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      AI_MINER_DESKTOP_APP_URL: "http://127.0.0.1:3000",
    },
  },
);

electron.on("exit", (code) => {
  shutdown(code ?? 0);
});
