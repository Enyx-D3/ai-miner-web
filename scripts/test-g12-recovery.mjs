import fs from "node:fs";
import ts from "typescript";

const source=fs.readFileSync("src/lib/brain2/recovery.ts","utf8");
const js=ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
const module={exports:{}};
new Function("exports","module",js)(module.exports,module);
const {journalNeedsRecovery,recoverInterruptedJournal}=module.exports;

for(const status of ["RECEIVED","NORMALIZED","COMMITTING"]){
  if(!journalNeedsRecovery(status))throw new Error(`${status} was not marked recoverable`);
  const original={id:"j1",status,updatedAt:"old",error:undefined};
  const recovered=recoverInterruptedJournal(original,"2026-09-08T00:00:00.000Z");
  if(recovered.status!=="FAILED")throw new Error(`${status} did not recover to FAILED`);
  if(!String(recovered.error).includes("replay"))throw new Error("recovery guidance missing");
  if(original.status!==status)throw new Error("recovery mutated original record");
}
for(const status of ["COMMITTED","DERIVED","FAILED"]){
  if(journalNeedsRecovery(status))throw new Error(`${status} incorrectly marked recoverable`);
  const original={id:"j2",status,updatedAt:"old"};
  if(recoverInterruptedJournal(original,"now")!==original)throw new Error(`${status} should remain unchanged`);
}
console.log("G12.2 Web restart journal recovery PASS");
