import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { webcrypto } from "node:crypto";

execFileSync("tsc",["-p","tsconfig.v6-fixtures.json","--pretty","false"],{stdio:"inherit"});
const require=createRequire(import.meta.url);
const {normalizeArchiveConversation}=require("../.v6-test-dist/archiveNormalize.js");
const {canonicalMessageId}=require("../.v6-test-dist/identity.js");
const {atomizeMessage}=require("../.v6-test-dist/atomizer.js");
const {reconcileAtomToTruth}=require("../.v6-test-dist/truthEngine.js");
const {buildPatterns}=require("../.v6-test-dist/patternEngine.js");
const {evaluatePattern,createPatternTest,createPortableExpertise}=require("../.v6-test-dist/patternLab.js");
const {planRetrieval}=require("../.v6-test-dist/retrievalRouter.js");
const {compileB2Job,verifyB2Result}=require("../.v6-test-dist/jobs.js");
const {buildReasoningRequest,validateReasoningResult}=require("../.v6-test-dist/reasoning.js");
globalThis.crypto??=webcrypto;
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
function message(id,role,text,time){return{id,author:{role},create_time:time,content:{parts:[text]}};}

// V5 correctness invariants remain mandatory.
const branchFixture={id:"conv-branch",title:"Branch test",current_node:"a2",mapping:{u1:{parent:null,children:["a1","a2"],message:message("m-user","user","Choose option",1)},a1:{parent:"u1",children:[],message:message("m-old","assistant","Old regenerated answer",2)},a2:{parent:"u1",children:[],message:message("m-selected","assistant","Selected answer",3)}}};
const normalized=normalizeArchiveConversation(branchFixture,0);assert(normalized?.messages.length===2,"alternate ChatGPT branch leaked");assert(!normalized?.messages.some(m=>m.text.includes("Old regenerated")),"wrong branch retained");
const repeatA=await canonicalMessageId({provider:"chatgpt",conversationId:"c",sequence:1,role:"user",text:"yes"});const repeatB=await canonicalMessageId({provider:"chatgpt",conversationId:"c",sequence:3,role:"user",text:"yes"});assert(repeatA!==repeatB,"repeated turns collapsed");

// V6 deterministic atom structure: explicit assignment produces stable subject/value and scope.
const candidates=atomizeMessage("Going forward AI Miner model is Qwen3-0.6B in this release.","user");assert(candidates[0]?.canonicalSubject.includes("ai miner model"),`bad structured subject: ${candidates[0]?.canonicalSubject}`);assert(candidates[0]?.value?.includes("qwen3-0.6b"),"assignment value missing");assert(candidates[0]?.scope?.includes("this release"),"scope extraction missing");
const split=atomizeMessage("Plan A costs $29 and includes offline export.","user");assert(split.length>=2,"measured conservative independent-change split was not absorbed");assert(split.some(a=>a.ruleTrace?.includes("clause_lite")||a.ruleTrace?.includes("independent_change")),"atom rule trace missing");
const relationGuard=atomizeMessage("If verification fails, the result must not be promoted because provenance is incomplete.","user");assert(relationGuard.length===1&&relationGuard[0]?.ruleTrace?.includes("relation_guard"),"conditional/causal relation was split unsafely");

// Current Truth respects explicit supersession and scope separation.
const baseAtom={id:"a1",messageId:"m1",conversationId:"c",projectId:"p",sourceId:"s",kind:"fact",subject:"AI Miner model",canonicalSubject:"ai miner model",value:"model a",polarity:"POSITIVE",text:"AI Miner model is Model A.",confidence:.9,provenance:["m1"],keywords:["miner","model"],hash:"h1"};
const first=await reconcileAtomToTruth(baseAtom,"user",[]);const updated={...baseAtom,id:"a2",messageId:"m2",value:"qwen3-0.6b",text:"Going forward AI Miner model is Qwen3-0.6B.",hash:"h2"};const second=await reconcileAtomToTruth(updated,"user",first.writes);assert(second.relation==="SUPERSEDES","explicit update did not supersede");
const scoped={...baseAtom,id:"a3",messageId:"m3",scope:"experiment alpha",value:"model z",text:"AI Miner model is Model Z in Experiment Alpha.",hash:"h3"};const scopedResult=await reconcileAtomToTruth(scoped,"user",first.writes);assert(["DIFFERENT_SCOPE","UNCERTAIN"].includes(scopedResult.relation),"scope-specific truth was treated as global overwrite");

