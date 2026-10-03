import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const embedded = path.resolve(process.argv[2] || "extension");
const upstream = path.resolve(process.argv[3] || "../ai-miner-extention");
function req(ok, msg) { if (!ok) throw new Error(msg); }
function read(root, file) { return fs.readFileSync(path.join(root, file)); }
function sha(buf) { return crypto.createHash("sha256").update(buf).digest("hex"); }

const exactFiles = [
  "provider_adapters.js",
  "capture.js",
  "bridge.js",
  "service_worker.js",
  "queue_db.js",
  "sidepanel.html",
  "sidepanel.js",
  "test-static.mjs",
  "test-provider-adapters.mjs"
];

for (const file of exactFiles) {
  const a = read(upstream, file);
  const b = read(embedded, file);
  req(Buffer.compare(a, b) === 0, `${file} drift: upstream=${sha(a)} embedded=${sha(b)}`);
}

function normalizeManifest(raw) {
  const value = JSON.parse(raw.toString("utf8"));
  delete value.name;
  const loopback = new Set([
    "http://localhost:3000/*",
    "http://127.0.0.1:3000/*"
  ]);
  if (Array.isArray(value.host_permissions)) {
    value.host_permissions = value.host_permissions.filter(x => !loopback.has(x)).sort();
  }
  if (Array.isArray(value.optional_host_permissions)) value.optional_host_permissions.sort();
  if (Array.isArray(value.permissions)) value.permissions.sort();
  if (Array.isArray(value.content_scripts)) {
    value.content_scripts = value.content_scripts.map(item => ({
      ...item,
      matches: Array.isArray(item.matches) ? item.matches.filter(x => !loopback.has(x)).sort() : item.matches
    }));
  }
  return value;
}

const upManifest = normalizeManifest(read(upstream, "manifest.json"));
const webManifest = normalizeManifest(read(embedded, "manifest.json"));
req(JSON.stringify(upManifest) === JSON.stringify(webManifest), "manifest drift outside allowed name/loopback-origin deltas");

console.log("Brain2 standalone ↔ Web embedded extension parity PASS");
