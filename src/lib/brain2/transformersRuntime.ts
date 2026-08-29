'use client';

export const BRAIN2_TRANSFORMERS_MODEL_ID = 'onnx-community/Qwen2.5-0.5B-Instruct';
export const BRAIN2_TRANSFORMERS_MODEL_FAMILY = 'Qwen2.5-0.5B-Instruct ONNX';
export const BRAIN2_TRANSFORMERS_WASM_DTYPE = 'q8';
export const BRAIN2_TRANSFORMERS_CONTEXT_WINDOW = 4096;
export const BRAIN2_WASM_INPUT_TOKEN_BUDGET = 1024;
export const BRAIN2_WASM_EMERGENCY_TOKEN_BUDGET = 512;
export const BRAIN2_WASM_MAX_NEW_TOKENS = 192;
export const BRAIN2_MRS_SELF_TEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const BRAIN2_MRS_SESSION_RESIDUAL_LIMIT = 4;
export const BRAIN2_MRS_MEMORY_PRESSURE_COOLDOWN_MS = 2 * 60 * 1000;

export type Brain2TransformersState = 'UNINITIALIZED'|'CHECKING'|'LOADING'|'READY'|'ERROR';
export type Brain2MRSState = 'INACTIVE'|'ACTIVATING'|'ACTIVE'|'SELF_TESTING'|'ERROR';
export type Brain2TransformersBackend = 'wasm';
export type Brain2TransformersSnapshot = {
  state: Brain2TransformersState;
  mrsState: Brain2MRSState;
  progress: number;
  text: string;
  detail?: string;
  error?: string;
  modelId: string;
  backend?: Brain2TransformersBackend;
  dtype?: string;
  activationMode?: 'MANUAL'|'AUTO_ON_DEMAND';
  cacheState?: 'UNKNOWN'|'CHECKING_CACHE'|'INITIALIZING_CACHE'|'DOWNLOADING'|'READY_CACHED'|'READY_FRESH';
  lastReadyAt?: string;
  lastSelfTest?: {ok:boolean;text:string;at:string};
  budget?: {
    residualCalls: number;
    residualLimit: number;
    coolingDownUntil?: string;
  };
};

type Proposal = {candidateId:string;importance?:number;novelty?:number;classification?:string;rationale?:string;evidenceIds?:string[]};
type ChatMessage = {role:'system'|'user'|'assistant';content:string};
export type Brain2ResidualReasonerOutput = {answer:string;evidenceIds:string[];confidence:number;residuals:string[];terminationReason:string};
export type Brain2RuntimeAvailabilityHint = {hasCachedRuntime:boolean;hasRecentSelfTest:boolean;lastReadyAt?:string;lastSelfTestAt?:string};
type RuntimeMeta = {
  modelId: string;
  dtype: string;
  backend: Brain2TransformersBackend;
  lastReadyAt?: string;
  lastSelfTest?: {ok:boolean;text:string;at:string};
};
type ResidualBudget = {residualCalls:number;residualLimit:number;coolingDownUntil?:string};
type LoadOptions = {reason?:'manual'|'residual'|'semantic-review'|'auto-cache';forceSelfTest?:boolean};