// Pattern Lab: frequency alone stops at TESTING; explicit replication + falsification + 2 transfer domains promotes.
const patternAtoms=Array.from({length:20},(_,i)=>({id:`pa${i}`,messageId:`pm${i}`,conversationId:`pc${i}`,projectId:`p${i%4}`,sourceId:"s",kind:"decision",subject:"checkpoint recovery",canonicalSubject:"checkpoint recovery",polarity:"POSITIVE",text:`Checkpoint recovery observation ${i}`,confidence:.8,provenance:[`pm${i}`],keywords:["checkpoint","recovery"],hash:`ph${i}`}));
let patterns=await buildPatterns(patternAtoms,[]);const candidate=patterns[0];assert(candidate.status==="TESTING"&&candidate.status!=="VERIFIED","frequency alone verified a pattern");
const tests=[];tests.push(await createPatternTest({patternId:candidate.id,kind:"REPLICATION",projectId:"replica",domain:"runtime",status:"PASS",hypothesis:"replicates",result:"replicated",evidenceAtomIds:["pa1"],verifier:"fixture"}));tests.push(await createPatternTest({patternId:candidate.id,kind:"FALSIFICATION",projectId:"falsify",domain:"runtime",status:"PASS",hypothesis:"survives adversarial test",result:"no falsifier found",evidenceAtomIds:["pa2"],verifier:"fixture"}));tests.push(await createPatternTest({patternId:candidate.id,kind:"TRANSFER",projectId:"transfer1",domain:"browser",status:"PASS",hypothesis:"transfers",result:"pass",evidenceAtomIds:["pa3"],verifier:"fixture"}));tests.push(await createPatternTest({patternId:candidate.id,kind:"TRANSFER",projectId:"transfer2",domain:"mobile",status:"PASS",hypothesis:"transfers",result:"pass",evidenceAtomIds:["pa4"],verifier:"fixture"}));
const evaluation=evaluatePattern(candidate,tests);assert(evaluation.status==="VERIFIED"&&evaluation.maturity==="L6_GENERALIZED","explicit Pattern Lab evidence failed to verify generalized pattern");
const expertise=await createPortableExpertise({...candidate,...evaluation},tests,{triggerConditions:["worker can disappear"],procedure:["checkpoint before lease boundary","resume from committed checkpoint"],verifier:"B2VERIFY"});assert(expertise.transferDomains.length===2&&expertise.provenanceAtomIds.length>0,"Portable Expertise lost transfer/provenance data");

// Retrieval router implements recovered B/F/G canon.
assert(planRetrieval("What is the current AI Miner model now?").route==="F_TEMPORAL_TRUTH","temporal query did not route to F");assert(planRetrieval("Compare the relationship across projects").route==="G_ADAPTIVE_HETEROGENEOUS","relationship query did not route to G");assert(planRetrieval("Find checkpoint recovery").route==="B_250_CHUNK","ordinary recall query did not route to B");

