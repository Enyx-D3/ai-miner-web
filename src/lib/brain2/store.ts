"use client";

import { useSyncExternalStore } from "react";
import { atomizeMessage } from "./atomizer";
import {
  BRAIN2_DISCOVER_VERSION,
  BRAIN2_SCHEMA_VERSION,
  BRAIN2_PATTERN_VERSION,
  type NormalizedConversationInput,
} from "./contracts";
import { accumulatePattern, buildPatternsFromAggregates, type PatternAggregate } from "./patternEngine";
import { buildCurrentTruthRoot, buildSourceEvidenceRoot, createStrictCurrentTruthContext, deriveStrictCurrentTruthCandidates, evaluateStrictCurrentTruthCandidate, noteStrictAssistantMessage, toCanonicalTruthMessages } from "./canonicalTruth";
import { createPatternTest, createPortableExpertise } from "./patternLab";
import { chooseProject, deriveProjectName, fingerprintConversation, projectSlug } from "./projectResolver";
import { buildDeterministicProjectIntelligence, buildProjectIntelligenceSourceVersion, refineProjectIntelligenceWithMRS, type IntelligenceProjection } from "./intelligenceLayer";
import { buildFailureMemory, buildReasoningTrajectory, compileCapabilityFromControllerRun, retrieveReasoningMemory } from "./reasoningCompiler";
import { configurePersistentRetrieval, indexedAtomsAsync, indexedMessages, indexedMessagesAsync, indexedTruths, indexedTruthsAsync, invalidateRuntimeIndex, messageHasAtom } from "./retrievalIndex";
import { getBrain2RuntimeAvailabilityHint, getBrain2TransformersSnapshot, isBrain2MRSReady } from "./transformersRuntime";
import { runBrain2ForegroundTask } from "./foregroundTaskGate";
import { brain2MRSError, brain2MRSLog } from "./mrsDebug";
import { reconcileAtomToTruth } from "./truthEngine";
import { canonicalId, canonicalMessageId, indexTerms, keywords, normalizeText, sha256, wordCount } from "./identity";
import { brain2MergeWinner, brain2MutationGapExpected, BRAIN2_SYNC_PROTOCOL_VERSION, canonicalJson, hashEntity, hashMutation, hashPayload, packBootstrapRecords, verifyMutationEnvelope } from "./syncProtocol";
import { runASIFReaderQuery } from "./asifReaderCore";
import { getBrain2BrowserRuntimeIfAvailable, type Brain2RuntimeSearchItem } from "./browserRuntime";
import { parseRuntimeExecutionEvidence } from "./runtimeEvidence";
import type {
  AtomRecord,
  B2TransactionRecord,
  Brain2Snapshot,
  CheckpointRecord,
  CompiledCapabilityRecord,
  ContextVaultRunRecord,
  ConversationRecord,
  DecisionRecord,
  DeviceRecord,
  DerivedArtifactRecord,
  ExperimentRecord,
  ExtensionCapture,
  EvidenceBlockRecord,
  FailureMemoryRecord,
  PersistentSearchDocument,
  Brain2StorageState,
  IngestionJournalRecord,
  MessageRecord,
  MissionRecord,
  MutationRecord,
  MutationDeltaPayload,
  SyncConflictRecord,
  SyncPeerRecord,
  SyncTableName,
  PatternRecord,
  PatternTestRecord,
  PortableExpertiseRecord,
  DataboxRecord,
  ReasoningTrajectoryRecord,
  RetrievalTelemetryRecord,
  ProjectRecord,
  SourceRecord,
  TickRecord,
  TruthRecord,
  VerificationRecord,
} from "./types";
import type { ProjectIntelligenceWorkerEvent, ProjectIntelligenceWorkerRequest } from "@/workers/brain2ProjectIntelligence.worker";

const DB_NAME = "brain2-ai-miner";
const DB_VERSION = 11;
const HOT_MESSAGE_LIMIT = 600;
const HOT_ATOM_LIMIT = 1200;
const RECENT_EVENT_LIMIT = 800;
const SEARCH_INDEX_BATCH = 500;
const CALCULATED_PROJECT_RISK_TICK_VERSION = "B2_CALCULATED_PROJECT_RISK_TICK_V1";
const CALCULATED_PROJECT_RISK_WAKE_PREFIX = `brain2:auto-project-risk:${CALCULATED_PROJECT_RISK_TICK_VERSION}`;
const TABLES = [
  "sources","conversations","messages","atoms","truths","projects","ticks","decisions","patterns","experiments","missions","checkpoints","mutations","devices","verifications","transactions","journals","contextVaultRuns","patternTests","portableExpertise","compiledCapabilities","reasoningTrajectories","failureMemories","derivedArtifacts","databoxes","retrievalTelemetry","evidenceBlocks","searchDocs","syncPeers","syncConflicts","meta",
] as const;

type TableName = typeof TABLES[number];
type DataTableName = Exclude<TableName, "meta">;
type AnyRecord = { id: string; [key: string]: unknown };
export type Brain2TruthIntegritySummary = {
  generatedAt: string;
  durationMs: number;
  currentTruthCount: number;
  messageCount: number;
  currentTruthRoot: string;
  providerNeutralCurrentTruthRoot: string;
  sourceEvidenceRoot: string;
};
export type Brain2DVIDiagnosticsSummary = {
  generatedAt: string;
  durationMs: number;
  atomCount: number;
  strictAtoms: number;
  eligible: number;
  residual: number;
  humanStrictAtoms: number;
  humanEligible: number;
  humanResidual: number;
  assistantOrUnknownStrictAtoms: number;
  mrsPressureResidual: number;
  byRuleFamily: Record<string, { eligible: number; residual: number; total: number }>;
  byHumanRuleFamily: Record<string, { eligible: number; residual: number; total: number }>;
  residualReasons: Record<string, number>;
  humanResidualSamples: Array<{ ruleFamily: string; reason: string; text: string; messageRole?: string }>;
  humanResidualSamplesByRuleFamily: Record<string, Array<{ reason: string; text: string; messageRole?: string }>>;
};
export type Brain2ProjectDiagnosticsSummary = {
  generatedAt: string;
  durationMs: number;
  projects: Array<{
    projectId: string;
    projectName: string;
    deterministic: {
      messages: number;
      atoms: number;
      currentTruths: number;
      eligible: number;
      residual: number;
      humanEligible: number;
      humanResidual: number;
      assistantBlocked: number;
      byHumanRuleFamily: Record<string, { eligible: number; residual: number; total: number }>;
      residualSamples: Array<{ ruleFamily: string; reason: string; text: string; atomId: string; messageId: string }>;
    };
    mrs: {
      artifactState?: string;
      runtime?: string;
      status: "RUNNING" | "QUEUED" | "WAITING" | "DONE" | "ERROR";
      unresolved: number;
      unresolvedShown: number;
      reviewed: number;
      deterministicVerified: number;
      verified: number;
      rejected: number;
      lastAttemptAt?: string;
      lastError?: string;
      processing: boolean;
      queued: boolean;
      samplePendingAtoms: Array<{ id: string; statement: string; kind: string; evidenceIds: string[] }>;
    };
  }>;
};

const emptyStorage: Brain2StorageState = {
  totalMessages:0,totalAtoms:0,totalTruths:0,totalConversations:0,totalEvidenceBlocks:0,indexedDocuments:0,hotMessages:0,hotAtoms:0,retrievalIndexStatus:"EMPTY",retrievalIndexProgress:0,bootMode:"BOUNDED_HOT_SET",
};
const emptySnapshot: Brain2Snapshot = {
  sources: [], conversations: [], messages: [], atoms: [], truths: [], projects: [], ticks: [], decisions: [], patterns: [], experiments: [], missions: [], checkpoints: [], mutations: [], devices: [], verifications: [], transactions: [], journals: [], contextVaultRuns: [], patternTests: [], portableExpertise: [], compiledCapabilities: [], reasoningTrajectories: [], failureMemories: [], derivedArtifacts: [], databoxes: [], retrievalTelemetry: [], evidenceBlocks: [], syncPeers: [], syncConflicts: [], storage:{...emptyStorage}, memoryRoot: "", loaded: false, version: 0,
};

let snapshot: Brain2Snapshot = emptySnapshot;
let bootPromise: Promise<void> | null = null;
let secondaryBootHydrationPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();
const projectIntelligenceRefreshes = new Map<string, Promise<DerivedArtifactRecord | null>>();
const projectIntelligenceMRSRefreshes = new Map<string, Promise<DerivedArtifactRecord | null>>();
const projectIntelligenceMRSScheduleTimers = new Map<string, number>();
const PROJECT_INTELLIGENCE_MRS_REFINING_STALE_MS = 90 * 1000;
let projectIntelligenceMRSQueue: Promise<void> = Promise.resolve();
let deferredDerivationsTimer:number|undefined;
let deferredDerivationsPromise:Promise<void>|null=null;
let deferredDerivationsQueued=false;
let derivedRefreshTimer:number|undefined;
let derivedRefreshPromise:Promise<void>|null=null;
let derivedRefreshQueued=false;
const derivedRefreshProjectIds = new Set<string>();
let responsivenessObserverStarted = false;
let pendingLongTaskCount = 0;
let pendingLongTaskTotalMs = 0;
let pendingLongTaskMaxMs = 0;
let pendingLongTaskLastAt: string | undefined;
let longTaskFlushTimer:number|undefined;
let projectIntelligenceWorker:Worker|undefined;
let projectIntelligenceWorkerPromise:Promise<Worker>|null=null;
let projectIntelligenceWorkerSequence=0;

// Ingestion indexes are deliberately independent of React snapshot scans.
let knownMessageIds = new Set<string>();
let knownAtomIds = new Set<string>();
let messageStatsByConversation = new Map<string, { count: number; words: number }>();
let truthGroups = new Map<string, TruthRecord[]>();
let decisionByAtomId = new Map<string, DecisionRecord>();
let mutationSequence = 0;

function emit() { for (const listener of listeners) listener(); }
function setSnapshot(next: Partial<Brain2Snapshot>) { const knowledgeChanged=Boolean(next.messages||next.atoms||next.truths); snapshot = { ...snapshot, ...next, version: snapshot.version + 1 }; if(knowledgeChanged)invalidateRuntimeIndex(); emit(); }
export function getBrain2Snapshot() { return snapshot; }
export function subscribeBrain2(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
export function useBrain2Snapshot() { return useSyncExternalStore(subscribeBrain2, getBrain2Snapshot, getBrain2Snapshot); }

function now() { return new Date().toISOString(); }
function performanceNow(){return typeof performance!=="undefined"&&typeof performance.now==="function"?performance.now():Date.now();}
function randomUuidCompat(){
  if(typeof crypto!=="undefined"&&typeof crypto.randomUUID==="function")return crypto.randomUUID();
  if(typeof crypto!=="undefined"&&typeof crypto.getRandomValues==="function"){
    const bytes=crypto.getRandomValues(new Uint8Array(16));
    bytes[6]=(bytes[6]&0x0f)|0x40;
    bytes[8]=(bytes[8]&0x3f)|0x80;
    const hex=[...bytes].map((byte)=>byte.toString(16).padStart(2,"0"));
    return `${hex.slice(0,4).join("")}-${hex.slice(4,6).join("")}-${hex.slice(6,8).join("")}-${hex.slice(8,10).join("")}-${hex.slice(10,16).join("")}`;
  }
  return `uuid_${Date.now()}_${Math.random().toString(36).slice(2,12)}`;
}
async function getProjectIntelligenceWorker(){
  if(typeof window==="undefined"||typeof Worker==="undefined")return null;
  if(projectIntelligenceWorker)return projectIntelligenceWorker;
  if(projectIntelligenceWorkerPromise)return projectIntelligenceWorkerPromise;
  projectIntelligenceWorkerPromise=Promise.resolve(new Worker(new URL("../../workers/brain2ProjectIntelligence.worker.ts", import.meta.url),{type:"module"})).then((worker)=>{
    projectIntelligenceWorker=worker;
    projectIntelligenceWorkerPromise=null;
    return worker;
  }).catch((error)=>{
    projectIntelligenceWorkerPromise=null;
    throw error;
  });
  return projectIntelligenceWorkerPromise;
}
async function buildDeterministicProjectIntelligenceOffMainThread(input:NonNullable<Awaited<ReturnType<typeof buildProjectIntelligenceInput>>>){
  const worker=await getProjectIntelligenceWorker().catch(()=>null);
  if(!worker)return buildDeterministicProjectIntelligence(input);
  const requestId=`pi_${++projectIntelligenceWorkerSequence}_${Date.now()}`;
  return await new Promise<IntelligenceProjection>((resolve,reject)=>{
    const handleMessage=(event:MessageEvent<ProjectIntelligenceWorkerEvent>)=>{
      if(event.data.requestId!==requestId)return;
      cleanup();
      if(event.data.type==="done"){resolve(event.data.projection);return;}
      reject(new Error(event.data.error));
    };
    const handleError=(event:ErrorEvent)=>{
      cleanup();
      void worker.postMessage({type:"cancel",requestId} satisfies ProjectIntelligenceWorkerRequest);
      reject(event.error instanceof Error?event.error:new Error(event.message||"Project intelligence worker failed"));
    };
    const cleanup=()=>{
      worker.removeEventListener("message",handleMessage as EventListener);
      worker.removeEventListener("error",handleError as EventListener);
    };
    worker.addEventListener("message",handleMessage as EventListener);
    worker.addEventListener("error",handleError as EventListener);
    worker.postMessage({type:"build",requestId,input} satisfies ProjectIntelligenceWorkerRequest);
  });
}
function projectIntelligenceArtifactId(projectId:string){return `derived_project_intelligence_${projectId}`;}
function projectIntelligenceCacheKey(projectId:string){return `PROJECT_INTELLIGENCE:${projectId}`;}
function parseProjectIntelligence(record?:DerivedArtifactRecord|null):IntelligenceProjection|null{
  if(!record?.payloadJson)return null;
  try{return JSON.parse(record.payloadJson) as IntelligenceProjection;}catch{return null;}
}
function isProjectIntelligenceMRSRefiningStale(record:DerivedArtifactRecord){
  if(record.state!=="MRS_REFINING")return false;
  const updatedAt=Date.parse(record.updatedAt);
  return !Number.isFinite(updatedAt)||Date.now()-updatedAt>PROJECT_INTELLIGENCE_MRS_REFINING_STALE_MS;
}
function projectIntelligencePendingCount(projection?:IntelligenceProjection|null){return projection?.unresolvedTotal ?? projection?.unresolved.length ?? 0;}
function isProjectIntelligenceMRSQueuedOrRunning(projectId:string){
  if(projectIntelligenceMRSScheduleTimers.has(projectId))return true;
  for(const key of projectIntelligenceMRSRefreshes.keys())if(key.startsWith(`${projectId}:`))return true;
  return false;
}
function projectIntelligenceMRSStatus(projectId:string,artifact?:DerivedArtifactRecord,unresolved=0):Brain2ProjectDiagnosticsSummary["projects"][number]["mrs"]["status"]{
  if(artifact?.state==="ERROR")return "ERROR";
  if(artifact?.state==="MRS_REFINING"&&!isProjectIntelligenceMRSRefiningStale(artifact))return "RUNNING";
  if(projectIntelligenceMRSScheduleTimers.has(projectId))return "QUEUED";
  for(const key of projectIntelligenceMRSRefreshes.keys())if(key.startsWith(`${projectId}:`))return "QUEUED";
  if(unresolved>0)return "WAITING";
  return "DONE";
}
function projectArtifactState(projection:IntelligenceProjection,phase:"deterministic"|"refining"|"refined"|"error"):DerivedArtifactRecord["state"]{
  if(phase==="error")return "ERROR";
  if(phase==="refined")return projectIntelligencePendingCount(projection)?"MRS_PENDING":"MRS_READY";
  if(phase==="refining")return "MRS_REFINING";
  return projectIntelligencePendingCount(projection)?"MRS_PENDING":"DETERMINISTIC_READY";
}
function projectArtifactRuntime(projection:IntelligenceProjection,phase:"deterministic"|"refining"|"refined"|"error"):DerivedArtifactRecord["mrsRuntime"]{
  if(phase==="error")return "ERROR";
  if(phase==="refined")return "CONNECTED";
  if(phase==="refining")return "DEFERRED";
  return projectIntelligencePendingCount(projection)?"DEFERRED":"NOT_REQUIRED";
}

function mergeById<T extends { id: string }>(base: T[], writes: T[]): T[] {
  if (!writes.length) return base;
  const map = new Map(base.map((item)=>[item.id,item]));
  for (const item of writes) map.set(item.id,item);
  return [...map.values()];
}

function buildTelemetryRecord(input:{
  route:string;
  durationMs:number;
  telemetryKind?:"RETRIEVAL"|"RESPONSIVENESS";
  queryHash?:string;
  candidateCount?:number;
  returnedCount?:number;
  detail?:Record<string,unknown>;
}):RetrievalTelemetryRecord{
  const createdAt=now();
  return {
    id:`telemetry_${createdAt}_${Math.random().toString(36).slice(2,10)}`,
    queryHash:input.queryHash??input.route,
    route:input.route,
    candidateCount:input.candidateCount??0,
    returnedCount:input.returnedCount??0,
    durationMs:Math.max(0,Math.round(input.durationMs)),
    createdAt,
    telemetryKind:input.telemetryKind??"RETRIEVAL",
    detailJson:input.detail?JSON.stringify(input.detail):undefined,
    schemaVersion:BRAIN2_SCHEMA_VERSION,
  };
}

async function persistTelemetryRecord(record:RetrievalTelemetryRecord){
  await put("retrievalTelemetry",record);
  snapshot.retrievalTelemetry=mergeById(snapshot.retrievalTelemetry,[record]).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,500);
  setSnapshot({retrievalTelemetry:snapshot.retrievalTelemetry});
}

async function recordResponsivenessTelemetry(route:string,durationMs:number,detail?:Record<string,unknown>){
  await persistTelemetryRecord(buildTelemetryRecord({route,durationMs,telemetryKind:"RESPONSIVENESS",detail}));
}

function flushLongTaskTelemetry(){
  if(!pendingLongTaskCount)return;
  const count=pendingLongTaskCount;
  const totalDurationMs=Math.round(pendingLongTaskTotalMs);
  const maxDurationMs=Math.round(pendingLongTaskMaxMs);
  const createdAt=pendingLongTaskLastAt;
  pendingLongTaskCount=0;
  pendingLongTaskTotalMs=0;
  pendingLongTaskMaxMs=0;
  pendingLongTaskLastAt=undefined;
  void recordResponsivenessTelemetry("browser.longtask.window",maxDurationMs,{
    count,
    totalDurationMs,
    maxDurationMs,
    lastAt:createdAt,
  }).catch(()=>undefined);
}

function scheduleLongTaskFlush(){
  if(typeof window==="undefined")return;
  if(longTaskFlushTimer)window.clearTimeout(longTaskFlushTimer);
  longTaskFlushTimer=window.setTimeout(()=>{
    longTaskFlushTimer=undefined;
    flushLongTaskTelemetry();
  },15000);
}

function startResponsivenessObserver(){
  if(responsivenessObserverStarted||typeof window==="undefined"||typeof PerformanceObserver==="undefined")return;
  responsivenessObserverStarted=true;
  try{
    const supportedTypes=(PerformanceObserver as typeof PerformanceObserver & {supportedEntryTypes?:string[]}).supportedEntryTypes??[];
    if(!supportedTypes.includes("longtask"))return;
    const observer=new PerformanceObserver((list)=>{
      for(const entry of list.getEntries()){
        if(entry.duration<120)continue;
        pendingLongTaskCount+=1;
        pendingLongTaskTotalMs+=entry.duration;
        pendingLongTaskMaxMs=Math.max(pendingLongTaskMaxMs,entry.duration);
        pendingLongTaskLastAt=now();
      }
      if(pendingLongTaskCount)scheduleLongTaskFlush();
    });
    observer.observe({entryTypes:["longtask"]});
  }catch{
    // Responsiveness telemetry is optional and must never break boot.
  }
}

function truthGroupKey(projectId: string, kind: string) { return `${projectId}\u241f${kind}`; }

function rebuildIngestionIndexes() {
  knownMessageIds = new Set(snapshot.messages.map((item)=>item.id));
  knownAtomIds = new Set(snapshot.atoms.map((item)=>item.id));
  messageStatsByConversation = new Map();
  for (const message of snapshot.messages) {
    const stat = messageStatsByConversation.get(message.conversationId) ?? { count: 0, words: 0 };
    stat.count += 1; stat.words += message.wordCount; messageStatsByConversation.set(message.conversationId,stat);
  }
  truthGroups = new Map();
  for (const truth of snapshot.truths) {
    const key = truthGroupKey(truth.projectId,truth.kind);
    const group = truthGroups.get(key) ?? []; group.push(truth); truthGroups.set(key,group);
  }
  decisionByAtomId = new Map(snapshot.decisions.map((item)=>[item.atomId,item]));
  mutationSequence = snapshot.mutations.reduce((max,item)=>Math.max(max,item.sequence ?? 0),0);
}

let dbPromise: Promise<IDBDatabase> | null = null;

function ensureIndex(store: IDBObjectStore, name: string, keyPath: string | string[], options: IDBIndexParameters = {}) {
  if (!store.indexNames.contains(name)) store.createIndex(name,keyPath,options);
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const tx = request.transaction;
      for (const table of TABLES) {
        if (!db.objectStoreNames.contains(table)) db.createObjectStore(table, { keyPath: "id" });
      }
      if (!tx) return;
      const conversations = tx.objectStore("conversations");
      ensureIndex(conversations,"byProjectId","projectId");
      ensureIndex(conversations,"byExternalId","externalId");
      const messages = tx.objectStore("messages");
      ensureIndex(messages,"byConversationId","conversationId");
      ensureIndex(messages,"byConversationSequence",["conversationId","sequence"]);
      ensureIndex(messages,"bySourceId","sourceId");
      ensureIndex(messages,"byExternalId","externalId");
      ensureIndex(messages,"byHash","hash");
      ensureIndex(messages,"byCreatedAt","createdAt");
      const atoms = tx.objectStore("atoms");
      ensureIndex(atoms,"byMessageId","messageId");
      ensureIndex(atoms,"byConversationId","conversationId");
      ensureIndex(atoms,"byProjectId","projectId");
      ensureIndex(atoms,"byProjectCreatedAt",["projectId","createdAt"]);
      ensureIndex(atoms,"byKind","kind");
      ensureIndex(atoms,"byCreatedAt","createdAt");
      const truths = tx.objectStore("truths");
      ensureIndex(truths,"byProjectId","projectId");
      ensureIndex(truths,"byProjectKind",["projectId","kind"]);
      ensureIndex(truths,"byProjectStatus",["projectId","status"]);
      ensureIndex(truths,"byStatus","status");
      ensureIndex(truths,"byKey","key");
      ensureIndex(truths,"byUpdatedAt","updatedAt");
      const decisions = tx.objectStore("decisions");
      ensureIndex(decisions,"byAtomId","atomId");
      ensureIndex(decisions,"byProjectId","projectId");
      const mutations = tx.objectStore("mutations");
      ensureIndex(mutations,"byCreatedAt","createdAt");
      ensureIndex(mutations,"bySequence","sequence");
      ensureIndex(mutations,"byOriginSequence",["originDeviceId","originSequence"]);
      ensureIndex(mutations,"byReplicationStatus","replicationStatus");
      const syncPeers = tx.objectStore("syncPeers");
      ensureIndex(syncPeers,"byPeerDeviceId","peerDeviceId");
      ensureIndex(syncPeers,"byStatus","status");
      const syncConflicts = tx.objectStore("syncConflicts");
      ensureIndex(syncConflicts,"byMutationId","mutationId");
      ensureIndex(syncConflicts,"byStatus","status");
      const transactions = tx.objectStore("transactions");
      ensureIndex(transactions,"byType","type");
      ensureIndex(transactions,"byCreatedAt","createdAt");
      const journals = tx.objectStore("journals");
      ensureIndex(journals,"byStatus","status");
      ensureIndex(journals,"byConversationExternalId","conversationExternalId");
      ensureIndex(journals,"byUpdatedAt","updatedAt");
      const patternTests = tx.objectStore("patternTests");
      ensureIndex(patternTests,"byPatternId","patternId");
      ensureIndex(patternTests,"byKind","kind");
      ensureIndex(patternTests,"byStatus","status");
      const portableExpertise = tx.objectStore("portableExpertise");
      ensureIndex(portableExpertise,"byPatternId","patternId");
      const compiledCapabilities = tx.objectStore("compiledCapabilities");
      ensureIndex(compiledCapabilities,"byRegistryKey","registryKey");
      ensureIndex(compiledCapabilities,"byProjectId","projectId");
      ensureIndex(compiledCapabilities,"byVerificationState","verificationState");
      const reasoningTrajectories = tx.objectStore("reasoningTrajectories");
      ensureIndex(reasoningTrajectories,"byTrajectoryKey","trajectoryKey");
      ensureIndex(reasoningTrajectories,"byProjectId","projectId");
      ensureIndex(reasoningTrajectories,"byVerificationStatus","verificationStatus");
      ensureIndex(reasoningTrajectories,"byUpdatedAt","updatedAt");
      const failureMemories = tx.objectStore("failureMemories");
      ensureIndex(failureMemories,"byFailureSignature","failureSignature");
      ensureIndex(failureMemories,"byProjectId","projectId");
      ensureIndex(failureMemories,"byLastSeenAt","lastSeenAt");
      const derivedArtifacts = tx.objectStore("derivedArtifacts");
      ensureIndex(derivedArtifacts,"byKind","kind");
      ensureIndex(derivedArtifacts,"byCacheKey","cacheKey");
      ensureIndex(derivedArtifacts,"byProjectId","projectId");
      ensureIndex(derivedArtifacts,"byUpdatedAt","updatedAt");
      const databoxes = tx.objectStore("databoxes");
      ensureIndex(databoxes,"byProjectId","projectId");
      ensureIndex(databoxes,"byCreatedAt","createdAt");
      const retrievalTelemetry = tx.objectStore("retrievalTelemetry");
      ensureIndex(retrievalTelemetry,"byCreatedAt","createdAt");
      const evidenceBlocks = tx.objectStore("evidenceBlocks");
      ensureIndex(evidenceBlocks,"byConversationId","conversationId");
      ensureIndex(evidenceBlocks,"byProjectId","projectId");
      ensureIndex(evidenceBlocks,"byUpdatedAt","updatedAt");
      const searchDocs = tx.objectStore("searchDocs");
      ensureIndex(searchDocs,"byTerm","terms",{multiEntry:true});
      ensureIndex(searchDocs,"byKind","kind");
      ensureIndex(searchDocs,"byProjectId","projectId");
      ensureIndex(searchDocs,"byCreatedAt","createdAt");
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => { request.result.close(); dbPromise = null; };
      resolve(request.result);
    };
    request.onerror = () => { dbPromise = null; reject(request.error ?? new Error("Unable to open Brain2 local database")); };
  });
  return dbPromise;
}

