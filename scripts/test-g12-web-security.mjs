import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync("src/server/brain2/httpSecurity.ts", "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const module = { exports: {} };
new Function("exports", "module", js)(module.exports, module);
const { readBrain2BoundedJson, BRAIN2_SYNC_PAIRING_BODY_MAX } = module.exports;

const ok = await readBrain2BoundedJson(
  new Request("http://localhost/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ok: true }),
  }),
  1024,
);
if (ok.ok !== true) throw new Error("bounded JSON rejected valid payload");

let rejected = false;
try {
  await readBrain2BoundedJson(
    new Request("http://localhost/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(BRAIN2_SYNC_PAIRING_BODY_MAX) }),
    }),
    BRAIN2_SYNC_PAIRING_BODY_MAX,
  );
} catch { rejected = true; }
if (!rejected) throw new Error("oversized body accepted");

rejected = false;
try {
  await readBrain2BoundedJson(
    new Request("http://localhost/x", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "{}",
    }),
    1024,
  );
} catch { rejected = true; }
if (!rejected) throw new Error("non-JSON content type accepted");

const config = fs.readFileSync("next.config.ts", "utf8");
for (const required of [
  "poweredByHeader: false",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Referrer-Policy",
  "Permissions-Policy",
]) {
  if (!config.includes(required)) throw new Error(`missing Web security config: ${required}`);
}
console.log("G12.4 Web security PASS.");
