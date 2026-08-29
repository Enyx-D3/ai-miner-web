import type { PersistentSearchDocument } from "./types";
import { indexTerms, normalizeText, sha256 } from "./identity";
import { planRetrieval } from "./retrievalRouter";

export const ASIF_READER_CORE_VERSION = "ASIF_READER_V9_BROWSER_CORE";
export const ASIF_READER_CACHE_VERSION = "ASIF_READER_VERIFIED_CACHE_V1";

export type ASIFReaderKind = "message" | "atom" | "truth";
export type ASIFEvidenceBudget = "TINY" | "BALANCED" | "DEEP";
export type ASIFReaderQueryPlan = {
  owner: "ASIF_READER";
  retrievalOwner: "RAPIDRETRIEVE";
  route: string;
  fallback?: string;
  budget: ASIFEvidenceBudget;
  termCap: number;
  candidateCap: number;
  resultCap: number;
  reason: string;
};

export type ASIFReaderAdapter<T> = {
  recentDocs(kind:ASIFReaderKind, limit:number, projectId?:string):Promise<PersistentSearchDocument[]>;
  docsForTerm(kind:ASIFReaderKind, term:string, limit:number, projectId?:string):Promise<PersistentSearchDocument[]>;
  hydrate(kind:ASIFReaderKind, ids:string[]):Promise<T[]>;
};

function budgetFor(limit:number, candidateCap:number):ASIFEvidenceBudget{
  if(limit<=32&&candidateCap<=192)return "TINY";
  if(limit<=96&&candidateCap<=320)return "BALANCED";
  return "DEEP";
}

export function planASIFReaderQuery(query:string, limit=256):ASIFReaderQueryPlan{
  const plan=planRetrieval(query);
  const resultCap=Math.max(1,Math.min(limit,256));
  return {
    owner:"ASIF_READER",
    retrievalOwner:"RAPIDRETRIEVE",
    route:plan.route,
    fallback:plan.fallback,
    budget:budgetFor(resultCap,plan.candidateCap),
    termCap:plan.route==="F_TEMPORAL_TRUTH"?14:12,
    candidateCap:Math.min(512,Math.max(resultCap,plan.candidateCap)),
    resultCap,
    reason:plan.reason,
  };
}

function compactQueryTerms(query:string, cap:number){
  return [...new Set(indexTerms(normalizeText(query),96).map((term)=>normalizeText(term).toLowerCase()).filter(Boolean))].slice(0,cap);
}

export async function runASIFReaderQuery<T>(adapter:ASIFReaderAdapter<T>,kind:ASIFReaderKind,query:string,limit=256,projectId?:string):Promise<{plan:ASIFReaderQueryPlan;records:T[];documentIds:string[];materializedDocumentCount:number}>{
  const q=normalizeText(query);const plan=planASIFReaderQuery(q,limit);const docs=new Map<string,{doc:PersistentSearchDocument;score:number}>();const terms=compactQueryTerms(q,plan.termCap);
  if(!terms.length){for(const doc of await adapter.recentDocs(kind,Math.max(64,plan.resultCap*2),projectId))docs.set(doc.recordId,{doc,score:1});}
  else{
    await Promise.all(terms.map(async(term)=>{
      const hits=await adapter.docsForTerm(kind,term,Math.max(48,Math.ceil(plan.candidateCap/Math.max(1,terms.length))),projectId);
      for(const doc of hits){const exact=q&&normalizeText(doc.text).toLowerCase().includes(q.toLowerCase());const currentBoost=kind==="truth"&&doc.status==="CURRENT"?2.5:0;const entry=docs.get(doc.recordId)??{doc,score:0};entry.score+=exact?4:1;entry.score+=currentBoost;docs.set(doc.recordId,entry);}
    }));
  }
  const selected=[...docs.values()].sort((a,b)=>b.score-a.score||(b.doc.createdAt??"").localeCompare(a.doc.createdAt??"")||a.doc.recordId.localeCompare(b.doc.recordId)).slice(0,plan.resultCap);
  const ids=selected.map((item)=>item.doc.recordId);const records=await adapter.hydrate(kind,ids);
  const byId=new Map((records as Array<{id?:string}>).map((item)=>[String(item.id??""),item]));
  return {plan,records:ids.map((id)=>byId.get(id)).filter(Boolean) as T[],documentIds:ids,materializedDocumentCount:ids.length};
}

export type ASIFVerifiedBlock = {id:string;conversationId:string;blockNumber:number;messageIds:string[];atomIds:string[];firstSequence:number;lastSequence:number;hash:string};
export async function verifyASIFEvidenceBlock(block:ASIFVerifiedBlock):Promise<boolean>{
  const expected=await sha256(JSON.stringify({conversationId:block.conversationId,blockNumber:block.blockNumber,messageIds:block.messageIds,atomIds:block.atomIds,firstSequence:block.firstSequence,lastSequence:block.lastSequence}));
  return expected===block.hash;
}