async function closeBrain2DatabaseConnection(): Promise<void> {
  const pending = dbPromise;
  dbPromise = null;
  if (!pending) return;
  try {
    const db = await pending;
    db.close();
  } catch {
    // A failed/aborted open must not prevent destructive recovery.
  }
}

function clearScheduledRefreshWork(){
  if(typeof window!=="undefined"){
    if(deferredDerivationsTimer)window.clearTimeout(deferredDerivationsTimer);
    if(derivedRefreshTimer)window.clearTimeout(derivedRefreshTimer);
    if(longTaskFlushTimer)window.clearTimeout(longTaskFlushTimer);
    for(const timer of projectIntelligenceMRSScheduleTimers.values())window.clearTimeout(timer);
  }
  deferredDerivationsTimer=undefined;
  derivedRefreshTimer=undefined;
  longTaskFlushTimer=undefined;
  deferredDerivationsQueued=false;
  derivedRefreshQueued=false;
  derivedRefreshProjectIds.clear();
  projectIntelligenceMRSScheduleTimers.clear();
}

async function hydrateSecondaryBootTables(): Promise<void> {
  if (secondaryBootHydrationPromise) return secondaryBootHydrationPromise;
  secondaryBootHydrationPromise = (async () => {
    const startedAt=performanceNow();
    const [
      decisions,
      patterns,
      experiments,
      missions,
      checkpoints,
      verifications,
      contextVaultRuns,
      patternTests,
      portableExpertise,
      compiledCapabilities,
      reasoningTrajectories,
      failureMemories,
    ] = await Promise.all([
      all<DecisionRecord>("decisions"),
      all<PatternRecord>("patterns"),
      all<ExperimentRecord>("experiments"),
      all<MissionRecord>("missions"),
      all<CheckpointRecord>("checkpoints"),
      all<VerificationRecord>("verifications"),
      all<ContextVaultRunRecord>("contextVaultRuns"),
      all<PatternTestRecord>("patternTests"),
      all<PortableExpertiseRecord>("portableExpertise"),
      all<CompiledCapabilityRecord>("compiledCapabilities"),
      all<ReasoningTrajectoryRecord>("reasoningTrajectories"),
      all<FailureMemoryRecord>("failureMemories"),
    ]);
    snapshot = {
      ...snapshot,
      decisions,
      patterns,
      experiments,
      missions,
      checkpoints,
      verifications,
      contextVaultRuns,
      patternTests,
      portableExpertise,
      compiledCapabilities,
      reasoningTrajectories,
      failureMemories,
    };
    rebuildIngestionIndexes();
    setSnapshot({
      decisions: snapshot.decisions,
      patterns: snapshot.patterns,
      experiments: snapshot.experiments,
      missions: snapshot.missions,
      checkpoints: snapshot.checkpoints,
      verifications: snapshot.verifications,
      contextVaultRuns: snapshot.contextVaultRuns,
      patternTests: snapshot.patternTests,
      portableExpertise: snapshot.portableExpertise,
      compiledCapabilities: snapshot.compiledCapabilities,
      reasoningTrajectories: snapshot.reasoningTrajectories,
      failureMemories: snapshot.failureMemories,
    });
    await recordResponsivenessTelemetry("boot.secondary_hydration",performanceNow()-startedAt,{
      decisions:decisions.length,
      patterns:patterns.length,
      missions:missions.length,
      patternTests:patternTests.length,
      trajectories:reasoningTrajectories.length,
    });
  })().finally(() => {
    secondaryBootHydrationPromise = null;
  });
  return secondaryBootHydrationPromise;
}

async function deleteBrain2DatabaseCompletely(timeoutMs = 5000): Promise<void> {
  await closeBrain2DatabaseConnection();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    let settled = false;
    const finish = (fn: () => void) => { if (settled) return; settled = true; clearTimeout(timer); fn(); };
    const timer = setTimeout(() => finish(() => reject(new Error("Local Brain2 database reset was blocked. Close any other Brain2 tabs/windows using this same site, then try Force reset again."))), timeoutMs);
    request.onsuccess = () => finish(resolve);
    request.onerror = () => finish(() => reject(request.error ?? new Error("Unable to delete the local Brain2 database.")));
    request.onblocked = () => {
      // Keep waiting briefly: another same-origin tab may release its connection.
    };
  });
}

async function all<T>(table: TableName): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(table, "readonly");
    const request = tx.objectStore(table).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function getOne<T>(table: TableName, id: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(table,"readonly");
    const request=tx.objectStore(table).get(id);
    request.onsuccess=()=>resolve(request.result as T | undefined);
    request.onerror=()=>reject(request.error);
  });
}

async function putDerivedArtifacts(records:DerivedArtifactRecord[]){
  if(!records.length)return;
  await putMany("derivedArtifacts",records);
  snapshot.derivedArtifacts=mergeById(snapshot.derivedArtifacts,records);
  setSnapshot({derivedArtifacts:snapshot.derivedArtifacts});
}

async function buildProjectIntelligenceInput(projectId:string){
  const startedAt=performanceNow();
  const project=snapshot.projects.find((item)=>item.id===projectId);
  if(!project)return null;
  const loadStartedAt=performanceNow();
  const [summary,atoms]=await Promise.all([loadProjectTruthSummary(projectId),loadProjectAtoms(projectId,400)]);
  const loadDurationMs=performanceNow()-loadStartedAt;
  const truthIds=new Set(atoms.map((atom)=>atom.truthRecordId).filter(Boolean));
  const extraTruth=snapshot.truths.filter((truth)=>truth.projectId===projectId&&(truthIds.has(truth.id)||["SUPERSEDED","CONFLICTING","PENDING_REVIEW"].includes(truth.status)));
  const truths=[...new Map([...summary.current,...extraTruth].map((truth)=>[truth.id,truth])).values()];
  const totalDurationMs=performanceNow()-startedAt;
  if(totalDurationMs>=16){
    await recordResponsivenessTelemetry("project_intelligence.build_input",totalDurationMs,{
      projectId,
      atoms:atoms.length,
      currentTruths:summary.current.length,
      extraTruths:extraTruth.length,
      mergedTruths:truths.length,
      loadDurationMs:Math.round(loadDurationMs),
    });
  }
  return {
    project,
    atoms,
    truths,
    decisions:snapshot.decisions.filter((item)=>item.projectId===projectId),
    patterns:snapshot.patterns.filter((item)=>item.projectIds.includes(projectId)),
    experiments:snapshot.experiments.filter((item)=>item.projectId===projectId),
    ticks:snapshot.ticks.filter((item)=>item.projectId===projectId),
  };
}

function projectIdsForCommittedJournals(){
  return [...new Set(
    snapshot.journals
      .filter((item)=>item.status==="COMMITTED")
      .map((item)=>snapshot.conversations.find((conversation)=>conversation.id===item.conversationId)?.projectId)
      .filter((projectId):projectId is string=>Boolean(projectId)),
  )];
}

function collectProjectIdsFromDeltaPayloads(payloads:MutationDeltaPayload[]){
  const ids=new Set<string>();
  for(const payload of payloads){
    for(const project of (payload.writes.projects??[]) as ProjectRecord[]) ids.add(project.id);
    for(const conversation of (payload.writes.conversations??[]) as ConversationRecord[]) ids.add(conversation.projectId);
    for(const atom of (payload.writes.atoms??[]) as AtomRecord[]) ids.add(atom.projectId);
    for(const truth of (payload.writes.truths??[]) as TruthRecord[]) ids.add(truth.projectId);
    for(const decision of (payload.writes.decisions??[]) as DecisionRecord[]) ids.add(decision.projectId);
    for(const experiment of (payload.writes.experiments??[]) as ExperimentRecord[]) if(experiment.projectId) ids.add(experiment.projectId);
    for(const tick of (payload.writes.ticks??[]) as TickRecord[]) if(tick.projectId) ids.add(tick.projectId);
    for(const block of (payload.writes.evidenceBlocks??[]) as EvidenceBlockRecord[]) ids.add(block.projectId);
  }
  return [...ids];
}

function buildProjectIntelligenceArtifact(input:{projectId:string;sourceVersion:string;projection:IntelligenceProjection;phase:"deterministic"|"refining"|"refined"|"error";createdAt?:string;lastMRSError?:string;}):DerivedArtifactRecord{
  const createdAt=input.createdAt??now();
  return {
    id:projectIntelligenceArtifactId(input.projectId),
    kind:"PROJECT_INTELLIGENCE",
    cacheKey:projectIntelligenceCacheKey(input.projectId),
    projectId:input.projectId,
    sourceVersion:input.sourceVersion,
    state:projectArtifactState(input.projection,input.phase),
    mrsRuntime:projectArtifactRuntime(input.projection,input.phase),
    payloadJson:JSON.stringify({...input.projection,mrsRuntime:projectArtifactRuntime(input.projection,input.phase)}),
    createdAt,
    updatedAt:now(),
    lastMRSAttemptAt:input.phase==="refined"||input.phase==="error"?now():undefined,
    lastMRSError:input.lastMRSError,
    schemaVersion:BRAIN2_SCHEMA_VERSION,
  };
}

async function queueProjectIntelligenceMRS(projectId:string,input:NonNullable<Awaited<ReturnType<typeof buildProjectIntelligenceInput>>>,sourceVersion:string,base:DerivedArtifactRecord){
  const key=`${projectId}:${sourceVersion}`;
  if(projectIntelligenceMRSRefreshes.has(key))return projectIntelligenceMRSRefreshes.get(key) ?? null;
  const pending=projectIntelligenceMRSQueue.then(async()=>{
    const baseProjection=parseProjectIntelligence(base);
    if(!baseProjection||!projectIntelligencePendingCount(baseProjection))return base;
    brain2MRSLog("queue.project-refine.start", {
      projectId,
      unresolved: projectIntelligencePendingCount(baseProjection),
      unresolvedShown: baseProjection.unresolved.length,
      runtimeReadyOnly: true,
    });
    const refining=buildProjectIntelligenceArtifact({projectId,sourceVersion,projection:baseProjection,phase:"refining",createdAt:base.createdAt});
    await putDerivedArtifacts([refining]);
    try{
      const refined=await refineProjectIntelligenceWithMRS(input,baseProjection,{runtimeReadyOnly:true});
      brain2MRSLog("queue.project-refine.done", {
        projectId,
        mrsRuntime: refined.mrsRuntime,
        unresolvedAfter: projectIntelligencePendingCount(refined),
        unresolvedShownAfter: refined.unresolved.length,
        importantIdeas: refined.importantIdeas.length,
        mrsVerified: refined.importantIdeas.filter((item)=>item.verification==="MRS_VERIFIED").length,
        mrsPending: projectIntelligencePendingCount(refined),
        mrsReviewedCandidateIds: refined.mrsReviewedCandidateIds?.length ?? 0,
      });
      const record=buildProjectIntelligenceArtifact({projectId,sourceVersion,projection:refined,phase:refined.mrsRuntime==="CONNECTED"?"refined":"deterministic",createdAt:base.createdAt});
      await putDerivedArtifacts([record]);
      await syncCalculatedProjectRiskTicks([projectId]).catch((error)=>brain2MRSError("queue.project-risk-ticks.error", { projectId, error: error instanceof Error ? error.message : String(error) }));
      return record;
    }catch(error){
      const message=error instanceof Error?error.message:String(error);
      brain2MRSError("queue.project-refine.error", { projectId, error: message });
      const fallback=buildProjectIntelligenceArtifact({projectId,sourceVersion,projection:{...baseProjection,mrsRuntime:"ERROR"},phase:"error",createdAt:base.createdAt,lastMRSError:message});
      await putDerivedArtifacts([fallback]);
      await syncCalculatedProjectRiskTicks([projectId]).catch((riskError)=>brain2MRSError("queue.project-risk-ticks.error", { projectId, error: riskError instanceof Error ? riskError.message : String(riskError) }));
      return fallback;
    }finally{
      projectIntelligenceMRSRefreshes.delete(key);
    }
  });
  projectIntelligenceMRSQueue=pending.then(()=>undefined,()=>undefined);
  projectIntelligenceMRSRefreshes.set(key,pending);
  return pending;
}


