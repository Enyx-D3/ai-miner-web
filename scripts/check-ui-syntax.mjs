import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const files = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(ent.name)) files.push(p);
  }
}

walk("src");

let errors = 0;
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const scriptKind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.ES2022,
    true,
    scriptKind,
  );

  for (const d of parsed.parseDiagnostics ?? []) {
    if (d.category !== ts.DiagnosticCategory.Error) continue;
    errors += 1;
    const pos = d.start !== undefined
      ? parsed.getLineAndCharacterOfPosition(d.start)
      : undefined;
    console.error(
      `${file}${pos ? `:${pos.line + 1}:${pos.character + 1}` : ""}: ` +
      ts.flattenDiagnosticMessageText(d.messageText, " "),
    );
  }
}

if (errors) process.exit(1);
console.log(`UI/source syntax PASS: ${files.length} TS/TSX declaration/source files parsed independently.`);
