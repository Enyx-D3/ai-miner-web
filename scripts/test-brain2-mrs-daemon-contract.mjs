import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const daemon = spawn(process.execPath, ["scripts/brain2-mrs-daemon.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    BRAIN2_MRS_HOST: "127.0.0.1",
    BRAIN2_MRS_PORT: "4327",
    BRAIN2_MRS_SERVICE_TOKEN: "secret",
    BRAIN2_MRS_MODEL_ID: "__contract_test__",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let started = false;
daemon.stdout.on("data", (chunk) => {
  if (String(chunk).includes("listening")) started = true;
});

daemon.stderr.on("data", () => undefined);

for (let i = 0; i < 40 && !started; i += 1) {
  await new Promise((resolve) => setTimeout(resolve, 100));
}

assert.equal(started, true, "daemon did not start");

const headers = { Authorization: "Bearer secret", "Content-Type": "application/json" };
const health = await fetch("http://127.0.0.1:4327/health", { headers: { Authorization: "Bearer secret" } }).then((r) => r.json());
assert.equal(health.backend, "service");
assert.equal(health.modelId, "__contract_test__");

const unauthorized = await fetch("http://127.0.0.1:4327/health");
assert.equal(unauthorized.status, 401);

const selfTest = await fetch("http://127.0.0.1:4327/self-test", { method: "POST", headers }).then((r) => r.json());
assert.ok("ok" in selfTest);

const review = await fetch("http://127.0.0.1:4327/review", {
  method: "POST",
  headers,
  body: JSON.stringify({ project: { id: "p1", name: "Life Wiki" }, candidates: [{ id: "c1", kind: "idea", statement: "Keep one active ladder", evidenceIds: ["e1"], importance: 0.8, novelty: 0.4, truthConfidence: 0.7 }] }),
}).then((r) => r.json());
assert.ok("proposals" in review || "error" in review);

const hardResidual = await fetch("http://127.0.0.1:4327/hard-residual", {
  method: "POST",
  headers,
  body: JSON.stringify({ task: "Fix the unresolved issue", context: "context" }),
}).then((r) => r.json());
assert.ok("text" in hardResidual || "error" in hardResidual);

const residual = await fetch("http://127.0.0.1:4327/residual", {
  method: "POST",
  headers,
  body: JSON.stringify({ task: "Resolve", context: "context", evidence: [{ id: "e1", type: "truth", text: "evidence", score: 1 }] }),
}).then((r) => r.json());
assert.ok("answer" in residual || "error" in residual);

daemon.kill();
console.log("Brain2 MRS daemon contract PASS");