async function countTable(table: TableName): Promise<number> {
  const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(table,"readonly");const request=tx.objectStore(table).count();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
}
async function getAllByIndex<T>(table:TableName,indexName:string,key:IDBValidKey|IDBKeyRange,limit?:number):Promise<T[]>{
  const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(table,"readonly");const index=tx.objectStore(table).index(indexName);const request=limit?index.getAll(key,limit):index.getAll(key);request.onsuccess=()=>resolve(request.result as T[]);request.onerror=()=>reject(request.error);});
}
async function countByIndex(table:TableName,indexName:string,key:IDBValidKey|IDBKeyRange):Promise<number>{const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(table,"readonly");const request=tx.objectStore(table).index(indexName).count(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function getAllKeysByIndex(table:TableName,indexName:string,key:IDBValidKey|IDBKeyRange):Promise<IDBValidKey[]>{
  const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(table,"readonly");const request=tx.objectStore(table).index(indexName).getAllKeys(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
}
async function recentByIndex<T>(table:TableName,indexName:string,limit:number):Promise<T[]>{
  const db=await openDb();return new Promise((resolve,reject)=>{const out:T[]=[];const tx=db.transaction(table,"readonly");const request=tx.objectStore(table).index(indexName).openCursor(null,"prev");request.onsuccess=()=>{const cursor=request.result;if(!cursor||out.length>=limit){resolve(out);return;}out.push(cursor.value as T);cursor.continue();};request.onerror=()=>reject(request.error);});
}
async function getByIds<T>(table:TableName,ids:string[]):Promise<T[]>{
  if(!ids.length)return[];const db=await openDb();return new Promise((resolve,reject)=>{const out:T[]=[];const tx=db.transaction(table,"readonly");const store=tx.objectStore(table);let pending=ids.length;for(const id of ids){const request=store.get(id);request.onsuccess=()=>{if(request.result)out.push(request.result as T);if(--pending===0)resolve(out);};request.onerror=()=>reject(request.error);} });
}
function compactTerms(text:string,extra:string[]=[]){return [...new Set([...extra,...indexTerms(text,64)].map((term)=>normalizeText(term).toLowerCase()).filter(Boolean))].slice(0,96);}
function searchDocForMessage(message:MessageRecord,projectId?:string,hasAtom=false,blockId?:string):PersistentSearchDocument{return{id:`search_message_${message.id}`,kind:"message",recordId:message.id,terms:compactTerms(message.text),text:message.text,projectId,sourceId:message.sourceId,conversationId:message.conversationId,blockId,createdAt:message.occurredAt??message.createdAt,role:message.role,hasAtom,schemaVersion:BRAIN2_SCHEMA_VERSION};}
function searchDocForAtom(atom:AtomRecord,blockId?:string):PersistentSearchDocument{return{id:`search_atom_${atom.id}`,kind:"atom",recordId:atom.id,terms:compactTerms(atom.text,atom.keywords),text:atom.text,projectId:atom.projectId,sourceId:atom.sourceId,conversationId:atom.conversationId,messageId:atom.messageId,blockId,sourceStart:atom.sourceStart,sourceEnd:atom.sourceEnd,createdAt:atom.createdAt,atomKind:atom.kind,confidence:atom.confidence,schemaVersion:BRAIN2_SCHEMA_VERSION};}
function searchDocForTruth(truth:TruthRecord):PersistentSearchDocument{return{id:`search_truth_${truth.id}`,kind:"truth",recordId:truth.id,terms:compactTerms(truth.text,[truth.kind,truth.canonicalSubject??""]),text:truth.text,projectId:truth.projectId,createdAt:truth.updatedAt,status:truth.status,atomKind:truth.kind,confidence:truth.confidence,schemaVersion:BRAIN2_SCHEMA_VERSION};}
function blockNumberForSequence(sequence?:number){return Math.floor(Math.max(0,sequence??0)/250);}
async function buildEvidenceBlocks(conversationId:string,projectId:string,sourceId:string,messages:MessageRecord[],atoms:AtomRecord[]):Promise<EvidenceBlockRecord[]>{
  const grouped=new Map<number,{messages:MessageRecord[];atoms:AtomRecord[]}>();for(const message of messages){const n=blockNumberForSequence(message.sequence);const g=grouped.get(n)??{messages:[],atoms:[]};g.messages.push(message);grouped.set(n,g);}for(const atom of atoms){const message=messages.find((item)=>item.id===atom.messageId);const n=blockNumberForSequence(message?.sequence);const g=grouped.get(n)??{messages:[],atoms:[]};g.atoms.push(atom);grouped.set(n,g);}const out:EvidenceBlockRecord[]=[];
  for(const [blockNumber,group] of grouped){const id=await canonicalId("evidence-block",conversationId,blockNumber);const existing=await getOne<EvidenceBlockRecord>("evidenceBlocks",id);const existingMessageIds=new Set(existing?.messageIds??[]);const freshMessages=group.messages.filter((item)=>!existingMessageIds.has(item.id));const messageIds=[...new Set([...(existing?.messageIds??[]),...group.messages.map((item)=>item.id)])];const atomIds=[...new Set([...(existing?.atomIds??[]),...group.atoms.map((item)=>item.id)])];const seqs=group.messages.map((item)=>item.sequence??0);const firstSequence=Math.min(existing?.firstSequence??Number.MAX_SAFE_INTEGER,...seqs);const lastSequence=Math.max(existing?.lastSequence??0,...seqs);const byteEstimate=(existing?.byteEstimate??0)+freshMessages.reduce((sum,item)=>sum+new TextEncoder().encode(item.text).byteLength,0);const hash=await sha256(JSON.stringify({conversationId,blockNumber,messageIds,atomIds,firstSequence,lastSequence}));out.push({id,conversationId,projectId,sourceId,blockNumber,firstSequence:Number.isFinite(firstSequence)?firstSequence:0,lastSequence,messageIds,atomIds,byteEstimate,hash,updatedAt:now(),schemaVersion:BRAIN2_SCHEMA_VERSION});}
  return out;
}
async function refreshStorageState(overrides:Partial<Brain2StorageState>={}):Promise<Brain2StorageState>{
  const [totalMessages,totalAtoms,totalTruths,totalConversations,totalEvidenceBlocks,indexedDocuments]=await Promise.all([countTable("messages"),countTable("atoms"),countTable("truths"),countTable("conversations"),countTable("evidenceBlocks"),countTable("searchDocs")]);const state:Brain2StorageState={...emptyStorage,...snapshot.storage,totalMessages,totalAtoms,totalTruths,totalConversations,totalEvidenceBlocks,indexedDocuments,hotMessages:snapshot.messages.length,hotAtoms:snapshot.atoms.length,retrievalIndexStatus:totalMessages+totalAtoms+totalTruths===0?"EMPTY":indexedDocuments>=totalMessages+totalAtoms+totalTruths?"READY":snapshot.storage.retrievalIndexStatus==="ERROR"?"ERROR":"PARTIAL",retrievalIndexProgress:totalMessages+totalAtoms+totalTruths?Math.min(1,indexedDocuments/(totalMessages+totalAtoms+totalTruths)):1,...overrides};snapshot.storage=state;return state;
}
async function persistentSearch<K extends "message"|"atom"|"truth">(kind:K,query:string,limit:number,projectId?:string):Promise<(K extends "message"?MessageRecord:K extends "atom"?AtomRecord:TruthRecord)[]> {
  const adapter={
    recentDocs:async(k:"message"|"atom"|"truth",docLimit:number,pid?:string)=>{const recent=await recentByIndex<PersistentSearchDocument>("searchDocs","byCreatedAt",Math.max(docLimit*2,64));return recent.filter((doc)=>doc.kind===k&&(!pid||doc.projectId===pid)).slice(0,docLimit);},
    docsForTerm:async(k:"message"|"atom"|"truth",term:string,docLimit:number,pid?:string)=>{const hits=await getAllByIndex<PersistentSearchDocument>("searchDocs","byTerm",term,Math.max(docLimit*2,64));return hits.filter((doc)=>doc.kind===k&&(!pid||doc.projectId===pid)).slice(0,docLimit);},
    hydrate:async(k:"message"|"atom"|"truth",ids:string[])=>{const table=k==="message"?"messages":k==="atom"?"atoms":"truths";return await getByIds<MessageRecord|AtomRecord|TruthRecord>(table,ids);},
  };
  const q=normalizeText(query);
  const runtime=await getBrain2BrowserRuntimeIfAvailable();
  if(runtime&&q){
    const docsById=new Map<string,PersistentSearchDocument>();
    for(const term of indexTerms(q,12)){
      const docs=await adapter.docsForTerm(kind,term,Math.max(limit*8,128),projectId);
      for(const doc of docs)docsById.set(doc.id,doc);
      if(docsById.size>=Math.max(limit*16,256))break;
    }
    const candidates=[...docsById.values()];
    if(candidates.length){
      const ranked=await runtime.searchDocuments(q,candidates.map((doc)=>({...doc,id:doc.id,text:doc.text,kind:doc.kind}) satisfies Brain2RuntimeSearchItem & PersistentSearchDocument),limit);
      const records=await adapter.hydrate(kind,ranked.map((doc)=>doc.recordId));
      const byId=new Map(records.map((record)=>[record.id,record]));
      return ranked.map((doc)=>byId.get(doc.recordId)).filter((record):record is K extends "message"?MessageRecord:K extends "atom"?AtomRecord:TruthRecord=>Boolean(record)) as never;
    }
  }
  const result=await runASIFReaderQuery(adapter,kind,query,limit,projectId);
  return result.records as never;
}

async function evidenceExists(ids:string[]):Promise<Set<string>>{const found=new Set<string>();if(!ids.length)return found;const db=await openDb();await Promise.all((["messages","atoms","truths"] as const).map(table=>new Promise<void>((resolve,reject)=>{const tx=db.transaction(table,"readonly");const store=tx.objectStore(table);let pending=ids.length;for(const id of ids){const r=store.getKey(id);r.onsuccess=()=>{if(r.result!==undefined)found.add(id);if(--pending===0)resolve();};r.onerror=()=>reject(r.error);}})));return found;}
async function pagedPrimaryRead<T>(table:TableName,startAfter?:IDBValidKey,limit=SEARCH_INDEX_BATCH):Promise<{items:T[];lastKey?:IDBValidKey}>{const db=await openDb();return new Promise((resolve,reject)=>{const items:T[]=[];let lastKey:IDBValidKey|undefined;const tx=db.transaction(table,"readonly");const range=startAfter===undefined?undefined:IDBKeyRange.lowerBound(startAfter,true);const request=tx.objectStore(table).openCursor(range);request.onsuccess=()=>{const cursor=request.result;if(!cursor||items.length>=limit){resolve({items,lastKey});return;}items.push(cursor.value as T);lastKey=cursor.key;cursor.continue();};request.onerror=()=>reject(request.error);});}
async function readAllPaged<T>(table:TableName,limit=SEARCH_INDEX_BATCH):Promise<T[]>{const out:T[]=[];let key:IDBValidKey|undefined;while(true){const page=await pagedPrimaryRead<T>(table,key,limit);out.push(...page.items);key=page.lastKey;if(page.items.length<limit)break;await new Promise((resolve)=>setTimeout(resolve,0));}return out;}
let searchIndexRebuildPromise:Promise<void>|null=null;
let storageLifecycleEpoch=0;
class StaleStorageLifecycleError extends Error { constructor(){ super("Brain2 storage lifecycle changed"); this.name="StaleStorageLifecycleError"; } }
function assertStorageLifecycle(epoch:number){ if(epoch!==storageLifecycleEpoch) throw new StaleStorageLifecycleError(); }
export async function rebuildPersistentSearchIndex():Promise<void>{if(searchIndexRebuildPromise)return searchIndexRebuildPromise;const rebuildEpoch=storageLifecycleEpoch;searchIndexRebuildPromise=(async()=>{try{assertStorageLifecycle(rebuildEpoch);snapshot.storage={...snapshot.storage,retrievalIndexStatus:"BUILDING",retrievalIndexProgress:0,lastError:undefined};setSnapshot({storage:snapshot.storage});await clearTable("searchDocs");assertStorageLifecycle(rebuildEpoch);const total=(await countTable("messages"))+(await countTable("atoms"))+(await countTable("truths"));let done=0;for(const table of ["messages","atoms","truths"] as const){let key:IDBValidKey|undefined;while(true){const page=await pagedPrimaryRead<MessageRecord|AtomRecord|TruthRecord>(table,key);if(!page.items.length)break;const docs:PersistentSearchDocument[]=[];if(table==="messages"){const byConversation=new Map<string,{conversation?:ConversationRecord;messages:MessageRecord[]}>();for(const item of page.items as MessageRecord[]){const entry=byConversation.get(item.conversationId)??{messages:[]};entry.messages.push(item);byConversation.set(item.conversationId,entry);}const blockWrites:EvidenceBlockRecord[]=[];for(const [conversationId,entry] of byConversation){const conv=snapshot.conversations.find((c)=>c.id===conversationId)??await getOne<ConversationRecord>("conversations",conversationId);entry.conversation=conv;if(conv){const blocks=await buildEvidenceBlocks(conversationId,conv.projectId,entry.messages[0]?.sourceId??conv.sourceId,entry.messages,[]);blockWrites.push(...blocks);const blockMap=new Map<string,string>();for(const block of blocks)for(const id of block.messageIds)blockMap.set(id,block.id);for(const item of entry.messages)docs.push(searchDocForMessage(item,conv.projectId,false,blockMap.get(item.id)));}else for(const item of entry.messages)docs.push(searchDocForMessage(item));}assertStorageLifecycle(rebuildEpoch);await putMany("evidenceBlocks",blockWrites);}else if(table==="atoms"){for(const item of page.items as AtomRecord[])docs.push(searchDocForAtom(item));}else for(const item of page.items as TruthRecord[])docs.push(searchDocForTruth(item));assertStorageLifecycle(rebuildEpoch);await putMany("searchDocs",docs);done+=page.items.length;key=page.lastKey;snapshot.storage={...snapshot.storage,retrievalIndexStatus:"BUILDING",retrievalIndexProgress:total?Math.min(1,done/total):1,indexedDocuments:done};setSnapshot({storage:snapshot.storage});if(page.items.length<SEARCH_INDEX_BATCH)break;await new Promise((resolve)=>setTimeout(resolve,0));assertStorageLifecycle(rebuildEpoch);}}
    assertStorageLifecycle(rebuildEpoch);await metaPut("searchIndexVersion","B2_SEARCH_DOC_V1");const state=await refreshStorageState({retrievalIndexStatus:"READY",retrievalIndexProgress:1,lastVerifiedAt:now()});setSnapshot({storage:state});}catch(error){if(error instanceof StaleStorageLifecycleError)return;snapshot.storage={...snapshot.storage,retrievalIndexStatus:"ERROR",lastError:error instanceof Error?error.message:String(error)};setSnapshot({storage:snapshot.storage});throw error;}finally{searchIndexRebuildPromise=null;}})();return searchIndexRebuildPromise;}
export async function verifyMemoryStorage():Promise<Brain2StorageState>{const state=await refreshStorageState({lastVerifiedAt:now()});if(state.indexedDocuments<state.totalMessages+state.totalAtoms+state.totalTruths&&state.totalMessages>0){state.retrievalIndexStatus="PARTIAL";state.retrievalIndexProgress=state.indexedDocuments/Math.max(1,state.totalMessages+state.totalAtoms+state.totalTruths);}setSnapshot({storage:state});return state;}

export async function getBrain2TruthIntegritySummary():Promise<Brain2TruthIntegritySummary>{
  await bootBrain2();
  const startedAt=performanceNow();
  const [currentTruths,messages]=await Promise.all([
    getAllByIndex<TruthRecord>("truths","byStatus","CURRENT"),
    readAllPaged<MessageRecord>("messages"),
  ]);
  const [currentTruthRoot,providerNeutralCurrentTruthRoot,sourceEvidenceRoot]=await Promise.all([
    buildCurrentTruthRoot(currentTruths),
    buildCurrentTruthRoot(currentTruths,{providerNeutral:true}),
    buildSourceEvidenceRoot(messages),
  ]);
  return {
    generatedAt:now(),
    durationMs:Math.round(performanceNow()-startedAt),
    currentTruthCount:currentTruths.length,
    messageCount:messages.length,
    currentTruthRoot,
    providerNeutralCurrentTruthRoot,
    sourceEvidenceRoot,
  };
}

export async function getBrain2DVIDiagnosticsSummary():Promise<Brain2DVIDiagnosticsSummary>{
  await bootBrain2();
  const startedAt=performanceNow();
  const [atoms,messages]=await Promise.all([readAllPaged<AtomRecord>("atoms"),readAllPaged<MessageRecord>("messages")]);
  const messageById=new Map(messages.map((message)=>[message.id,message]));
  const byRuleFamily:Brain2DVIDiagnosticsSummary["byRuleFamily"]={};
  const byHumanRuleFamily:Brain2DVIDiagnosticsSummary["byHumanRuleFamily"]={};
  const residualReasons:Record<string,number>={};
  const humanResidualSamples:Brain2DVIDiagnosticsSummary["humanResidualSamples"]=[];
  const humanResidualSamplesByRuleFamily:Brain2DVIDiagnosticsSummary["humanResidualSamplesByRuleFamily"]={};
  let strictAtoms=0;
  let eligible=0;
  let residual=0;
  let humanStrictAtoms=0;
  let humanEligible=0;
  let humanResidual=0;
  let assistantOrUnknownStrictAtoms=0;
  for(const atom of atoms){
    const traces=atom.ruleTrace??[];
    const strictTrace=traces.find((trace)=>trace.startsWith("strict_truth:")&&!["strict_truth:eligible","strict_truth:residual"].includes(trace));
    if(!strictTrace)continue;
    strictAtoms+=1;
    const message=messageById.get(atom.messageId);
    const role=normalizeText(message?.role??"").toLowerCase();
    const humanAuthored=role==="user"||role==="human";
    const ruleFamily=strictTrace.replace(/^strict_truth:/,"");
    const isEligible=traces.includes("strict_truth:eligible");
    const bucket=byRuleFamily[ruleFamily]??{eligible:0,residual:0,total:0};
    bucket.total+=1;
    if(isEligible){bucket.eligible+=1;eligible+=1;}else{bucket.residual+=1;residual+=1;}
    byRuleFamily[ruleFamily]=bucket;
    if(humanAuthored){
      humanStrictAtoms+=1;
      const humanBucket=byHumanRuleFamily[ruleFamily]??{eligible:0,residual:0,total:0};
      humanBucket.total+=1;
      if(isEligible){humanBucket.eligible+=1;humanEligible+=1;}else{humanBucket.residual+=1;humanResidual+=1;}
      byHumanRuleFamily[ruleFamily]=humanBucket;
    }else{
      assistantOrUnknownStrictAtoms+=1;
    }
    if(!isEligible){
      const reason=(atom.boundarySignals??[]).find((signal)=>signal.startsWith("strict_truth:"))?.replace(/^strict_truth:/,"")??"unknown residual reason";
      residualReasons[reason]=(residualReasons[reason]??0)+1;
      if(humanAuthored&&humanResidualSamples.length<30){
        humanResidualSamples.push({ruleFamily,reason,text:atom.text,messageRole:message?.role});
      }
      if(humanAuthored){
        const samples=humanResidualSamplesByRuleFamily[ruleFamily]??[];
        if(samples.length<6)samples.push({reason,text:atom.text,messageRole:message?.role});
        humanResidualSamplesByRuleFamily[ruleFamily]=samples;
      }
    }
  }
  return {
    generatedAt:now(),
    durationMs:Math.round(performanceNow()-startedAt),
    atomCount:atoms.length,
    strictAtoms,
    eligible,
    residual,
    humanStrictAtoms,
    humanEligible,
    humanResidual,
    assistantOrUnknownStrictAtoms,
    mrsPressureResidual:humanResidual,
    byRuleFamily,
    byHumanRuleFamily,
    residualReasons,
    humanResidualSamples,
    humanResidualSamplesByRuleFamily,
  };
}

export async function getBrain2ProjectDiagnosticsSummary():Promise<Brain2ProjectDiagnosticsSummary>{
  await bootBrain2();
  const startedAt=performanceNow();
  const [atoms,messages,currentTruths]=await Promise.all([
    readAllPaged<AtomRecord>("atoms"),
    readAllPaged<MessageRecord>("messages"),
    getAllByIndex<TruthRecord>("truths","byStatus","CURRENT"),
  ]);
  const messageById=new Map(messages.map((message)=>[message.id,message]));
  const messagesByProject=new Map<string,number>();
  for(const conversation of snapshot.conversations)messagesByProject.set(conversation.projectId,(messagesByProject.get(conversation.projectId)??0)+(conversation.messageCount??0));
  const atomsByProject=new Map<string,AtomRecord[]>();
  for(const atom of atoms){
    const list=atomsByProject.get(atom.projectId)??[];
    list.push(atom);
    atomsByProject.set(atom.projectId,list);
  }
  const currentTruthsByProject=new Map<string,number>();
  for(const truth of currentTruths)currentTruthsByProject.set(truth.projectId,(currentTruthsByProject.get(truth.projectId)??0)+1);
  const artifactByProject=new Map(snapshot.derivedArtifacts.filter((item)=>item.kind==="PROJECT_INTELLIGENCE"&&item.projectId).map((item)=>[item.projectId as string,item]));
  const projects=snapshot.projects.map((project)=>{
    const projectAtoms=atomsByProject.get(project.id)??[];
    const byHumanRuleFamily:Record<string,{eligible:number;residual:number;total:number}>={};
    const residualSamples:Brain2ProjectDiagnosticsSummary["projects"][number]["deterministic"]["residualSamples"]=[];
    let eligible=0,residual=0,humanEligible=0,humanResidual=0,assistantBlocked=0;
    for(const atom of projectAtoms){
      const traces=atom.ruleTrace??[];
      const strictTrace=traces.find((trace)=>trace.startsWith("strict_truth:")&&!["strict_truth:eligible","strict_truth:residual"].includes(trace));
      if(!strictTrace)continue;
      const ruleFamily=strictTrace.replace(/^strict_truth:/,"");
      const isEligible=traces.includes("strict_truth:eligible");
      const message=messageById.get(atom.messageId);
      const role=normalizeText(message?.role??"").toLowerCase();
      const humanAuthored=role==="user"||role==="human";
      if(isEligible)eligible+=1;else residual+=1;
      if(!humanAuthored){
        if(ruleFamily==="assistant_or_unknown_author")assistantBlocked+=1;
        continue;
      }
      const bucket=byHumanRuleFamily[ruleFamily]??{eligible:0,residual:0,total:0};
      bucket.total+=1;
      if(isEligible){bucket.eligible+=1;humanEligible+=1;}else{bucket.residual+=1;humanResidual+=1;}
      byHumanRuleFamily[ruleFamily]=bucket;
      if(!isEligible&&residualSamples.length<8){
        const reason=(atom.boundarySignals??[]).find((signal)=>signal.startsWith("strict_truth:"))?.replace(/^strict_truth:/,"")??"unknown residual reason";
        residualSamples.push({ruleFamily,reason,text:atom.text,atomId:atom.id,messageId:atom.messageId});
      }
    }
    const artifact=artifactByProject.get(project.id);
    const projection=parseProjectIntelligence(artifact);
    const unresolved=projectIntelligencePendingCount(projection);
    const status=projectIntelligenceMRSStatus(project.id,artifact,unresolved);
    const projectionItems=[...(projection?.currentTruth??[]),...(projection?.importantIdeas??[]),...(projection?.changes??[]),...(projection?.connections??[]),...(projection?.openQuestions??[])];
    const samplePendingAtoms=(projection?.unresolved??[]).slice(0,5).map((item)=>({id:item.id,statement:item.statement,kind:item.kind,evidenceIds:item.evidenceIds}));
    return {
      projectId:project.id,
      projectName:project.name,
      deterministic:{
        messages:messagesByProject.get(project.id)??0,
        atoms:projectAtoms.length,
        currentTruths:currentTruthsByProject.get(project.id)??0,
        eligible,
        residual,
        humanEligible,
        humanResidual,
        assistantBlocked,
        byHumanRuleFamily,
        residualSamples,
      },
      mrs:{
        artifactState:artifact?.state,
        runtime:artifact?.mrsRuntime,
        unresolved,
        unresolvedShown:projection?.unresolved.length??0,
        reviewed:projection?.mrsReviewedCandidateIds?.length??0,
        deterministicVerified:projectionItems.filter((item)=>item.verification==="DETERMINISTIC_VERIFIED").length,
        verified:projectionItems.filter((item)=>item.verification==="MRS_VERIFIED").length,
        rejected:projectionItems.filter((item)=>item.verification==="REJECTED").length,
        lastAttemptAt:artifact?.lastMRSAttemptAt,
        lastError:artifact?.lastMRSError,
        status,
        processing:status==="RUNNING",
        queued:status==="QUEUED",
        samplePendingAtoms,
      },
    };
  }).sort((a,b)=>b.mrs.unresolved-a.mrs.unresolved||b.deterministic.humanResidual-a.deterministic.humanResidual||a.projectName.localeCompare(b.projectName));
  return {generatedAt:now(),durationMs:Math.round(performanceNow()-startedAt),projects};
}

async function put<T extends AnyRecord>(table: TableName, value: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(table, "readwrite");
    tx.objectStore(table).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error(`Transaction aborted: ${table}`));
  });
}

async function putMany<T extends AnyRecord>(table: TableName, values: T[]): Promise<void> {
  if (!values.length) return;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(table, "readwrite");
    const store = tx.objectStore(table);
    for (const value of values) store.put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error(`Transaction aborted: ${table}`));
  });
}

async function atomicPut(writes: Partial<Record<DataTableName, AnyRecord[]>>): Promise<void> {
  const tables = (Object.keys(writes) as DataTableName[]).filter((table)=>(writes[table]?.length ?? 0) > 0);
  if (!tables.length) return;
  const db = await openDb();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(tables,"readwrite");
    for (const table of tables) {
      const store = tx.objectStore(table);
      for (const value of writes[table] ?? []) store.put(value);
    }
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error ?? new Error("Brain2 atomic commit aborted"));
  });
}

async function clearTable(table: TableName): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(table, "readwrite");
    tx.objectStore(table).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function metaGet(id: string): Promise<string | undefined> {
  const item = await getOne<{id:string;value:string}>("meta",id);
  return item?.value;
}
async function metaPut(id: string, value: string) { await put("meta", { id, value }); }

async function ensureWebDevice(memoryRoot: string): Promise<DeviceRecord> {
  let deviceId = localStorage.getItem("brain2-web-device-id");
  if (!deviceId) {
    deviceId = await canonicalId("dev", "web", navigator.userAgent, randomUuidCompat());
    localStorage.setItem("brain2-web-device-id", deviceId);
  }
  const device: DeviceRecord = { id: deviceId, name: "AI Miner Web", kind: "web", status: "SYNCED", lastSeenAt: now(), memoryRoot, pendingDeltas: 0 };
  await put("devices", device);
  return device;
}

export async function bootBrain2(): Promise<void> {
  if (snapshot.loaded) return;
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    clearScheduledRefreshWork();
    const startedAt=performanceNow();
    let memoryRoot = await metaGet("memoryRoot");
    if (!memoryRoot) {
      memoryRoot = await canonicalId("b2m", randomUuidCompat(), Date.now());
      await metaPut("memoryRoot", memoryRoot);
    }
    configurePersistentRetrieval(persistentSearch,evidenceExists);
    void getBrain2BrowserRuntimeIfAvailable();
    const [
      sources, conversations, messages, atoms, currentTruths, conflictingTruths, pendingTruths, recentTruths,
      projects, ticks, recentMutations, devices, recentTransactions, committedJournals, failedJournals, recentJournals,
      derivedArtifacts, databoxes, retrievalTelemetry, evidenceBlocks, syncPeers, syncConflicts,
    ] = await Promise.all([
      all<SourceRecord>("sources"),
      all<ConversationRecord>("conversations"),
      recentByIndex<MessageRecord>("messages","byCreatedAt",HOT_MESSAGE_LIMIT),
      recentByIndex<AtomRecord>("atoms","byCreatedAt",HOT_ATOM_LIMIT),
      getAllByIndex<TruthRecord>("truths","byStatus","CURRENT",5000),
      getAllByIndex<TruthRecord>("truths","byStatus","CONFLICTING",3000),
      getAllByIndex<TruthRecord>("truths","byStatus","PENDING_REVIEW",3000),
      recentByIndex<TruthRecord>("truths","byUpdatedAt",1200),
      all<ProjectRecord>("projects"), all<TickRecord>("ticks"),
      recentByIndex<MutationRecord>("mutations","byCreatedAt",RECENT_EVENT_LIMIT), all<DeviceRecord>("devices"), all<B2TransactionRecord>("transactions"),
      getAllByIndex<IngestionJournalRecord>("journals","byStatus","COMMITTED",5000), getAllByIndex<IngestionJournalRecord>("journals","byStatus","FAILED",1000), recentByIndex<IngestionJournalRecord>("journals","byUpdatedAt",RECENT_EVENT_LIMIT),
      all<DerivedArtifactRecord>("derivedArtifacts"), recentByIndex<DataboxRecord>("databoxes","byCreatedAt",500), recentByIndex<RetrievalTelemetryRecord>("retrievalTelemetry","byCreatedAt",500), recentByIndex<EvidenceBlockRecord>("evidenceBlocks","byUpdatedAt",500), all<SyncPeerRecord>("syncPeers"), all<SyncConflictRecord>("syncConflicts"),
    ]);
    const truths=mergeById(mergeById(mergeById(currentTruths,conflictingTruths),pendingTruths),recentTruths);
    const journals=mergeById(mergeById(recentJournals,committedJournals),failedJournals);
    const webDevice = await ensureWebDevice(memoryRoot);
    const finalDevices = [...devices.filter((device) => device.id !== webDevice.id), webDevice];
    const searchVersion=await metaGet("searchIndexVersion");
    const patternVersion=await metaGet("patternVersion");
    const storageCounts:Brain2StorageState={...emptyStorage,totalMessages:await countTable("messages"),totalAtoms:await countTable("atoms"),totalTruths:await countTable("truths"),totalConversations:conversations.length,totalEvidenceBlocks:await countTable("evidenceBlocks"),indexedDocuments:await countTable("searchDocs"),hotMessages:messages.length,hotAtoms:atoms.length,retrievalIndexStatus:"EMPTY",retrievalIndexProgress:0,bootMode:"BOUNDED_HOT_SET"};
    const expectedDocs=storageCounts.totalMessages+storageCounts.totalAtoms+storageCounts.totalTruths;
    storageCounts.retrievalIndexProgress=expectedDocs?Math.min(1,storageCounts.indexedDocuments/expectedDocs):1;
    storageCounts.retrievalIndexStatus=expectedDocs===0?"EMPTY":searchVersion==="B2_SEARCH_DOC_V1"&&storageCounts.indexedDocuments>=expectedDocs?"READY":storageCounts.indexedDocuments?"PARTIAL":"BUILDING";
    const normalizedProjects=projects.map((project)=>({...project,atomCount:project.atomCount??project.atomIds.length,recentAtomIds:project.recentAtomIds??project.atomIds.slice(-256),atomIds:project.atomIds.slice(-512)}));
    setSnapshot({ sources, conversations, messages, atoms, truths, projects:normalizedProjects, ticks, mutations: recentMutations, devices: finalDevices, transactions: recentTransactions, journals, derivedArtifacts, databoxes, retrievalTelemetry, evidenceBlocks, syncPeers, syncConflicts, storage:storageCounts, memoryRoot, loaded: true });
    startResponsivenessObserver();
    void recordResponsivenessTelemetry("boot.initial_hydration",performanceNow()-startedAt,{
      sources:sources.length,
      conversations:conversations.length,
      hotMessages:messages.length,
      hotAtoms:atoms.length,
      truths:truths.length,
      projects:normalizedProjects.length,
      journals:journals.length,
      retrievalStatus:storageCounts.retrievalIndexStatus,
    }).catch(()=>undefined);
    const projectsNeedingCompaction=normalizedProjects.filter((project)=>{const original=projects.find((item)=>item.id===project.id);return Boolean(original&&((original.atomIds?.length??0)>512||original.atomCount===undefined||original.recentAtomIds===undefined));});
    if(projectsNeedingCompaction.length)setTimeout(()=>{void putMany("projects",projectsNeedingCompaction);},0);
    rebuildIngestionIndexes();
    if(storageCounts.retrievalIndexStatus!=="READY"&&expectedDocs>0) setTimeout(()=>{void rebuildPersistentSearchIndex();},0);
    if(patternVersion!==BRAIN2_PATTERN_VERSION&&storageCounts.totalAtoms>0) setTimeout(()=>{scheduleDeferredDerivations({delayMs:500,idleTimeoutMs:6000});},0);
    if (committedJournals.length) queueMicrotask(()=>{ scheduleDeferredDerivations({delayMs:800}); });
    setTimeout(()=>{void hydrateSecondaryBootTables().catch(()=>undefined);},0);
  })().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    snapshot = { ...snapshot, loaded: false, storage: { ...snapshot.storage, retrievalIndexStatus: "ERROR", lastError: message } };
    emit();
    throw error;
  }).finally(() => { bootPromise = null; });
  return bootPromise;
}

const SYNC_TABLES: SyncTableName[] = ["sources","conversations","messages","atoms","truths","projects","ticks","decisions","patterns","experiments","missions","checkpoints","verifications","transactions","patternTests","portableExpertise","compiledCapabilities","reasoningTrajectories","failureMemories","databoxes","evidenceBlocks"];
const SYNC_TABLE_SET = new Set<string>(SYNC_TABLES);

function deltaPayload(primaryTable:SyncTableName,writes:MutationDeltaPayload["writes"],deletes?:MutationDeltaPayload["deletes"]):MutationDeltaPayload{
  return {version:1,operation:deletes?"UPSERT_BUNDLE":"UPSERT_BUNDLE",writes,deletes,primaryTable};
}