// B2JOB v2 carries a hashed Databox and B2RESULT must bind to it.
const truth={id:"t1",projectId:"p",atomId:"pa1",text:"Current model is Qwen3-0.6B",kind:"fact",status:"CURRENT",confidence:.95,updatedAt:"2026-08-20T00:00:00Z",key:"k"};
const snapshot={version:1,memoryRoot:"root",messages:[],atoms:patternAtoms.slice(0,1),truths:[truth],conversations:[],transactions:[],projects:[],sources:[],ticks:[],decisions:[],patterns:[],experiments:[],missions:[],checkpoints:[],mutations:[],devices:[],verifications:[],journals:[],contextVaultRuns:[],patternTests:[],portableExpertise:[],databoxes:[],retrievalTelemetry:[],loaded:true};
const job=await compileB2Job(snapshot,"What is the current model?","p",8);assert(job.version===2&&job.databox.format==="B2DATABOX"&&job.databox.hash,"B2JOB lacks Databox");snapshot.transactions=[{id:"tx",type:"B2JOB",payload:JSON.stringify(job),createdAt:"",hash:""}];
const cited=job.evidence[0]?.id;assert(cited,"fixture B2JOB returned no evidence");let check=verifyB2Result(snapshot,{format:"B2RESULT",version:2,jobId:job.id,answer:"Qwen",evidenceIds:[cited],databoxHash:"wrong"});assert(check.status==="FAIL"&&!check.databoxMatches,"wrong Databox hash accepted");check=verifyB2Result(snapshot,{format:"B2RESULT",version:2,jobId:job.id,answer:"Qwen",evidenceIds:[cited],databoxHash:job.databox.hash});assert(check.status==="PASS","correct Databox-bound result rejected");

// Reasoning is contract-bound and can propose, never directly mutate memory.
const request=await buildReasoningRequest({task:"Answer",databox:job.databox,effort:"BALANCED"});assert(request.memoryWritePolicy==="PROPOSE_ONLY"&&request.maxIterations===4,"reasoning control contract wrong");const goodReason={format:"B2_REASONING_RESULT",version:1,requestId:request.requestId,answer:"x",evidenceIds:[cited],verification:"PASS",residuals:[],terminationReason:"verified",proposedMemoryMutations:[],artifacts:[],createdAt:new Date().toISOString()};assert(validateReasoningResult(request,job.databox,goodReason).status==="PASS","valid reasoning result rejected");assert(validateReasoningResult(request,job.databox,{...goodReason,evidenceIds:["outside"]}).status==="FAIL","reasoning cited outside Databox evidence");

// Extension fallback keeps >2K records; production source contains the IndexedDB durable queue path.
const data={};let onMessage;const noopEvent={addListener(){}};const chrome={storage:{local:{async get(keys){if(typeof keys==="string")return{[keys]:data[keys]};const out={};for(const key of keys||[])out[key]=data[key];return out;},async set(value){Object.assign(data,value);}}},runtime:{onInstalled:noopEvent,onStartup:noopEvent,onMessage:{addListener(fn){onMessage=fn;}}},alarms:{create(){},onAlarm:noopEvent},tabs:{async query(){return[];}},scripting:{async unregisterContentScripts(){},async registerContentScripts(){}}};const context={chrome,crypto:webcrypto,TextEncoder,TextDecoder,btoa,atob,URL,console,setTimeout,clearTimeout};vm.createContext(context);vm.runInContext(fs.readFileSync("extension/service_worker.js","utf8"),context);function send(message){return new Promise((resolve,reject)=>{try{const open=onMessage(message,{},resolve);if(!open)resolve(undefined);}catch(error){reject(error);}});}await send({type:"BRAIN2_UNLOCK",passphrase:"v6"});for(let i=0;i<2005;i++)await send({type:"BRAIN2_CAPTURE",record:{id:`e${i}`,provider:"chatgpt",conversationExternalId:"c",conversationTitle:"t",sequence:i,role:"user",text:`m${i}`,url:"https://chatgpt.com/c/1"}});const status=await send({type:"BRAIN2_STATUS"});assert(status.queueCount===2005,"extension queue truncated");const queueSource=fs.readFileSync("extension/queue_db.js","utf8");assert(queueSource.includes("indexedDB.open")&&queueSource.includes('createIndex("byRecordId"'),"V6 encrypted IndexedDB queue implementation missing");assert(fs.readFileSync("extension/service_worker.js","utf8").includes('importScripts("queue_db.js")'),"service worker does not load durable queue");

console.log("V6 regression PASS: V5 invariants + relation-safe structured atomization, Pattern Lab explicit promotion, Portable Expertise, B/F/G retrieval routing, hashed Databox provenance, reasoning proposal-only contract, durable >2K encrypted queue.");
