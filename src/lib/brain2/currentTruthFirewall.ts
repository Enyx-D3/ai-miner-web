import type { TruthRecord } from "./types";
import {
  requireVerifiedR1Allow,
  type R1AuthorityReceipt,
  type R1AuthoritySource,
} from "./r1Authority";

export const R1_CURRENT_TRUTH_ACTION = "CURRENT_TRUTH_PROMOTE" as const;

export type CurrentTruthAuthorityContext = {
  path: "MUTATION" | "BOOTSTRAP" | "MEMORY_MERGE" | "B2M_IMPORT" | "TICK_RESOLUTION";
  projectId?: string;
  operationId: string;
  memoryRoot?: string;
  mergeId?: string;
  sourceRoot?: string;
  targetRoot?: string;
  sourceDeviceId?: string;
  targetDeviceId?: string;
  ordinal?: number;
  chunkHash?: string;
  stateHash?: string;
  currentTruthRoot?: string;
};

export function currentTruthMutationContext(input:{type:string;entityType:string;entityId:string;memoryRoot:string}): CurrentTruthAuthorityContext {
  return {path:"MUTATION",operationId:`${input.type}:${input.entityType}:${input.entityId}`,memoryRoot:input.memoryRoot};
}

export function currentTruthBootstrapContext(input:{memoryRoot:string;sourceDeviceId:string;targetDeviceId:string;ordinal:number;chunkHash:string}): CurrentTruthAuthorityContext {
  return {path:"BOOTSTRAP",operationId:`${input.sourceDeviceId}:${input.targetDeviceId}:${input.ordinal}`,memoryRoot:input.memoryRoot,sourceDeviceId:input.sourceDeviceId,targetDeviceId:input.targetDeviceId,ordinal:input.ordinal,chunkHash:input.chunkHash};
}

export function currentTruthMergeContext(input:{sourceRoot:string;targetRoot:string;sourceDeviceId:string;targetDeviceId:string;mergeId:string}): CurrentTruthAuthorityContext {
  return {path:"MEMORY_MERGE",operationId:input.mergeId,memoryRoot:input.targetRoot,mergeId:input.mergeId,sourceRoot:input.sourceRoot,targetRoot:input.targetRoot,sourceDeviceId:input.sourceDeviceId,targetDeviceId:input.targetDeviceId};
}

export function currentTruthB2MImportContext(input:{memoryRoot:string;stateHash:string;currentTruthRoot:string}): CurrentTruthAuthorityContext {
  return {path:"B2M_IMPORT",operationId:input.stateHash,memoryRoot:input.memoryRoot,stateHash:input.stateHash,currentTruthRoot:input.currentTruthRoot};
}

export function currentTruthAuthorityScope(context: CurrentTruthAuthorityContext): string {
  if(context.path === "BOOTSTRAP"){
    return ["bootstrap",context.memoryRoot??"_",context.sourceDeviceId??"_",context.targetDeviceId??"_",String(context.ordinal??-1),context.chunkHash??"_"].join(":");
  }
  if(context.path === "MEMORY_MERGE"){
    return ["merge",context.sourceRoot??"_",context.targetRoot??"_",context.sourceDeviceId??"_",context.targetDeviceId??"_",context.mergeId??"_"].join(":");
  }
  if(context.path === "B2M_IMPORT"){
    return ["b2m-import",context.memoryRoot??"_",context.stateHash??"_",context.currentTruthRoot??"_"].join(":");
  }
  const segments = [
    "current-truth",
    context.path,
    context.projectId ?? "_",
    context.operationId,
    context.memoryRoot ?? "_",
    context.mergeId ?? "_",
  ];
  return segments.join(":");
}

export function containsCurrentTruthWrite(records: readonly Record<string,unknown>[]): boolean {
  return records.some((record)=>record.status === "CURRENT");
}

export function currentTruthRecordsFromWrites(writes: Partial<Record<string,Array<{id:string;[key:string]:unknown}>>>): Array<{id:string;[key:string]:unknown}> {
  return (writes.truths ?? []).filter((record)=>record.status === "CURRENT");
}

export async function requireCurrentTruthAuthority(input:{
  truths: readonly TruthRecord[] | readonly Record<string,unknown>[];
  receipt?: R1AuthorityReceipt | null;
  context: CurrentTruthAuthorityContext;
  authoritySource?: R1AuthoritySource;
}): Promise<R1AuthorityReceipt|undefined> {
  if(!containsCurrentTruthWrite(input.truths as readonly Record<string,unknown>[])) return undefined;
  return requireVerifiedR1Allow(input.receipt,{
    action:R1_CURRENT_TRUTH_ACTION,
    scope:currentTruthAuthorityScope(input.context),
    minVersion:2,
    authoritySource:input.authoritySource,
  });
}

export async function requireCurrentTruthAuthorityForMutation(input:{
  writes: Partial<Record<string,Array<{id:string;[key:string]:unknown}>>>;
  receipt?: R1AuthorityReceipt | null;
  context: CurrentTruthAuthorityContext;
  authoritySource?: R1AuthoritySource;
}): Promise<R1AuthorityReceipt|undefined> {
  const truths=currentTruthRecordsFromWrites(input.writes);
  if(!truths.length)return undefined;
  return requireCurrentTruthAuthority({truths,receipt:input.receipt,context:input.context,authoritySource:input.authoritySource});
}
