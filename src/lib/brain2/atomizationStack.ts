import { indexTerms, normalizeText } from "./identity";

export const BRAIN2_ATOMIZATION_STACK_VERSION = "B2_ATOM_STACK_G_F_I_B250_V1";
export const B250_TOKEN_CAP = 250;
export const I_STYLE_SUFFICIENCY_THRESHOLD = 0.72;

export type AtomContextSufficiency = {
  score:number;
  state:"SUFFICIENT"|"AMBIGUOUS"|"INSUFFICIENT";
  queryCoverage:number;
  evidenceCount:number;
  reasons:string[];
};

function lexicalTokens(text:string):{token:string;start:number;end:number}[]{
  const out:{token:string;start:number;end:number}[]=[];
  const re=/\S+/g; let m:RegExpExecArray|null;
  while((m=re.exec(text))) out.push({token:m[0],start:m.index,end:m.index+m[0].length});
  return out;
}

export function buildB250LocalChunk(text:string,anchorStart=0,anchorEnd=anchorStart,cap=B250_TOKEN_CAP){
  const cleaned=normalizeText(text); if(!cleaned)return{text:"",sourceStart:0,sourceEnd:0,tokenCount:0};
  const tokens=lexicalTokens(cleaned); if(tokens.length<=cap)return{text:cleaned,sourceStart:0,sourceEnd:cleaned.length,tokenCount:tokens.length};
  const anchor=Math.max(0,Math.min(cleaned.length,Math.floor((anchorStart+Math.max(anchorStart,anchorEnd))/2)));
  let center=tokens.findIndex((t)=>t.start<=anchor&&t.end>=anchor);
  if(center<0){center=tokens.findIndex((t)=>t.start>=anchor); if(center<0)center=tokens.length-1;}
  let left=Math.max(0,center-Math.floor(cap/2)); let right=Math.min(tokens.length,left+cap); left=Math.max(0,right-cap);
  const sourceStart=tokens[left].start, sourceEnd=tokens[right-1].end;
  return{text:cleaned.slice(sourceStart,sourceEnd),sourceStart,sourceEnd,tokenCount:right-left};
}

export function intrinsicAtomSufficiency(text:string,subject:string,value?:string,relationSafe=true){
  const words=lexicalTokens(text).length; let score=.42;
  if(subject&&normalizeText(subject).length>=3)score+=.16;
  if(value)score+=.12;
  if(words>=6)score+=.08;
  if(words>=12)score+=.06;
  if(relationSafe)score+=.08;
  if(/\b(if|unless|because|therefore|due to|step|first|then|finally)\b/i.test(text))score+=.04;
  if(words<4)score-=.2;
  return Math.max(0,Math.min(1,score));
}

export function assessAtomContextSufficiency(input:{query:string;evidence:Array<{text:string;score:number;type:string;truthStatus?:string;confidence?:number;intrinsicSufficiency?:number}>}) : AtomContextSufficiency {
  const qTerms=[...new Set(indexTerms(normalizeText(input.query),32).map((v)=>v.toLowerCase()))];
  const evidence=input.evidence.slice(0,12); const covered=new Set<string>();
  for(const item of evidence){const normalized=normalizeText(item.text).toLowerCase();for(const term of qTerms)if(normalized.includes(term))covered.add(term);}
  const queryCoverage=qTerms.length?covered.size/qTerms.length:1;
  const top=evidence[0]; const evidenceCount=evidence.length;
  const currentTruth=evidence.some((e)=>e.type==="truth"&&e.truthStatus==="CURRENT");
  const conflict=evidence.some((e)=>e.type==="truth"&&(e.truthStatus==="CONFLICTING"||e.truthStatus==="PENDING_REVIEW"));
  const semanticStrength=evidence.length?evidence.slice(0,4).reduce((a,e)=>a+Math.max(0,Math.min(1,e.intrinsicSufficiency??e.confidence??Math.min(1,e.score/6))),0)/Math.min(4,evidence.length):0;
  const score=Math.max(0,Math.min(1,queryCoverage*.46+semanticStrength*.28+Math.min(1,evidenceCount/4)*.14+(currentTruth?.08:0)+(top&&top.score>=4?.08:0)-(conflict?.08:0)));
  const reasons:string[]=[];
  if(queryCoverage<.67)reasons.push("query_terms_undercovered");
  if(evidenceCount<2)reasons.push("too_few_atom_evidence_units");
  if(semanticStrength<.65)reasons.push("atom_context_thin");
  if(conflict)reasons.push("conflict_requires_local_context");
  if(currentTruth)reasons.push("current_truth_present");
  const state=score>=I_STYLE_SUFFICIENCY_THRESHOLD?"SUFFICIENT":score>=.5?"AMBIGUOUS":"INSUFFICIENT";
  return{score,state,queryCoverage,evidenceCount,reasons};
}
