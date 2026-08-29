import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { webcrypto } from "node:crypto";

execFileSync("tsc", ["-p", "tsconfig.v5-fixtures.json", "--pretty", "false"], { stdio: "inherit" });
const require = createRequire(import.meta.url);
const { normalizeArchiveConversation } = require("../.v5-test-dist/archiveNormalize.js");
const { canonicalMessageId } = require("../.v5-test-dist/identity.js");
const { reconcileAtomToTruth } = require("../.v5-test-dist/truthEngine.js");
const { buildPatterns } = require("../.v5-test-dist/patternEngine.js");
const { fingerprintConversation, chooseProject } = require("../.v5-test-dist/projectResolver.js");
const { verifyB2Result } = require("../.v5-test-dist/jobs.js");

globalThis.crypto ??= webcrypto;
function assert(condition, message) { if (!condition) throw new Error(message); }
function message(id, role, text, time) { return { id, author:{ role }, create_time:time, content:{ parts:[text] } }; }

// 1) ChatGPT mapping tree: only active current_node lineage may enter the canonical selected conversation.
const branchFixture = {
  id:"conv-branch", title:"Branch test", current_node:"a2",
  mapping:{
    u1:{ parent:null, children:["a1","a2"], message:message("m-user","user","Choose option",1) },
    a1:{ parent:"u1", children:[], message:message("m-old","assistant","Old regenerated answer",2) },
    a2:{ parent:"u1", children:[], message:message("m-selected","assistant","Selected answer",3) }
  }
};
const normalized = normalizeArchiveConversation(branchFixture,0);
assert(normalized?.selectedBranchId === "a2", "current_node branch was not selected");
assert(normalized?.messages.length === 2, "alternate ChatGPT branch leaked into selected lineage");
assert(normalized?.messages.some(m=>m.text==="Selected answer"), "selected answer missing");
assert(!normalized?.messages.some(m=>m.text==="Old regenerated answer"), "regenerated alternate answer was flattened into selected history");

// 2) Repeated identical turns must remain distinct when structural sequence differs.
const repeatedA = await canonicalMessageId({provider:"chatgpt",conversationId:"c1",sequence:1,role:"user",text:"yes"});
const repeatedB = await canonicalMessageId({provider:"chatgpt",conversationId:"c1",sequence:3,role:"user",text:"yes"});
assert(repeatedA !== repeatedB, "repeated identical turns collapsed to one canonical message ID");

// 3) Current Truth: explicit update supersedes; unqualified opposing value conflicts.
const atom19 = {id:"a19",messageId:"m1",conversationId:"c",projectId:"p",sourceId:"s",kind:"fact",subject:"pricing",canonicalSubject:"pricing",value:"$19",polarity:"POSITIVE",text:"Pricing is $19.",confidence:.9,provenance:["m1"],keywords:["pricing"],hash:"h19"};
const first = await reconcileAtomToTruth(atom19,"user",[]);
assert(first.created?.status === "CURRENT", "first truth was not CURRENT");
const atom29 = {...atom19,id:"a29",messageId:"m2",value:"$29",text:"Going forward pricing is $29.",hash:"h29"};
const second = await reconcileAtomToTruth(atom29,"user",first.writes);
assert(second.relation === "SUPERSEDES", `expected SUPERSEDES, got ${second.relation}`);
assert(second.writes.some(t=>t.atomId==="a19"&&t.status==="SUPERSEDED"), "previous truth was not superseded");
assert(second.created?.status === "CURRENT", "updated truth was not current");
const enabled = {...atom19,id:"ae",messageId:"me",subject:"feature",canonicalSubject:"feature",value:"enabled",text:"Feature is enabled.",hash:"he"};
const enabledTruth = await reconcileAtomToTruth(enabled,"user",[]);
const disabled = {...enabled,id:"ad",messageId:"md",value:"disabled",polarity:"NEGATIVE",text:"Feature is disabled.",hash:"hd"};
const conflict = await reconcileAtomToTruth(disabled,"user",enabledTruth.writes);
assert(conflict.relation === "CONTRADICTS", `expected CONTRADICTS, got ${conflict.relation}`);
assert(conflict.writes.filter(t=>t.status==="CONFLICTING").length === 2, "both sides of contradiction were not marked conflicting");

// 4) Pattern frequency is evidence, not verification. V5 may reach TESTING but never VERIFIED from counts alone.
const patternAtoms = Array.from({length:20},(_,i)=>({id:`pa${i}`,messageId:`pm${i}`,conversationId:`pc${i}`,projectId:`p${i%4}`,sourceId:"s",kind:"decision",subject:"checkpoint recovery",canonicalSubject:"checkpoint recovery",polarity:"POSITIVE",text:`Checkpoint recovery observation ${i}`,confidence:.8,provenance:[`pm${i}`],keywords:["checkpoint","recovery"],hash:`ph${i}`}));
const patterns = await buildPatterns(patternAtoms,[]);
assert(patterns.length===1,"expected one canonical-subject pattern candidate");
assert(patterns[0].status === "TESTING", `frequency should reach TESTING, got ${patterns[0].status}`);
assert(patterns[0].verificationStatus === "NEEDS_TRANSFER_TEST", "pattern should require transfer test");
assert(patterns[0].status !== "VERIFIED", "frequency alone incorrectly verified a pattern");

