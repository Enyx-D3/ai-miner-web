import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const tscPath=execFileSync("bash",["-lc","readlink -f $(which tsc)"],{encoding:"utf8"}).trim();
const tsPath=path.resolve(path.dirname(tscPath),"../lib/typescript.js");
const ts=await import(`file://${tsPath}`);
const files=[];
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p);else if(/\.tsx?$/.test(ent.name))files.push(p);}}
walk("src");
let errors=0;
for(const file of files){const source=fs.readFileSync(file,"utf8");const out=ts.transpileModule(source,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,isolatedModules:true}});for(const d of out.diagnostics??[]){if(d.category!==ts.DiagnosticCategory.Error)continue;errors++;const pos=d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start):undefined;console.error(`${file}${pos?`:${pos.line+1}:${pos.character+1}`:""}: ${ts.flattenDiagnosticMessageText(d.messageText," ")}`);}}
if(errors)process.exit(1);
console.log(`UI/source syntax PASS: ${files.length} TS/TSX files transpiled independently.`);
