import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
const contracts=read("src/lib/brain2/contracts.ts");
const store=read("src/lib/brain2/store.ts");
const types=read("src/lib/brain2/types.ts");
const gc=read("src/lib/brain2/globalContext.ts");
const sidebar=read("src/components/Sidebar/AppSidebar.tsx");
const bridge=read("src/lib/brain2/mcpBrowserBridge.ts");
for(const invariant of ["BRAIN2_SCHEMA_VERSION = 10","B2_STORAGE_V10_LOCKED_MRS_PERSISTENT_INTELLIGENCE"])if(!contracts.includes(invariant))throw new Error(`Missing ${invariant}`);
if(!store.includes("const DB_VERSION = 12"))throw new Error("IndexedDB v12 migration missing");
for(const table of ["mrsRuns","intelligenceSnapshots","wikiSnapshots","notebookSnapshots"]){
  if(!store.includes(`"${table}"`)||!types.includes(`"${table}"`))throw new Error(`Missing shared state family ${table}`);
}
for(const invariant of ["GLOBAL_CONTEXT_RESUME","GLOBAL_CONTEXT_PACKAGE","findAntiReinvention","fullArchiveIncluded: false","EXPLICIT_USER_ACTION"])if(!gc.includes(invariant))throw new Error(`Global Context contract missing ${invariant}`);
if(!sidebar.includes("/continue"))throw new Error("Continue / Handoff route missing from Web UI");
for(const method of ["resumeCapsule","contextPackage","antiReinvention"])if(!bridge.includes(`method === "${method}"`))throw new Error(`MCP bridge missing ${method}`);
console.log("Global Context Web gap-fill static contract PASS");
