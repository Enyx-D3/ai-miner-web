import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { TextEncoder, TextDecoder } from 'node:util';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);

function loadTs(path) {
  const source=fs.readFileSync(path,'utf8');
  const out=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,strict:true}}).outputText;
  const module={exports:{}};
  const context={module,exports:module.exports,require,console,crypto:webcrypto,TextEncoder,TextDecoder,setTimeout,clearTimeout};
  vm.runInNewContext(`(function(exports,module,require){${out}\n})(exports,module,require);`,context,{filename:path});
  return module.exports;
}

const planner=loadTs('src/lib/brain2/sharedQueryPlanner.ts');
const continuity=loadTs('src/lib/brain2/continuityIntelligence.ts');
const vectors=[
 ['receipt: abcdef123456',1,'EXACT','FAST','B_250_CHUNK','154fbc413bc7bd12c4351896f40cfc36486ccab540b71791e09aa1903c6a1121'],
 ['what is the current status now?',1,'TEMPORAL','STANDARD','F_TEMPORAL_TRUTH','cfb2de2193f81ac958e3806a7470a2728211fb338a2ed724d2b8d0cdf7f72fea'],
 ['what are we using now?',1,'TEMPORAL','STANDARD','F_TEMPORAL_TRUTH','a5997b2f2b082ac539b4fa0fc5e730e44013ac01164bec5aaced0c2d355dbd97'],
 ['find the contradiction between these decisions',1,'CONTRADICTION','STANDARD','F_TEMPORAL_TRUTH','7e21f30073eb278ca6ff10300df9c307113b5798992634c640cdca4ca5d5eb58'],
 ['why did this fail and what repair worked?',1,'FAILURE','STANDARD','G_ADAPTIVE_HETEROGENEOUS','89c50b84de943790cd83bd6edd9423e354201b533b7809e974f5fa01442f93f4'],
 ['why does this module depend on the router?',1,'SEMANTIC','STANDARD','G_ADAPTIVE_HETEROGENEOUS','b97189fc0cce6ae6ea572d0d3ea7ca6ebc381b36e80e28b9a4f87e814ab591a2'],
 ['explain the memory architecture',1,'SEMANTIC','FAST','B_250_CHUNK','45114cd9bdb1e9323cde219ec377cbfc8a8dfb1393c0b34209ba54aefe7a6bf3'],
 ['deep archaeology trace back the full lineage',1,'GENEALOGY_ARCHAEOLOGY','DEEP','G_ADAPTIVE_HETEROGENEOUS','a88347173c462dc65276ab5b51a96d877af81f4028ccd8e1cb1e0323cebd5e13'],
 ['deep search implementation history',1,'GENEALOGY_ARCHAEOLOGY','DEEP','G_ADAPTIVE_HETEROGENEOUS','10f1c10c5917280ec5704b7b203d5fb8033978371ef02f991412ecf536fc08ce'],
 ['compare across projects',2,'MULTI_PROJECT','STANDARD','G_ADAPTIVE_HETEROGENEOUS','058b52514817e5c07f5faa44e8529308ce15bade697dc0d4a35b7797400ed59d'],
]
for(const [query,projectCount,queryClass,mode,route,hash] of vectors){const p=planner.planSharedQuery(query,{projectCount});assert.equal(p.queryClass,queryClass);assert.equal(p.mode,mode);assert.equal(p.route,route);assert.equal(await planner.hashSharedQueryPlan(p),hash);}
const built=await continuity.buildContinuitySnapshot({project:{id:'p',name:'P',summary:'Ship continuity'},atoms:[{id:'a',projectId:'p',kind:'task',text:'Ship continuity',provenance:['m']}],truths:[{id:'t',projectId:'p',kind:'task',text:'Ship continuity',status:'CURRENT',atomId:'a',evidenceAtomIds:['a'],updatedAt:'2026-10-03'}],ticks:[{id:'tick',projectId:'p',title:'Approve',detail:'Human approval',status:'OPEN',actionType:'APPROVE',evidenceAtomIds:['a']}],failures:[],verifications:[]});
assert.equal(built.snapshot.kind,'CONTINUITY_INTELLIGENCE');assert.ok(built.atomUpdates[0].goalId);assert.ok(built.snapshot.checklist.some(x=>x.status==='GATE'));
const item=built.snapshot.checklist.find(x=>x.sourceType==='ATOM');await assert.rejects(()=>continuity.completeContinuityChecklistItem(built.snapshot,item.id,{evidenceAtomIds:['a'],verificationIds:[],authorizationRefs:['r1']}));

