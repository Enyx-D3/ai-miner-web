import fs from "node:fs";
import { execFileSync } from "node:child_process";

const syntaxFiles = [
  "extension/service_worker.js",
  "extension/queue_db.js",
  "extension/provider_adapters.js",
  "extension/capture.js",
  "extension/bridge.js",
  "extension/sidepanel.js",
];

for (const file of syntaxFiles) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

for (const file of [
  "extension/sidepanel.html",
  "extension/test-static.mjs",
  "extension/test-provider-adapters.mjs",
]) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
}

const manifest = JSON.parse(fs.readFileSync("extension/manifest.json", "utf8"));

for (const host of ["chatgpt.com", "claude.ai", "gemini.google.com"]) {
  if (!(manifest.host_permissions || []).some((x) => x.includes(host))) {
    throw new Error(`Missing host permission: ${host}`);
  }
}

if (manifest.action?.default_popup) {
  throw new Error("Popup-era manifest regression: toolbar action must open the persistent Side Panel.");
}
if (manifest.side_panel?.default_path !== "sidepanel.html") {
  throw new Error("Current extension must use sidepanel.html as its persistent UI.");
}

const providerScript = (manifest.content_scripts || []).find((entry) =>
  (entry.matches || []).some((x) => x.includes("chatgpt.com"))
);
const js = providerScript?.js || [];
const adaptersAt = js.indexOf("provider_adapters.js");
const captureAt = js.indexOf("capture.js");
if (adaptersAt < 0 || captureAt < 0 || adaptersAt >= captureAt) {
  throw new Error("Provider content script must load provider_adapters.js before capture.js.");
}

const serviceWorker = fs.readFileSync("extension/service_worker.js", "utf8");
if (!serviceWorker.includes('files:["provider_adapters.js","capture.js"]')) {
  throw new Error("Fallback/manual injection must load provider_adapters.js before capture.js.");
}
if (!serviceWorker.includes("openPanelOnActionClick:true")) {
  throw new Error("Toolbar action must open the persistent Side Panel.");
}

console.log(
  `Brain2 extension current-architecture acceptance PASS: manifest + ${syntaxFiles.length} scripts parse, ` +
  "Side Panel is canonical, popup is absent, provider adapter ordering is enforced."
);