// 5) Generic titles cannot force unrelated conversations into one project.
const fpA = fingerprintConversation({title:"New chat",messages:[{sequence:0,externalId:"1",role:"user",text:"Design photon lattice resonator spectroscopy calibration"}]});
const fpB = fingerprintConversation({title:"New chat",messages:[{sequence:0,externalId:"2",role:"user",text:"Create restaurant dessert menu chocolate tiramisu plating"}]});
const projectA = {id:"pA",slug:"a",name:"Photon lattice",summary:"",createdAt:"",updatedAt:"",conversationIds:[],atomIds:[],openTickIds:[],tags:fpA.allTerms,entityTerms:fpA.entityTerms};
assert(!chooseProject(fpB,[projectA]).project,"unrelated New chat conversations were merged by generic title");


// 6) B2RESULT may cite only evidence that was actually supplied in the referenced B2JOB.
const allowedEvidence={id:"truth_allowed",type:"truth",text:"Allowed evidence",score:3};
const job={format:"B2JOB",version:1,id:"job_fixture",createdAt:"2026-08-20T00:00:00Z",question:"Q",memoryRoot:"root_fixture",evidenceHash:"eh",evidencePolicy:{limit:1,method:"indexed-deterministic-overlap-v5",boundedContext:true},instructions:[],evidence:[allowedEvidence]};
const provenanceSnapshot={memoryRoot:"root_fixture",truths:[{id:"truth_allowed"},{id:"truth_outside"}],atoms:[],messages:[],transactions:[{id:"tx1",type:"B2JOB",payload:JSON.stringify(job)}]};
const badResult={format:"B2RESULT",version:1,jobId:"job_fixture",answer:"unsupported",evidenceIds:["truth_outside"]};
const provenanceCheck=verifyB2Result(provenanceSnapshot,badResult);
assert(provenanceCheck.status==="FAIL","B2RESULT with non-job evidence was not rejected");
assert(provenanceCheck.outsideJobEvidenceIds.includes("truth_outside"),"outside-job evidence was not identified");

// 7) Extension encrypted queue must survive >2,000 queued records without silent truncation and batch delivery must remain bounded.
const data = {};
let onMessage;
const noopEvent={addListener(){}};
const chrome={
  storage:{local:{async get(keys){if(typeof keys==="string")return{[keys]:data[keys]};const out={};for(const key of keys||[])out[key]=data[key];return out;},async set(value){Object.assign(data,value);}}},
  runtime:{onInstalled:noopEvent,onStartup:noopEvent,onMessage:{addListener(fn){onMessage=fn;}}},
  alarms:{create(){},onAlarm:noopEvent},tabs:{async query(){return[];}},scripting:{async unregisterContentScripts(){},async registerContentScripts(){}},permissions:{async request(){return true;}}
};
const context={chrome,crypto:webcrypto,TextEncoder,TextDecoder,btoa,atob,URL,console,setTimeout,clearTimeout};vm.createContext(context);vm.runInContext(fs.readFileSync("extension/service_worker.js","utf8"),context);
function send(message){return new Promise((resolve,reject)=>{try{const open=onMessage(message,{},resolve);if(!open)resolve(undefined);}catch(error){reject(error);}});}
let response=await send({type:"BRAIN2_UNLOCK",passphrase:"v5-regression"});assert(response.ok,"extension vault unlock failed");
for(let i=0;i<2005;i++){response=await send({type:"BRAIN2_CAPTURE",record:{id:`ext_${i}`,provider:"chatgpt",conversationExternalId:"c",conversationTitle:"T",sequence:i,role:"user",text:`message ${i}`,url:"https://chatgpt.com/c/1"}});assert(response.ok,`capture ${i} failed`);}
let status=await send({type:"BRAIN2_STATUS"});assert(status.queueCount===2005,`queue truncated: expected 2005, got ${status.queueCount}`);
response=await send({type:"BRAIN2_GET_BATCH"});assert(response.records.length===250,"delivery batch is not bounded to 250");assert(response.hasMore===true,"hasMore missing for oversized queue");
await send({type:"BRAIN2_ACK",acceptedIds:response.records.map(r=>r.id)});status=await send({type:"BRAIN2_STATUS"});assert(status.queueCount===1755,"partial ACK did not preserve remaining encrypted queue");

// 8) Bridge hardening/static invariants.
const bridge=fs.readFileSync("extension/bridge.js","utf8");
assert(bridge.includes("event.origin !== targetOrigin"),"bridge does not enforce exact origin");
assert(bridge.includes("bridgeNonce"),"bridge nonce missing");
assert(!bridge.includes('postMessage({ type: "BRAIN2_EXTENSION_BATCH", batchId: activeBatch, records: response.records }, "*")'),"legacy wildcard bridge still present");
const capture=fs.readFileSync("extension/capture.js","utf8");
assert(capture.includes("isGenerating()"),"capture completion gate missing");
assert(capture.includes("turn.sequence"),"structural sequence missing from extension identity");

console.log("V5 regression PASS: branch lineage, repeated-turn identity, truth reconciliation, pattern verification gate, generic-title isolation, B2RESULT job-membership provenance, >2K encrypted queue, bounded batches, exact-origin bridge.");