async function buildMutation(type: string, entityType: string, entityId: string, payload?:MutationDeltaPayload, beforeValue?:unknown): Promise<MutationRecord> {
  const deviceId = localStorage.getItem("brain2-web-device-id") ?? "web";
  const createdAt = now();
  const sequence = ++mutationSequence;
  const prior=[...snapshot.mutations].filter((item)=>(item.originDeviceId??item.deviceId)===deviceId).sort((a,b)=>(b.originSequence??b.sequence??0)-(a.originSequence??a.sequence??0))[0];
  const parentMutationId=prior?.id;
  if(!payload){
    const legacyHash=await sha256(`${BRAIN2_SCHEMA_VERSION}|${type}|${entityType}|${entityId}|${createdAt}|${deviceId}|${sequence}|${parentMutationId??""}`);
    return {id:`mut_${legacyHash.slice(0,24)}`,type,entityType,entityId,createdAt,deviceId,hash:legacyHash,sequence,parentMutationId,schemaVersion:BRAIN2_SCHEMA_VERSION,originDeviceId:deviceId,originSequence:sequence,parentMutationIds:parentMutationId?[parentMutationId]:[],memoryRoot:snapshot.memoryRoot,protocolVersion:BRAIN2_SYNC_PROTOCOL_VERSION,replicationStatus:"LINEAGE_ONLY",sourceTransport:"LOCAL"};
  }
  const payloadHash=await hashPayload(payload);
  const primaryRecord=payload.primaryTable ? payload.writes[payload.primaryTable]?.find((record)=>record.id===entityId) : undefined;
  const beforeHash=beforeValue===undefined?undefined:await hashEntity(beforeValue);
  const afterHash=primaryRecord===undefined?undefined:await hashEntity(primaryRecord);
  const base={protocolVersion:BRAIN2_SYNC_PROTOCOL_VERSION,memoryRoot:snapshot.memoryRoot,originDeviceId:deviceId,originSequence:sequence,type,entityType,entityId,payloadHash,parentMutationIds:parentMutationId?[parentMutationId]:[]};
  const hash=await hashMutation(base);
  return {id:`mut_${hash.slice(0,24)}`,createdAt,deviceId,hash,sequence,parentMutationId,schemaVersion:BRAIN2_SCHEMA_VERSION,...base,payload,beforeHash,afterHash,replicationStatus:"LOCAL_COMMITTED",sourceTransport:"LOCAL"};
}

async function recordMutation(type: string, entityType: string, entityId: string, payload?:MutationDeltaPayload, beforeValue?:unknown): Promise<MutationRecord> {
  await bootBrain2();
  const mutation = await buildMutation(type,entityType,entityId,payload,beforeValue);
  await put("mutations", mutation);
  snapshot.mutations = mergeById(snapshot.mutations,[mutation]).slice(-RECENT_EVENT_LIMIT);
  return mutation;
}

async function buildSource(provider: SourceRecord["provider"], label: string, sourceType: string): Promise<SourceRecord> {
  const id = await canonicalId("src", provider, sourceType);
  const existing = snapshot.sources.find((item) => item.id === id);
  return { id, provider, label, sourceType, createdAt: existing?.createdAt ?? now(), lastSeenAt: now(), schemaVersion: BRAIN2_SCHEMA_VERSION };
}

async function resolveProjectForInput(input: NormalizedConversationInput, existingConversation?: ConversationRecord): Promise<{project:ProjectRecord; created:boolean}> {
  if (existingConversation) {
    const existing = snapshot.projects.find((item)=>item.id === existingConversation.projectId);
    if (existing) return { project: existing, created: false };
  }
  const fingerprint = fingerprintConversation(input);
  const chosen = chooseProject(fingerprint,snapshot.projects);
  if (chosen.project) {
    return {
      project: {
        ...chosen.project,
        tags: [...new Set([...(chosen.project.tags ?? []),...fingerprint.allTerms.slice(0,18)])],
        entityTerms: [...new Set([...(chosen.project.entityTerms ?? []),...fingerprint.entityTerms])].slice(0,32),
        resolutionConfidence: Math.max(chosen.project.resolutionConfidence ?? 0,chosen.score),
        updatedAt: now(),
        schemaVersion: BRAIN2_SCHEMA_VERSION,
      },
      created:false,
    };
  }
  const name = deriveProjectName(input.title,fingerprint);
  const slug = projectSlug(name);
  const signature = fingerprint.allTerms.slice(0,12).sort().join("|") || input.externalId;
  const id = await canonicalId("prj",slug,signature, fingerprint.genericTitle ? input.externalId : "");
  const sameId = snapshot.projects.find((item)=>item.id === id);
  if (sameId) return { project: sameId, created:false };
  const createdAt=now();
  return {
    created:true,
    project:{
      id,slug,name,summary:"Source-backed project resolved from conversation title, content, entities, chronology and prior project evidence.",createdAt,updatedAt:createdAt,conversationIds:[],atomIds:[],openTickIds:[],tags:fingerprint.allTerms.slice(0,20),aliases:input.title && input.title !== name ? [normalizeText(input.title)] : [],entityTerms:fingerprint.entityTerms,resolutionConfidence:1,schemaVersion:BRAIN2_SCHEMA_VERSION,
    },
  };
}

function replaceTruthGroup(writes: TruthRecord[]) {
  for (const truth of writes) {
    const key=truthGroupKey(truth.projectId,truth.kind);
    const group=truthGroups.get(key) ?? [];
    truthGroups.set(key,mergeById(group,[truth]));
  }
}

export async function ingestNormalizedConversation(input: NormalizedConversationInput): Promise<{ messagesAdded: number; atomsAdded: number; projectId: string }> {
  await bootBrain2();
  const source = await buildSource(input.provider,input.sourceLabel,input.sourceType);
  const conversationId = await canonicalId("conv", input.provider, input.externalId || input.title);
  const existingConversation = snapshot.conversations.find((item)=>item.id===conversationId);
  const { project, created: projectCreated } = await resolveProjectForInput(input,existingConversation);
  const payloadHash = await sha256(JSON.stringify({ provider:input.provider,externalId:input.externalId,title:input.title,selectedBranchId:input.selectedBranchId,messages:input.messages.map((m)=>[m.externalId,m.providerMessageId,m.providerNodeId,m.parentProviderNodeId,m.branchId,m.sequence,m.role,normalizeText(m.text),m.occurredAt]) }));
  const journalId = await canonicalId("ingest",input.provider,input.externalId,payloadHash);
  const priorJournal = snapshot.journals.find((item)=>item.id === journalId) ?? await getOne<IngestionJournalRecord>("journals",journalId);
  if (priorJournal?.status === "DERIVED") return { messagesAdded:0,atomsAdded:0,projectId:project.id };
  const receivedAt = priorJournal?.receivedAt ?? now();
  let journal: IngestionJournalRecord = { id:journalId,sourceId:source.id,conversationExternalId:input.externalId,conversationId,provider:input.provider,status:"RECEIVED",receivedAt,updatedAt:now(),payloadHash,messageCount:input.messages.length,committedMessageIds:priorJournal?.committedMessageIds ?? [],committedAtomIds:priorJournal?.committedAtomIds ?? [],schemaVersion:BRAIN2_SCHEMA_VERSION };
  await put("journals",journal);
  snapshot.journals=mergeById(snapshot.journals,[journal]);

  try {
    journal={...journal,status:"NORMALIZED",updatedAt:now()}; await put("journals",journal); snapshot.journals=mergeById(snapshot.journals,[journal]);
    const conversation: ConversationRecord = existingConversation ?? {
      id:conversationId,sourceId:source.id,provider:input.provider,externalId:input.externalId || conversationId,title:normalizeText(input.title || "Untitled conversation"),createdAt:input.createdAt,updatedAt:input.updatedAt,projectId:project.id,messageCount:0,wordCount:0,selectedBranchId:input.selectedBranchId,branchIds:input.branchIds,projectResolutionConfidence:project.resolutionConfidence,schemaVersion:BRAIN2_SCHEMA_VERSION,
    };
    const messageWrites: MessageRecord[]=[];
    const atomWrites: AtomRecord[]=[];
    const truthWritesMap=new Map<string,TruthRecord>();
    const decisionWritesMap=new Map<string,DecisionRecord>();
    const persistedConversationMessageIds=await getAllKeysByIndex("messages","byConversationId",conversationId);
    const localMessageIds=new Set<string>([...knownMessageIds,...persistedConversationMessageIds.map(String)]);
    const localAtomIds=new Set(knownAtomIds);
    // Keep reconciliation caches local until the IndexedDB transaction commits. This prevents
    // an aborted ingestion from contaminating same-session truth/decision resolution state.
    const localTruthGroups=new Map([...truthGroups.entries()].map(([key,value])=>[key,[...value]]));
    const loadedTruthGroupKeys=new Set(localTruthGroups.keys());
    const localDecisionByAtomId=new Map(decisionByAtomId);

    const canonicalTruthMessages=toCanonicalTruthMessages(input,conversationId);
    const strictDerivedCandidates=deriveStrictCurrentTruthCandidates(canonicalTruthMessages);
    const strictTruthContext=createStrictCurrentTruthContext();

    for (let rawIndex=0; rawIndex<input.messages.length; rawIndex+=1) {
      const raw=input.messages[rawIndex];
      const canonicalTruthMessage=canonicalTruthMessages[rawIndex];
      if(canonicalTruthMessage?.role==="assistant")noteStrictAssistantMessage(strictTruthContext,canonicalTruthMessage);
      const text=normalizeText(raw.text); if(!text) continue;
      const id=await canonicalMessageId({provider:input.provider,conversationId,providerMessageId:raw.providerMessageId || raw.externalId,providerNodeId:raw.providerNodeId,parentProviderNodeId:raw.parentProviderNodeId,branchId:raw.branchId,sequence:raw.sequence,role:raw.role,text});
      if(localMessageIds.has(id)) continue;
      const hash=await sha256(`${BRAIN2_SCHEMA_VERSION}|${input.provider}|${conversationId}|${raw.providerMessageId ?? raw.externalId}|${raw.providerNodeId ?? ""}|${raw.parentProviderNodeId ?? ""}|${raw.branchId ?? ""}|${raw.sequence}|${raw.role}|${text}`);
      const occurredAt=raw.occurredAt;
      const message:MessageRecord={id,conversationId,sourceId:source.id,provider:input.provider,externalId:raw.externalId || id,role:raw.role,text,createdAt:occurredAt,occurredAt,capturedAt:raw.capturedAt,timestampSource:raw.timestampSource ?? (occurredAt?"archive":"unknown"),sequence:raw.sequence,providerMessageId:raw.providerMessageId,providerNodeId:raw.providerNodeId,parentProviderNodeId:raw.parentProviderNodeId,branchId:raw.branchId,captureId:raw.captureId,captureUrl:raw.captureUrl,captureConnectorId:raw.captureConnectorId,hash,wordCount:wordCount(text),schemaVersion:BRAIN2_SCHEMA_VERSION};
      messageWrites.push(message); localMessageIds.add(id);

      const candidates=[...atomizeMessage(text,raw.role),...(strictDerivedCandidates.get(canonicalTruthMessage?.messageKey ?? "") ?? [])];
      for (const candidate of candidates) {
        const strictTruth=evaluateStrictCurrentTruthCandidate(candidate,canonicalTruthMessage,strictTruthContext);
        const effectiveKind=strictTruth.eligible && strictTruth.truthKind ? strictTruth.truthKind : candidate.kind;
        const candidateKeywords=candidate.keywords ?? keywords(candidate.text,10);
        const candidateConfidence=candidate.confidence ?? 0.72;
        const atomHash=await sha256(`${effectiveKind}|${candidate.canonicalSubject}|${candidate.text}|${message.id}`);
        const atomId=`atom_${atomHash.slice(0,24)}`;
        if(localAtomIds.has(atomId)) continue;
        const atom:AtomRecord={id:atomId,messageId:message.id,conversationId,projectId:project.id,sourceId:source.id,kind:effectiveKind,subject:candidate.subject,canonicalSubject:candidate.canonicalSubject,value:candidate.value,polarity:candidate.polarity,scope:candidate.scope,sourceStart:candidate.sourceStart,sourceEnd:candidate.sourceEnd,semanticSubtype:candidate.semanticSubtype,ruleTrace:[...(candidate.ruleTrace??[]),`strict_truth:${strictTruth.ruleFamily}`,`strict_truth:${strictTruth.eligible?"eligible":"residual"}`],relationSafe:candidate.relationSafe,atomizationArm:candidate.atomizationArm,boundarySignals:[...(candidate.boundarySignals??[]),`strict_truth:${strictTruth.reason}`],hierarchyRole:candidate.hierarchyRole,sequenceIndex:candidate.sequenceIndex,cohesionType:candidate.cohesionType,intrinsicSufficiency:candidate.intrinsicSufficiency,fallbackPolicy:candidate.fallbackPolicy,validFrom:occurredAt,text:candidate.text,createdAt:occurredAt,confidence:strictTruth.eligible?Math.min(0.98,Math.max(candidateConfidence,0.82)):candidateConfidence,provenance:[message.id],keywords:candidateKeywords,hash:atomHash,extractionVersion:candidate.extractionVersion,schemaVersion:BRAIN2_SCHEMA_VERSION};
        atomWrites.push(atom); localAtomIds.add(atomId);
        if(!strictTruth.eligible){atom.truthStatus="UNKNOWN";continue;}
        const groupKey=truthGroupKey(atom.projectId,atom.kind);
        if(!loadedTruthGroupKeys.has(groupKey)){const persisted=await getAllByIndex<TruthRecord>("truths","byProjectKind",[atom.projectId,atom.kind]);localTruthGroups.set(groupKey,mergeById(localTruthGroups.get(groupKey)??[],persisted));loadedTruthGroupKeys.add(groupKey);}
        const reconciliation=await reconcileAtomToTruth(atom,raw.role,localTruthGroups.get(groupKey) ?? []);
        if(reconciliation.created){atom.truthStatus=reconciliation.created.status;atom.truthRelation=reconciliation.relation;atom.truthRecordId=reconciliation.created.id;atom.supersedesTruthId=reconciliation.created.supersedes;}
        for(const truth of reconciliation.writes) truthWritesMap.set(truth.id,truth);
        localTruthGroups.set(groupKey,mergeById(localTruthGroups.get(groupKey) ?? [],reconciliation.writes));
        if(atom.kind === "decision" && reconciliation.created){
          const decision:DecisionRecord={id:await canonicalId("dec",atom.id),projectId:atom.projectId,atomId:atom.id,title:atom.text,status:reconciliation.created.status,createdAt:atom.createdAt,evidenceAtomIds:[atom.id]};
          decisionWritesMap.set(decision.id,decision); localDecisionByAtomId.set(atom.id,decision);
        }
        for(const truth of reconciliation.writes){
          const existingDecision=localDecisionByAtomId.get(truth.atomId);
          if(existingDecision && existingDecision.status !== truth.status){
            const updated={...existingDecision,status:truth.status}; decisionWritesMap.set(updated.id,updated); localDecisionByAtomId.set(updated.atomId,updated);
          }
        }
      }
    }

    const priorStats={count:conversation.messageCount??0,words:conversation.wordCount??0};
    const newStats={count:priorStats.count+messageWrites.length,words:priorStats.words+messageWrites.reduce((sum,item)=>sum+item.wordCount,0)};
    const updatedConversation:ConversationRecord={...conversation,sourceId:source.id,projectId:project.id,title:normalizeText(input.title || conversation.title),createdAt:conversation.createdAt ?? input.createdAt,updatedAt:input.updatedAt ?? input.messages.at(-1)?.occurredAt ?? conversation.updatedAt ?? now(),messageCount:newStats.count,wordCount:newStats.words,selectedBranchId:input.selectedBranchId ?? conversation.selectedBranchId,branchIds:[...new Set([...(conversation.branchIds ?? []),...(input.branchIds ?? [])])],projectResolutionConfidence:project.resolutionConfidence,schemaVersion:BRAIN2_SCHEMA_VERSION};
    const priorAtomCount=project.atomCount??project.atomIds.length;const recentAtomIds=[...new Set([...(project.recentAtomIds??project.atomIds),...atomWrites.map((atom)=>atom.id)])].slice(-256);
    const updatedProject:ProjectRecord={...project,conversationIds:[...new Set([...project.conversationIds,conversationId])],atomIds:recentAtomIds.slice(-512),recentAtomIds,atomCount:priorAtomCount+atomWrites.length,tags:[...new Set([...project.tags,...fingerprintConversation(input).allTerms.slice(0,20),...atomWrites.flatMap((atom)=>atom.keywords.slice(0,4))])].slice(0,64),updatedAt:now(),schemaVersion:BRAIN2_SCHEMA_VERSION};
    const evidenceBlocks=await buildEvidenceBlocks(conversationId,project.id,source.id,messageWrites,atomWrites);
    const blockByMessage=new Map<string,string>();for(const block of evidenceBlocks)for(const id of block.messageIds)blockByMessage.set(id,block.id);
    const messageHasAtoms=new Set(atomWrites.map((atom)=>atom.messageId));
    const searchDocs:PersistentSearchDocument[]=[...messageWrites.map((message)=>searchDocForMessage(message,project.id,messageHasAtoms.has(message.id),blockByMessage.get(message.id))),...atomWrites.map((atom)=>searchDocForAtom(atom,blockByMessage.get(atom.messageId))),...[...truthWritesMap.values()].map(searchDocForTruth)];
    const mutationPayload=deltaPayload("conversations",{sources:[source],projects:[updatedProject],conversations:[updatedConversation],messages:messageWrites,atoms:atomWrites,truths:[...truthWritesMap.values()],decisions:[...decisionWritesMap.values()],evidenceBlocks});
    const mutation=await buildMutation(projectCreated?"INGEST_CREATE_PROJECT":"INGEST_CONVERSATION","conversation",conversationId,mutationPayload,existingConversation);
    journal={...journal,status:"COMMITTING",updatedAt:now(),committedMessageIds:messageWrites.map((item)=>item.id),committedAtomIds:atomWrites.map((item)=>item.id)};
    await put("journals",journal);
    snapshot.journals=mergeById(snapshot.journals,[journal]);
    const committedJournal={...journal,status:"COMMITTED" as const,updatedAt:now()};

    await atomicPut({
      sources:[source],
      projects:[updatedProject],
      conversations:[updatedConversation],
      messages:messageWrites,
      atoms:atomWrites,
      truths:[...truthWritesMap.values()],
      decisions:[...decisionWritesMap.values()],
      mutations:[mutation],
      journals:[committedJournal],
      evidenceBlocks,
      searchDocs,
    });

    snapshot.sources=mergeById(snapshot.sources,[source]);
    snapshot.projects=mergeById(snapshot.projects,[updatedProject]);
    snapshot.conversations=mergeById(snapshot.conversations,[updatedConversation]);
    snapshot.messages=mergeById(snapshot.messages,messageWrites).sort((a,b)=>(a.createdAt??"").localeCompare(b.createdAt??"")).slice(-HOT_MESSAGE_LIMIT);
    snapshot.atoms=mergeById(snapshot.atoms,atomWrites).sort((a,b)=>(a.createdAt??"").localeCompare(b.createdAt??"")).slice(-HOT_ATOM_LIMIT);
    snapshot.truths=mergeById(snapshot.truths,[...truthWritesMap.values()]);
    snapshot.decisions=mergeById(snapshot.decisions,[...decisionWritesMap.values()]);
    // Publish reconciliation caches only after the durable multi-store commit succeeds.
    replaceTruthGroup([...truthWritesMap.values()]);
    for(const decision of decisionWritesMap.values()) decisionByAtomId.set(decision.atomId,decision);
    snapshot.mutations=mergeById(snapshot.mutations,[mutation]);
    snapshot.journals=mergeById(snapshot.journals,[committedJournal]);
    snapshot.evidenceBlocks=mergeById(snapshot.evidenceBlocks,evidenceBlocks).slice(-500);
    const nextTotalMessages=snapshot.storage.totalMessages+messageWrites.length;const nextTotalAtoms=snapshot.storage.totalAtoms+atomWrites.length;const nextIndexed=snapshot.storage.indexedDocuments+searchDocs.length;const estimatedTotalTruths=Math.max(snapshot.storage.totalTruths,snapshot.truths.length);const expectedIndexed=nextTotalMessages+nextTotalAtoms+estimatedTotalTruths;const indexComplete=snapshot.storage.retrievalIndexStatus!=="BUILDING"&&snapshot.storage.retrievalIndexStatus!=="PARTIAL"&&nextIndexed>=expectedIndexed;snapshot.storage={...snapshot.storage,totalMessages:nextTotalMessages,totalAtoms:nextTotalAtoms,totalTruths:estimatedTotalTruths,totalEvidenceBlocks:Math.max(snapshot.storage.totalEvidenceBlocks,snapshot.evidenceBlocks.length),indexedDocuments:nextIndexed,hotMessages:snapshot.messages.length,hotAtoms:snapshot.atoms.length,retrievalIndexStatus:indexComplete?"READY":snapshot.storage.retrievalIndexStatus,retrievalIndexProgress:expectedIndexed?Math.min(1,nextIndexed/expectedIndexed):1};
    if(indexComplete)await metaPut("searchIndexVersion","B2_SEARCH_DOC_V1");
    for(const item of messageWrites) knownMessageIds.add(item.id);
    for(const item of atomWrites) knownAtomIds.add(item.id);
    messageStatsByConversation.set(conversationId,newStats);
    invalidateRuntimeIndex();

    if(!input.deferDerivedPatterns) scheduleDeferredDerivations({delayMs:800});
    setSnapshot({sources:snapshot.sources,conversations:snapshot.conversations,messages:snapshot.messages,atoms:snapshot.atoms,truths:snapshot.truths,projects:snapshot.projects,decisions:snapshot.decisions,patterns:snapshot.patterns,derivedArtifacts:snapshot.derivedArtifacts,mutations:snapshot.mutations,journals:snapshot.journals,evidenceBlocks:snapshot.evidenceBlocks,storage:snapshot.storage});
    return {messagesAdded:messageWrites.length,atomsAdded:atomWrites.length,projectId:project.id};
  } catch(error){
    const failed:IngestionJournalRecord={...journal,status:"FAILED",updatedAt:now(),error:error instanceof Error?error.message:String(error)};
    await put("journals",failed).catch(()=>undefined); snapshot.journals=mergeById(snapshot.journals,[failed]); setSnapshot({journals:snapshot.journals});
    throw error;
  }
}

export async function finalizeDeferredDerivations(): Promise<void> {
  await bootBrain2();
  const startedAt=performanceNow();
  const projectIds=projectIdsForCommittedJournals();
  const patternStartedAt=performanceNow();
  await refreshDerivedPatterns();
  const patternDurationMs=performanceNow()-patternStartedAt;
  const projectRefreshStartedAt=performanceNow();
  await refreshProjectIntelligenceArtifacts(projectIds.length?projectIds:undefined);
  const projectRefreshDurationMs=performanceNow()-projectRefreshStartedAt;
  const writes=snapshot.journals.filter((item)=>item.status === "COMMITTED").map((item)=>({...item,status:"DERIVED" as const,updatedAt:now()}));
  const journalWriteStartedAt=performanceNow();
  await putMany("journals",writes);
  const journalWriteDurationMs=performanceNow()-journalWriteStartedAt;
  snapshot.journals=mergeById(snapshot.journals,writes);
  setSnapshot({patterns:snapshot.patterns,derivedArtifacts:snapshot.derivedArtifacts,journals:snapshot.journals});
  const pendingMRSProjectIds=getProjectsWithPendingMRS().filter((projectId)=>!projectIds.length||projectIds.includes(projectId));
  brain2MRSLog("derivations.queue-mrs-after-finalize", { projectCount: projectIds.length, pendingMRSProjects: pendingMRSProjectIds.length });
  if(pendingMRSProjectIds.length){
    void requestPendingProjectIntelligenceMRS({idle:false,projectIds:pendingMRSProjectIds,limit:pendingMRSProjectIds.length}).catch((error)=>brain2MRSError("derivations.queue-mrs-after-finalize.error", { error: error instanceof Error ? error.message : String(error) }));
  }
  await syncCalculatedProjectRiskTicks(projectIds.length?projectIds:undefined);
  await recordResponsivenessTelemetry("derivations.finalize",performanceNow()-startedAt,{
    projectCount:projectIds.length,
    committedJournals:writes.length,
    patternDurationMs:Math.round(patternDurationMs),
    projectRefreshDurationMs:Math.round(projectRefreshDurationMs),
    journalWriteDurationMs:Math.round(journalWriteDurationMs),
  });
}

function scheduleIdleTask(run:()=>void,timeout=7000){
  if(typeof window==="undefined"){run();return;}
  const idle=(window as typeof window & {requestIdleCallback?:(cb:()=>void,opts?:{timeout:number})=>number}).requestIdleCallback;
  if(idle)idle(run,{timeout});else window.setTimeout(run,0);
}

async function flushDeferredDerivationsQueue():Promise<void>{
  if(deferredDerivationsPromise)return deferredDerivationsPromise;
  deferredDerivationsPromise=(async()=>{
    const startedAt=performanceNow();
    let passes=0;
    try{
      do{
        deferredDerivationsQueued=false;
        passes+=1;
        await finalizeDeferredDerivations();
        await new Promise((resolve)=>setTimeout(resolve,0));
      }while(deferredDerivationsQueued);
      await recordResponsivenessTelemetry("derivations.deferred_queue",performanceNow()-startedAt,{passes});
    }finally{
      deferredDerivationsPromise=null;
    }
  })();
  return deferredDerivationsPromise;
}

