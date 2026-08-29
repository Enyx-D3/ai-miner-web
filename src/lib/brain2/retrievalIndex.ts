import type { AtomRecord, Brain2Snapshot, MessageRecord, TruthRecord } from "./types";
import { indexTerms, normalizeText } from "./identity";

type Kind = "message" | "atom" | "truth";
type RuntimeIndex = {
  version: number;
  terms: Record<Kind, Map<string, Set<string>>>;
  messageById: Map<string, MessageRecord>;
  atomById: Map<string, AtomRecord>;
  truthById: Map<string, TruthRecord>;
  atomsByMessage: Map<string, Set<string>>;
};
export type PersistentRetrievalProvider = (kind:Kind,query:string,limit:number,projectId?:string)=>Promise<Array<MessageRecord|AtomRecord|TruthRecord>>;
export type PersistentEvidenceExistsProvider = (ids:string[])=>Promise<Set<string>>;
let cache: RuntimeIndex | undefined;
let persistentProvider: PersistentRetrievalProvider | undefined;
let persistentExistsProvider: PersistentEvidenceExistsProvider | undefined;

export function configurePersistentRetrieval(provider?:PersistentRetrievalProvider, existsProvider?:PersistentEvidenceExistsProvider){
  persistentProvider=provider;persistentExistsProvider=existsProvider;
}
function addTerm(map: Map<string, Set<string>>, term: string, id: string) { const set = map.get(term) ?? new Set<string>(); set.add(id); map.set(term,set); }
function termsFor(text: string): string[] { return indexTerms(text, 96); }
export function buildRuntimeIndex(snapshot: Brain2Snapshot): RuntimeIndex {
  if (cache?.version === snapshot.version) return cache;
  const terms = { message: new Map<string,Set<string>>(), atom: new Map<string,Set<string>>(), truth: new Map<string,Set<string>>() };
  const messageById = new Map(snapshot.messages.map((item)=>[item.id,item]));
  const atomById = new Map(snapshot.atoms.map((item)=>[item.id,item]));
  const truthById = new Map(snapshot.truths.map((item)=>[item.id,item]));
  const atomsByMessage = new Map<string,Set<string>>();
  for (const message of snapshot.messages) for (const term of termsFor(message.text)) addTerm(terms.message,term,message.id);
  for (const atom of snapshot.atoms) { for (const term of [...new Set([...atom.keywords, ...termsFor(atom.text)])]) addTerm(terms.atom,term,atom.id); const set = atomsByMessage.get(atom.messageId) ?? new Set<string>(); set.add(atom.id); atomsByMessage.set(atom.messageId,set); }
  for (const truth of snapshot.truths) for (const term of termsFor(truth.text)) addTerm(terms.truth,term,truth.id);
  cache = { version: snapshot.version, terms, messageById, atomById, truthById, atomsByMessage };
  return cache;
}
function candidateIds(map: Map<string,Set<string>>, query: string, limit=256): string[] | undefined {
  const queryTerms = termsFor(query); if (!queryTerms.length) return undefined;
  const hits = new Map<string,number>();
  for (const term of queryTerms) for (const id of map.get(term) ?? []) hits.set(id,(hits.get(id)??0)+1);
  return [...hits.entries()].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,Math.max(1,limit)).map(([id])=>id);
}
export function indexedMessages(snapshot: Brain2Snapshot, query: string, limit=256): MessageRecord[] { const q=normalizeText(query).toLowerCase(); if(!q)return snapshot.messages.slice(-limit); const index=buildRuntimeIndex(snapshot); const ids=candidateIds(index.terms.message,q,limit); if(!ids)return snapshot.messages.filter((item)=>item.text.toLowerCase().includes(q)).slice(0,limit); return ids.map((id)=>index.messageById.get(id)).filter((item):item is MessageRecord=>Boolean(item)); }
export function indexedTruths(snapshot: Brain2Snapshot, query: string, limit=256): TruthRecord[] { const q=normalizeText(query).toLowerCase(); if(!q)return snapshot.truths.slice(-limit); const index=buildRuntimeIndex(snapshot); const ids=candidateIds(index.terms.truth,q,limit); if(!ids)return snapshot.truths.filter((item)=>item.text.toLowerCase().includes(q)).slice(0,limit); return ids.map((id)=>index.truthById.get(id)).filter((item):item is TruthRecord=>Boolean(item)); }
export function indexedAtoms(snapshot: Brain2Snapshot, query: string, limit=256): AtomRecord[] { const q=normalizeText(query).toLowerCase(); if(!q)return snapshot.atoms.slice(-limit); const index=buildRuntimeIndex(snapshot); const ids=candidateIds(index.terms.atom,q,limit); if(!ids)return snapshot.atoms.filter((item)=>item.text.toLowerCase().includes(q)).slice(0,limit); return ids.map((id)=>index.atomById.get(id)).filter((item):item is AtomRecord=>Boolean(item)); }

async function persistentOrHot<K extends Kind>(kind:K,snapshot:Brain2Snapshot,query:string,limit:number,projectId?:string):Promise<Array<MessageRecord|AtomRecord|TruthRecord>> {
  if(persistentProvider){
    try{const results=await persistentProvider(kind,query,limit,projectId);if(results.length||normalizeText(query))return results;}catch{/* bounded hot fallback */}
  }
  if(kind==="message")return indexedMessages(snapshot,query,limit).filter((item)=>!projectId||snapshot.conversations.find((c)=>c.id===item.conversationId)?.projectId===projectId);
  if(kind==="atom")return indexedAtoms(snapshot,query,limit).filter((item)=>!projectId||item.projectId===projectId);
  return indexedTruths(snapshot,query,limit).filter((item)=>!projectId||item.projectId===projectId);
}
export async function indexedMessagesAsync(snapshot:Brain2Snapshot,query:string,limit=256,projectId?:string){return await persistentOrHot("message",snapshot,query,limit,projectId) as MessageRecord[];}
export async function indexedAtomsAsync(snapshot:Brain2Snapshot,query:string,limit=256,projectId?:string){return await persistentOrHot("atom",snapshot,query,limit,projectId) as AtomRecord[];}
export async function indexedTruthsAsync(snapshot:Brain2Snapshot,query:string,limit=256,projectId?:string){return await persistentOrHot("truth",snapshot,query,limit,projectId) as TruthRecord[];}
export async function persistentEvidenceExists(ids:string[]):Promise<Set<string>>{return persistentExistsProvider?persistentExistsProvider(ids):new Set<string>();}
export function messageHasAtom(snapshot: Brain2Snapshot, messageId: string): boolean { return (buildRuntimeIndex(snapshot).atomsByMessage.get(messageId)?.size ?? 0) > 0; }
export function invalidateRuntimeIndex() { cache = undefined; }