let generatorPromise: Promise<any>|null = null;
let generatorInstance:any = null;
let snapshot:Brain2TransformersSnapshot={
  state:'UNINITIALIZED',
  mrsState:'INACTIVE',
  progress:0,
  text:'AI runtime waiting to initialize',
  modelId:BRAIN2_TRANSFORMERS_MODEL_ID,
  activationMode:'MANUAL',
  cacheState:'UNKNOWN',
  budget:{residualCalls:0,residualLimit:BRAIN2_MRS_SESSION_RESIDUAL_LIMIT},
};
const listeners=new Set<(s:Brain2TransformersSnapshot)=>void>();
function publish(next:Partial<Brain2TransformersSnapshot>){snapshot={...snapshot,...next};for(const l of listeners)l(snapshot);}
export function getBrain2TransformersSnapshot(){return snapshot;}
export function subscribeBrain2Transformers(listener:(s:Brain2TransformersSnapshot)=>void){listeners.add(listener);listener(snapshot);return()=>{listeners.delete(listener);};}
export function isBrain2MRSReady(snapshotLike:Brain2TransformersSnapshot=snapshot){
  return snapshotLike.state==="READY"&&snapshotLike.mrsState==="ACTIVE";
}
const META_KEY='brain2-transformers-runtime-meta-v1';
const BUDGET_KEY='brain2-transformers-session-budget-v1';
function safeWindow(){return typeof window!=='undefined'?window:undefined;}
function hasBrowserCacheSupport(){
  const win=safeWindow();
  return Boolean(win && "caches" in win && win.caches);
}
function loadRuntimeMeta():RuntimeMeta|undefined{
  const win=safeWindow(); if(!win) return undefined;
  try{const raw=win.localStorage.getItem(META_KEY); if(!raw) return undefined; const parsed=JSON.parse(raw) as RuntimeMeta; return parsed?.modelId===BRAIN2_TRANSFORMERS_MODEL_ID?parsed:undefined;}catch{return undefined;}
}
function saveRuntimeMeta(meta:RuntimeMeta){
  const win=safeWindow(); if(!win) return;
  try{win.localStorage.setItem(META_KEY,JSON.stringify(meta));}catch{/* optional */}
}
function loadResidualBudget():ResidualBudget{
  const win=safeWindow(); if(!win) return {residualCalls:0,residualLimit:BRAIN2_MRS_SESSION_RESIDUAL_LIMIT};
  try{
    const raw=win.sessionStorage.getItem(BUDGET_KEY);
    if(!raw)return {residualCalls:0,residualLimit:BRAIN2_MRS_SESSION_RESIDUAL_LIMIT};
    const parsed=JSON.parse(raw) as Partial<ResidualBudget>;
    return {residualCalls:Math.max(0,Number(parsed.residualCalls??0)||0),residualLimit:BRAIN2_MRS_SESSION_RESIDUAL_LIMIT,coolingDownUntil:typeof parsed.coolingDownUntil==='string'?parsed.coolingDownUntil:undefined};
  }catch{return {residualCalls:0,residualLimit:BRAIN2_MRS_SESSION_RESIDUAL_LIMIT};}
}
function saveResidualBudget(budget:ResidualBudget){
  const win=safeWindow(); if(!win) return;
  try{win.sessionStorage.setItem(BUDGET_KEY,JSON.stringify(budget));}catch{/* optional */}
}
function syncBudgetSnapshot(partial?:Partial<ResidualBudget>){
  const next={...loadResidualBudget(),...partial,residualLimit:BRAIN2_MRS_SESSION_RESIDUAL_LIMIT};
  saveResidualBudget(next);
  publish({budget:next});
  return next;
}
function shouldReuseSelfTest(meta?:RuntimeMeta){
  if(!meta?.lastSelfTest?.ok||!meta.lastSelfTest.at)return false;
  const age=Date.now()-Date.parse(meta.lastSelfTest.at);
  return Number.isFinite(age)&&age>=0&&age<=BRAIN2_MRS_SELF_TEST_TTL_MS;
}
export function getBrain2RuntimeAvailabilityHint():Brain2RuntimeAvailabilityHint{
  const meta=loadRuntimeMeta();
  return {hasCachedRuntime:Boolean(meta?.lastReadyAt),hasRecentSelfTest:shouldReuseSelfTest(meta),lastReadyAt:meta?.lastReadyAt,lastSelfTestAt:meta?.lastSelfTest?.at};
}
function noteReady(meta?:RuntimeMeta,detail?:string){
  const next:RuntimeMeta={modelId:BRAIN2_TRANSFORMERS_MODEL_ID,dtype:BRAIN2_TRANSFORMERS_WASM_DTYPE,backend:'wasm',lastReadyAt:new Date().toISOString(),lastSelfTest:meta?.lastSelfTest};
  saveRuntimeMeta(next);
  publish({state:'READY',mrsState:meta?.lastSelfTest?.ok?'ACTIVE':'INACTIVE',text:meta?.lastSelfTest?.ok?'Cached AI model ready':'AI model initialized',detail:detail??(meta?.lastSelfTest?.ok?'Cached Qwen runtime restored without rerunning the self-test.':'Qwen runtime initialized and waiting for an explicit self-test or residual task.'),cacheState:meta?.lastSelfTest?.ok?'READY_CACHED':'READY_FRESH',lastReadyAt:next.lastReadyAt,lastSelfTest:meta?.lastSelfTest,budget:loadResidualBudget()});
}
function progressCallback(p:any){
  const raw=Number(p?.progress??0);
  const progress=Number.isFinite(raw)?Math.max(0,Math.min(1,raw>1?raw/100:raw)):snapshot.progress;
  const file=String(p?.file??'').trim();
  const status=String(p?.status??'').trim();
  const reportText=[status,file].filter(Boolean).join(' · ');
  publish({
    state:'LOADING',
    mrsState:'ACTIVATING',
    progress,
    text:`Downloading AI model… ${Math.round(progress*100)}%`,
    detail:reportText || 'Downloading and preparing Qwen ONNX model artifacts in browser cache',
    cacheState:'DOWNLOADING',
  });
}

