import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
const html=read("sidepanel.html"),js=read("sidepanel.js"),worker=read("service_worker.js"),bridge=read("bridge.js");
for(const v of ["Context","Capture","Connection","Bounded handoff","PREVIEW ONLY"])if(!html.includes(v))throw new Error(`Extension UI missing ${v}`);
for(const v of ["BRAIN2_CONTEXT_PREVIEW_UPDATE","BRAIN2_CLEAR_CONTEXT_PREVIEW","contextPreview"])if(!worker.includes(v))throw new Error(`Extension worker missing ${v}`);
for(const v of ["BRAIN2_CONTEXT_PREVIEW","BRAIN2_CONTEXT_PREVIEW_CLEAR"])if(!bridge.includes(v))throw new Error(`Extension bridge missing ${v}`);
if(!js.includes("/continue"))throw new Error("Extension prepare-context route missing");
console.log("brain2:inContext extension gap-fill static contract PASS");
