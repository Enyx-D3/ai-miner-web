import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { rmSync } from "node:fs";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
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
  const nested=zipSync({
    "android/app/src/main/kotlin/com/example/MainActivity.kt":strToU8("class MainActivity {}"),
    "android/key.properties":strToU8("secret=must-never-leave-archive"),
  });
  const conversation={id:"c1",title:"My Example Project",mapping:{n1:{parent:null,children:[],message:{
    id:"msg-1",author:{role:"user"},content:{content_type:"text",parts:["Here is code:\n```dart\nvoid main() {}\n```"]},
  }}},current_node:"n1"};
  const outer=zipSync({
    "export/conversations-000.json":strToU8(JSON.stringify([conversation])),
    "export/library_files.json":strToU8(JSON.stringify([
      {file_id:"file_abc",file_name:"model_downloader.dart",file_extension:"dart",file_size_bytes:15,origination_thread_id:"c1"},
      {file_id:"file_xyz",file_name:"android.zip",file_extension:"zip",file_size_bytes:nested.length,origination_thread_id:"c1"},
      {file_id:"file_skip",file_name:"key.properties",file_extension:"properties",file_size_bytes:30,origination_thread_id:"c1"},
    ])),
    "export/file_abc.dat":strToU8("void loadModel() {}"),
    "export/file_xyz.dat":nested,
    "export/file_skip.dat":strToU8("secret=do-not-ingest"),
  });
  const upload=new File([outer],"chatgpt.zip",{type:"application/zip"});
  const parsed=await s.extractConversationJsonBytes(upload);
  assert.equal(parsed.conversationCount,1);
  assert.equal(parsed.codeFiles.length,2);
  const sources=await s.extractChatGptCodeAttachments(upload,parsed.codeFiles);
  assert.equal(sources.length,2);
  assert.deepEqual(sources.map(x=>x.language).sort(),["dart","kotlin"]);
  assert.equal(sources.some(x=>x.content.includes("secret=")),false);
  assert.deepEqual(sources,await s.extractChatGptCodeAttachments(upload,parsed.codeFiles));
  console.log("G12.1 archive safety PASS");
}finally{rmSync(dist,{recursive:true,force:true});}
