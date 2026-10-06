import { normalizeText, tokenOverlap, words } from "./identity";
export type ClaimVerification = "EXACT" | "ENTAILED" | "PARTIAL" | "CONTRADICTED" | "UNSUPPORTED" | "UNKNOWN";
export type ClaimCandidate = { claimId: string; text: string; evidenceIds: string[] };
export type ClaimEvidence = { id: string; text: string; truthStatus?: string };
export type SemanticJudgeInput = { claim: ClaimCandidate; evidence: ClaimEvidence[] };
export type SemanticJudge = (input: SemanticJudgeInput) => Promise<{ verification: Exclude<ClaimVerification,"EXACT">; confidence: number; detail: string }>;
export type ClaimVerificationResult = { claimId: string; verification: ClaimVerification; confidence: number; evidenceIds: string[]; detail: string };

function splitClaims(answer: string): string[] {
  return answer.split(/(?<=[.!?])\s+|\n+/g).map((value)=>normalizeText(value)).filter((value)=>value.length >= 4);
}
export function decomposeClaims(answer: string): ClaimCandidate[] { return splitClaims(answer).map((text,index)=>({claimId:`claim_${String(index+1).padStart(3,"0")}`,text,evidenceIds:[]})); }
function exactSupport(claim:string,evidence:string){const c=normalizeText(claim).toLowerCase(),e=normalizeText(evidence).toLowerCase();return Boolean(c && (e===c || e.includes(c)));}
function lexicalSupport(claim:string,evidence:string){return tokenOverlap(words(claim),words(evidence));}

export async function verifyClaims(input:{claims:ClaimCandidate[];evidence:ClaimEvidence[];judge?:SemanticJudge}):Promise<ClaimVerificationResult[]> {
  const evidenceById=new Map(input.evidence.map((item)=>[item.id,item])); const out:ClaimVerificationResult[]=[];
  for(const claim of input.claims){
    const evidence=claim.evidenceIds.length?claim.evidenceIds.map((id)=>evidenceById.get(id)).filter((x):x is ClaimEvidence=>Boolean(x)):input.evidence;
    if(!evidence.length){out.push({claimId:claim.claimId,verification:"UNSUPPORTED",confidence:1,evidenceIds:[],detail:"No evidence was supplied for this claim."});continue;}
    const exact=evidence.find((item)=>exactSupport(claim.text,item.text));
    if(exact){out.push({claimId:claim.claimId,verification:"EXACT",confidence:1,evidenceIds:[exact.id],detail:"Claim text is directly contained in bounded evidence."});continue;}
    const best=[...evidence].map((item)=>({item,score:lexicalSupport(claim.text,item.text)})).sort((a,b)=>b.score-a.score)[0];
    if(!input.judge){out.push({claimId:claim.claimId,verification:best.score>=0.35?"UNKNOWN":"UNSUPPORTED",confidence:best.score,evidenceIds:best.score? [best.item.id]:[],detail:best.score>=0.35?"Evidence is lexically related, but semantic entailment has not been independently judged.":"No bounded evidence provides sufficient direct support."});continue;}
    const judged=await input.judge({claim,evidence});
    out.push({claimId:claim.claimId,verification:judged.verification,confidence:Math.max(0,Math.min(1,judged.confidence)),evidenceIds:evidence.map((item)=>item.id),detail:judged.detail});
  }
  return out;
}
export function semanticVerifierPass(results:ClaimVerificationResult[]):boolean{return results.length>0&&results.every((item)=>item.verification==="EXACT"||item.verification==="ENTAILED");}