export function scheduleDeferredDerivations(options:{delayMs?:number;idleTimeoutMs?:number}={}){
  deferredDerivationsQueued=true;
  if(typeof window==="undefined"){void flushDeferredDerivationsQueue();return;}
  if(deferredDerivationsTimer)window.clearTimeout(deferredDerivationsTimer);
  deferredDerivationsTimer=window.setTimeout(()=>{
    deferredDerivationsTimer=undefined;
    scheduleIdleTask(()=>{void flushDeferredDerivationsQueue().catch(()=>undefined);},options.idleTimeoutMs??7000);
  },options.delayMs??1200);
}

export function getCachedProjectIntelligence(projectId:string){
  return snapshot.derivedArtifacts.find((item)=>item.id===projectIntelligenceArtifactId(projectId));
}

export function getCachedProjectIntelligenceProjection(projectId:string){
  return parseProjectIntelligence(getCachedProjectIntelligence(projectId));
}

export function getProjectsNeedingIntelligenceRefresh(){
  return snapshot.projects
    .filter((project)=>!getCachedProjectIntelligence(project.id))
    .map((project)=>project.id);
}

export function getProjectsWithPendingMRS(){
  return snapshot.derivedArtifacts
    .filter((item)=>item.kind==="PROJECT_INTELLIGENCE"&&item.projectId)
    .map((item)=>({item,projection:parseProjectIntelligence(item)}))
    .filter(({item,projection})=>Boolean(projectIntelligencePendingCount(projection))&&(item.state!=="MRS_REFINING"||isProjectIntelligenceMRSRefiningStale(item))&&!isProjectIntelligenceMRSQueuedOrRunning(item.projectId as string))
    .map(({item})=>item.projectId as string);
}

export function getProjectIntelligenceMRSDebugSummary(){
  const projectNameById=new Map(snapshot.projects.map((project)=>[project.id,project.name]));
  const artifacts=snapshot.derivedArtifacts
    .filter((item)=>item.kind==="PROJECT_INTELLIGENCE"&&item.projectId)
    .map((item)=>{
      const projection=parseProjectIntelligence(item);
      return {
        projectId:item.projectId as string,
        projectName:projectNameById.get(item.projectId as string)??"Unknown project",
        state:item.state,
        mrsRuntime:item.mrsRuntime,
        unresolved:projectIntelligencePendingCount(projection),
        unresolvedShown:projection?.unresolved.length??0,
        currentTruth:projection?.currentTruth.length??0,
        importantIdeas:projection?.importantIdeas.length??0,
        lastMRSAttemptAt:item.lastMRSAttemptAt,
        lastMRSError:item.lastMRSError,
        updatedAt:item.updatedAt,
        staleRefining:isProjectIntelligenceMRSRefiningStale(item),
      };
    });
  const byState=artifacts.reduce<Record<string,number>>((acc,item)=>{
    acc[item.state]=(acc[item.state]??0)+1;
    return acc;
  },{});
  const withUnresolved=artifacts.filter((item)=>item.unresolved>0);
  const eligible=withUnresolved.filter((item)=>item.state!=="MRS_REFINING"||item.staleRefining);
  const refining=withUnresolved.filter((item)=>item.state==="MRS_REFINING");
  const staleRefining=withUnresolved.filter((item)=>item.staleRefining);
  const staleReady=withUnresolved.filter((item)=>item.state==="MRS_READY");
  const projectsWithoutArtifacts=snapshot.projects
    .filter((project)=>!artifacts.some((item)=>item.projectId===project.id))
    .map((project)=>({projectId:project.id,projectName:project.name}))
    .slice(0,20);
  return {
    projects:snapshot.projects.length,
    projectIntelligenceArtifacts:artifacts.length,
    byState,
    unresolvedProjects:withUnresolved.length,
    unresolvedCandidates:withUnresolved.reduce((sum,item)=>sum+item.unresolved,0),
    eligibleProjects:eligible.length,
    refiningProjects:refining.length,
    staleRefiningProjects:staleRefining.length,
    staleReadyWithUnresolved:staleReady.length,
    projectsWithoutArtifacts:projectsWithoutArtifacts.length,
    eligible:eligible.slice(0,20),
    refining:refining.slice(0,20),
    staleRefining:staleRefining.slice(0,20),
    staleReady:staleReady.slice(0,20),
    missingArtifacts:projectsWithoutArtifacts,
  };
}

export async function refreshProjectIntelligenceArtifacts(projectIds?:string[]):Promise<DerivedArtifactRecord[]>{
  await bootBrain2();
  const startedAt=performanceNow();
  const targets=(projectIds?.length?projectIds:[...new Set(snapshot.projects.map((project)=>project.id))]).filter(Boolean);
  const out:DerivedArtifactRecord[]=[];
  let rebuiltCount=0;
  let cacheHitCount=0;
  for(const projectId of targets){
    const key=projectId;
    if(projectIntelligenceRefreshes.has(key)){
      const existing=await projectIntelligenceRefreshes.get(key);
      if(existing)out.push(existing);
      continue;
    }
    const pending=(async()=>{
      const projectStartedAt=performanceNow();
      const input=await buildProjectIntelligenceInput(projectId);
      if(!input)return null;
      const afterInputAt=performanceNow();
      const sourceVersion=await buildProjectIntelligenceSourceVersion(input);
      const afterSourceVersionAt=performanceNow();
      const existing=getCachedProjectIntelligence(projectId);
      if(existing?.sourceVersion===sourceVersion){
        cacheHitCount+=1;
        const totalProjectDurationMs=performanceNow()-projectStartedAt;
        if(totalProjectDurationMs>=16){
          await recordResponsivenessTelemetry("project_intelligence.refresh_project",totalProjectDurationMs,{
            projectId,
            cacheHit:true,
            atomCount:input.atoms.length,
            truthCount:input.truths.length,
            inputDurationMs:Math.round(afterInputAt-projectStartedAt),
            sourceVersionDurationMs:Math.round(afterSourceVersionAt-afterInputAt),
            buildDurationMs:0,
            persistDurationMs:0,
          });
        }
        return existing;
      }
      const projection=await buildDeterministicProjectIntelligenceOffMainThread(input);
      const afterBuildAt=performanceNow();
      const record=buildProjectIntelligenceArtifact({projectId,sourceVersion,projection,phase:"deterministic",createdAt:existing?.createdAt});
      const persistStartedAt=performanceNow();
      await putDerivedArtifacts([record]);
      rebuiltCount+=1;
      const totalProjectDurationMs=performanceNow()-projectStartedAt;
      if(totalProjectDurationMs>=16){
        await recordResponsivenessTelemetry("project_intelligence.refresh_project",totalProjectDurationMs,{
          projectId,
          cacheHit:false,
          atomCount:input.atoms.length,
          truthCount:input.truths.length,
          unresolvedCount:projectIntelligencePendingCount(projection),
          offMainThread:typeof window!=="undefined"&&typeof Worker!=="undefined",
          inputDurationMs:Math.round(afterInputAt-projectStartedAt),
          sourceVersionDurationMs:Math.round(afterSourceVersionAt-afterInputAt),
          buildDurationMs:Math.round(afterBuildAt-afterSourceVersionAt),
          persistDurationMs:Math.round(performanceNow()-persistStartedAt),
        });
      }
      return record;
    })().finally(()=>{projectIntelligenceRefreshes.delete(key);});
    projectIntelligenceRefreshes.set(key,pending);
    const result=await pending;
    if(result)out.push(result);
    await new Promise((resolve)=>setTimeout(resolve,0));
  }
  await recordResponsivenessTelemetry("project_intelligence.refresh_batch",performanceNow()-startedAt,{
    targetCount:targets.length,
    rebuiltCount,
    cacheHitCount,
  });
  return out;
}

export async function ensureProjectIntelligenceArtifact(projectId:string){
  const cached=getCachedProjectIntelligence(projectId);
  if(cached)return cached;
  const [result]=await refreshProjectIntelligenceArtifacts([projectId]);
  return result;
}

export async function requestProjectIntelligenceMRS(projectId:string,options:{idle?:boolean}={}):Promise<DerivedArtifactRecord|null>{
  await bootBrain2();
  const existing=getCachedProjectIntelligence(projectId);
  const projection=parseProjectIntelligence(existing);
  const activeOrScheduled=isProjectIntelligenceMRSQueuedOrRunning(projectId);
  brain2MRSLog("queue.project.request", {
    projectId,
    hasArtifact: Boolean(existing),
    state: existing?.state,
    mrsRuntime: existing?.mrsRuntime,
    unresolved: projectIntelligencePendingCount(projection),
    unresolvedShown: projection?.unresolved.length ?? 0,
    activeOrScheduled,
  });
  if(activeOrScheduled){
    brain2MRSLog("queue.project.skip-active", { projectId, state: existing?.state, unresolved: projectIntelligencePendingCount(projection) });
    return existing ?? null;
  }
  const staleRefining=existing?isProjectIntelligenceMRSRefiningStale(existing):false;
  if(existing?.state==="MRS_REFINING"&&staleRefining){
    brain2MRSLog("queue.project.recover-stale-refining", { projectId, updatedAt: existing.updatedAt, unresolved: projectIntelligencePendingCount(projection) });
  }
  if(!existing||!projectIntelligencePendingCount(projection)||(existing.state==="MRS_REFINING"&&!staleRefining)){
    brain2MRSLog("queue.project.skip-state", {
      projectId,
      hasArtifact: Boolean(existing),
      state: existing?.state,
      unresolved: projectIntelligencePendingCount(projection),
      staleRefining,
    });
    return existing ?? null;
  }
  const runtime=getBrain2TransformersSnapshot();
  if(!isBrain2MRSReady(runtime)){
    brain2MRSLog("queue.project.skip-runtime", { projectId, state: runtime.state, mrsState: runtime.mrsState });
    return existing;
  }
  const input=await buildProjectIntelligenceInput(projectId);
  if(!input){
    brain2MRSLog("queue.project.skip-input", { projectId });
    return null;
  }
  const sourceVersion=await buildProjectIntelligenceSourceVersion(input);
  let mrsInput=input;
  let mrsSourceVersion=sourceVersion;
  let mrsArtifact=existing;
  if(existing.sourceVersion!==sourceVersion){
    brain2MRSLog("queue.project.refresh-stale", { projectId, existing: existing.sourceVersion, current: sourceVersion });
    const [fresh]=await refreshProjectIntelligenceArtifacts([projectId]);
    const freshProjection=parseProjectIntelligence(fresh);
    const freshStaleRefining=fresh?isProjectIntelligenceMRSRefiningStale(fresh):false;
    if(!fresh||!projectIntelligencePendingCount(freshProjection)||(fresh.state==="MRS_REFINING"&&!freshStaleRefining)){
      brain2MRSLog("queue.project.skip-after-refresh", {
        projectId,
        hasArtifact: Boolean(fresh),
        state: fresh?.state,
        unresolved: projectIntelligencePendingCount(freshProjection),
        staleRefining:freshStaleRefining,
      });
      return fresh ?? existing;
    }
    const freshInput=await buildProjectIntelligenceInput(projectId);
    if(!freshInput){
      brain2MRSLog("queue.project.skip-input-after-refresh", { projectId });
      return fresh;
    }
    mrsInput=freshInput;
    mrsSourceVersion=await buildProjectIntelligenceSourceVersion(freshInput);
    mrsArtifact=fresh;
    if(fresh.sourceVersion!==mrsSourceVersion){
      brain2MRSLog("queue.project.skip-source-version-after-refresh", { projectId, existing: fresh.sourceVersion, current: mrsSourceVersion });
      return fresh;
    }
  }
  const schedule=(run:()=>void)=>{
    if(options.idle===false||typeof window==="undefined"){
      brain2MRSLog("queue.project.schedule-now", { projectId, idle: options.idle !== false });
      run();
      return;
    }
    const priorTimer=projectIntelligenceMRSScheduleTimers.get(projectId);
    if(priorTimer)window.clearTimeout(priorTimer);
    brain2MRSLog("queue.project.schedule-idle", { projectId });
    const timer=window.setTimeout(()=>{
      projectIntelligenceMRSScheduleTimers.delete(projectId);
      const idle=(window as typeof window & {requestIdleCallback?:(cb:()=>void,opts?:{timeout:number})=>number}).requestIdleCallback;
      const runQueued=()=>{
        brain2MRSLog("queue.project.idle-fired", { projectId });
        run();
      };
      if(idle)idle(runQueued,{timeout:2500});else window.setTimeout(runQueued,0);
    },120);
    projectIntelligenceMRSScheduleTimers.set(projectId,timer);
  };
  schedule(()=>{void queueProjectIntelligenceMRS(projectId,mrsInput,mrsSourceVersion,mrsArtifact);});
  return mrsArtifact;
}

export async function requestPendingProjectIntelligenceMRS(options:{idle?:boolean;projectIds?:string[];limit?:number}={}):Promise<void>{
  await bootBrain2();
  const targets=[...new Set((options.projectIds?.length?options.projectIds:getProjectsWithPendingMRS()).filter(Boolean))];
  const limited=(options.limit&&options.limit>0)?targets.slice(0,options.limit):targets;
  const runtime=getBrain2TransformersSnapshot();
  brain2MRSLog("queue.request", {
    targets: targets.length,
    limit: options.limit,
    selected: limited.length,
    idle: options.idle !== false,
    runtimeReady: isBrain2MRSReady(runtime),
    runtimeState: runtime.state,
    mrsState: runtime.mrsState,
  });
  for(const projectId of limited){
    const artifact=parseProjectIntelligence(snapshot.derivedArtifacts.find((item)=>item.id===projectIntelligenceArtifactId(projectId)));
    brain2MRSLog("queue.project.selected", {
      projectId,
      mrsRuntime: artifact?.mrsRuntime,
      unresolved: projectIntelligencePendingCount(artifact),
      unresolvedShown: artifact?.unresolved.length ?? 0,
    });
    await requestProjectIntelligenceMRS(projectId,{idle:options.idle});
    await new Promise((resolve)=>setTimeout(resolve,0));
  }
}

export async function recordContextVaultRun(run: ContextVaultRunRecord): Promise<void> {
  await bootBrain2();
  await put("contextVaultRuns",run);
  snapshot.contextVaultRuns=mergeById(snapshot.contextVaultRuns,[run]);
  setSnapshot({contextVaultRuns:snapshot.contextVaultRuns});
}

export async function registerExtensionConnector(input:{installId:string;origin:string;queueCount?:number;vaultLocked?:boolean;version?:string;connected?:boolean}):Promise<DeviceRecord>{
  await bootBrain2();
  const safeInstall=input.installId.replace(/[^a-zA-Z0-9_-]/g,"").slice(0,80)||"legacy";
  const id=`dev_extension_${safeInstall}`;
  const existing=await getOne<DeviceRecord>("devices",id);
  const connected=input.connected!==false;
  const device:DeviceRecord={
    id,name:"Brain2 Chrome Connector",kind:"extension",status:connected?"SYNCED":"WAITING",lastSeenAt:now(),memoryRoot:snapshot.memoryRoot,pendingDeltas:Math.max(0,input.queueCount??existing?.pendingDeltas??0),trusted:true,transport:"EXTENSION",
    connectorInstallId:input.installId,connectorOrigin:input.origin,connectorStatus:connected?((input.queueCount??0)>0?"QUEUED":"CONNECTED"):"DISCONNECTED",connectorQueueCount:Math.max(0,input.queueCount??existing?.connectorQueueCount??0),connectorVaultLocked:Boolean(input.vaultLocked),connectorVersion:input.version??existing?.connectorVersion,lastSyncAt:connected?now():existing?.lastSyncAt,
  };
  await put("devices",device);snapshot.devices=mergeById(snapshot.devices,[device]);setSnapshot({devices:snapshot.devices});return device;
}

export async function ingestExtensionCapture(capture: ExtensionCapture): Promise<void> {
  const capturedAt=capture.capturedAt ?? capture.createdAt ?? now();
  await ingestNormalizedConversation({provider:capture.provider,sourceLabel:capture.provider === "chatgpt" ? "ChatGPT Live" : capture.provider === "claude" ? "Claude Live" : capture.provider === "gemini" ? "Gemini Live" : "Browser Capture",sourceType:"Chrome extension",externalId:capture.conversationExternalId,title:capture.conversationTitle || "Live AI conversation",updatedAt:capture.occurredAt,selectedBranchId:capture.branchId,messages:[{externalId:capture.messageExternalId ?? capture.id,providerMessageId:capture.providerMessageId,providerNodeId:capture.providerNodeId,parentProviderNodeId:capture.parentProviderNodeId,branchId:capture.branchId,sequence:capture.sequence ?? 0,role:capture.role,text:capture.text,occurredAt:capture.occurredAt,capturedAt,timestampSource:capture.timestampSource ?? (capture.occurredAt?"dom":"capture"),captureId:capture.captureId??capture.id,captureUrl:capture.captureUrl??capture.url,captureConnectorId:capture.captureConnectorId} ]});
  await registerExtensionConnector({installId:capture.captureConnectorId||"legacy",origin:typeof location!=="undefined"?location.origin:"browser",queueCount:0,vaultLocked:false,connected:true});
}

export async function ingestExtensionBatch(captures:ExtensionCapture[]):Promise<{acceptedIds:string[];errors:string[]}> {
  await bootBrain2();const acceptedIds:string[]=[];const errors:string[]=[];const touchedProjectIds=new Set<string>();const groups=new Map<string,ExtensionCapture[]>();
  for(const capture of captures){const key=`${capture.provider}|${capture.conversationExternalId}`;const group=groups.get(key)??[];group.push(capture);groups.set(key,group);}
  for(const group of groups.values()){const first=group[0];try{const messages=group.sort((a,b)=>(a.sequence??0)-(b.sequence??0)).map((capture)=>({externalId:capture.messageExternalId??capture.id,providerMessageId:capture.providerMessageId,providerNodeId:capture.providerNodeId,parentProviderNodeId:capture.parentProviderNodeId,branchId:capture.branchId,sequence:capture.sequence??0,role:capture.role,text:capture.text,occurredAt:capture.occurredAt,capturedAt:capture.capturedAt??capture.createdAt??now(),timestampSource:capture.timestampSource??(capture.occurredAt?"dom" as const:"capture" as const),captureId:capture.captureId??capture.id,captureUrl:capture.captureUrl??capture.url,captureConnectorId:capture.captureConnectorId}));
    const result=await ingestNormalizedConversation({provider:first.provider,sourceLabel:first.provider==="chatgpt"?"ChatGPT Live":first.provider==="claude"?"Claude Live":first.provider==="gemini"?"Gemini Live":"Browser Capture",sourceType:"Chrome extension",externalId:first.conversationExternalId,title:first.conversationTitle||"Live AI conversation",updatedAt:group.at(-1)?.occurredAt,selectedBranchId:first.branchId,messages,deferDerivedPatterns:true});touchedProjectIds.add(result.projectId);acceptedIds.push(...group.map((item)=>item.id));}catch(error){errors.push(error instanceof Error?error.message:String(error));}}
  if(acceptedIds.length)scheduleDerivedPatternsRefresh([...touchedProjectIds]);return{acceptedIds,errors};
}

type CalculatedProjectRiskTickInput = Pick<TickRecord,"id"|"projectId"|"title"|"detail"|"priority"|"wakeCondition"|"evidenceAtomIds">;

function isCalculatedProjectRiskTick(tick:TickRecord){
  return tick.wakeCondition?.startsWith(CALCULATED_PROJECT_RISK_WAKE_PREFIX)===true;
}

function strictTraceFamily(atom:AtomRecord){
  return atom.ruleTrace?.filter((trace)=>trace.startsWith("strict_truth:")&&!["strict_truth:eligible","strict_truth:residual"].includes(trace)).at(-1)?.replace(/^strict_truth:/,"");
}

async function calculateProjectRiskTicks(project:ProjectRecord):Promise<CalculatedProjectRiskTickInput[]>{
  const [truthSummary,atoms]=await Promise.all([loadProjectTruthSummary(project.id),loadProjectAtoms(project.id,500)]);
  const messageIds=[...new Set(atoms.map((atom)=>atom.messageId))];
  const messages=await getByIds<MessageRecord>("messages",messageIds);
  const messageRoleById=new Map(messages.map((message)=>[message.id,normalizeText(message.role).toLowerCase()]));
  const artifact=getCachedProjectIntelligence(project.id);
  const projection=parseProjectIntelligence(artifact);
  const unresolved=projectIntelligencePendingCount(projection);
  const unresolvedEvidenceIds=[...new Set((projection?.unresolved??[]).flatMap((item)=>item.evidenceIds))].slice(0,12);
  let humanEligible=0;
  let humanResidual=0;
  let assistantBlocked=0;
  const residualEvidenceIds:string[]=[];
  for(const atom of atoms){
    const family=strictTraceFamily(atom);
    if(!family)continue;
    const role=messageRoleById.get(atom.messageId);
    const humanAuthored=role==="user"||role==="human";
    const eligible=atom.ruleTrace?.includes("strict_truth:eligible")===true;
    if(!humanAuthored){
      if(family==="assistant_or_unknown_author")assistantBlocked+=1;
      continue;
    }
    if(eligible)humanEligible+=1;
    else{
      humanResidual+=1;
      if(residualEvidenceIds.length<12)residualEvidenceIds.push(atom.id);
    }
  }
  const risks:Array<Omit<CalculatedProjectRiskTickInput,"id"|"projectId"|"wakeCondition"> & { riskId:string }>=[];
  const conflictCount=truthSummary.conflicting+truthSummary.pending;
  if(conflictCount>0){
    const conflicting=snapshot.truths.filter((truth)=>truth.projectId===project.id&&(truth.status==="CONFLICTING"||truth.status==="PENDING_REVIEW")).flatMap((truth)=>truth.evidenceAtomIds??[truth.atomId]).slice(0,12);
    risks.push({
      riskId:"truth-conflict",
      title:"Resolve conflicting project truth",
      detail:`${project.name} has ${truthSummary.conflicting} conflicting truth(s) and ${truthSummary.pending} pending truth review item(s). Current Truth may be unsafe until reviewed.`,
      priority:truthSummary.conflicting?"HIGH":"MEDIUM",
      evidenceAtomIds:[...new Set(conflicting)],
    });
  }
  if(unresolved>0){
    risks.push({
      riskId:"mrs-backlog",
      title:"Review unresolved project intelligence",
      detail:`${project.name} has ${unresolved} project intelligence candidate(s) still waiting for MRS or deterministic verification. MRS status: ${projectIntelligenceMRSStatus(project.id,artifact,unresolved)}.`,
      priority:unresolved>=20?"HIGH":"MEDIUM",
      evidenceAtomIds:unresolvedEvidenceIds,
    });
  }
  if(humanResidual>=12&&humanResidual>Math.max(8,humanEligible*1.5)){
    risks.push({
      riskId:"deterministic-pressure",
      title:"Check deterministic extraction pressure",
      detail:`${project.name} has ${humanResidual} human residual atom(s) vs ${humanEligible} human eligible atom(s). Deterministic gate may be missing useful project truth here.`,
      priority:humanResidual>=40?"HIGH":"MEDIUM",
      evidenceAtomIds:[...new Set(residualEvidenceIds)],
    });
  }
  if(atoms.length>=25&&truthSummary.currentCount<3&&humanResidual>=8){
    risks.push({
      riskId:"thin-current-truth",
      title:"Current Truth is thin for this project",
      detail:`${project.name} has ${atoms.length} recent atom(s), but only ${truthSummary.currentCount} current truth(s). Important user decisions or constraints may still be trapped in residual evidence.`,
      priority:"MEDIUM",
      evidenceAtomIds:[...new Set(residualEvidenceIds)],
    });
  }
  if(assistantBlocked>=80&&humanEligible===0&&truthSummary.currentCount===0){
    risks.push({
      riskId:"assistant-heavy-project",
      title:"Project has mostly assistant-derived material",
      detail:`${project.name} has ${assistantBlocked} assistant/unknown strict atom(s) and no human eligible Current Truth. This project may need better source grouping or more user-authored evidence.`,
      priority:"LOW",
      evidenceAtomIds:[],
    });
  }
  const out:CalculatedProjectRiskTickInput[]=[];
  for(const risk of risks){
    out.push({
      id:await canonicalId("tick","calculated-project-risk",CALCULATED_PROJECT_RISK_TICK_VERSION,project.id,risk.riskId),
      projectId:project.id,
      title:risk.title,
      detail:risk.detail,
      priority:risk.priority,
      wakeCondition:`${CALCULATED_PROJECT_RISK_WAKE_PREFIX}:${risk.riskId}`,
      evidenceAtomIds:risk.evidenceAtomIds,
    });
  }
  return out;
}