async function requestPersistentStorage(){
  try{if(typeof navigator!=='undefined' && navigator.storage?.persist){await navigator.storage.persist();}}catch{/* optional */}
}

async function buildGenerator(){
  const transformers=await import('@huggingface/transformers');
  await requestPersistentStorage();
  const hasCache=hasBrowserCacheSupport();
  // Brain2 deliberately uses one browser runtime path: Transformers.js + ONNX Runtime Web/WASM.
  // WebGPU is not selected here, even when the browser exposes it. This keeps model loading and
  // inference behavior consistent across supported browsers.
  if(transformers.env){
    transformers.env.useBrowserCache=hasCache;
    transformers.env.useWasmCache=hasCache;
  }
  const backend:Brain2TransformersBackend='wasm';
  const dtype=BRAIN2_TRANSFORMERS_WASM_DTYPE;
  publish({
    state:'LOADING',mrsState:'ACTIVATING',backend,dtype,progress:0,
    text:'Initializing cached AI model…',
    detail:hasCache
      ? 'Transformers.js / WASM — checking browser cache and initializing the q8 Qwen2.5-0.5B-Instruct ONNX runtime.'
      : 'Transformers.js / WASM — browser cache is unavailable here, so Brain2 is initializing the q8 Qwen2.5-0.5B-Instruct ONNX runtime without cache reuse.',
    cacheState:'INITIALIZING_CACHE',
  });
  const options:any={device:'wasm',dtype,progress_callback:progressCallback};
  const generator=await transformers.pipeline('text-generation',BRAIN2_TRANSFORMERS_MODEL_ID,options);
  return {generator,backend,dtype};
}

function generatedText(output:any):string{
  const first=Array.isArray(output)?output[0]:output;
  const value=first?.generated_text ?? first?.text ?? '';
  if(typeof value==='string')return value;
  if(Array.isArray(value)){
    for(let i=value.length-1;i>=0;i--){
      const content=value[i]?.content;
      if(typeof content==='string' && content.trim())return content;
    }
  }
  return String(value??'');
}

function estimateTokens(text:string){
  // Conservative browser-side estimate. Qwen tokenization varies, but ~2 chars/token keeps
  // WASM inputs comfortably below the 4096 model context and avoids multi-thousand-token OOMs.
  return Math.ceil(text.length/2);
}

function clipTextToEstimatedTokens(text:string,budget:number){
  const clean=String(text??'').trim();
  if(estimateTokens(clean)<=budget)return clean;
  const maxChars=Math.max(256,budget*3);
  const head=Math.floor(maxChars*.68);
  const tail=Math.max(0,maxChars-head-120);
  return `${clean.slice(0,head)}\n\n[...Brain2 context compacted for WASM memory safety...]\n\n${clean.slice(-tail)}`;
}

function boundMessages(messages:ChatMessage[],tokenBudget:number){
  const system=messages.filter(m=>m.role==='system').map(m=>m.content).join('\n').trim();
  const rest=messages.filter(m=>m.role!=='system');
  const systemBudget=Math.min(320,Math.max(128,Math.floor(tokenBudget*.22)));
  const boundedSystem=clipTextToEstimatedTokens(system,systemBudget);
  const remaining=Math.max(256,tokenBudget-estimateTokens(boundedSystem)-64);
  if(!rest.length)return [{role:'system' as const,content:boundedSystem}];
  const per=Math.max(128,Math.floor(remaining/rest.length));
  return [
    {role:'system' as const,content:boundedSystem},
    ...rest.map(m=>({...m,content:clipTextToEstimatedTokens(m.content,per)})),
  ];
}

function isMemoryPressureError(error:unknown){
  const message=error instanceof Error?error.message:String(error??'');
  return /std::bad_alloc|out of memory|oom|failed to call OrtRun|allocation/i.test(message);
}

