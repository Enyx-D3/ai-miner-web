import { canonicalId, sha256 } from "./identity";
import type { Brain2Snapshot, DataboxEvidence, DataboxRecord } from "./types";

export async function buildDatabox(input:{snapshot:Brain2Snapshot;query:string;projectId?:string;retrievalRoute:string;evidence:DataboxEvidence[]}):Promise<DataboxRecord>{
  const {snapshot,query,projectId,retrievalRoute,evidence}=input;
  const createdAt=new Date().toISOString();
  const evidenceHash=await sha256(JSON.stringify(evidence.map((item)=>[item.id,item.type,item.text,item.projectId,item.sourceId,item.conversationId,item.messageId,item.blockId,item.truthStatus,item.sourceStart,item.sourceEnd,item.createdAt])));
  const sourceCount=new Set(evidence.map((item)=>item.sourceId).filter(Boolean)).size;
  const evidenceIds=new Set(evidence.map((item)=>item.id));
  const currentTruthCount=evidence.filter((item)=>item.type==="truth"&&item.truthStatus==="CURRENT").length;
  const explicitConflictCount=evidence.filter((item)=>item.type==="truth"&&item.truthStatus==="CONFLICTING").length;
  const hotConflictCount=snapshot.truths.filter((truth)=>truth.status==="CONFLICTING"&&(evidenceIds.has(truth.id)||(truth.evidenceAtomIds??[]).some((id)=>evidenceIds.has(id)))).length;
  const conflictCount=Math.max(explicitConflictCount,hotConflictCount);
  const evidenceBlockCount=new Set(evidence.map((item)=>item.blockId).filter(Boolean)).size;
  const id=await canonicalId("databox",snapshot.memoryRoot,query,projectId,retrievalRoute,evidenceHash);
  const hash=await sha256(JSON.stringify({id,query,projectId,memoryRoot:snapshot.memoryRoot,retrievalRoute,evidenceHash,sourceCount,currentTruthCount,conflictCount}));
  return {id,format:"B2DATABOX",version:1,query,projectId,memoryRoot:snapshot.memoryRoot,retrievalRoute,evidence,evidenceHash,sourceCount,evidenceBlockCount,currentTruthCount,conflictCount,createdAt,hash};
}