export async function syncCalculatedProjectRiskTicks(projectIds?:string[]):Promise<TickRecord[]>{
  await bootBrain2();
  const targetProjects=(projectIds?.length?snapshot.projects.filter((project)=>projectIds.includes(project.id)):snapshot.projects);
  if(!targetProjects.length)return [];
  const targetProjectIds=new Set(targetProjects.map((project)=>project.id));
  const desired=(await Promise.all(targetProjects.map(calculateProjectRiskTicks))).flat();
  const desiredById=new Map(desired.map((tick)=>[tick.id,tick]));
  const existingCalculated=snapshot.ticks.filter((tick)=>isCalculatedProjectRiskTick(tick)&&tick.projectId&&targetProjectIds.has(tick.projectId));
  const existingById=new Map(existingCalculated.map((tick)=>[tick.id,tick]));
  const updatedAt=now();
  const tickWrites:TickRecord[]=[];
  for(const desiredTick of desired){
    const existing=existingById.get(desiredTick.id);
    const next:TickRecord={
      id:desiredTick.id,
      projectId:desiredTick.projectId,
      title:desiredTick.title,
      detail:desiredTick.detail,
      priority:desiredTick.priority,
      status:"OPEN",
      createdAt:existing?.createdAt??updatedAt,
      updatedAt:existing&&existing.title===desiredTick.title&&existing.detail===desiredTick.detail&&existing.priority===desiredTick.priority&&existing.status==="OPEN"?existing.updatedAt:updatedAt,
      wakeCondition:desiredTick.wakeCondition,
      evidenceAtomIds:desiredTick.evidenceAtomIds,
    };
    if(!existing||existing.status!=="OPEN"||existing.title!==next.title||existing.detail!==next.detail||existing.priority!==next.priority||existing.evidenceAtomIds.join("|")!==next.evidenceAtomIds.join("|"))tickWrites.push(next);
  }
  for(const existing of existingCalculated){
    if(desiredById.has(existing.id)||existing.status==="RESOLVED")continue;
    tickWrites.push({...existing,status:"RESOLVED",resolution:"Auto-resolved: project risk no longer present.",updatedAt});
  }
  if(!tickWrites.length)return [];
  const nextProjectById=new Map<string,ProjectRecord>();
  for(const project of targetProjects){
    const openCalculatedIds=tickWrites.filter((tick)=>tick.projectId===project.id&&tick.status==="OPEN").map((tick)=>tick.id);
    const resolvedCalculatedIds=new Set(tickWrites.filter((tick)=>tick.projectId===project.id&&tick.status==="RESOLVED").map((tick)=>tick.id));
    const openIds=[...new Set([...project.openTickIds.filter((id)=>!resolvedCalculatedIds.has(id)),...openCalculatedIds])];
    if(openIds.join("|")!==project.openTickIds.join("|"))nextProjectById.set(project.id,{...project,openTickIds:openIds,updatedAt});
  }
  const projectWrites=[...nextProjectById.values()];
  const mutation=await buildMutation("CALCULATE","projectRiskTicks","calculated-project-risk",deltaPayload("ticks",{ticks:tickWrites,projects:projectWrites}));
  await atomicPut({ticks:tickWrites,projects:projectWrites,mutations:[mutation]});
  snapshot.ticks=mergeById(snapshot.ticks,tickWrites);
  snapshot.projects=mergeById(snapshot.projects,projectWrites);
  snapshot.mutations=mergeById(snapshot.mutations,[mutation]).slice(-RECENT_EVENT_LIMIT);
  setSnapshot({ticks:snapshot.ticks,projects:snapshot.projects,mutations:snapshot.mutations});
  return tickWrites;
}

export async function createTick(input: Pick<TickRecord, "title" | "detail" | "priority"> & { projectId?: string; wakeCondition?: string; evidenceAtomIds?: string[] }): Promise<TickRecord> {
  await bootBrain2(); const createdAt=now(); const id=await canonicalId("tick",input.projectId,input.title,createdAt); const tick:TickRecord={id,projectId:input.projectId,title:input.title,detail:input.detail,priority:input.priority,status:"OPEN",createdAt,updatedAt:createdAt,wakeCondition:input.wakeCondition,evidenceAtomIds:input.evidenceAtomIds??[]};
  const project=tick.projectId?snapshot.projects.find((item)=>item.id===tick.projectId):undefined;
  const nextProject=project?{...project,openTickIds:[...new Set([...project.openTickIds,tick.id])],updatedAt:now()}:undefined;
  const payload=deltaPayload("ticks",{ticks:[tick],...(nextProject?{projects:[nextProject]}:{})});
  const mutation=await buildMutation("CREATE","tick",tick.id,payload);
  await atomicPut({ticks:[tick],...(nextProject?{projects:[nextProject]}:{}),mutations:[mutation]});
  snapshot.ticks=mergeById(snapshot.ticks,[tick]); if(nextProject)snapshot.projects=mergeById(snapshot.projects,[nextProject]); snapshot.mutations=mergeById(snapshot.mutations,[mutation]).slice(-RECENT_EVENT_LIMIT);
  setSnapshot({ticks:snapshot.ticks,projects:snapshot.projects,mutations:snapshot.mutations}); return tick;
}

export async function resolveTick(id:string,resolution:string):Promise<void>{await bootBrain2();const tick=snapshot.ticks.find((item)=>item.id===id);if(!tick)return;const next:TickRecord={...tick,status:"RESOLVED",resolution:normalizeText(resolution),updatedAt:now()};const project=tick.projectId?snapshot.projects.find((item)=>item.id===tick.projectId):undefined;const nextProject=project?{...project,openTickIds:project.openTickIds.filter((tickId)=>tickId!==id),updatedAt:now()}:undefined;const payload=deltaPayload("ticks",{ticks:[next],...(nextProject?{projects:[nextProject]}:{})});const mutation=await buildMutation("RESOLVE","tick",id,payload,tick);await atomicPut({ticks:[next],...(nextProject?{projects:[nextProject]}:{}),mutations:[mutation]});snapshot.ticks=mergeById(snapshot.ticks,[next]);if(nextProject)snapshot.projects=mergeById(snapshot.projects,[nextProject]);snapshot.mutations=mergeById(snapshot.mutations,[mutation]).slice(-RECENT_EVENT_LIMIT);setSnapshot({ticks:snapshot.ticks,projects:snapshot.projects,mutations:snapshot.mutations});}

export async function createExperiment(input:{title:string;hypothesis:string;projectId?:string}):Promise<void>{await bootBrain2();const createdAt=now();const id=await canonicalId("exp",input.title,createdAt);const experiment:ExperimentRecord={id,projectId:input.projectId,title:input.title,hypothesis:input.hypothesis,status:"READY",createdAt,updatedAt:createdAt,evidenceAtomIds:[],validationStatus:"UNVALIDATED"};const mutation=await buildMutation("CREATE","experiment",id,deltaPayload("experiments",{experiments:[experiment]}));await atomicPut({experiments:[experiment],mutations:[mutation]});snapshot.experiments=mergeById(snapshot.experiments,[experiment]);snapshot.mutations=mergeById(snapshot.mutations,[mutation]).slice(-RECENT_EVENT_LIMIT);setSnapshot({experiments:snapshot.experiments,mutations:snapshot.mutations});}

async function validateExperimentUpdate(experiment:ExperimentRecord,status:ExperimentRecord["status"],result?:string,evidenceAtomIds:string[]=[]){
  const cleanResult=normalizeText(result??"");
  const uniqueEvidenceIds=[...new Set(evidenceAtomIds.map((id)=>normalizeText(id)).filter(Boolean))];
  if(status==="COMPLETED"){
    if(cleanResult.length<20)throw new Error("Experiment completion needs a real result summary.");
    if(!uniqueEvidenceIds.length)throw new Error("Experiment completion needs at least one evidence atom.");
    const atoms=await getByIds<AtomRecord>("atoms",uniqueEvidenceIds);
    const foundIds=new Set(atoms.map((atom)=>atom.id));
    const missing=uniqueEvidenceIds.filter((id)=>!foundIds.has(id));
    if(missing.length)throw new Error(`Experiment evidence atom not found: ${missing[0]}`);
    const outside=atoms.find((atom)=>experiment.projectId&&atom.projectId!==experiment.projectId);
    if(outside)throw new Error("Experiment evidence must belong to same project.");
    const weak=atoms.find((atom)=>atom.confidence<0.6||atom.kind==="question");
    if(weak)throw new Error("Experiment evidence must be concrete non-question atoms.");
    return {result:cleanResult,evidenceAtomIds:uniqueEvidenceIds,validationStatus:"PASS" as const,validationDetail:`Validated with ${uniqueEvidenceIds.length} evidence atom(s).`,validatedAt:now()};
  }
  if(status==="FAILED"||status==="BLOCKED"){
    if(cleanResult.length<10)throw new Error("Experiment failure/block needs a short result reason.");
    return {result:cleanResult,evidenceAtomIds:uniqueEvidenceIds,validationStatus:"PASS" as const,validationDetail:`Operator result recorded for ${status.toLowerCase()} experiment.`,validatedAt:now()};
  }
  return {result:cleanResult||undefined,evidenceAtomIds:uniqueEvidenceIds.length?uniqueEvidenceIds:experiment.evidenceAtomIds,validationStatus:"UNVALIDATED" as const,validationDetail:undefined,validatedAt:undefined};
}

export async function updateExperiment(id:string,status:ExperimentRecord["status"],result?:string,evidenceAtomIds?:string[]){await bootBrain2();const experiment=snapshot.experiments.find((item)=>item.id===id);if(!experiment)return;const validation=await validateExperimentUpdate(experiment,status,result,evidenceAtomIds??experiment.evidenceAtomIds);const next={...experiment,status,result:validation.result,evidenceAtomIds:validation.evidenceAtomIds,validationStatus:validation.validationStatus,validationDetail:validation.validationDetail,validatedAt:validation.validatedAt,updatedAt:now()};const mutation=await buildMutation("UPDATE","experiment",id,deltaPayload("experiments",{experiments:[next]}),experiment);await atomicPut({experiments:[next],mutations:[mutation]});snapshot.experiments=mergeById(snapshot.experiments,[next]);snapshot.mutations=mergeById(snapshot.mutations,[mutation]).slice(-RECENT_EVENT_LIMIT);setSnapshot({experiments:snapshot.experiments,mutations:snapshot.mutations});}

export async function createMission(input:{title:string;objective:string;projectId?:string}){await bootBrain2();const createdAt=now();const id=await canonicalId("mission",input.title,createdAt);const mission:MissionRecord={id,projectId:input.projectId,title:input.title,objective:input.objective,status:"READY",createdAt,updatedAt:createdAt,checkpointIds:[],tickIds:[],runtimeCanon:"BRAIN2SHOT_CANONICAL_PRODUCTION_RUNTIME_V2",writerId:localStorage.getItem("brain2-web-device-id")??"web"};const mutation=await buildMutation("CREATE","mission",id,deltaPayload("missions",{missions:[mission]}));await atomicPut({missions:[mission],mutations:[mutation]});snapshot.missions=mergeById(snapshot.missions,[mission]);snapshot.mutations=mergeById(snapshot.mutations,[mutation]).slice(-RECENT_EVENT_LIMIT);setSnapshot({missions:snapshot.missions,mutations:snapshot.mutations});}

export async function checkpointMission(id:string,state:string,note:string){await bootBrain2();const mission=snapshot.missions.find((item)=>item.id===id);if(!mission)return;const parentId=mission.checkpointIds.at(-1);const createdAt=now();const hash=await sha256(`${mission.runtimeCanon ?? "BRAIN2SHOT_CANONICAL_PRODUCTION_RUNTIME_V2"}|${id}|${parentId??""}|${state}|${note}|${createdAt}`);let checkpoint:CheckpointRecord={id:`cp_${hash.slice(0,24)}`,missionId:id,parentId,state,note,createdAt,hash,validationStatus:"PASS",regressionStatus:"PASS",commitStatus:"PREPARED"};await put("checkpoints",checkpoint);const reopened=await getOne<CheckpointRecord>("checkpoints",checkpoint.id);if(!reopened||reopened.hash!==hash)throw new Error("Checkpoint persist/reopen integrity verification failed.");checkpoint={...checkpoint,commitStatus:"COMMITTED",reopenedHash:reopened.hash};const next:MissionRecord={...mission,checkpointIds:[...mission.checkpointIds,checkpoint.id],status:state==="completed"?"COMPLETED":state==="blocked"?"BLOCKED":"RUNNING",updatedAt:createdAt};const mutation=await buildMutation("CHECKPOINT","mission",id,deltaPayload("missions",{missions:[next],checkpoints:[checkpoint]}),mission);await atomicPut({checkpoints:[checkpoint],missions:[next],mutations:[mutation]});snapshot.checkpoints=mergeById(snapshot.checkpoints,[checkpoint]);snapshot.missions=mergeById(snapshot.missions,[next]);snapshot.mutations=mergeById(snapshot.mutations,[mutation]).slice(-RECENT_EVENT_LIMIT);setSnapshot({missions:snapshot.missions,checkpoints:snapshot.checkpoints,mutations:snapshot.mutations});}

export async function addVerification(entityType:string,entityId:string,status:VerificationRecord["status"],detail:string){await bootBrain2();const createdAt=now();const id=await canonicalId("verify",entityType,entityId,createdAt);const verification:VerificationRecord={id,entityType,entityId,status,detail,createdAt};const mutation=await buildMutation("CREATE","verification",id,deltaPayload("verifications",{verifications:[verification]}));await atomicPut({verifications:[verification],mutations:[mutation]});snapshot.verifications=mergeById(snapshot.verifications,[verification]);snapshot.mutations=mergeById(snapshot.mutations,[mutation]).slice(-RECENT_EVENT_LIMIT);setSnapshot({verifications:snapshot.verifications,mutations:snapshot.mutations});}

export async function addTransaction(type:B2TransactionRecord["type"],payload:string,projectId?:string){await bootBrain2();const createdAt=now();const payloadHash=await sha256(payload);const prior=[...snapshot.transactions].sort((a,b)=>(b.sequence??0)-(a.sequence??0)||b.createdAt.localeCompare(a.createdAt))[0];const sequence=(prior?.sequence??0)+1;const protocolVersion=2;const hash=await sha256(`${protocolVersion}|${type}|${projectId??""}|${payloadHash}|${prior?.id??""}|${sequence}`);const transaction:B2TransactionRecord={id:`b2tx_${hash.slice(0,24)}`,type,projectId,payload,createdAt,hash,payloadHash,parentId:prior?.id,sequence,protocolVersion};const mutation=await buildMutation("CREATE","transaction",transaction.id,deltaPayload("transactions",{transactions:[transaction]}));await atomicPut({transactions:[transaction],mutations:[mutation]});snapshot.transactions=mergeById(snapshot.transactions,[transaction]);snapshot.mutations=mergeById(snapshot.mutations,[mutation]).slice(-RECENT_EVENT_LIMIT);setSnapshot({transactions:snapshot.transactions,mutations:snapshot.mutations});}

export async function commitVerifiedRuntimeEvidence(
  result:unknown,
  structuralVerification:{status:"PASS"|"FAIL"|"PENDING";detail:string},
){
  await bootBrain2();
  const runtime=parseRuntimeExecutionEvidence(result);
  if(!runtime)return{committed:false,reason:"NOT_RUNTIME_EXECUTION"} as const;
  if(structuralVerification.status!=="PASS")throw new Error("Runtime evidence cannot commit unless canonical B2RESULT provenance passes.");
  const parsed=result as {jobId?:string;databoxHash?:string;evidenceIds?:string[]};
  const jobTx=[...snapshot.transactions].reverse().find((tx)=>tx.type==="B2JOB"&&(()=>{try{return JSON.parse(tx.payload)?.id===parsed.jobId}catch{return false}})());
  if(!jobTx)throw new Error("Canonical B2JOB is required before runtime evidence commit.");
  const job=JSON.parse(jobTx.payload) as {id:string;projectId?:string;databox?:{hash?:string};evidence?:Array<{id:string}>};
  if(!job.projectId||job.projectId!==runtime.projectId)throw new Error("Runtime evidence project scope does not match the canonical B2JOB.");
  if(job.databox?.hash!==parsed.databoxHash)throw new Error("Runtime evidence Databox hash mismatch.");
  const allowed=new Set((job.evidence??[]).map((item)=>item.id));
  if(runtime.evidenceIds.some((id)=>!allowed.has(id)))throw new Error("Runtime evidence escaped the canonical B2JOB boundary.");
  const project=snapshot.projects.find((item)=>item.id===runtime.projectId);
  if(!project)throw new Error("Runtime evidence project is not present in canonical AI Miner memory.");

  const sourceId=await canonicalId("source","generic","brain2-runtime-v1");
  const conversationId=await canonicalId("conversation","generic",`brain2-runtime:${runtime.projectId}`);
  const messageId=await canonicalId("message","brain2-runtime",runtime.runtimeJobId);
  const atomId=await canonicalId("atom","brain2-runtime",runtime.runtimeJobId,runtime.capability);
  const truthId=await canonicalId("truth","brain2-runtime",runtime.runtimeJobId,runtime.capability);
  const existingTruth=await getOne<TruthRecord>("truths",truthId);
  if(existingTruth)return{committed:false,reason:"ALREADY_COMMITTED",truthId,atomId} as const;

  const createdAt=runtime.executionResult.finishedAt??new Date().toISOString();
  const existingSource=await getOne<SourceRecord>("sources",sourceId);
  const source:SourceRecord=existingSource?{...existingSource,lastSeenAt:createdAt}:{id:sourceId,provider:"generic",label:"Brain2 Runtime",sourceType:"Verified bounded runtime execution",createdAt,lastSeenAt:createdAt,schemaVersion:BRAIN2_SCHEMA_VERSION};
  const existingConversation=await getOne<ConversationRecord>("conversations",conversationId);
  const messageHash=await sha256(runtime.observedStatement);
  const message:MessageRecord={id:messageId,conversationId,sourceId,provider:"generic",externalId:runtime.runtimeJobId,role:"tool",text:runtime.observedStatement,createdAt,occurredAt:createdAt,capturedAt:createdAt,timestampSource:"capture",sequence:(existingConversation?.messageCount??0)+1,hash:messageHash,wordCount:wordCount(runtime.observedStatement),schemaVersion:BRAIN2_SCHEMA_VERSION};
  const conversation:ConversationRecord={id:conversationId,sourceId,provider:"generic",externalId:`brain2-runtime:${runtime.projectId}`,title:`Brain2 Runtime - ${project.name}`,createdAt:existingConversation?.createdAt??createdAt,updatedAt:createdAt,projectId:runtime.projectId,messageCount:(existingConversation?.messageCount??0)+1,wordCount:(existingConversation?.wordCount??0)+message.wordCount,schemaVersion:BRAIN2_SCHEMA_VERSION};
  const scope=`runtime:${runtime.capability}:${runtime.runtimeJobId}`;
  const atomHash=await sha256(`${runtime.runtimeJobId}|${runtime.capability}|${runtime.observedStatement}|${runtime.executionResult.outputHashes.join(",")}`);
  const atom:AtomRecord={id:atomId,messageId,conversationId,projectId:runtime.projectId,sourceId,kind:"fact",subject:`Verified runtime execution ${runtime.runtimeJobId}`,canonicalSubject:`runtime.${runtime.capability}.${runtime.runtimeJobId}`,value:runtime.executionResult.outputHashes.join(","),scope,text:runtime.observedStatement,createdAt,confidence:1,provenance:[...runtime.evidenceIds,`runtime-job:${runtime.runtimeJobId}`],keywords:indexTerms(`${runtime.capability} ${runtime.observedStatement}`,16),hash:atomHash,truthStatus:"CURRENT",truthRelation:"NEW",truthRecordId:truthId,ruleTrace:["runtime:verified","runtime:r1_authorized","runtime:mechanical_observation","r2:no_direct_promotion"],relationSafe:true,extractionVersion:"B2_RUNTIME_EVIDENCE_V1",schemaVersion:BRAIN2_SCHEMA_VERSION};
  const truth:TruthRecord={id:truthId,key:`runtime:${runtime.runtimeJobId}:${runtime.capability}`,projectId:runtime.projectId,conversationId,sourceId,atomId,text:runtime.observedStatement,kind:"fact",status:"CURRENT",confidence:1,createdAt,updatedAt:createdAt,relation:"NEW",evidenceAtomIds:[atomId],canonicalSubject:atom.canonicalSubject,value:atom.value,scope,reconciliationVersion:"B2_RUNTIME_EVIDENCE_V1",schemaVersion:BRAIN2_SCHEMA_VERSION};
  const updatedProject:ProjectRecord={...project,updatedAt:createdAt,conversationIds:[...new Set([...project.conversationIds,conversationId])],atomIds:[...new Set([...project.atomIds,atomId])],recentAtomIds:[atomId,...(project.recentAtomIds??[]).filter((id)=>id!==atomId)].slice(0,120),atomCount:(project.atomCount??project.atomIds.length)+1};
  const writes:MutationDeltaPayload["writes"]={sources:[source],conversations:[conversation],messages:[message],atoms:[atom],truths:[truth],projects:[updatedProject]};
  const payload=deltaPayload("truths",writes);
  const mutation=await buildMutation("CREATE","runtimeEvidence",truthId,payload);
  const searchDocs=await searchDocsForDelta(payload);
  await atomicPut({sources:[source],conversations:[conversation],messages:[message],atoms:[atom],truths:[truth],projects:[updatedProject],mutations:[mutation],...(searchDocs.writes.length?{searchDocs:searchDocs.writes}:{})});
  snapshot.sources=mergeById(snapshot.sources,[source]);
  snapshot.conversations=mergeById(snapshot.conversations,[conversation]);
  snapshot.messages=mergeById(snapshot.messages,[message]).slice(-HOT_MESSAGE_LIMIT);
  snapshot.atoms=mergeById(snapshot.atoms,[atom]).slice(-HOT_ATOM_LIMIT);
  snapshot.truths=mergeById(snapshot.truths,[truth]);
  snapshot.projects=mergeById(snapshot.projects,[updatedProject]);
  snapshot.mutations=mergeById(snapshot.mutations,[mutation]).slice(-RECENT_EVENT_LIMIT);
  snapshot.storage={...snapshot.storage,totalMessages:snapshot.storage.totalMessages+1,totalAtoms:snapshot.storage.totalAtoms+1,totalTruths:snapshot.storage.totalTruths+1,totalConversations:snapshot.storage.totalConversations+(existingConversation?0:1),indexedDocuments:snapshot.storage.indexedDocuments+searchDocs.writes.length,hotMessages:Math.min(HOT_MESSAGE_LIMIT,snapshot.storage.hotMessages+1),hotAtoms:Math.min(HOT_ATOM_LIMIT,snapshot.storage.hotAtoms+1)};
  setSnapshot({sources:snapshot.sources,conversations:snapshot.conversations,messages:snapshot.messages,atoms:snapshot.atoms,truths:snapshot.truths,projects:snapshot.projects,mutations:snapshot.mutations,storage:snapshot.storage});
  scheduleDerivedPatternsRefresh([runtime.projectId]);
  return{committed:true,truthId,atomId,projectId:runtime.projectId,hypothesisId:runtime.hypothesisId,r2Action:"RECALCULATE_FROM_UPDATED_R1"} as const;
}

export async function refreshDerivedPatterns(){await bootBrain2();const conflicting=await getAllByIndex<TruthRecord>("truths","byStatus","CONFLICTING");const conflictingAtomIds=new Set(conflicting.flatMap((truth)=>truth.evidenceAtomIds??[truth.atomId]));const aggregates=new Map<string,PatternAggregate>();let key:IDBValidKey|undefined;while(true){const page=await pagedPrimaryRead<AtomRecord>("atoms",key,SEARCH_INDEX_BATCH);for(const atom of page.items)accumulatePattern(aggregates,atom,conflictingAtomIds);key=page.lastKey;if(page.items.length<SEARCH_INDEX_BATCH)break;await new Promise((resolve)=>setTimeout(resolve,0));}const patterns=await buildPatternsFromAggregates(aggregates.values(),250,snapshot.patternTests);const db=await openDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(["patterns","meta"],"readwrite");const store=tx.objectStore("patterns");store.clear();for(const pattern of patterns)store.put(pattern);tx.objectStore("meta").put({id:"patternVersion",value:BRAIN2_PATTERN_VERSION});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error("Pattern rebuild aborted"));});snapshot.patterns=patterns;invalidateRuntimeIndex();}

