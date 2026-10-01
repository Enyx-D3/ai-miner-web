import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const forbiddenPath = (path) => {
  if (path === ".env.example") return false;
  if (/^\.env(?:\.|$)/i.test(path)) return true;
  if (/(^|\/)key\.properties$/i.test(path)) return true;
  return /\.(?:pem|key|p12|pfx|jks|keystore)$/i.test(path);
};

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bsk_live_[A-Za-z0-9]{16,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{16,}\b/,
];

const violations = [];
for (const file of tracked) {
  if (forbiddenPath(file)) {
    violations.push(`forbidden tracked secret/artifact path: ${file}`);
    continue;
  }
  if (file.endsWith("test-g12-secret-hygiene.mjs")) continue;
  let size = 0;
  try { size = statSync(file).size; } catch { continue; }
  if (size > 2 * 1024 * 1024) continue;
  let text;
  try { text = readFileSync(file, "utf8"); } catch { continue; }
  if (secretPatterns.some((pattern) => pattern.test(text))) {
    violations.push(`possible hardcoded secret in tracked file: ${file}`);
  }
}
if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log(`G12.4 secret hygiene PASS: ${tracked.length} tracked files checked.`);