async function generate(messages:ChatMessage[],opts:{maxNewTokens?:number;temperature?:number;inputTokenBudget?:number}={}){
  const generator=await loadGenerator({reason:'residual'});
  const temperature=opts.temperature??0.2;
  const maxNewTokens=Math.min(opts.maxNewTokens??128,BRAIN2_WASM_MAX_NEW_TOKENS);
  const primaryBudget=Math.min(opts.inputTokenBudget??BRAIN2_WASM_INPUT_TOKEN_BUDGET,BRAIN2_WASM_INPUT_TOKEN_BUDGET);

  const invoke=async(tokenBudget:number)=>{
    const bounded=boundMessages(messages,tokenBudget);
    return generator(bounded,{
      max_new_tokens:maxNewTokens,
      temperature,
      do_sample:temperature>0,
      return_full_text:false,
    });
  };

  try{
    const output=await invoke(primaryBudget);
    return generatedText(output).trim();
  }catch(error){
    if(!isMemoryPressureError(error))throw error;
    publish({
      state:'READY',mrsState:'ACTIVATING',
      text:'AI model ready · reducing MRS context',
      detail:`Browser memory pressure detected. Retrying the residual with a ${BRAIN2_WASM_EMERGENCY_TOKEN_BUDGET}-token input budget.`,
      error:undefined,
    });
    try{
      const output=await invoke(BRAIN2_WASM_EMERGENCY_TOKEN_BUDGET);
      publish({state:'READY',mrsState:'ACTIVE',text:'AI model downloaded & ready',detail:'MRS recovered from browser memory pressure using the compact residual budget.',error:undefined});
      return generatedText(output).trim();
    }catch(retryError){
      if(isMemoryPressureError(retryError)){
        const coolingDownUntil=new Date(Date.now()+BRAIN2_MRS_MEMORY_PRESSURE_COOLDOWN_MS).toISOString();
        syncBudgetSnapshot({coolingDownUntil});
        publish({state:'READY',mrsState:'ERROR',text:'AI model ready · MRS memory pressure',detail:'Qwen is loaded, but this residual still exceeded the browser WASM memory budget after compaction.',error:'MRS_MEMORY_PRESSURE'});
      }
      throw retryError;
    }
  }
}

async function probeMRS(){
  publish({mrsState:'SELF_TESTING',detail:'Model ready. Running a real Brain2 MRS inference probe…'});
  const text=await generate([
    {role:'system',content:'You are running a local Brain2 runtime health check. Give a very short acknowledgement.'},
    {role:'user',content:'Runtime health check.'},
  ],{temperature:0,maxNewTokens:12});
  // Activation verifies that a real generation completed. Do not require a magic literal: small
  // instruction models may paraphrase an exact-token request even though inference is healthy.
  const clean=text.trim();
  const ok=clean.length>0;
  const result={ok,text:clean.slice(0,200),at:new Date().toISOString()};
  if(!ok)throw new Error('MRS activation probe completed without generated output.');
  saveRuntimeMeta({modelId:BRAIN2_TRANSFORMERS_MODEL_ID,dtype:BRAIN2_TRANSFORMERS_WASM_DTYPE,backend:'wasm',lastReadyAt:snapshot.lastReadyAt,lastSelfTest:result});
  publish({mrsState:'ACTIVE',lastSelfTest:result,detail:'Brain2 MRS ACTIVE — real Qwen ONNX inference completed through Transformers.js / WASM.'});
  return result;
}

async function loadGenerator(options:LoadOptions={}){
  if(typeof window==='undefined')throw new Error('Transformers.js is browser-only in Brain2.');
  if(generatorInstance)return generatorInstance;
  if(generatorPromise)return generatorPromise;
  const meta=loadRuntimeMeta();
  const activationMode=options.reason==='manual'?'MANUAL':'AUTO_ON_DEMAND';
  publish({state:'CHECKING',mrsState:'ACTIVATING',progress:0,text:'Checking cached AI model…',error:undefined,detail:'Starting Transformers.js / WASM browser runtime and checking cached model artifacts.',activationMode,cacheState:'CHECKING_CACHE',budget:loadResidualBudget()});
  generatorPromise=(async()=>{
    const {generator,backend,dtype}=await buildGenerator();
    generatorInstance=generator;
    const readyAt=new Date().toISOString();
    const freshMeta:RuntimeMeta={modelId:BRAIN2_TRANSFORMERS_MODEL_ID,dtype,backend,lastReadyAt:readyAt,lastSelfTest:meta?.lastSelfTest};
    saveRuntimeMeta(freshMeta);
    if(options.forceSelfTest || !shouldReuseSelfTest(meta)){
      publish({state:'READY',mrsState:'SELF_TESTING',progress:1,text:meta?'Cached AI model ready':'AI model downloaded & ready',detail:`Qwen ONNX loaded through Transformers.js / WASM (${dtype}); verifying real MRS inference…`,backend,dtype,lastReadyAt:readyAt,error:undefined,cacheState:meta?'READY_CACHED':'READY_FRESH',budget:loadResidualBudget()});
      await probeMRS();
    }else{
      const selfTestAt=meta?.lastSelfTest?.at ? new Date(meta.lastSelfTest.at).toLocaleString() : 'a previous verified run';
      noteReady(meta,`Qwen ONNX loaded through Transformers.js / WASM (${dtype}) from browser cache. Reusing the self-test from ${selfTestAt}.`);
    }
    return generator;
  })().catch((error)=>{
    generatorPromise=null;generatorInstance=null;
    publish({state:'ERROR',mrsState:'ERROR',progress:0,text:'AI model download/load failed',detail:'Brain2 MRS could not activate. Retry after checking browser network/storage/console.',error:error instanceof Error?error.message:String(error),budget:loadResidualBudget()});
    throw error;
  });
  return generatorPromise;
}

