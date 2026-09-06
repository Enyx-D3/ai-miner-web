import { spawn } from "node:child_process";
import process from "node:process";

const host = process.env.BRAIN2_MRS_HOST || "127.0.0.1";
const port = process.env.BRAIN2_MRS_PORT || "4317";
const targetUrl = `http://${host}:${port}/health`;

async function healthOk() {
  try {
    const response = await fetch(targetUrl);
    if (!response.ok) return false;
    const body = await response.json().catch(() => ({}));
    return body?.backend === "service";
  } catch {
    return false;
  }
}

if (await healthOk()) {
  process.stdout.write(`Brain2 MRS daemon already healthy at ${targetUrl}\n`);
  process.exit(0);
}

const child = spawn(process.execPath, ["scripts/brain2-mrs-daemon.mjs"], {
  cwd: process.cwd(),
  detached: true,
  stdio: "ignore",
  env: {
    ...process.env,
    BRAIN2_MRS_HOST: host,
    BRAIN2_MRS_PORT: port,
  },
});

child.unref();

for (let i = 0; i < 25; i += 1) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (await healthOk()) {
    process.stdout.write(`Brain2 MRS daemon started at ${targetUrl}\n`);
    process.exit(0);
  }
}

process.stderr.write(`Brain2 MRS daemon did not become healthy at ${targetUrl}\n`);
process.exit(1);
