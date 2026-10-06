import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { rmSync } from "node:fs";
const dist=".g12-archive-test-dist";
rmSync(dist,{recursive:true,force:true});
try{
  execFileSync("tsc",["-p","tsconfig.g12-archive-fixtures.json","--pretty","false"],{stdio:"inherit"});
  const require=createRequire(import.meta.url);
  const s=require(join(process.cwd(),dist,"lib/browser-digest/readChatGptZip.js"));
  for(const v of ["conversations.json","nested/conversations-0001.json","Takeout/My Activity/Gemini Apps/MyActivity.json","./nested/./conversations.json"]){
    const n=s.normalizeBrain2ArchiveEntryPath(v); if(!n||n.includes(".."))throw new Error(`safe path failed: ${v}`);
  }
  for(const v of ["../conversations.json","nested/../../conversations.json","/conversations.json","C:\\temp\\conversations.json","\\\\server\\share\\conversations.json","bad\0conversations.json"]){
    let rejected=false; try{s.normalizeBrain2ArchiveEntryPath(v);}catch{rejected=true;}
    if(!rejected)throw new Error(`unsafe path accepted: ${JSON.stringify(v)}`);
  }
  s.assertBrain2ArchiveCompressedSize(1);
  let rejected=false;try{s.assertBrain2ArchiveCompressedSize(s.BRAIN2_ARCHIVE_MAX_COMPRESSED_BYTES+1);}catch{rejected=true;}
  if(!rejected)throw new Error("oversized archive accepted");
  if(s.brain2ArchiveExpansionLimit(1024)!==s.BRAIN2_ARCHIVE_MIN_EXPANSION_BUDGET_BYTES)throw new Error("small budget mismatch");
  if(s.brain2ArchiveExpansionLimit(1024*1024*1024)!==s.BRAIN2_ARCHIVE_MAX_TOTAL_JSON_BYTES)throw new Error("ceiling mismatch");
  console.log("G12.1 archive safety PASS");
}finally{rmSync(dist,{recursive:true,force:true});}