export async function preloadBrain2Transformers(){return loadGenerator({reason:'manual'});}
export async function autoWarmBrain2TransformersFromCache(){
  const meta=loadRuntimeMeta();
  if(!meta?.lastReadyAt)return false;
  await loadGenerator({reason:'auto-cache'});
  return true;
}
export async function retryBrain2Transformers(){
  generatorPromise=null;generatorInstance=null;
  publish({state:'UNINITIALIZED',mrsState:'INACTIVE',progress:0,text:'Retrying AI runtime…',error:undefined,detail:'Restarting Transformers.js model initialization',activationMode:'MANUAL',cacheState:'UNKNOWN',budget:loadResidualBudget()});
  return loadGenerator({reason:'manual',forceSelfTest:true});
}

function parseJSON(text:string){const cleaned=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');return JSON.parse(cleaned);}

export async function reviewBrain2Intelligence(input:{project:{id:string;name:string};candidates:Array<{id:string;kind:string;statement:string;evidenceIds:string[];importance:number;novelty:number;truthConfidence:number}>}):Promise<Proposal[]> {
  await loadGenerator({reason:'semantic-review'});
  // Semantic review is deliberately narrow on WASM: only the highest-value candidates are sent
  // to Qwen and each candidate is compacted before serialization. The full evidence remains in
  // Brain2; the model receives only enough text to judge the residual semantic question.
  const payload=input.candidates.slice(0,8).map(c=>({
    ...c,
    statement:clipTextToEstimatedTokens(c.statement,90),
    evidenceIds:c.evidenceIds.slice(0,6),
  }));if(!payload.length)return[];
  const system=`You are the Brain2 MRS semantic reviewer. You receive already-retrieved evidence candidates. You may classify/rank them, but you MUST NOT invent evidence IDs, facts, or Current Truth. Return ONLY JSON: {"proposals":[{"candidateId":"...","classification":"TRUTH|IMPORTANT_IDEA|NOVELTY|CONNECTION|CHANGE|OPEN_QUESTION","importance":0..1,"novelty":0..1,"rationale":"brief evidence-grounded reason","evidenceIds":["only IDs already attached to that candidate"]}]}. Omit candidates that do not deserve semantic promotion.`;
  const user=JSON.stringify({format:'B2_INTELLIGENCE_REVIEW',version:3,project:input.project,candidates:payload});
  const text=await generate([{role:'system',content:system},{role:'user',content:user}],{temperature:.2,maxNewTokens:192,inputTokenBudget:BRAIN2_WASM_INPUT_TOKEN_BUDGET});
  const parsed=parseJSON(text) as {proposals?:Proposal[]};
  return Array.isArray(parsed.proposals)?parsed.proposals:[];
}

export async function runBrain2HardResidual(input:{task:string;context:string;maxTokens?:number}){
  const task=clipTextToEstimatedTokens(input.task,220);
  const context=clipTextToEstimatedTokens(input.context,700);
  return generate([
    {role:'system',content:'You are the Brain2 Qwen hard-residual lane. Work only on the unresolved residual provided. Do not claim evidence beyond the verified Databox context. Return a concise proposal for the independent verifier.'},
    {role:'user',content:`TASK\n${task}\n\nVERIFIED DATABOX / RESIDUAL CONTEXT\n${context}`},
  ],{temperature:.35,maxNewTokens:Math.min(input.maxTokens??128,BRAIN2_WASM_MAX_NEW_TOKENS),inputTokenBudget:BRAIN2_WASM_INPUT_TOKEN_BUDGET});
}

export async function runBrain2StructuredResidualReasoner(input:{task:string;context:string;evidence:Array<{id:string;type:string;text:string;score:number;truthStatus?:string}>;maxTokens?:number}):Promise<Brain2ResidualReasonerOutput>{
  const budget=syncBudgetSnapshot();
  if(budget.coolingDownUntil&&Date.parse(budget.coolingDownUntil)>Date.now())throw new Error(`MRS is cooling down after browser memory pressure until ${new Date(budget.coolingDownUntil).toLocaleTimeString()}.`);
  if(budget.residualCalls>=budget.residualLimit)throw new Error(`MRS session budget reached: ${budget.residualCalls}/${budget.residualLimit} residual calls used in this browser session.`);
  await loadGenerator({reason:'residual'});
  syncBudgetSnapshot({residualCalls:budget.residualCalls+1});
  const allowedEvidenceIds=input.evidence.map((item)=>item.id);
  const compactEvidence=input.evidence.slice(0,10).map((item)=>({id:item.id,type:item.type,truthStatus:item.truthStatus,score:item.score,text:clipTextToEstimatedTokens(item.text,72)}));
  const system='You are the Brain2 residual reasoning lane. Work only inside the provided Databox evidence. Do not invent facts or evidence IDs. Return ONLY JSON: {"answer":"string","evidenceIds":["subset of provided IDs"],"confidence":0..1,"residuals":["brief unresolved items"],"terminationReason":"short grounded reason"}.';
  const user=JSON.stringify({format:'B2_RESIDUAL_REASON',version:1,task:input.task,context:input.context,evidence:compactEvidence,allowedEvidenceIds});
  const text=await generate([{role:'system',content:system},{role:'user',content:user}],{temperature:.25,maxNewTokens:Math.min(input.maxTokens??176,BRAIN2_WASM_MAX_NEW_TOKENS),inputTokenBudget:BRAIN2_WASM_INPUT_TOKEN_BUDGET});
  try{
    const parsed=parseJSON(text) as Partial<Brain2ResidualReasonerOutput>;
    const evidenceIds=Array.isArray(parsed.evidenceIds)?parsed.evidenceIds.filter((id):id is string=>typeof id==='string'&&allowedEvidenceIds.includes(id)).slice(0,6):[];
    return{
      answer:typeof parsed.answer==='string'&&parsed.answer.trim()?parsed.answer.trim():text.trim(),
      evidenceIds,
      confidence:Math.max(0,Math.min(1,Number(parsed.confidence??0.45)||0.45)),
      residuals:Array.isArray(parsed.residuals)?parsed.residuals.filter((item):item is string=>typeof item==='string').slice(0,4):[],
      terminationReason:typeof parsed.terminationReason==='string'&&parsed.terminationReason.trim()?parsed.terminationReason.trim():'Qwen produced a bounded residual proposal from the Databox.',
    };
  }catch{
    return{answer:text.trim(),evidenceIds:[],confidence:.4,residuals:['Structured residual output could not be parsed as JSON.'],terminationReason:'Qwen returned an unstructured residual answer, so local repair may be required.'};
  }
}

export async function runBrain2MRSSelfTest(){
  publish({mrsState:'SELF_TESTING',detail:'Running real Qwen ONNX inference through the Brain2 hard-residual lane…'});
  try{
    const text=await runBrain2HardResidual({task:'Give a one-sentence acknowledgement that this local inference request completed.',context:'Self-test request. No external evidence is required.',maxTokens:32});
    const ok=text.trim().length>0;
    publish({mrsState:ok?'ACTIVE':'ERROR',lastSelfTest:{ok,text:text.trim().slice(0,200),at:new Date().toISOString()},detail:ok?'MRS self-test passed via Transformers.js / WASM.':'MRS self-test produced no output.',error:ok?undefined:'MRS self-test produced no generated output.'});
    return {ok,text};
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    publish({mrsState:'ERROR',lastSelfTest:{ok:false,text:message,at:new Date().toISOString()},detail:'MRS self-test failed.',error:message});
    return {ok:false,text:message};
  }
}

export function getBrain2ResidualBudget(){return loadResidualBudget();}
export function resetBrain2ResidualBudget(){return syncBudgetSnapshot({residualCalls:0,coolingDownUntil:undefined});}