export async function recordDatabox(databox:DataboxRecord){await bootBrain2();const mutation=await buildMutation("CREATE","databox",databox.id,deltaPayload("databoxes",{databoxes:[databox]}));await atomicPut({databoxes:[databox],mutations:[mutation]});snapshot.databoxes=mergeById(snapshot.databoxes,[databox]);snapshot.mutations=mergeById(snapshot.mutations,[mutation]).slice(-RECENT_EVENT_LIMIT);setSnapshot({databoxes:snapshot.databoxes,mutations:snapshot.mutations});}

export async function recordRetrievalTelemetry(record:RetrievalTelemetryRecord){await bootBrain2();await persistTelemetryRecord({...record,telemetryKind:record.telemetryKind??"RETRIEVAL"});}
export async function recordRuntimeResponsiveness(route:string,durationMs:number,detail?:Record<string,unknown>){await bootBrain2();await recordResponsivenessTelemetry(route,durationMs,detail);}

export async function addPatternLabTest(input:Omit<PatternTestRecord,"id"|"createdAt"|"hash"|"schemaVersion">){await bootBrain2();const test=await createPatternTest(input);const mutation=await buildMutation("CREATE","patternTest",test.id,deltaPayload("patternTests",{patternTests:[test]}));await atomicPut({patternTests:[test],mutations:[mutation]});snapshot.patternTests=mergeById(snapshot.patternTests,[test]);snapshot.mutations=mergeById(snapshot.mutations,[mutation]).slice(-RECENT_EVENT_LIMIT);await refreshDerivedPatterns();const projectIds=snapshot.patterns.find((item)=>item.id===test.patternId)?.projectIds;await refreshProjectIntelligenceArtifacts(projectIds?.length?projectIds:undefined);setSnapshot({patternTests:snapshot.patternTests,patterns:snapshot.patterns,derivedArtifacts:snapshot.derivedArtifacts,mutations:snapshot.mutations});return test;}

export async function promotePortableExpertise(patternId:string,input:{title?:string;triggerConditions:string[];procedure:string[];verifier:string}){await bootBrain2();const pattern=snapshot.patterns.find((item)=>item.id===patternId);if(!pattern)throw new Error("Pattern not found.");const item=await createPortableExpertise(pattern,snapshot.patternTests,input);const mutation=await buildMutation("CREATE","portableExpertise",item.id,deltaPayload("portableExpertise",{portableExpertise:[item]}));await atomicPut({portableExpertise:[item],mutations:[mutation]});snapshot.portableExpertise=mergeById(snapshot.portableExpertise,[item]);snapshot.mutations=mergeById(snapshot.mutations,[mutation]).slice(-RECENT_EVENT_LIMIT);setSnapshot({portableExpertise:snapshot.portableExpertise,mutations:snapshot.mutations});return item;}

export async function recordControllerLearning(run:{
  id:string;
  question:string;
  projectId?:string;
  createdAt:string;
  usedMRS:boolean;
  terminatedBy:"BRANCH_ZERO"|"TINY_SPECIALIST"|"MRS_MODEL"|"REPAIR";
  confidence:number;
  result:{answer:string;evidenceIds:string[]};
  verification:{status:"PASS"|"FAIL"|"PENDING";detail:string};
  job:{id:string;databox:{id:string;hash:string};evidencePolicy:{sufficiencyState:string};evidence:Array<{id:string}>};
  stages:Array<{name:string;status:"PASS"|"SKIP"|"FAIL";detail:string}>;
  capabilityMatches:Array<{id:string;title:string;score:number;source?:string;verificationState?:string;procedure:string[];triggerConditions:string[];provenanceAtomIds:string[]}>;
  patternMatches:Array<{id:string;label:string;score:number}>;
  acceptanceTrace?:string[];
}){
  await bootBrain2();
  const memory=retrieveReasoningMemory(snapshot,{question:run.question,projectId:run.projectId});
  const trajectory=await buildReasoningTrajectory(run,memory);
  const failure=await buildFailureMemory(run,trajectory);
  const capability=await compileCapabilityFromControllerRun(snapshot,run,trajectory);
  const existingFailure=failure?snapshot.failureMemories.find((item)=>item.failureSignature===failure.failureSignature&&item.projectId===failure.projectId):undefined;
  const nextFailure=failure?existingFailure?{...existingFailure,occurrenceCount:existingFailure.occurrenceCount+1,lastSeenAt:run.createdAt,repairThatWorked:failure.repairThatWorked??existingFailure.repairThatWorked,boundaryConditions:[...new Set([...existingFailure.boundaryConditions,...failure.boundaryConditions])],evidenceIds:[...new Set([...existingFailure.evidenceIds,...failure.evidenceIds])],stageTrace:failure.stageTrace,cause:failure.cause,failedStage:failure.failedStage,knownBadOperation:failure.knownBadOperation,repairNotApplicableWhen:[...new Set([...existingFailure.repairNotApplicableWhen,...failure.repairNotApplicableWhen])],hash:await sha256(JSON.stringify({...failure,id:existingFailure.id,occurrenceCount:existingFailure.occurrenceCount+1,lastSeenAt:run.createdAt}))}:failure:undefined;
  const writes:MutationDeltaPayload["writes"]={reasoningTrajectories:[trajectory]};
  if(capability)writes.compiledCapabilities=[capability];
  if(nextFailure)writes.failureMemories=[nextFailure];
  const mutation=await buildMutation("LEARN","reasoningTrajectory",trajectory.id,deltaPayload("reasoningTrajectories",writes));
  await atomicPut({reasoningTrajectories:[trajectory],...(capability?{compiledCapabilities:[capability]}:{}),...(nextFailure?{failureMemories:[nextFailure]}:{}),mutations:[mutation]});
  snapshot.reasoningTrajectories=mergeById(snapshot.reasoningTrajectories,[trajectory]);
  if(capability)snapshot.compiledCapabilities=mergeById(snapshot.compiledCapabilities,[capability]);
  if(nextFailure)snapshot.failureMemories=mergeById(snapshot.failureMemories,[nextFailure]);
  snapshot.mutations=mergeById(snapshot.mutations,[mutation]).slice(-RECENT_EVENT_LIMIT);
  setSnapshot({reasoningTrajectories:snapshot.reasoningTrajectories,compiledCapabilities:snapshot.compiledCapabilities,failureMemories:snapshot.failureMemories,mutations:snapshot.mutations});
  return {trajectory,capability,failureMemory:nextFailure};
}

const DISCOVER_SAFE_KINDS=new Set<AtomRecord["kind"]>(["idea","decision","constraint","task","fact"]);
const DISCOVER_BLOCKED_RULES=new Set(["assistant_or_unknown_author","question","code_or_log","labelled_answer","quoted_text","meta_task","chat_task","anaphora","duplicate_claim","transient_observation","observation","speculation","invalid_source","invalid_timestamp","empty_candidate","not_strict_truth"]);
const DISCOVER_STOP_TERMS=new Set(["brain2","project","thing","things","stuff","work","works","need","needs","make","made","want","user","chatgpt","claude","gemini","assistant","export","import","data","file","page","pages","good","better","best","wrong","right","issue","issues","problem","problems"]);

