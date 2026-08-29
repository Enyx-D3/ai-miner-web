import fs from "node:fs";
import { execFileSync } from "node:child_process";
const files = ["extension/service_worker.js","extension/queue_db.js","extension/capture.js","extension/bridge.js","extension/popup.js"];
for (const file of files) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}
const manifest = JSON.parse(fs.readFileSync("extension/manifest.json","utf8"));
for (const host of ["chatgpt.com","claude.ai","gemini.google.com"]) {
  if (!(manifest.host_permissions || []).some((x) => x.includes(host))) throw new Error(`Missing host permission: ${host}`);
}
console.log("Brain2 extension acceptance PASS: manifest + 5 scripts parse, provider hosts present.");
