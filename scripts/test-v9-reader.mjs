import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
const root=process.cwd(),dist=join(root,".v9-reader-test-dist");rmSync(dist,{recursive:true,force:true});
execFileSync(process.platform==="win32"?"tsc.cmd":"tsc",["-p","tsconfig.v9-reader-fixtures.json","--pretty","false"],{stdio:"inherit"});
const reader=await import(pathToFileURL(join(dist,"asifReaderCore.js")));
const docs=[
{id:"s1",kind:"message",recordId:"m1",terms:["alpha","project"],text:"Alpha project current plan",projectId:"p1",createdAt:"2026-08-23"},
{id:"s2",kind:"message",recordId:"m2",terms:["beta"],text:"Beta unrelated",projectId:"p1",createdAt:"2026-08-22"},
{id:"s3",kind:"truth",recordId:"t1",terms:["alpha","current"],text:"Alpha is current",projectId:"p1",status:"CURRENT",createdAt:"2026-08-23"}
];
const records={m1:{id:"m1",text:"Alpha project current plan"},m2:{id:"m2",text:"Beta unrelated"},t1:{id:"t1",text:"Alpha is current"}};
const adapter={recentDocs:async(k,l,p)=>docs.filter(d=>d.kind===k&&(!p||d.projectId===p)).slice(0,l),docsForTerm:async(k,t,l,p)=>docs.filter(d=>d.kind===k&&d.terms.includes(t)&&(!p||d.projectId===p)).slice(0,l),hydrate:async(k,ids)=>ids.map(id=>records[id]).filter(Boolean)};
const r=await reader.runASIFReaderQuery(adapter,"message","alpha project",10,"p1");if(r.plan.owner!=="ASIF_READER"||r.plan.retrievalOwner!=="RAPIDRETRIEVE")throw new Error("Reader ownership wrong");if(r.records[0]?.id!=="m1")throw new Error("Selective reader retrieval failed");
const truth=await reader.runASIFReaderQuery(adapter,"truth","current alpha",10,"p1");if(truth.records[0]?.id!=="t1")throw new Error("Current-truth selective retrieval failed");
console.log("V9 Reader smoke PASS: ASIF Reader/RapidRetrieve query planning + bounded selective hydration.");rmSync(dist,{recursive:true,force:true});