function discoverStrictRule(atom:AtomRecord){return atom.ruleTrace?.filter((item)=>item.startsWith("strict_truth:")&&!item.endsWith(":eligible")&&!item.endsWith(":residual")).at(-1)?.replace(/^strict_truth:/,"");}
function discoverStrictEligible(atom:AtomRecord){return atom.ruleTrace?.includes("strict_truth:eligible")===true;}
function discoverMeaningfulTerms(input:string[]|string|undefined,limit=12){
  const raw=Array.isArray(input)?input:indexTerms(normalizeText(input??""),48);
  const out:string[]=[];
  for(const term of raw.map((item)=>normalizeText(item).toLowerCase()).filter(Boolean)){
    if(term.length<4||DISCOVER_STOP_TERMS.has(term)||/^\d+$/.test(term)||out.includes(term))continue;
    out.push(term);
    if(out.length>=limit)break;
  }
  return out;
}
function discoverTermsForAtom(atom:AtomRecord){
  return [...new Set([...discoverMeaningfulTerms(atom.keywords,8),...discoverMeaningfulTerms(atom.canonicalSubject||atom.subject,6),...discoverMeaningfulTerms(atom.value,4),...discoverMeaningfulTerms(atom.text,8)])].slice(0,16);
}
function discoverTermsForDoc(doc:PersistentSearchDocument){
  return [...new Set([...discoverMeaningfulTerms(doc.terms,12),...discoverMeaningfulTerms(doc.text,8)])].slice(0,16);
}
function discoverTextLooksJunk(text:string){
  const clean=normalizeText(text);
  if(!clean||clean.length<18)return true;
  if(/^(q|question|answer|assistant|user)\s*[:\-]/i.test(clean))return true;
  if(/```|<meta-data|<\/?[a-z][^>]*>|https?:\/\/|traceback|typeerror|syntaxerror|\{".{0,80}":/.test(clean))return true;
  if(clean.split(/\s+/).length<5&&!/\b(decided|decision|must|should|need|requires|required|use|keep|remove|avoid|build|implement|ship|verify|test)\b/i.test(clean))return true;
  return false;
}
function discoverSourceSafe(atom:AtomRecord){
  const rule=discoverStrictRule(atom);
  if(rule&&DISCOVER_BLOCKED_RULES.has(rule))return false;
  if(atom.boundarySignals?.some((signal)=>["code","log","assistant","question"].some((bad)=>signal.toLowerCase().includes(bad))))return false;
  return true;
}
function discoverQualitySafe(atom:AtomRecord){
  if(!DISCOVER_SAFE_KINDS.has(atom.kind))return false;
  if(!atom.projectId||!atom.createdAt||Number.isNaN(Date.parse(atom.createdAt)))return false;
  if(atom.confidence<0.66)return false;
  if(atom.truthStatus==="SUPERSEDED"||atom.truthStatus==="CONFLICTING")return false;
  if(!discoverSourceSafe(atom)||discoverTextLooksJunk(atom.text))return false;
  const terms=discoverTermsForAtom(atom);
  if(terms.length<2)return false;
  if(atom.kind==="fact"&&!discoverStrictEligible(atom)&&atom.truthStatus!=="CURRENT")return false;
  if(atom.kind==="idea"&&!discoverStrictEligible(atom)&&atom.truthStatus!=="CURRENT"&&!atom.relationSafe&&atom.confidence<0.78)return false;
  return true;
}
function scoreDiscoverAtom(atom:AtomRecord,recentTerms:Set<string>,projectRecentTerms?:Set<string>){
  const terms=discoverTermsForAtom(atom);
  const overlap=terms.filter((term)=>recentTerms.has(term));
  const projectOverlap=projectRecentTerms?terms.filter((term)=>projectRecentTerms.has(term)):[];
  const strongAtom=discoverStrictEligible(atom)||atom.truthStatus==="CURRENT"||atom.kind==="decision"||atom.kind==="constraint";
  if(overlap.length<2&&!(strongAtom&&projectOverlap.length>=1))return 0;
  const kindBoost=atom.kind==="decision"?.55:atom.kind==="constraint"?.5:atom.kind==="task"?.25:atom.kind==="idea"?.2:.1;
  const truthBoost=atom.truthStatus==="CURRENT"?.55:discoverStrictEligible(atom)?.35:0;
  const projectBoost=Math.min(.8,projectOverlap.length*.25);
  return overlap.length*.9+projectOverlap.length*.35+atom.confidence+kindBoost+truthBoost+projectBoost;
}

export function discoverForgottenGold(limit=20){
  const recentCutoff=Date.now()-45*86400000;
  const oldCutoff=Date.now()-120*86400000;
  const recentAtoms=snapshot.atoms.filter((atom)=>!atom.createdAt||Date.parse(atom.createdAt)>=recentCutoff).filter(discoverQualitySafe);
  const recentTerms=new Set(recentAtoms.flatMap(discoverTermsForAtom));
  const recentTermsByProject=new Map<string,Set<string>>();
  for(const atom of recentAtoms){
    const terms=recentTermsByProject.get(atom.projectId)??new Set<string>();
    for(const term of discoverTermsForAtom(atom))terms.add(term);
    recentTermsByProject.set(atom.projectId,terms);
  }
  return snapshot.atoms
    .filter((atom)=>atom.createdAt&&Date.parse(atom.createdAt)<=oldCutoff&&discoverQualitySafe(atom))
    .map((atom)=>({atom,score:scoreDiscoverAtom(atom,recentTerms,recentTermsByProject.get(atom.projectId))}))
    .filter((item)=>item.score>=2.7)
    .sort((a,b)=>b.score-a.score||b.atom.confidence-a.atom.confidence)
    .slice(0,limit);
}

async function searchDocsDateRange(range:IDBKeyRange,direction:IDBCursorDirection,limit:number):Promise<PersistentSearchDocument[]>{const db=await openDb();return new Promise((resolve,reject)=>{const out:PersistentSearchDocument[]=[];const tx=db.transaction("searchDocs","readonly");const request=tx.objectStore("searchDocs").index("byCreatedAt").openCursor(range,direction);request.onsuccess=()=>{const cursor=request.result;if(!cursor||out.length>=limit){resolve(out);return;}out.push(cursor.value as PersistentSearchDocument);cursor.continue();};request.onerror=()=>reject(request.error);});}
export async function discoverForgottenGoldAsync(limit=50){
  await bootBrain2();
  const recentIso=new Date(Date.now()-45*86400000).toISOString();
  const oldIso=new Date(Date.now()-120*86400000).toISOString();
  try{
    const recentDocs=await searchDocsDateRange(IDBKeyRange.lowerBound(recentIso),"prev",5000);
    const recentAtomDocs=recentDocs.filter((doc)=>doc.kind==="atom"&&doc.recordId);
    const recentAtoms=await getByIds<AtomRecord>("atoms",recentAtomDocs.map((doc)=>doc.recordId));
    const safeRecentAtoms=recentAtoms.filter(discoverQualitySafe);
    const recentTerms=new Set(safeRecentAtoms.flatMap(discoverTermsForAtom));
    const recentTermsByProject=new Map<string,Set<string>>();
    for(const atom of safeRecentAtoms){
      const terms=recentTermsByProject.get(atom.projectId)??new Set<string>();
      for(const term of discoverTermsForAtom(atom))terms.add(term);
      recentTermsByProject.set(atom.projectId,terms);
    }
    const oldDocs=await searchDocsDateRange(IDBKeyRange.upperBound(oldIso),"prev",10000);
    const preCandidates=oldDocs
      .filter((doc)=>doc.kind==="atom"&&doc.atomKind&&DISCOVER_SAFE_KINDS.has(doc.atomKind)&&(doc.confidence??0)>=0.62)
      .map((doc)=>({doc,overlap:discoverTermsForDoc(doc).filter((term)=>recentTerms.has(term)).length}))
      .filter((item)=>item.overlap>=1)
      .sort((a,b)=>b.overlap-a.overlap||(b.doc.confidence??0)-(a.doc.confidence??0))
      .slice(0,Math.max(limit*12,240));
    const atoms=await getByIds<AtomRecord>("atoms",preCandidates.map((item)=>item.doc.recordId));
    const byId=new Map(atoms.map((atom)=>[atom.id,atom]));
    const scored=preCandidates
      .map((item)=>byId.get(item.doc.recordId))
      .filter((atom):atom is AtomRecord=>{
        if(!atom)return false;
        return discoverQualitySafe(atom);
      })
      .map((atom)=>({atom,score:scoreDiscoverAtom(atom,recentTerms,recentTermsByProject.get(atom.projectId))}))
      .filter((item)=>item.score>=2.7)
      .sort((a,b)=>b.score-a.score||b.atom.confidence-a.atom.confidence)
      .slice(0,limit);
    await metaPut("discoverVersion",BRAIN2_DISCOVER_VERSION).catch(()=>undefined);
    return scored;
  }catch{
    return discoverForgottenGold(limit);
  }
}

export function searchBrain2(query:string,mode:"find"|"current"|"history"|"evidence"|"discover"="find"){
  const q=normalizeText(query).toLowerCase();
  if(mode==="discover")return discoverForgottenGold().filter((item)=>!q||item.atom.text.toLowerCase().includes(q)||item.atom.keywords.some((term)=>q.includes(term)));
  if(mode==="current")return indexedTruths(snapshot,q).filter((truth)=>truth.status==="CURRENT");
  if(mode==="history")return indexedTruths(snapshot,q).filter((truth)=>truth.status!=="CURRENT");
  const messages=indexedMessages(snapshot,q);
  return mode==="evidence"?messages.filter((message)=>messageHasAtom(snapshot,message.id)):messages;
}
export async function searchBrain2Async(query:string,mode:"find"|"current"|"history"|"evidence"|"discover"="find"){
  await bootBrain2();const q=normalizeText(query);
  if(mode==="discover"){const results=await discoverForgottenGoldAsync(60);return results.filter((item)=>!q||item.atom.text.toLowerCase().includes(q.toLowerCase())||item.atom.keywords.some((term)=>q.toLowerCase().includes(term)));}
  if(mode==="current")return (await indexedTruthsAsync(snapshot,q,256)).filter((truth)=>truth.status==="CURRENT");
  if(mode==="history")return (await indexedTruthsAsync(snapshot,q,256)).filter((truth)=>truth.status!=="CURRENT");
  const messages=await indexedMessagesAsync(snapshot,q,256);if(mode!=="evidence")return messages;const checks=await Promise.all(messages.map(async(message)=>({message,has:(await getAllKeysByIndex("atoms","byMessageId",message.id)).length>0})));return checks.filter((item)=>item.has).map((item)=>item.message);
}

export async function loadConversationMessages(conversationId:string,limit=120,beforeSequence?:number):Promise<MessageRecord[]>{await bootBrain2();const db=await openDb();const upper=beforeSequence===undefined?Number.MAX_SAFE_INTEGER:Math.max(0,beforeSequence-1);return new Promise((resolve,reject)=>{const out:MessageRecord[]=[];const tx=db.transaction("messages","readonly");const index=tx.objectStore("messages").index("byConversationSequence");const range=IDBKeyRange.bound([conversationId,0],[conversationId,upper]);const request=index.openCursor(range,"prev");request.onsuccess=()=>{const cursor=request.result;if(!cursor||out.length>=limit){resolve(out.reverse());return;}out.push(cursor.value as MessageRecord);cursor.continue();};request.onerror=()=>reject(request.error);});}
export async function loadTimelineMessages(limit=250){await bootBrain2();return recentByIndex<MessageRecord>("messages","byCreatedAt",limit);}
export async function loadProjectAtoms(projectId:string,limit=120){await bootBrain2();const db=await openDb();return new Promise<AtomRecord[]>((resolve,reject)=>{const out:AtomRecord[]=[];const tx=db.transaction("atoms","readonly");const index=tx.objectStore("atoms").index("byProjectCreatedAt");const range=IDBKeyRange.bound([projectId,""],[projectId,"\uffff"]);const request=index.openCursor(range,"prev");request.onsuccess=()=>{const cursor=request.result;if(!cursor||out.length>=limit){resolve(out);return;}out.push(cursor.value as AtomRecord);cursor.continue();};request.onerror=()=>reject(request.error);});}
export async function loadProjectTruthSummary(projectId:string){await bootBrain2();const [current,currentCount,superseded,conflicting,pending]=await Promise.all([getAllByIndex<TruthRecord>("truths","byProjectStatus",[projectId,"CURRENT"],100),countByIndex("truths","byProjectStatus",[projectId,"CURRENT"]),countByIndex("truths","byProjectStatus",[projectId,"SUPERSEDED"]),countByIndex("truths","byProjectStatus",[projectId,"CONFLICTING"]),countByIndex("truths","byProjectStatus",[projectId,"PENDING_REVIEW"])]);return{current:current.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),currentCount,superseded,conflicting,pending};}
export async function loadAtomById(id:string){await bootBrain2();return getOne<AtomRecord>("atoms",id);}

export function currentBrain2DeviceId(){return localStorage.getItem("brain2-web-device-id")??"web";}
export function currentBrain2MemoryRoot(){return snapshot.memoryRoot;}

export async function getSyncReplicaSummary(){await bootBrain2();return{deviceId:currentBrain2DeviceId(),memoryRoot:snapshot.memoryRoot,totalMessages:snapshot.storage.totalMessages,totalAtoms:snapshot.storage.totalAtoms,totalTruths:snapshot.storage.totalTruths,latestLocalSequence:mutationSequence,conflicts:snapshot.syncConflicts.filter((item)=>item.status==="OPEN").length};}

export async function getG11SyncProofMaterial(){
  await bootBrain2();
  const db=await openDb();
  const readAll=<T>(table:TableName)=>new Promise<T[]>((resolve,reject)=>{
    const tx=db.transaction(table,"readonly");
    const request=tx.objectStore(table).getAll();
    request.onsuccess=()=>resolve(request.result as T[]);
    request.onerror=()=>reject(request.error);
  });
  const [truths,mutations,summary]=await Promise.all([
    readAll<TruthRecord>("truths"),
    readAll<MutationRecord>("mutations"),
    getSyncReplicaSummary(),
  ]);
  return {truths,mutations,summary,snapshotVersion:snapshot.version};
}

export async function adoptMemoryRootIfEmpty(memoryRoot:string){await bootBrain2();if(!memoryRoot)throw new Error("Missing Brain2 memory root.");if(snapshot.memoryRoot===memoryRoot)return;if(snapshot.storage.totalMessages||snapshot.storage.totalAtoms||snapshot.projects.length||snapshot.truths.length)throw new Error("This browser already contains a different Brain2 memory. Export/reset it before joining another memory root.");await metaPut("memoryRoot",memoryRoot);snapshot.memoryRoot=memoryRoot;const device=await ensureWebDevice(memoryRoot);snapshot.devices=mergeById(snapshot.devices,[device]);setSnapshot({memoryRoot,devices:snapshot.devices});}

async function upsertSyncPeerInternal(peerDeviceId:string,patch:Partial<SyncPeerRecord>={}){await bootBrain2();const id=`peer_${peerDeviceId}`;const existing=await getOne<SyncPeerRecord>("syncPeers",id);const peer:SyncPeerRecord={id,deviceId:currentBrain2DeviceId(),peerDeviceId,memoryRoot:snapshot.memoryRoot,status:"DISCONNECTED",lastPushedSequence:0,lastAppliedPeerSequence:0,pendingDeltas:0,transport:"WEBRTC",...existing,...patch};await put("syncPeers",peer);snapshot.syncPeers=mergeById(snapshot.syncPeers,[peer]);setSnapshot({syncPeers:snapshot.syncPeers});return peer;}
export async function updateSyncPeer(peerDeviceId:string,patch:Partial<SyncPeerRecord>){return upsertSyncPeerInternal(peerDeviceId,patch);}
export async function getSyncPeer(peerDeviceId:string){await bootBrain2();return getOne<SyncPeerRecord>("syncPeers",`peer_${peerDeviceId}`);}

export async function getReplicableMutationsForPeer(peerDeviceId:string,limit=128){await bootBrain2();const peer=await upsertSyncPeerInternal(peerDeviceId);const deviceId=currentBrain2DeviceId();const db=await openDb();return new Promise<MutationRecord[]>((resolve,reject)=>{const out:MutationRecord[]=[];const tx=db.transaction("mutations","readonly");const index=tx.objectStore("mutations").index("byOriginSequence");const range=IDBKeyRange.bound([deviceId,peer.lastPushedSequence+1],[deviceId,Number.MAX_SAFE_INTEGER]);const request=index.openCursor(range,"next");request.onsuccess=()=>{const cursor=request.result;if(!cursor||out.length>=limit){resolve(out.filter((item)=>item.replicationStatus==="LOCAL_COMMITTED"&&Boolean(item.payload)));return;}out.push(cursor.value as MutationRecord);cursor.continue();};request.onerror=()=>reject(request.error);});}

export async function markPeerAck(peerDeviceId:string,sequence:number){const peer=await upsertSyncPeerInternal(peerDeviceId);await upsertSyncPeerInternal(peerDeviceId,{lastPushedSequence:Math.max(peer.lastPushedSequence,sequence),lastSyncAt:now(),status:"SYNCED",pendingDeltas:0,error:undefined});}

async function searchDocsForDelta(payload:MutationDeltaPayload):Promise<{writes:PersistentSearchDocument[];deletes:string[]}> {
  const writes:PersistentSearchDocument[]=[];const deletes:string[]=[];
  const conversations=(payload.writes.conversations??[]) as ConversationRecord[];const conversationMap=new Map(conversations.map((item)=>[item.id,item]));
  const blocks=(payload.writes.evidenceBlocks??[]) as EvidenceBlockRecord[];const blockByMessage=new Map<string,string>();for(const block of blocks)for(const id of block.messageIds)blockByMessage.set(id,block.id);
  for(const message of (payload.writes.messages??[]) as MessageRecord[]){const conv=conversationMap.get(message.conversationId)??snapshot.conversations.find((item)=>item.id===message.conversationId)??await getOne<ConversationRecord>("conversations",message.conversationId);writes.push(searchDocForMessage(message,conv?.projectId,false,blockByMessage.get(message.id)));}
  for(const atom of (payload.writes.atoms??[]) as AtomRecord[])writes.push(searchDocForAtom(atom,blockByMessage.get(atom.messageId)));
  for(const truth of (payload.writes.truths??[]) as TruthRecord[])writes.push(searchDocForTruth(truth));
  for(const id of payload.deletes?.messages??[])deletes.push(`search_message_${id}`);for(const id of payload.deletes?.atoms??[])deletes.push(`search_atom_${id}`);for(const id of payload.deletes?.truths??[])deletes.push(`search_truth_${id}`);
  return {writes,deletes};
}

function applyDeltaPayloadToHotSnapshot(payload:MutationDeltaPayload){
  const merge=(key:keyof Brain2Snapshot,limit?:number)=>{const incoming=(payload.writes as Record<string,AnyRecord[]|undefined>)[String(key)]??[];if(!incoming.length&&!((payload.deletes as Record<string,string[]|undefined>|undefined)?.[String(key)]?.length))return;const current=((snapshot as unknown as Record<string,unknown>)[String(key)]??[]) as AnyRecord[];const deleted=new Set((payload.deletes as Record<string,string[]|undefined>|undefined)?.[String(key)]??[]);let next=mergeById(current.filter((item)=>!deleted.has(item.id)),incoming);if(limit)next=next.slice(-limit);(snapshot as unknown as Record<string,unknown>)[String(key)]=next;};
  merge("sources");merge("conversations");merge("messages",HOT_MESSAGE_LIMIT);merge("atoms",HOT_ATOM_LIMIT);merge("truths");merge("projects");merge("ticks");merge("decisions");merge("patterns");merge("experiments");merge("missions");merge("checkpoints");merge("verifications");merge("transactions",RECENT_EVENT_LIMIT);merge("patternTests");merge("portableExpertise");merge("compiledCapabilities");merge("reasoningTrajectories");merge("failureMemories");merge("databoxes");merge("evidenceBlocks",500);
}

async function flushDerivedPatternsRefreshQueue():Promise<void>{
  if(derivedRefreshPromise)return derivedRefreshPromise;
  derivedRefreshPromise=(async()=>{
    try{
      do{
        derivedRefreshQueued=false;
        const targets=[...derivedRefreshProjectIds];
        derivedRefreshProjectIds.clear();
        await refreshDerivedPatterns();
        await refreshProjectIntelligenceArtifacts(targets.length?targets:undefined);
        setSnapshot({patterns:snapshot.patterns,derivedArtifacts:snapshot.derivedArtifacts});
        const pendingMRSProjectIds=getProjectsWithPendingMRS().filter((projectId)=>!targets.length||targets.includes(projectId));
        brain2MRSLog("derived-refresh.queue-mrs", { targetCount: targets.length, pendingMRSProjects: pendingMRSProjectIds.length });
        if(pendingMRSProjectIds.length){
          void requestPendingProjectIntelligenceMRS({idle:false,projectIds:pendingMRSProjectIds,limit:pendingMRSProjectIds.length}).catch((error)=>brain2MRSError("derived-refresh.queue-mrs.error", { error: error instanceof Error ? error.message : String(error) }));
        }
        await new Promise((resolve)=>setTimeout(resolve,0));
      }while(derivedRefreshQueued);
    }finally{
      derivedRefreshPromise=null;
    }
  })();
  return derivedRefreshPromise;
}

function scheduleDerivedPatternsRefresh(projectIds?:string[]){
  for(const projectId of projectIds??[]){if(projectId)derivedRefreshProjectIds.add(projectId);}
  derivedRefreshQueued=true;
  if(typeof window==="undefined"){void flushDerivedPatternsRefreshQueue().catch(()=>undefined);return;}
  if(derivedRefreshTimer)window.clearTimeout(derivedRefreshTimer);
  derivedRefreshTimer=window.setTimeout(()=>{
    derivedRefreshTimer=undefined;
    scheduleIdleTask(()=>{void flushDerivedPatternsRefreshQueue().catch(()=>undefined);},5000);
  },2500);
}

async function atomicApplyRemote(mutation:MutationRecord,peerDeviceId:string,transport:"WEBRTC"|"HTTPS"|"B2_NETWORK"){
  if(!mutation.payload)throw new Error("Replicated mutation has no payload.");
  const payload=mutation.payload;const primaryTable=payload.primaryTable;let localHash:string|undefined;
  if(primaryTable){const existing=await getOne<AnyRecord>(primaryTable,mutation.entityId);if(existing)localHash=await hashEntity(existing);if(mutation.beforeHash&&existing&&localHash!==mutation.beforeHash&&localHash!==mutation.afterHash){const conflict:SyncConflictRecord={id:`conflict_${mutation.id}`,mutationId:mutation.id,peerDeviceId,entityType:mutation.entityType,entityId:mutation.entityId,expectedBeforeHash:mutation.beforeHash,localHash,incomingAfterHash:mutation.afterHash,status:"OPEN",createdAt:now(),detail:"Concurrent state diverged from the mutation base. Brain2 preserved the conflict instead of silently applying last-write-wins."};const rejected:{id:string;[key:string]:unknown}={...mutation,replicationStatus:"CONFLICT",receivedAt:now(),sourceTransport:transport};await atomicPut({mutations:[rejected],syncConflicts:[conflict]});snapshot.syncConflicts=mergeById(snapshot.syncConflicts,[conflict]);return{applied:false,conflict};}}
  const writeTables=Object.entries(payload.writes).filter(([table,records])=>SYNC_TABLE_SET.has(table)&&Array.isArray(records)&&records.length) as Array<[SyncTableName,AnyRecord[]]>;
  const readerDocs=await searchDocsForDelta(payload);
  const db=await openDb();const tables=[...new Set([...writeTables.map(([table])=>table),"mutations","syncPeers",...(readerDocs.writes.length||readerDocs.deletes.length?["searchDocs"]:[]),...(payload.deletes?Object.keys(payload.deletes).filter((table)=>SYNC_TABLE_SET.has(table)):[])])] as TableName[];
  const peer=await getSyncPeer(peerDeviceId)??{id:`peer_${peerDeviceId}`,deviceId:currentBrain2DeviceId(),peerDeviceId,memoryRoot:snapshot.memoryRoot,status:"SYNCING" as const,lastPushedSequence:0,lastAppliedPeerSequence:0,pendingDeltas:0,transport};
  const appliedMutation:MutationRecord={...mutation,deviceId:mutation.originDeviceId??mutation.deviceId,replicationStatus:"REMOTE_APPLIED",receivedAt:now(),appliedAt:now(),sourceTransport:transport};
  const nextPeer:SyncPeerRecord={...peer,status:"SYNCING",lastAppliedPeerSequence:Math.max(peer.lastAppliedPeerSequence,mutation.originSequence??mutation.sequence??0),lastSeenAt:now(),lastSyncAt:now(),transport,error:undefined};
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction(tables,"readwrite");for(const [table,records] of writeTables){const store=tx.objectStore(table);for(const record of records)store.put(record);}if(payload.deletes){for(const [table,ids] of Object.entries(payload.deletes)){if(!SYNC_TABLE_SET.has(table)||!Array.isArray(ids))continue;const store=tx.objectStore(table);for(const id of ids)store.delete(id);}}if(tables.includes("searchDocs")){const reader=tx.objectStore("searchDocs");for(const doc of readerDocs.writes)reader.put(doc);for(const id of readerDocs.deletes)reader.delete(id);}tx.objectStore("mutations").put(appliedMutation);tx.objectStore("syncPeers").put(nextPeer);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error("Remote mutation transaction aborted"));});
  applyDeltaPayloadToHotSnapshot(payload);snapshot.mutations=mergeById(snapshot.mutations,[appliedMutation]).slice(-RECENT_EVENT_LIMIT);snapshot.syncPeers=mergeById(snapshot.syncPeers,[nextPeer]);return{applied:true,readerDocs:readerDocs.writes.length};
}

export async function applyReplicatedMutations(peerDeviceId:string,incoming:MutationRecord[],transport:"WEBRTC"|"HTTPS"|"B2_NETWORK"="WEBRTC"){
  await bootBrain2();const peer=await upsertSyncPeerInternal(peerDeviceId,{status:"SYNCING",transport});const sorted=[...incoming].sort((a,b)=>(a.originSequence??a.sequence??0)-(b.originSequence??b.sequence??0));const accepted:string[]=[];const rejected:Array<{id:string;reason:string}>=[];let lastApplied=peer.lastAppliedPeerSequence;
  for(const mutation of sorted){if(await getOne<MutationRecord>("mutations",mutation.id)){lastApplied=Math.max(lastApplied,mutation.originSequence??mutation.sequence??0);accepted.push(mutation.id);continue;}const verification=await verifyMutationEnvelope(mutation);if(!verification.ok){rejected.push({id:mutation.id,reason:verification.reason??"invalid mutation"});continue;}if(mutation.memoryRoot!==snapshot.memoryRoot){rejected.push({id:mutation.id,reason:"memory-root mismatch"});continue;}if((mutation.originDeviceId??mutation.deviceId)!==peerDeviceId){rejected.push({id:mutation.id,reason:"origin device mismatch"});continue;}const seq=mutation.originSequence??mutation.sequence??0;const gapExpected=brain2MutationGapExpected(lastApplied,seq);if(gapExpected!==null){rejected.push({id:mutation.id,reason:`mutation gap: expected ${gapExpected}, got ${seq}`});break;}const result=await atomicApplyRemote(mutation,peerDeviceId,transport);if(result.applied){lastApplied=Math.max(lastApplied,seq);accepted.push(mutation.id);}else{rejected.push({id:mutation.id,reason:"concurrent mutation conflict preserved"});break;}}
  await upsertSyncPeerInternal(peerDeviceId,{lastAppliedPeerSequence:lastApplied,lastSyncAt:now(),lastSeenAt:now(),status:rejected.length?"CONFLICT":"SYNCED",transport,error:rejected.length?rejected[0].reason:undefined});if(accepted.length){const state=await refreshStorageState();rebuildIngestionIndexes();setSnapshot({sources:snapshot.sources,conversations:snapshot.conversations,messages:snapshot.messages,atoms:snapshot.atoms,truths:snapshot.truths,projects:snapshot.projects,ticks:snapshot.ticks,decisions:snapshot.decisions,patterns:snapshot.patterns,experiments:snapshot.experiments,missions:snapshot.missions,checkpoints:snapshot.checkpoints,verifications:snapshot.verifications,transactions:snapshot.transactions,patternTests:snapshot.patternTests,portableExpertise:snapshot.portableExpertise,compiledCapabilities:snapshot.compiledCapabilities,reasoningTrajectories:snapshot.reasoningTrajectories,failureMemories:snapshot.failureMemories,databoxes:snapshot.databoxes,evidenceBlocks:snapshot.evidenceBlocks,mutations:snapshot.mutations,syncPeers:snapshot.syncPeers,storage:state});const deltaPayloads=sorted.map((m)=>m.payload).filter((payload):payload is MutationDeltaPayload=>Boolean(payload));if(deltaPayloads.some((payload)=>Boolean(payload.writes.atoms?.length||payload.writes.truths?.length))){scheduleDerivedPatternsRefresh(collectProjectIdsFromDeltaPayloads(deltaPayloads));}}return{accepted,rejected,lastAppliedSequence:lastApplied};
}

export async function streamSyncBootstrap(onChunk:(chunk:{table:SyncTableName|"mutations";records:AnyRecord[];ordinal:number})=>Promise<void>){await bootBrain2();let ordinal=0;for(const table of [...SYNC_TABLES,"mutations" as const]){let key:IDBValidKey|undefined;while(true){const page=await pagedPrimaryRead<AnyRecord>(table,key,100);for(const records of packBootstrapRecords(page.items)){await onChunk({table,records,ordinal:ordinal++});}key=page.lastKey;if(page.items.length<100)break;await new Promise((resolve)=>setTimeout(resolve,0));}}return ordinal;}

export async function streamSyncMergeSnapshot(
  onChunk: (chunk: {table: SyncTableName; records: AnyRecord[]; ordinal: number}) => Promise<void>,
) {
  await bootBrain2();
  let ordinal = 0;
  for (const table of SYNC_TABLES) {
    let key: IDBValidKey | undefined;
    while (true) {
      const page = await pagedPrimaryRead<AnyRecord>(table, key, 100);
      for (const records of packBootstrapRecords(page.items)) {
        await onChunk({ table, records, ordinal: ordinal++ });
      }
      key = page.lastKey;
      if (page.items.length < 100) break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  return ordinal;
}

export async function applySyncMergeChunk(
  targetRoot: string,
  table: string,
  records: AnyRecord[],
) {
  await bootBrain2();
  if (snapshot.memoryRoot !== targetRoot) {
    throw new Error("Merge target memory-root mismatch.");
  }
  if (!SYNC_TABLE_SET.has(table)) {
    throw new Error(`Unsupported merge table: ${table}`);
  }

  const typedTable = table as SyncTableName;
  const writes: AnyRecord[] = [];
  for (const incoming of records) {
    const id = String(incoming.id ?? "");
    if (!id) continue;
    const local = await getOne<AnyRecord>(typedTable, id);
    if (!local) {
      writes.push(incoming);
      continue;
    }
    const winner = await brain2MergeWinner(local, incoming);
    if (canonicalJson(local) !== canonicalJson(winner)) writes.push(winner);
  }
  await putMany(typedTable, writes);
  return writes.length;
}

export async function finalizeSyncMemoryMerge() {
  await reloadBrain2FromDisk();
  setTimeout(() => {
    void rebuildPersistentSearchIndex();
    scheduleDeferredDerivations({delayMs: 1200, idleTimeoutMs: 9000});
  }, 0);
}

export async function applySyncBootstrapChunk(memoryRoot:string,table:SyncTableName|"mutations",records:AnyRecord[]){await bootBrain2();if(snapshot.memoryRoot!==memoryRoot)throw new Error("Bootstrap memory-root mismatch.");if(snapshot.storage.totalMessages>0)throw new Error("Bootstrap is only allowed into an empty Brain2 replica. Existing replicas use mutation sync.");if(table!=="mutations"&&!SYNC_TABLE_SET.has(table))throw new Error("Unsupported bootstrap table.");await putMany(table,records);}
export async function finalizeSyncBootstrap(){await reloadBrain2FromDisk();setTimeout(()=>{void rebuildPersistentSearchIndex();scheduleDeferredDerivations({delayMs:1200,idleTimeoutMs:9000});},0);}

export async function reloadBrain2FromDisk(){clearScheduledRefreshWork();snapshot={...emptySnapshot,storage:{...emptyStorage}};mutationSequence=0;secondaryBootHydrationPromise=null;rebuildIngestionIndexes();await bootBrain2();}

async function buildB2MIntegrity(tableData:Record<string,unknown>){
  const currentTruths=Array.isArray(tableData.truths)?(tableData.truths as TruthRecord[]).filter((truth)=>truth.status==="CURRENT"):[];
  const messages=Array.isArray(tableData.messages)?tableData.messages as MessageRecord[]:[];
  const [currentTruthRoot,providerNeutralCurrentTruthRoot,sourceEvidenceRoot]=await Promise.all([
    buildCurrentTruthRoot(currentTruths),
    buildCurrentTruthRoot(currentTruths,{providerNeutral:true}),
    buildSourceEvidenceRoot(messages),
  ]);
  return {currentTruthRoot,providerNeutralCurrentTruthRoot,sourceEvidenceRoot};
}

async function buildB2MPayload(){
  const portableTables=TABLES.filter((table)=>table!=="meta"&&table!=="searchDocs");const tableData:Record<string,unknown>={};for(const table of portableTables){tableData[table]=await all(table);await new Promise((resolve)=>setTimeout(resolve,0));}const tableHashes:Record<string,string>={};for(const [table,value] of Object.entries(tableData)){tableHashes[table]=await sha256(JSON.stringify(value));await new Promise((resolve)=>setTimeout(resolve,0));}const integrity=await buildB2MIntegrity(tableData);const stateHash=await sha256(Object.entries(tableHashes).sort(([a],[b])=>a.localeCompare(b)).map(([table,hash])=>`${table}:${hash}`).join("|"));return {format:"B2M",version:4,schemaVersion:BRAIN2_SCHEMA_VERSION,memoryRoot:snapshot.memoryRoot,exportedAt:now(),manifest:{stateHash,tableHashes,...integrity,derivedExcluded:["searchDocs"]},tables:tableData};
}
export async function exportB2M(passphrase?:string):Promise<Blob>{return runBrain2ForegroundTask("B2M_EXPORT",async()=>{await bootBrain2();const startedAt=performanceNow();const payload=JSON.stringify(await buildB2MPayload());if(!passphrase){await recordResponsivenessTelemetry("b2m.export_total",performanceNow()-startedAt,{encrypted:false,sizeBytes:payload.length});return new Blob([payload],{type:"application/vnd.brain2.b2m+json"});}const salt=crypto.getRandomValues(new Uint8Array(16));const iv=crypto.getRandomValues(new Uint8Array(12));const baseKey=await crypto.subtle.importKey("raw",new TextEncoder().encode(passphrase),"PBKDF2",false,["deriveKey"]);const key=await crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",salt,iterations:200000},baseKey,{name:"AES-GCM",length:256},false,["encrypt"]);const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(payload));const encoded={format:"B2M-ENCRYPTED",version:4,kdf:"PBKDF2-SHA256-200000",cipher:"AES-256-GCM",salt:btoa(String.fromCharCode(...salt)),iv:btoa(String.fromCharCode(...iv)),data:btoa(String.fromCharCode(...new Uint8Array(ciphertext)))};const out=JSON.stringify(encoded);await recordResponsivenessTelemetry("b2m.export_total",performanceNow()-startedAt,{encrypted:true,sizeBytes:out.length});return new Blob([out],{type:"application/vnd.brain2.b2m+json"});});}
function fromBase64(value:string){return Uint8Array.from(atob(value),(char)=>char.charCodeAt(0));}
export async function importB2M(file:File,passphrase?:string):Promise<void>{return runBrain2ForegroundTask("B2M_IMPORT",async()=>{await bootBrain2();const startedAt=performanceNow();const raw=JSON.parse(await file.text());let payload=raw;if(raw.format==="B2M-ENCRYPTED"){if(!passphrase)throw new Error("This .B2M is encrypted. Enter its passphrase.");const salt=fromBase64(raw.salt);const iv=fromBase64(raw.iv);const cipher=fromBase64(raw.data);const baseKey=await crypto.subtle.importKey("raw",new TextEncoder().encode(passphrase),"PBKDF2",false,["deriveKey"]);const key=await crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",salt,iterations:200000},baseKey,{name:"AES-GCM",length:256},false,["decrypt"]);const clear=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,cipher);payload=JSON.parse(new TextDecoder().decode(clear));}
  if(payload.format!=="B2M"||!payload.tables)throw new Error("Not a supported Brain2 .B2M package.");if(snapshot.memoryRoot&&payload.memoryRoot&&snapshot.memoryRoot!==payload.memoryRoot&&snapshot.storage.totalMessages)throw new Error("Memory-root mismatch. Import into an empty Brain2 profile or use a matching .B2M root.");if(payload.manifest?.tableHashes){for(const [table,expected] of Object.entries(payload.manifest.tableHashes as Record<string,string>)){const actual=await sha256(JSON.stringify(payload.tables[table]??[]));if(actual!==expected)throw new Error(`.B2M integrity check failed for ${table}.`);}}
  const manifest=payload.manifest as Record<string,unknown>|undefined;
  if(manifest?.currentTruthRoot||manifest?.providerNeutralCurrentTruthRoot||manifest?.sourceEvidenceRoot){
    const actual=await buildB2MIntegrity(payload.tables as Record<string,unknown>);
    for(const key of ["currentTruthRoot","providerNeutralCurrentTruthRoot","sourceEvidenceRoot"] as const){
      const expected=manifest[key];
      if(typeof expected!=="string")throw new Error(`.B2M integrity check missing ${key}.`);
      if(actual[key]!==expected)throw new Error(`.B2M integrity check failed for ${key}.`);
    }
  }
  clearScheduledRefreshWork();
  const db=await openDb();const restoreTables=TABLES.filter((item):item is DataTableName=>item!=="meta"&&item!=="searchDocs");await new Promise<void>((resolve,reject)=>{const tx=db.transaction([...restoreTables,"searchDocs","meta"],"readwrite");for(const table of restoreTables){const store=tx.objectStore(table);store.clear();for(const value of Array.isArray(payload.tables[table])?payload.tables[table]:[])store.put(value);}tx.objectStore("searchDocs").clear();tx.objectStore("meta").put({id:"memoryRoot",value:payload.memoryRoot});tx.objectStore("meta").delete("searchIndexVersion");tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error(".B2M atomic restore aborted"));});snapshot={...emptySnapshot,storage:{...emptyStorage}};secondaryBootHydrationPromise=null;rebuildIngestionIndexes();await bootBrain2();setTimeout(()=>{void rebuildPersistentSearchIndex();scheduleDeferredDerivations({delayMs:1200,idleTimeoutMs:9000});},0);await recordResponsivenessTelemetry("b2m.import_total",performanceNow()-startedAt,{encrypted:Boolean(raw.format==="B2M-ENCRYPTED"),fileName:file.name});});}

export async function resetBrain2():Promise<void>{
  // Destructive reset is a hard replica boundary. Invalidate every pre-reset
  // async job first, then delete the entire IndexedDB database rather than
  // depending on a large multi-store clear transaction.
  storageLifecycleEpoch += 1;
  const resetEpoch = storageLifecycleEpoch;
  invalidateRuntimeIndex();
  searchIndexRebuildPromise = null;
  bootPromise = null;
  secondaryBootHydrationPromise = null;
  clearScheduledRefreshWork();

  // Publish an explicit resetting state, but never leave it unobservable.
  snapshot = { ...snapshot, loaded: false, storage: { ...snapshot.storage, retrievalIndexStatus: "BUILDING", retrievalIndexProgress: 0, lastError: undefined } };
  emit();

  try {
    await deleteBrain2DatabaseCompletely();
    assertStorageLifecycle(resetEpoch);
    localStorage.removeItem("brain2-web-device-id");

    // Re-open a genuinely new database and seed only the new replica identity.
    const memoryRoot = await canonicalId("b2m", randomUuidCompat(), Date.now());
    await metaPut("memoryRoot", memoryRoot);
    const webDevice = await ensureWebDevice(memoryRoot);
    assertStorageLifecycle(resetEpoch);

    mutationSequence = 0;
    snapshot = {
      ...emptySnapshot,
      memoryRoot,
      devices: [webDevice],
      loaded: true,
      version: snapshot.version + 1,
      storage: { ...emptyStorage, retrievalIndexStatus: "EMPTY", retrievalIndexProgress: 1, lastVerifiedAt: now(), lastError: undefined },
    };
    rebuildIngestionIndexes();
    configurePersistentRetrieval(persistentSearch,evidenceExists);
    emit();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Make reset failure recoverable from the global workspace gate.
    snapshot = { ...snapshot, loaded: false, storage: { ...snapshot.storage, retrievalIndexStatus: "ERROR", lastError: message } };
    emit();
    throw error;
  }
}

export function memoryHealth(){const total=snapshot.storage.totalMessages;const hotMessageIds=new Set(snapshot.messages.map((message)=>message.id));const atomizedHot=new Set(snapshot.atoms.filter((atom)=>hotMessageIds.has(atom.messageId)).map((atom)=>atom.messageId)).size;const atomCoverage=snapshot.messages.length?atomizedHot/snapshot.messages.length:0;const conflicts=snapshot.truths.filter((truth)=>truth.status==="CONFLICTING").length;const pending=snapshot.truths.filter((truth)=>truth.status==="PENDING_REVIEW").length;const failedJournals=snapshot.journals.filter((item)=>item.status==="FAILED").length;const indexPenalty=snapshot.storage.retrievalIndexStatus==="ERROR"?15:snapshot.storage.retrievalIndexStatus==="PARTIAL"||snapshot.storage.retrievalIndexStatus==="BUILDING"?4:0;const score=Math.max(0,Math.min(100,Math.round((total?55:15)+atomCoverage*30-conflicts*1.5-pending*0.35-failedJournals*2+Math.min(10,snapshot.projects.length)-indexPenalty)));return{score,atomCoverage,conflicts,pending,failedJournals,indexStatus:snapshot.storage.retrievalIndexStatus,totalMessages:total,totalAtoms:snapshot.storage.totalAtoms};}
