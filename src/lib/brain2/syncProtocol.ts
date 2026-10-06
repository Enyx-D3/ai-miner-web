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

export function brain2MutationGapExpected(lastApplied: number, nextSequence: number): number | null {
  const cursor = Math.max(0, Math.trunc(lastApplied));
  const next = Math.trunc(nextSequence);
  if (next <= cursor) return null;
  const expected = cursor + 1;
  return next === expected ? null : expected;
}

function proofString(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

export function brain2TruthStateMaterial(truths: Array<Record<string, unknown>>): unknown[] {
  return [...truths]
    .map((truth) => [
      proofString(truth.id),
      proofString(truth.key),
      proofString(truth.projectId),
      proofString(truth.atomId),
      proofString(truth.status),
      proofString(truth.kind),
      proofString(truth.text),
      proofString(truth.canonicalSubject),
      proofString(truth.value),
      proofString(truth.scope),
      proofString(truth.supersedes),
      (Array.isArray(truth.evidenceAtomIds) ? truth.evidenceAtomIds : []).map(proofString).filter(Boolean).sort(),
    ])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}

export async function brain2TruthStateRoot(truths: Array<Record<string, unknown>>): Promise<string> {
  return sha256Hex(JSON.stringify(brain2TruthStateMaterial(truths)));
}

export function brain2MutationFrontier(mutations: Array<Record<string, unknown>>): Array<[string, number]> {
  const maxByOrigin = new Map<string, number>();
  for (const mutation of mutations) {
    const origin = proofString(mutation.originDeviceId ?? mutation.deviceId);
    const raw = Number(mutation.originSequence ?? mutation.sequence ?? 0);
    const sequence = Number.isFinite(raw) ? Math.trunc(raw) : 0;
    if (!origin || sequence < 1) continue;
    maxByOrigin.set(origin, Math.max(maxByOrigin.get(origin) ?? 0, sequence));
  }
  return [...maxByOrigin.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export async function brain2MutationFrontierRoot(mutations: Array<Record<string, unknown>>): Promise<string> {
  return sha256Hex(JSON.stringify(brain2MutationFrontier(mutations)));
}

const BRAIN2_MERGE_CLOCK_FIELDS = [
  "updatedAt",
  "createdAt",
  "occurredAt",
  "timestamp",
  "lastSeenAt",
  "completedAt",
] as const;

export function brain2MergeClock(record: Record<string, unknown>): string {
  for (const key of BRAIN2_MERGE_CLOCK_FIELDS) {
    const value = String(record[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}

export async function brain2MergeWinner<T extends Record<string, unknown>>(
  local: T,
  incoming: T,
): Promise<T> {
  const localJson = canonicalJson(local);
  const incomingJson = canonicalJson(incoming);
  if (localJson === incomingJson) return local;

  const localClock = brain2MergeClock(local);
  const incomingClock = brain2MergeClock(incoming);
  if (localClock !== incomingClock) {
    return incomingClock > localClock ? incoming : local;
  }

  const [localHash, incomingHash] = await Promise.all([
    sha256Hex(localJson),
    sha256Hex(incomingJson),
  ]);
  return incomingHash > localHash ? incoming : local;
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