const continuitySourceHash=await continuity.hashContinuitySourceState({projectId:'p',goalText:'Ship continuity',atoms:[{id:'a',projectId:'p',kind:'task',text:'Ship continuity',createdAt:'2026-10-03'}],truths:[{id:'t',projectId:'p',kind:'task',text:'Ship continuity',status:'CURRENT',updatedAt:'2026-10-03'}],ticks:[{id:'k',projectId:'p',title:'Approve',detail:'Human approval',status:'OPEN',actionType:'APPROVE'}],failures:[{id:'f',projectId:'p',title:'Old failure',cause:'Bad route',lastSeenAt:'2026-10-02'}]});
assert.equal(continuitySourceHash,'802148b176c8e2496bd1a17e329eb4875d4293634cb5c37a89e83ab199d7d865');
assert.equal(await continuity.continuityStableId('goal','p','Ship continuity'),'goal_2f0bd589d83e0c366a21fa65');
assert.equal(await continuity.continuityStableId('check','p','TICK','k'),'check_2b155c9e94d40cdb160c6e67');
const parityState={format:'B2_CONTINUITY',version:1,kind:'CONTINUITY_INTELLIGENCE',projectId:'p',sourceHash:continuitySourceHash,goal:{id:'goal_2f0bd589d83e0c366a21fa65',text:'Ship continuity',evidenceAtomIds:['a']},checklist:[{id:'check_2b155c9e94d40cdb160c6e67',projectId:'p',goalId:'goal_2f0bd589d83e0c366a21fa65',sourceType:'TICK',sourceRefId:'k',title:'Approve: Human approval',status:'GATE',evidenceAtomIds:['a'],verificationIds:[],authorizationRefs:[],blockedByIds:[],updatedAt:'IGNORED'},{id:'check_504956e09d241db1f358a685',projectId:'p',goalId:'goal_2f0bd589d83e0c366a21fa65',sourceType:'ATOM',sourceRefId:'a',title:'Ship continuity',status:'OPEN',evidenceAtomIds:['m'],verificationIds:[],authorizationRefs:[],blockedByIds:[],updatedAt:'IGNORED'}],avoidedWorkLedger:[],recap:{currentTruthCount:1,open:1,blocked:0,gates:1,done:0,unknown:0,knownFailureCount:1,recentChangeCount:0},prescription:['Resolve human gate: Approve: Human approval','Continue: Ship continuity'],plannerVersion:'B2_QUERY_PLANNER_V1'};
assert.equal(await continuity.hashContinuityStateMaterial(parityState),'f1b3f45e8f99c489032ce8a89caae5cc1f3a964593230da9f2435e0215141bf3');
console.log('Global Context Phase 2 Web continuity + shared planner PASS');

// Integration contract: core modules passing is insufficient if product wiring is absent.
const typesSource=fs.readFileSync('src/lib/brain2/types.ts','utf8');
const routerSource=fs.readFileSync('src/lib/brain2/retrievalRouter.ts','utf8');
const storeSource=fs.readFileSync('src/lib/brain2/store.ts','utf8');
const globalContextSource=fs.readFileSync('src/lib/brain2/globalContext.ts','utf8');
const bridgeSource=fs.readFileSync('src/lib/brain2/mcpBrowserBridge.ts','utf8');
assert.match(typesSource,/goalId\?: string;/);
assert.match(typesSource,/dependencyIds\?: string\[\];/);
assert.match(typesSource,/telemetryKind\?: "RETRIEVAL" \| "RESPONSIVENESS" \| "FRICTION";/);
assert.match(routerSource,/planSharedQuery\(query\)/);
assert.match(storeSource,/refreshContinuityIntelligenceSnapshots/);
assert.match(storeSource,/verifyR1AuthorityReceipt/);
assert.match(storeSource,/authorization is not bound to this checklist item or its evidence/);
assert.match(storeSource,/recordContinuityFriction/);
assert.match(storeSource,/recordAvoidedWorkEvent/);
assert.match(storeSource,/replayGlobalContextAnswer/);
assert.match(globalContextSource,/findContinuitySnapshot/);
assert.match(globalContextSource,/CONTINUITY PRESCRIPTION/);
assert.match(bridgeSource,/method === "continuity"/);
assert.match(bridgeSource,/method === "answerUpgrade"/);
assert.match(bridgeSource,/method === "queryPlan"/);
console.log('Global Context Phase 2 Web integration contract PASS');
