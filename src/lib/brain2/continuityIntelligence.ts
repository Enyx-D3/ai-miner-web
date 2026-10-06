export const CONTINUITY_VERSION = "B2_CONTINUITY_INTELLIGENCE_V1" as const;
export const CONTINUITY_PLANNER_VERSION = "B2_QUERY_PLANNER_V1" as const;

export type ContinuityChecklistStatus = "OPEN" | "BLOCKED" | "GATE" | "DONE" | "UNKNOWN";
export type AnswerReplayStatus = "VALID" | "STALE" | "CONTRADICTED" | "MISSING" | "UNVERIFIED";
export type FrictionEventType = "REEXPLANATION" | "REPEATED_SEARCH" | "CONTEXT_REENTRY" | "USER_CORRECTION" | "FAILED_RETRIEVAL" | "REINVENTION_HIT" | "ABANDONED_RESTART";
export type AvoidedWorkKind = "REUSED_CURRENT_TRUTH" | "REUSED_FAILURE_MEMORY" | "REUSED_CONTEXT_PACKAGE" | "SKIPPED_DUPLICATE_SEARCH" | "SKIPPED_REINVENTION";

type BaseRecord = { id: string; [key:string]: unknown };
export type ContinuityAtom = BaseRecord & { projectId:string; kind:string; text:string; createdAt?:string; evidenceAtomIds?:string[]; provenance?:string[]; goalId?:string; dependencyIds?:string[]; gateId?:string; blockerId?:string; nextAction?:string };
export type ContinuityTruth = BaseRecord & { projectId:string; kind:string; text:string; status:string; atomId?:string; evidenceAtomIds?:string[]; updatedAt?:string; canonicalSubject?:string };
export type ContinuityTick = BaseRecord & { projectId?:string; title:string; detail:string; status:string; actionType?:string; evidenceAtomIds?:string[]; priority?:string; updatedAt?:string };
export type ContinuityProject = BaseRecord & { name:string; summary?:string };
export type ContinuityFailure = BaseRecord & { projectId?:string; title?:string; cause?:string; evidenceIds?:string[]; lastSeenAt?:string };
export type ContinuityVerification = BaseRecord & { entityId:string; status:string; detail?:string };

export type ContinuityChecklistItem = {
  id:string;
  projectId:string;
  goalId:string;
  sourceType:"ATOM"|"TICK"|"TRUTH";
  sourceRefId:string;
  title:string;
  status:ContinuityChecklistStatus;
  evidenceAtomIds:string[];
  verificationIds:string[];
  authorizationRefs:string[];
  blockedByIds:string[];
  updatedAt:string;
};

export type AvoidedWorkMetric = {
  kind:AvoidedWorkKind;
  measuredCount:number;
  estimatedMs?:number;
  estimateLabel?:"ESTIMATE";
};

export type ContinuitySnapshot = BaseRecord & {
  format:"B2_CONTINUITY";
  version:1;
  kind:"CONTINUITY_INTELLIGENCE";
  projectId:string;
  sourceHash:string;
  stateHash:string;
  goal:{id:string;text:string;evidenceAtomIds:string[]};
  checklist:ContinuityChecklistItem[];
  avoidedWorkLedger:AvoidedWorkMetric[];
  recap:{currentTruthCount:number;open:number;blocked:number;gates:number;done:number;unknown:number;knownFailureCount:number;recentChangeCount:number};
  prescription:string[];
  plannerVersion:typeof CONTINUITY_PLANNER_VERSION;
  updatedAt:string;
};

export type AnswerReplayResult = {
  format:"B2_ANSWER_REPLAY";
  version:1;
  projectId:string;
  previousAnswerHash:string;
  missingEvidenceIds:string[];
  sentences:Array<{text:string;status:AnswerReplayStatus;matchedTruthId?:string;score:number;replacement?:string}>;
  retained:string[];
  repairDelta:string[];
  replayHash:string;
};

