import { BRAIN2_REASONING_VERSION } from "./contracts";
import { canonicalId } from "./identity";
import type { DataboxRecord, ReasoningRequestRecord, ReasoningResultRecord } from "./types";

export async function buildReasoningRequest(input:{task:string;databox:DataboxRecord;effort?:ReasoningRequestRecord["effort"]}):Promise<ReasoningRequestRecord>{
  const effort=input.effort??"BALANCED";const caps={INSTANT:[1,1],QUICK:[2,2],BALANCED:[4,4],DEEP:[8,6],LONG_LOOP:[16,8],MAX_LOOP:[32,12]} as const;const [maxIterations,maxCandidates]=caps[effort];
  return{format:"B2_REASONING_REQUEST",version:1,requestId:await canonicalId(BRAIN2_REASONING_VERSION,input.databox.hash,input.task,effort),task:input.task,databoxId:input.databox.id,effort,thinkingAllowed:effort!=="INSTANT",maxIterations,maxCandidates,verificationPolicy:"DETERMINISTIC_THEN_JUDGE",memoryWritePolicy:"PROPOSE_ONLY"};
}

export function validateReasoningResult(request:ReasoningRequestRecord,databox:DataboxRecord,result:ReasoningResultRecord){
  const allowed=new Set(databox.evidence.map((item)=>item.id));const outside=[...new Set(result.evidenceIds)].filter((id)=>!allowed.has(id));const requestMatches=result.requestId===request.requestId;const writesAreProposals=request.memoryWritePolicy==="PROPOSE_ONLY";return{status:(requestMatches&&writesAreProposals&&!outside.length?"PASS":"FAIL") as "PASS"|"FAIL",requestMatches,writesAreProposals,outsideEvidenceIds:outside};
}
