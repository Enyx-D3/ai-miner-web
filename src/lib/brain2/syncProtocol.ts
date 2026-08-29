import { sha256 } from "./identity";
import type { MutationDeltaPayload, MutationRecord } from "./types";

export const BRAIN2_SYNC_PROTOCOL_VERSION = 2;
export const BRAIN2_SYNC_CHANNEL = "brain2-sync";
export const BRAIN2_SYNC_BATCH_LIMIT = 128;
export const BRAIN2_SYNC_BOOTSTRAP_CHUNK_BYTES = 48 * 1024;

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(obj[key])}`).join(",")}}`;
}

export async function sha256Hex(value: string): Promise<string> {
  return sha256(value);
}

export async function hashPayload(payload: MutationDeltaPayload): Promise<string> {
  return sha256Hex(canonicalJson(payload));
}

export async function hashEntity(value: unknown): Promise<string> {
  return sha256Hex(canonicalJson(value));
}

export async function hashMutation(input: Pick<MutationRecord,"protocolVersion"|"memoryRoot"|"originDeviceId"|"originSequence"|"type"|"entityType"|"entityId"|"payloadHash"|"parentMutationIds">): Promise<string> {
  return sha256Hex([
    input.protocolVersion ?? BRAIN2_SYNC_PROTOCOL_VERSION,
    input.memoryRoot ?? "",
    input.originDeviceId ?? "",
    input.originSequence ?? 0,
    input.type,
    input.entityType,
    input.entityId,
    input.payloadHash ?? "",
    ...(input.parentMutationIds ?? []),
  ].join("|"));
}

export async function hashBootstrapChunk(memoryRoot:string,table:string,ordinal:number,records:unknown[]):Promise<string>{
  return sha256Hex(canonicalJson({memoryRoot,table,ordinal,records}));
}

export async function hashMutationManifest(mutations: MutationRecord[]): Promise<string> {
  return sha256Hex([...mutations].sort((a,b)=>(a.originSequence??a.sequence??0)-(b.originSequence??b.sequence??0)).map((item)=>`${item.originSequence??item.sequence??0}:${item.id}:${item.payloadHash??""}`).join("|"));
}

export async function verifyMutationEnvelope(mutation: MutationRecord): Promise<{ok:boolean;reason?:string}> {
  if (!mutation.payload || !mutation.payloadHash || !mutation.memoryRoot || !mutation.originDeviceId || !mutation.originSequence) {
    return { ok:false, reason:"mutation is lineage-only or missing replication fields" };
  }
  const payloadHash = await hashPayload(mutation.payload);
  if (payloadHash !== mutation.payloadHash) return { ok:false, reason:"payload hash mismatch" };
  const hash = await hashMutation(mutation);
  if (hash !== mutation.hash) return { ok:false, reason:"mutation envelope hash mismatch" };
  return { ok:true };
}

export function packBootstrapRecords<T>(records:T[], maxBytes=BRAIN2_SYNC_BOOTSTRAP_CHUNK_BYTES):T[][] {
  const chunks:T[][]=[]; let current:T[]=[]; let bytes=2;
  for(const record of records){
    const size=new TextEncoder().encode(canonicalJson(record)).byteLength+1;
    if(current.length && bytes+size>maxBytes){chunks.push(current);current=[];bytes=2;}
    current.push(record);bytes+=size;
  }
  if(current.length)chunks.push(current);
  return chunks;
}