const STOP = new Set(["the","and","for","with","that","this","from","have","will","would","should","could","what","when","where","which","about","into","your","you","our","are","was","were","has","had","not","but","can","how","why","use","using","need","want","project","brain2","global","context"]);
const DEP_CUE=/\b(depends? on|dependency|after|before|requires?|prerequisite|blocked by|waiting for)\b/i;
const BLOCK_CUE=/\b(blocked|cannot|can't|waiting|missing|failed|failure|stuck)\b/i;
const GATE_ACTIONS=new Set(["APPROVE","DECIDE","CONFLICT","UNCERTAIN","VERIFY"]);

function norm(value:unknown){return String(value??"").normalize("NFKC").replace(/\s+/g," ").trim();}
function tokens(value:unknown){return [...new Set((norm(value).toLowerCase().match(/[a-z0-9][a-z0-9'-]{2,}/g)??[]).filter(x=>!STOP.has(x)))];}
function overlap(a:unknown,b:unknown){const aa=new Set(tokens(a)),bb=new Set(tokens(b));if(!aa.size||!bb.size)return 0;let n=0;for(const x of aa)if(bb.has(x))n++;return n/(aa.size+bb.size-n);}
function unique(values:Iterable<string>){return [...new Set([...values].map(x=>String(x).trim()).filter(Boolean))].sort();}
function canonicalJson(value:unknown):string{if(value===null||typeof value!=="object")return JSON.stringify(value);if(Array.isArray(value))return `[${value.map(canonicalJson).join(",")}]`;const o=value as Record<string,unknown>;return `{${Object.keys(o).sort().map(k=>`${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(",")}}`;}
async function sha(value:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("");}
export async function continuityStableId(prefix:string,...parts:unknown[]){return `${prefix}_${(await sha([CONTINUITY_VERSION,...parts.map(norm)].join("\u241f"))).slice(0,24)}`;}


export async function hashContinuitySourceState(input:{projectId:string;goalText:string;atoms:ContinuityAtom[];truths:ContinuityTruth[];ticks:ContinuityTick[];failures:ContinuityFailure[]}):Promise<string>{
  const byFirst=(a:unknown[],b:unknown[])=>String(a[0]).localeCompare(String(b[0]));
  const material={projectId:input.projectId,goalText:norm(input.goalText),atoms:input.atoms.map(a=>[a.id,a.kind,norm(a.text),a.createdAt??""]).sort(byFirst),truths:input.truths.map(t=>[t.id,t.status,t.kind,norm(t.text),t.updatedAt??""]).sort(byFirst),ticks:input.ticks.map(t=>[t.id,t.status,t.actionType??"",norm(t.title),norm(t.detail)]).sort(byFirst),failures:input.failures.map(f=>[f.id,f.lastSeenAt??"",norm(f.title),norm(f.cause)]).sort(byFirst)};
  return sha(canonicalJson(material));
}

function proofComplete(item:ContinuityChecklistItem){return item.evidenceAtomIds.length>0&&item.verificationIds.length>0&&item.authorizationRefs.length>0;}
function statusPriority(status:ContinuityChecklistStatus){return ({GATE:0,BLOCKED:1,UNKNOWN:2,OPEN:3,DONE:4})[status];}
function checklistStable(item:ContinuityChecklistItem){const {updatedAt:_updatedAt,...stable}=item;return stable;}
function continuityStateMaterial(input:{format:"B2_CONTINUITY";version:1;kind:"CONTINUITY_INTELLIGENCE";projectId:string;sourceHash:string;goal:ContinuitySnapshot["goal"];checklist:ContinuityChecklistItem[];avoidedWorkLedger:AvoidedWorkMetric[];recap:ContinuitySnapshot["recap"];prescription:string[];plannerVersion:typeof CONTINUITY_PLANNER_VERSION}){return {format:input.format,version:input.version,kind:input.kind,projectId:input.projectId,sourceHash:input.sourceHash,goal:input.goal,checklist:input.checklist.map(checklistStable),avoidedWorkLedger:input.avoidedWorkLedger,recap:input.recap,prescription:input.prescription,plannerVersion:input.plannerVersion};}
export async function hashContinuityStateMaterial(input:Parameters<typeof continuityStateMaterial>[0]){return sha(canonicalJson(continuityStateMaterial(input)));}

export async function buildContinuitySnapshot(input:{
  project:ContinuityProject;
  atoms:ContinuityAtom[];
  truths:ContinuityTruth[];
  ticks:ContinuityTick[];
  failures?:ContinuityFailure[];
  verifications?:ContinuityVerification[];
  previous?:ContinuitySnapshot;
}):Promise<{snapshot:ContinuitySnapshot;atomUpdates:ContinuityAtom[]}> {
  const {project}=input;
  const truths=input.truths.filter(x=>x.projectId===project.id);
  const current=truths.filter(x=>x.status==="CURRENT");
  const taskTruth=current.filter(x=>x.kind==="task").sort((a,b)=>String(b.updatedAt??"").localeCompare(String(a.updatedAt??"")))[0];
  const goalText=norm(taskTruth?.text||project.summary||project.name);
  const goalId=await continuityStableId("goal",project.id,goalText);
  const goalEvidence=unique(taskTruth?.evidenceAtomIds??(taskTruth?.atomId?[String(taskTruth.atomId)]:[]));
  const projectTicks=input.ticks.filter(x=>x.projectId===project.id&&x.status==="OPEN");
  const sortedAtoms=input.atoms.filter(x=>x.projectId===project.id).sort((a,b)=>String(a.createdAt??a.id).localeCompare(String(b.createdAt??b.id)));
  const linkedTasks:ContinuityAtom[]=[];
  const atomUpdates:ContinuityAtom[]=[];

  for(const atom of sortedAtoms){
    const score=overlap(atom.text,goalText);
    const eligible=atom.kind==="task"||(["decision","constraint","fact"].includes(atom.kind)&&score>=0.16);
    if(!eligible)continue;
    let dependencyIds:string[]=[];
    if(DEP_CUE.test(atom.text)&&linkedTasks.length){
      const ranked=linkedTasks.map(x=>({x,score:overlap(atom.text,x.text)})).sort((a,b)=>b.score-a.score||a.x.id.localeCompare(b.x.id));
      if(ranked[0]?.score>=0.10)dependencyIds=[ranked[0].x.id];
    }
    const rankedTicks=projectTicks.map(t=>({t,score:overlap(atom.text,`${t.title} ${t.detail}`)})).sort((a,b)=>b.score-a.score||a.t.id.localeCompare(b.t.id));
    const bestTick=rankedTicks[0]?.score>=0.12?rankedTicks[0].t:undefined;
    const blocker=bestTick&&(bestTick.actionType==="BLOCKER"||BLOCK_CUE.test(atom.text))?bestTick.id:undefined;
    const gate=bestTick&&GATE_ACTIONS.has(String(bestTick.actionType??""))?bestTick.id:undefined;
    const {goalId:_oldGoalId,dependencyIds:_oldDependencyIds,gateId:_oldGateId,blockerId:_oldBlockerId,nextAction:_oldNextAction,...baseAtom}=atom;
    const next:ContinuityAtom={...baseAtom,goalId,...(dependencyIds.length?{dependencyIds}:{}),...(gate?{gateId:gate}:{}),...(blocker?{blockerId:blocker}:{}),...(atom.kind==="task"?{nextAction:norm(atom.text)}:{})};
    if(canonicalJson(next)!==canonicalJson(atom))atomUpdates.push(next);
    if(atom.kind==="task")linkedTasks.push(next);
  }

  const previousBySource=new Map((input.previous?.checklist??[]).map(x=>[`${x.sourceType}:${x.sourceRefId}`,x]));
  const checklist:ContinuityChecklistItem[]=[];
  async function add(sourceType:ContinuityChecklistItem["sourceType"],sourceRefId:string,title:string,derivedStatus:ContinuityChecklistStatus,evidence:string[],blockedBy:string[]=[]){
    const previous=previousBySource.get(`${sourceType}:${sourceRefId}`);
    const verificationIds=unique(previous?.verificationIds??[]);
    const authorizationRefs=unique(previous?.authorizationRefs??[]);
    const evidenceAtomIds=unique([...(evidence??[]),...(previous?.evidenceAtomIds??[])]);
    const provisional:ContinuityChecklistItem={id:previous?.id??await continuityStableId("check",project.id,sourceType,sourceRefId),projectId:project.id,goalId,sourceType,sourceRefId,title:norm(title),status:derivedStatus,evidenceAtomIds,verificationIds,authorizationRefs,blockedByIds:unique(blockedBy),updatedAt:new Date().toISOString()};
    if(previous?.status==="DONE"&&proofComplete({...provisional,status:"DONE"}))provisional.status="DONE";
    checklist.push(provisional);
  }

  for(const atom of atomUpdates.concat(sortedAtoms.filter(a=>a.goalId===goalId)).filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i)){
    if(atom.kind!=="task")continue;
    await add("ATOM",atom.id,atom.nextAction??atom.text,atom.blockerId?"BLOCKED":atom.gateId?"GATE":"OPEN",(atom.evidenceAtomIds??atom.provenance??[]).map(String),unique([...(atom.dependencyIds??[]),...(atom.blockerId?[atom.blockerId]:[])]));
  }
  for(const tick of projectTicks){
    const status:ContinuityChecklistStatus=tick.actionType==="BLOCKER"?"BLOCKED":GATE_ACTIONS.has(String(tick.actionType??""))?"GATE":"OPEN";
    await add("TICK",tick.id,`${tick.title}: ${tick.detail}`,status,(tick.evidenceAtomIds??[]).map(String));
  }
  for(const truth of truths.filter(t=>t.status==="CONFLICTING"||t.status==="PENDING_REVIEW")){
    await add("TRUTH",truth.id,truth.text,truth.status==="CONFLICTING"?"BLOCKED":"UNKNOWN",unique(truth.evidenceAtomIds??(truth.atomId?[String(truth.atomId)]:[])));
  }
  checklist.sort((a,b)=>statusPriority(a.status)-statusPriority(b.status)||a.id.localeCompare(b.id));

  const previousLedger=input.previous?.avoidedWorkLedger??[];
  const ledger=previousLedger.map(x=>({...x})).sort((a,b)=>a.kind.localeCompare(b.kind));
  const nonCurrent=truths.filter(x=>x.status!=="CURRENT");
  const failures=(input.failures??[]).filter(x=>!x.projectId||x.projectId===project.id);
  const counts={OPEN:0,BLOCKED:0,GATE:0,DONE:0,UNKNOWN:0} as Record<ContinuityChecklistStatus,number>;
  for(const item of checklist)counts[item.status]++;
  const recap={currentTruthCount:current.length,open:counts.OPEN,blocked:counts.BLOCKED,gates:counts.GATE,done:counts.DONE,unknown:counts.UNKNOWN,knownFailureCount:failures.length,recentChangeCount:nonCurrent.length};
  const prescription=[
    ...checklist.filter(x=>x.status==="GATE").slice(0,2).map(x=>`Resolve human gate: ${x.title}`),
    ...checklist.filter(x=>x.status==="BLOCKED").slice(0,2).map(x=>`Unblock: ${x.title}`),
    ...checklist.filter(x=>x.status==="UNKNOWN").slice(0,1).map(x=>`Verify: ${x.title}`),
    ...checklist.filter(x=>x.status==="OPEN").slice(0,3).map(x=>`Continue: ${x.title}`),
  ].slice(0,5);
  if(!prescription.length)prescription.push(`Continue ${project.name} from the latest verified state.`);

  const sourceHash=await hashContinuitySourceState({projectId:project.id,goalText,atoms:sortedAtoms,truths,ticks:projectTicks,failures});
  const stateInput={format:"B2_CONTINUITY" as const,version:1 as const,kind:"CONTINUITY_INTELLIGENCE" as const,projectId:project.id,sourceHash,goal:{id:goalId,text:goalText,evidenceAtomIds:goalEvidence},checklist,avoidedWorkLedger:ledger,recap,prescription,plannerVersion:CONTINUITY_PLANNER_VERSION};
  const stateHash=await hashContinuityStateMaterial(stateInput);
  const snapshot:ContinuitySnapshot={id:await continuityStableId("continuity",project.id),...stateInput,updatedAt:new Date().toISOString(),stateHash};
  return {snapshot,atomUpdates};
}

export async function completeContinuityChecklistItem(snapshot:ContinuitySnapshot,itemId:string,proof:{evidenceAtomIds:string[];verificationIds:string[];authorizationRefs:string[]}):Promise<ContinuitySnapshot>{
  const checklist=snapshot.checklist.map(item=>item.id===itemId?{...item,evidenceAtomIds:unique(proof.evidenceAtomIds),verificationIds:unique(proof.verificationIds),authorizationRefs:unique(proof.authorizationRefs),status:"DONE" as const,updatedAt:new Date().toISOString()}:item);
  const target=checklist.find(x=>x.id===itemId);if(!target)throw new Error("Continuity checklist item not found.");if(!proofComplete(target))throw new Error("DONE requires evidence + PASS verification + explicit authorization reference.");
  const counts={OPEN:0,BLOCKED:0,GATE:0,DONE:0,UNKNOWN:0} as Record<ContinuityChecklistStatus,number>;for(const x of checklist)counts[x.status]++;
  const recap={...snapshot.recap,open:counts.OPEN,blocked:counts.BLOCKED,gates:counts.GATE,done:counts.DONE,unknown:counts.UNKNOWN};
  const next={...snapshot,checklist,recap,updatedAt:new Date().toISOString()};
  return {...next,stateHash:await hashContinuityStateMaterial(next)};
}

export async function recordAvoidedWork(snapshot:ContinuitySnapshot,input:{kind:AvoidedWorkKind;count?:number;estimatedMs?:number}):Promise<ContinuitySnapshot>{
  const count=Math.max(1,Math.trunc(input.count??1));const map=new Map(snapshot.avoidedWorkLedger.map(x=>[x.kind,{...x}]));const prior=map.get(input.kind)??{kind:input.kind,measuredCount:0};prior.measuredCount+=count;if(Number.isFinite(input.estimatedMs)&&Number(input.estimatedMs)>0){prior.estimatedMs=Math.round((prior.estimatedMs??0)+Number(input.estimatedMs));prior.estimateLabel="ESTIMATE";}map.set(input.kind,prior);
  const avoidedWorkLedger=[...map.values()].sort((a,b)=>a.kind.localeCompare(b.kind));const next={...snapshot,avoidedWorkLedger,updatedAt:new Date().toISOString()};return {...next,stateHash:await hashContinuityStateMaterial(next)};
}

export async function replayAnswer(input:{projectId:string;previousAnswer:string;previousEvidenceIds:string[];knownEvidenceIds:Iterable<string>;truths:ContinuityTruth[]}):Promise<AnswerReplayResult>{
  const previousAnswer=norm(input.previousAnswer);const previousAnswerHash=await sha(previousAnswer);const known=new Set([...input.knownEvidenceIds]);const missingEvidenceIds=unique(input.previousEvidenceIds.filter(id=>!known.has(id)));
  const sentences=(previousAnswer.match(/[^.!?]+[.!?]?/g)??[previousAnswer]).map(norm).filter(Boolean);const truthRows=input.truths.filter(t=>t.projectId===input.projectId);const out=[] as AnswerReplayResult["sentences"];
  for(const sentence of sentences){const ranked=truthRows.map(t=>({t,score:overlap(sentence,`${t.canonicalSubject??""} ${t.text}`)})).sort((a,b)=>b.score-a.score||a.t.id.localeCompare(b.t.id));const current=ranked.find(x=>x.t.status==="CURRENT"&&x.score>=0.18);const conflict=ranked.find(x=>x.t.status==="CONFLICTING"&&x.score>=0.18);const stale=ranked.find(x=>["SUPERSEDED","HISTORICAL"].includes(x.t.status)&&x.score>=0.18);let status:AnswerReplayStatus="UNVERIFIED",match=current??conflict??stale;if(current)status="VALID";else if(conflict)status="CONTRADICTED";else if(stale)status="STALE";else if(missingEvidenceIds.length)status="MISSING";const replacement=status==="VALID"?undefined:ranked.find(x=>x.t.status==="CURRENT"&&x.score>=0.10)?.t.text;out.push({text:sentence,status,...(match?{matchedTruthId:match.t.id}:{}),score:Number((match?.score??0).toFixed(4)),...(replacement?{replacement}:{})});}
  const retained=out.filter(x=>x.status==="VALID").map(x=>x.text);const repairDelta=out.filter(x=>x.status!=="VALID").map(x=>x.replacement?`${x.status}: ${x.text} -> ${x.replacement}`:`${x.status}: ${x.text}`);const core={format:"B2_ANSWER_REPLAY" as const,version:1 as const,projectId:input.projectId,previousAnswerHash,missingEvidenceIds,sentences:out,retained,repairDelta};return {...core,replayHash:await sha(canonicalJson(core))};
}

export function frictionTelemetryDetail(type:FrictionEventType,projectId:string,detail:Record<string,unknown>={}){return {continuityVersion:CONTINUITY_VERSION,frictionType:type,projectId,...detail};}

export function findContinuitySnapshot(records:Array<Record<string,unknown>>,projectId:string):ContinuitySnapshot|undefined{return records.find(x=>x.kind==="CONTINUITY_INTELLIGENCE"&&x.projectId===projectId) as ContinuitySnapshot|undefined;}
