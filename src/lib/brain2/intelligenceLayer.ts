import { canonicalId, normalizeText, sha256 } from './identity';
import { brain2MRSError, brain2MRSLog } from './mrsDebug';
import type { AtomRecord, DecisionRecord, ExperimentRecord, PatternRecord, ProjectRecord, TickRecord, TruthRecord } from './types';
import { BRAIN2_MRS_REVIEW_CANDIDATE_LIMIT, getBrain2RuntimeAvailabilityHint, reviewBrain2Intelligence } from './transformersRuntime';

export const BRAIN2_INTELLIGENCE_VERSION = 'B2_INTELLIGENCE_V1';
const BRAIN2_PROJECT_INTELLIGENCE_RULE_VERSION = 'B2_PROJECT_INTELLIGENCE_SOFT_GATE_V4';

export type IntelligenceKind = 'TRUTH'|'IMPORTANT_IDEA'|'NOVELTY'|'CONNECTION'|'CHANGE'|'OPEN_QUESTION';
export type IntelligenceVerification = 'DETERMINISTIC_VERIFIED'|'MRS_VERIFIED'|'MRS_PENDING'|'REJECTED';
export type MRSRuntimeState = 'CONNECTED'|'NOT_CONFIGURED'|'ERROR'|'DEFERRED'|'NOT_REQUIRED';

export type IntelligenceItem = {
  id:string; projectId:string; kind:IntelligenceKind; title:string; statement:string;
  evidenceIds:string[]; truthConfidence:number; importance:number; novelty:number;
  verification:IntelligenceVerification; rationale:string; createdAt?:string;
};

export type IntelligenceProjection = {
  version:string; projectId:string; generatedAt:string; mrsRuntime:MRSRuntimeState;
  currentTruth:IntelligenceItem[]; importantIdeas:IntelligenceItem[]; changes:IntelligenceItem[];
  connections:IntelligenceItem[]; openQuestions:IntelligenceItem[]; unresolved:IntelligenceItem[];
  unresolvedTotal?:number;
  mrsReviewedCandidateIds?:string[];
};

export type IntelligenceInput = {
  project:ProjectRecord; atoms:AtomRecord[]; truths:TruthRecord[]; decisions:DecisionRecord[];
  patterns:PatternRecord[]; experiments:ExperimentRecord[]; ticks:TickRecord[];
};

type MRSProposal = {candidateId:string;importance?:number;novelty?:number;classification?:IntelligenceKind;rationale?:string;evidenceIds?:string[]};
type MRSResult = {state:MRSRuntimeState;proposals:MRSProposal[];reviewedCandidateIds?:string[];priorReviewedCandidateIds?:string[]};
type AtomScoringContext = {
  atomById: Map<string, AtomRecord>;
  keywordFrequency: Map<string, number>;
  conceptFrequencyByAtomId: Map<string, number>;
  noveltyByAtomId: Map<string, number>;
};

function clamp(v:number){return Math.max(0,Math.min(1,v));}
function recency(value?:string){if(!value)return .35;const t=Date.parse(value);if(!Number.isFinite(t))return .35;const days=(Date.now()-t)/86400000;return clamp(1-days/730);}
function normalizedValue(record:{value?:string}){return normalizeText(record.value ?? "").toLowerCase();}
function evidenceExists(ids:string[], input:IntelligenceInput){const all=new Set<string>([
  ...input.atoms.map(x=>x.id),...input.truths.map(x=>x.id),...input.decisions.map(x=>x.id),
  ...input.patterns.map(x=>x.id),...input.experiments.map(x=>x.id),...input.ticks.map(x=>x.id),
]);return ids.length>0&&ids.every(id=>all.has(id));}
function normalizeForPromotion(value:string){return normalizeText(value).replace(/\s+/g," ").trim();}
function isRequestLikeText(value:string){
  const text=normalizeForPromotion(value);
  return /^(?:i need|need |please |can you|could you|would you|help me|make |write |create |generate |give me|tell me|show me|explain |summarize |draft |build )/i.test(text)
    || /\b(?:for me|more details|full information|long article|article on|document on)\b/i.test(text);
}
function hasStructuredAssertionShape(value:string){
  const text=normalizeForPromotion(value);
  if(!text)return false;
  if(/\b(?:is|are|was|were|has|have|uses|requires|means|contains|supports|blocks|fails|works|equals)\b/i.test(text))return true;
  if(/[:=]\s*\S+/.test(text))return true;
  if(/\b\d+(?:\.\d+)?\b/.test(text))return true;
  if(/\b(?:current|status|version|limit|budget|error|issue|problem|state|runtime|backend|model)\b/i.test(text))return true;
  return false;
}
function hasGroundedTruthShape(text:string,source?:{value?:string;scope?:string;semanticSubtype?:string},evidenceCount=0){
  if(source?.value?.trim().length)return true;
  if(source?.scope?.trim().length)return true;
  if(source?.semanticSubtype?.trim().length)return true;
  if(evidenceCount>=2)return true;
  return hasStructuredAssertionShape(text);
}
function isOperationallyThinFact(atom:AtomRecord){
  if(atom.kind!=='fact')return false;
  const text=normalizeForPromotion(atom.text);
  if(/\bversion\b/i.test(text))return true;
  if(/\bstatus\b/i.test(text) && !/\b(?:fails|blocks|requires|supports|changed?|updated?)\b/i.test(text))return true;
  if(Boolean(atom.value) && atom.keywords.length<=3 && !hasGroundedTruthShape(atom.text,atom,atom.truthStatus==='CURRENT'?2:0))return true;
  return false;
}
function isUIPromotionJunk(value:string){
  const text=normalizeForPromotion(value);
  if(!text)return true;
  if(text.length<10)return true;
  if(/\bmust be treated as\s+\d+\b/i.test(text))return true;
  if(/\bmust be treated as\s+(?:on|between|ambiguous|true|false)\b/i.test(text)&&text.split(" ").length<12)return true;
  if(/^```/.test(text)||/^`{1,3}\s*$/.test(text))return true;
  if(/<[^>]+>/.test(text)&&/\b(?:class|meta-data|android:name|div|span|image|svg|import|export|const)\b/i.test(text))return true;
  if(/this block is not supported on your current device yet/i.test(text))return true;
  if(/browser cache is not available in this environment/i.test(text))return true;
  if(/brain2 mrs could not activate/i.test(text))return true;
  if(/retry after checking browser network\/storage\/console/i.test(text))return true;
  if(/\b(?:download|restore|enable)\s+local\s+mrs\b/i.test(text))return true;
  if(/\bbrain2 ai runtime\b/i.test(text))return true;
  if(/\bmodel download progress\b/i.test(text))return true;
  const alphaChars=text.replace(/[^a-z]/gi,"").length;
  if(alphaChars<6)return true;
  return false;
}
function isWeakStandaloneTruthText(value:string,options:{allowStructuredRequest?:boolean}={}){
  const text=normalizeForPromotion(value);
  if(isRequestLikeText(text)&&!(options.allowStructuredRequest&&hasStructuredAssertionShape(text)))return true;
  if(text.split(" ").length<4)return true;
  if(/^(?:yes|no|ok|okay|thanks|thank you|done|sure)\b/i.test(text))return true;
  return false;
}
function strictTruthRule(atom:AtomRecord){
  return atom.ruleTrace?.filter((item)=>item.startsWith("strict_truth:")&&!item.endsWith(":eligible")&&!item.endsWith(":residual")).at(-1)?.replace(/^strict_truth:/,"");
}
function strictTruthEligible(atom:AtomRecord){return atom.ruleTrace?.includes("strict_truth:eligible")===true;}
function assistantBlocked(atom:AtomRecord){return strictTruthRule(atom)==="assistant_or_unknown_author";}
const MRS_BLOCKED_RULES=new Set([
  "assistant_or_unknown_author",
  "question",
  "code_or_log",
  "labelled_answer",
  "quoted_text",
  "meta_task",
  "chat_task",
  "anaphora",
  "duplicate_claim",
  "transient_observation",
  "speculation",
  "invalid_source",
  "invalid_timestamp",
  "empty_candidate",
]);
const DETERMINISTIC_PROJECT_IDEA_RULES=new Set([
  "explicit_negative_constraint",
  "explicit_first_person_requirement",
  "explicit_preference",
  "deterministic_priority_decision",
  "explicit_architecture_decision",
  "bounded_project_requirement",
  "explicit_project_config",
  "calibrated_short_component_directive",
  "explicit_qa_selection",
  "corroborated_exact_config",
]);
function hasProjectDirectiveShape(value:string){
  const text=normalizeForPromotion(value);
  return /\b(i|we)\s+(want|need|prefer|must|should)\b/i.test(text)
    || /\b(should|must|needs?\s+to|has\s+to|have\s+to|do not|don't|dont|never|without manual|no manual|keep|use|switch|replace|remove|make|move|stay|stick to|preserve|protect|disable|enable)\b/i.test(text);
}
function hasDurableProjectSignal(atom:AtomRecord){
  const text=normalizeForPromotion(`${atom.subject??""} ${atom.canonicalSubject??""} ${atom.value??""} ${atom.scope??""} ${(atom.keywords??[]).join(" ")} ${atom.text}`).toLowerCase();
  return /\b(app|webapp|web app|product|project|architecture|runtime|model|backend|provider|adapter|engine|cache|worker|browser|wasm|webgpu|transformers?|mrs|dvi|brain2|life wiki|current truth|truth extraction|deterministic|import|export|ui|page|screen|responsiveness|performance|freeze|storage|database|indexeddb|json|console|automatic|auto|session)\b/i.test(text);
}
function deterministicProjectIdea(atom:AtomRecord){
  if(assistantBlocked(atom))return false;
  if(!promotableAtom(atom))return false;
  const rule=strictTruthRule(atom);
  if(rule&&DETERMINISTIC_PROJECT_IDEA_RULES.has(rule))return true;
  if(strictTruthEligible(atom)&&["decision","constraint","fact"].includes(atom.kind))return true;
  if(atom.kind==="idea"&&hasProjectDirectiveShape(atom.text)&&hasDurableProjectSignal(atom))return true;
  if(atom.ruleTrace?.includes("strict_truth:residual")&&["decision","constraint"].includes(atom.kind)&&hasProjectDirectiveShape(atom.text)&&hasDurableProjectSignal(atom)&&hasGroundedTruthShape(atom.text,atom,0))return true;
  return false;
}
function mrsReviewableProjectIdea(atom:AtomRecord,importance:number){
  if(!promotableAtom(atom))return false;
  const rule=strictTruthRule(atom);
  if(rule&&MRS_BLOCKED_RULES.has(rule))return false;
  if(deterministicProjectIdea(atom))return false;
  if(["decision","constraint"].includes(atom.kind)&&hasProjectDirectiveShape(atom.text)&&hasDurableProjectSignal(atom))return true;
  if(atom.kind==="idea"&&importance>=.7&&hasDurableProjectSignal(atom)&&hasGroundedTruthShape(atom.text,atom,0))return true;
  if(atom.kind==="fact"&&importance>=.74&&hasDurableProjectSignal(atom)&&hasGroundedTruthShape(atom.text,atom,1)&&!isOperationallyThinFact(atom))return true;
  return false;
}
function promotableAtom(atom:AtomRecord){
  const grounded=hasGroundedTruthShape(atom.text,atom,atom.truthStatus==='CURRENT'?2:0);
  return !isUIPromotionJunk(atom.text) && !isWeakStandaloneTruthText(atom.text,{allowStructuredRequest:grounded});
}
function promotableTruth(truth:TruthRecord,input:IntelligenceInput){
  const atomById=new Map(input.atoms.map((atom)=>[atom.id,atom]));
  const evidenceAtoms=(truth.evidenceAtomIds??[]).map((id)=>atomById.get(id)).filter((atom):atom is AtomRecord=>Boolean(atom));
  const grounded=hasGroundedTruthShape(truth.text,truth,evidenceAtoms.length);
  if(isUIPromotionJunk(truth.text) || isWeakStandaloneTruthText(truth.text,{allowStructuredRequest:grounded}))return false;
  if(evidenceAtoms.some((atom)=>!promotableAtom(atom)))return false;
  return true;
}
function duplicatesCurrentTruth(atom:AtomRecord,input:IntelligenceInput){
  if(atom.kind!=='fact' || atom.truthStatus!=='CURRENT')return false;
  const atomText=normalizeForPromotion(atom.text);
  const atomSubject=normalizeText(atom.canonicalSubject??atom.subject??"").toLowerCase();
  const atomValue=normalizedValue(atom);
  return input.truths.some((truth)=>truth.status==='CURRENT'&&(
    normalizeForPromotion(truth.text)===atomText
    || (atomSubject && normalizeText(truth.canonicalSubject??"").toLowerCase()===atomSubject && atomValue && normalizedValue(truth)===atomValue)
  ));
}
function buildAtomScoringContext(input:IntelligenceInput):AtomScoringContext{
  const atomById=new Map(input.atoms.map((atom)=>[atom.id,atom]));
  const keywordFrequency=new Map<string,number>();
  const conceptFrequencyByAtomId=new Map<string,number>();
  const noveltyByAtomId=new Map<string,number>();
  for(const atom of input.atoms){
    for(const keyword of new Set(atom.keywords.slice(0,8).map((entry)=>entry.trim().toLowerCase()).filter(Boolean))){
      keywordFrequency.set(keyword,(keywordFrequency.get(keyword)??0)+1);
    }
  }
  const projectScale=Math.max(1,input.atoms.length-1);
  for(const atom of input.atoms){
    const keywords=[...new Set(atom.keywords.slice(0,7).map((entry)=>entry.trim().toLowerCase()).filter(Boolean))];
    if(!keywords.length){
      conceptFrequencyByAtomId.set(atom.id,0);
      noveltyByAtomId.set(atom.id,.25);
      continue;
    }
    const overlapMass=keywords.reduce((sum,keyword)=>sum+Math.max(0,(keywordFrequency.get(keyword)??1)-1),0);
    const normalizedMass=overlapMass/(keywords.length*projectScale);
    conceptFrequencyByAtomId.set(atom.id,clamp(normalizedMass*8));
    noveltyByAtomId.set(atom.id,clamp(1-Math.min(1,normalizedMass*6)));
  }
  return {atomById,keywordFrequency,conceptFrequencyByAtomId,noveltyByAtomId};
}
function truthPromotionScore(truth:TruthRecord,input:IntelligenceInput,context:AtomScoringContext){
  const evidenceAtoms=(truth.evidenceAtomIds??[]).map((id)=>context.atomById.get(id)).filter((atom):atom is AtomRecord=>Boolean(atom));
  const sourceAtom=evidenceAtoms[0]??context.atomById.get(truth.atomId);
  const grounded=hasGroundedTruthShape(truth.text,sourceAtom??truth,evidenceAtoms.length);
  const requestPenalty=(isRequestLikeText(truth.text)||evidenceAtoms.some((atom)=>isRequestLikeText(atom.text))) ? .32 : 0;
  const weakPenalty=isWeakStandaloneTruthText(truth.text,{allowStructuredRequest:grounded}) ? .22 : 0;
  const evidenceBoost=Math.min(.18,evidenceAtoms.length*.04);
  const kindBoost=truth.kind==="decision" ? .14 : truth.kind==="constraint" ? .1 : truth.kind==="fact" ? .06 : 0;
  const confidenceBoost=.22*truth.confidence;
  const recencyBoost=.08*recency(truth.updatedAt);
  const structuredBoost=grounded ? .08 : 0;
  const requestMitigation=grounded ? .2 : 0;
  return clamp(.22+kindBoost+confidenceBoost+recencyBoost+evidenceBoost+structuredBoost-Math.max(0,requestPenalty-requestMitigation)-weakPenalty);
}
function ideaImportance(atom:AtomRecord,input:IntelligenceInput,context:AtomScoringContext){
  const kindBoost=atom.kind==='idea' ? .2 : atom.kind==='decision' ? .16 : atom.kind==='constraint' ? .1 : 0;
  const truthBoost=atom.truthStatus==='CURRENT' ? .1 : atom.truthStatus==='CONFLICTING' ? .05 : 0;
  const connection=context.conceptFrequencyByAtomId.get(atom.id)??0;
  const scope=clamp((atom.keywords.length||1)/8);
  const grounded=hasGroundedTruthShape(atom.text,atom,atom.truthStatus==='CURRENT'?2:0);
  const requestPenalty=isRequestLikeText(atom.text) ? .24 : 0;
  const weakPenalty=isWeakStandaloneTruthText(atom.text,{allowStructuredRequest:grounded}) ? .18 : 0;
  const thinFactPenalty=isOperationallyThinFact(atom) ? .22 : 0;
  const structuredBoost=grounded ? .06 : 0;
  const requestMitigation=grounded ? .14 : 0;
  return clamp(.14+kindBoost+truthBoost+.18*atom.confidence+.12*recency(atom.createdAt)+.16*connection+.06*scope+structuredBoost-Math.max(0,requestPenalty-requestMitigation)-weakPenalty-thinFactPenalty);
}
function novelty(atom:AtomRecord,_input:IntelligenceInput,context:AtomScoringContext){return context.noveltyByAtomId.get(atom.id)??.25;}
function sentenceCase(value:string){const text=normalizeForPromotion(value).replace(/^[\s:;,.]+|[\s:;,.]+$/g,"");return text?`${text.charAt(0).toUpperCase()}${text.slice(1)}`:"";}
function clipDisplayText(value:string,limit=260){const text=normalizeForPromotion(value).replace(/```[\s\S]*?```/g," ").replace(/`([^`]+)`/g,"$1").replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").replace(/https?:\/\/\S+/gi,"").replace(/\s+/g," ").trim();if(text.length<=limit)return text;const clipped=text.slice(0,limit);return `${clipped.slice(0,Math.max(120,clipped.lastIndexOf(" ")))}...`;}
function readableScope(scope?:string){const text=scope?normalizeForPromotion(scope):"";return text?` (${text})`:"";}
function readableValue(value?:string){const text=value?normalizeForPromotion(value).replace(/[.]+$/,""):"";return text&&text.length<=140?text:"";}
function readableAtomStatement(atom:AtomRecord){
  const subject=sentenceCase(atom.subject||atom.canonicalSubject||"");
  const value=readableValue(atom.value);
  if(subject&&value){
    if(atom.kind==="decision")return `Decision: ${subject} is ${value}${readableScope(atom.scope)}.`;
    if(atom.kind==="constraint")return `Constraint: ${subject} must be treated as ${value}${readableScope(atom.scope)}.`;
    if(atom.kind==="task")return `Task: ${subject} needs ${value}${readableScope(atom.scope)}.`;
    return `${subject} is ${value}${readableScope(atom.scope)}.`;
  }
  return clipDisplayText(atom.text);
}
function readableTruthStatement(truth:TruthRecord){
  const subject=sentenceCase(truth.canonicalSubject||"");
  const value=readableValue(truth.value);
  if(subject&&value){
    const prefix=truth.kind==="decision"?"Decision":truth.kind==="constraint"?"Constraint":"Current truth";
    return `${prefix}: ${subject} is ${value}${readableScope(truth.scope)}.`;
  }
  return clipDisplayText(truth.text);
}
function readableTitle(kind:IntelligenceKind,source:{subject?:string;canonicalSubject?:string;kind?:string;semanticSubtype?:string;text:string}){
  const subject=sentenceCase(source.subject||source.canonicalSubject||"");
  if(subject&&subject.length>=4)return subject.slice(0,90);
  const text=clipDisplayText(source.text,96).replace(/[.?!]+$/,"");
  if(text)return text;
  return kind.replaceAll("_"," ").toLowerCase();
}

async function item(input:IntelligenceInput, kind:IntelligenceKind, title:string, statement:string, evidenceIds:string[], values:{truthConfidence:number;importance:number;novelty:number;rationale:string;createdAt?:string;verification?:IntelligenceVerification}) : Promise<IntelligenceItem>{
  const id=await canonicalId(BRAIN2_INTELLIGENCE_VERSION,input.project.id,kind,normalizeText(statement),...evidenceIds.sort());
  return{id,projectId:input.project.id,kind,title,statement,evidenceIds,truthConfidence:clamp(values.truthConfidence),importance:clamp(values.importance),novelty:clamp(values.novelty),verification:values.verification??(evidenceExists(evidenceIds,input)?'DETERMINISTIC_VERIFIED':'MRS_PENDING'),rationale:values.rationale,createdAt:values.createdAt};
}

async function discover(input:IntelligenceInput):Promise<IntelligenceItem[]>{const out:IntelligenceItem[]=[];const context=buildAtomScoringContext(input);const truthIds=new Set(input.truths.map((truth)=>truth.id));const atomIds=new Set(input.atoms.map((atom)=>atom.id));
  for(const truth of input.truths.filter((t)=>t.status==='CURRENT'&&promotableTruth(t,input)).map((entry)=>({truth:entry,score:truthPromotionScore(entry,input,context)})).filter((entry)=>entry.score>=.58).sort((a,b)=>b.score-a.score||(b.truth.updatedAt??"").localeCompare(a.truth.updatedAt??"")).slice(0,40))out.push(await item(input,'TRUTH',truth.truth.kind==='decision'?'Current decision':readableTitle('TRUTH',{...truth.truth,subject:truth.truth.canonicalSubject}),readableTruthStatement(truth.truth),[truth.truth.id,...(truth.truth.evidenceAtomIds??[])].filter(id=>truthIds.has(id)||atomIds.has(id)),{truthConfidence:truth.truth.confidence,importance:truth.score,novelty:.2,rationale:'Deterministic Current Truth: this item has a current truth record, grounded evidence, and enough assertion structure to present before MRS review.',createdAt:truth.truth.updatedAt}));
  const candidates=input.atoms.filter(a=>['idea','decision','constraint','fact'].includes(a.kind)&&promotableAtom(a)&&a.truthStatus!=='SUPERSEDED'&&a.truthStatus!=='CONFLICTING'&&!duplicatesCurrentTruth(a,input)).map(a=>({a,importance:ideaImportance(a,input,context),novelty:novelty(a,input,context)})).filter(({a,importance})=>deterministicProjectIdea(a)||mrsReviewableProjectIdea(a,importance)).sort((x,y)=>y.importance-x.importance).slice(0,60);
  for(const {a,importance,novelty:n} of candidates){if(importance<.56)continue;const deterministic=deterministicProjectIdea(a);out.push(await item(input,'IMPORTANT_IDEA',readableTitle('IMPORTANT_IDEA',a),readableAtomStatement(a),[a.id],{truthConfidence:a.truthStatus==='CURRENT'?a.confidence:Math.min(deterministic ? .82 : .72,a.confidence),importance,novelty:n,rationale:deterministic?`Deterministic project intelligence: ${strictTruthRule(a)??a.kind} has enough project-scoped human directive structure to show without MRS.`:`MRS candidate: human-authored project evidence is useful but ambiguous enough to require semantic review before verification.`,createdAt:a.createdAt,verification:deterministic?'DETERMINISTIC_VERIFIED':'MRS_PENDING'}));}
  for(const truth of input.truths.filter((t)=>['SUPERSEDED','CONFLICTING','PENDING_REVIEW'].includes(t.status)&&promotableTruth(t,input)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,30))out.push(await item(input,'CHANGE',truth.status==='CONFLICTING'?'Conflict detected':truth.status==='SUPERSEDED'?'Superseded state':'Unresolved change',readableTruthStatement(truth),[truth.id,...(truth.evidenceAtomIds??[])].filter(id=>truthIds.has(id)||atomIds.has(id)),{truthConfidence:truth.confidence,importance:.7,novelty:.35,rationale:`Deterministic change signal: the truth engine marked this record ${truth.status}, so Life Wiki keeps it separate from Current Truth.`,createdAt:truth.updatedAt}));
  for(const p of input.patterns.filter(p=>p.projectIds.includes(input.project.id)).filter((pattern)=>pattern.status==='VERIFIED'||(pattern.strength>=.22&&pattern.evidenceCount>=2)).sort((a,b)=>b.strength-a.strength).slice(0,20))out.push(await item(input,'CONNECTION',p.status==='VERIFIED'?'Verified connection':'Candidate connection',p.label,[p.id,...p.atomIds.slice(0,6)].filter(id=>input.patterns.some(x=>x.id===id)||input.atoms.some(a=>a.id===id)),{truthConfidence:p.status==='VERIFIED'?Math.max(.75,p.strength):Math.min(.7,p.strength),importance:clamp(.45+.35*p.strength),novelty:.4,rationale:`Pattern Lab connection with ${p.evidenceCount} observations and ${p.counterexamples} counterexamples.`}));
  for(const a of input.atoms.filter((a)=>a.kind==='question'&&promotableAtom(a)).sort((a,b)=>(b.createdAt??'').localeCompare(a.createdAt??'')).slice(0,25))out.push(await item(input,'OPEN_QUESTION',readableTitle('OPEN_QUESTION',a),clipDisplayText(a.text),[a.id],{truthConfidence:a.confidence,importance:clamp(.45+.25*recency(a.createdAt)),novelty:novelty(a,input,context),rationale:'Explicit unresolved question preserved from source history.',createdAt:a.createdAt}));
  return out;
}

function mergeProposals(input:IntelligenceInput,candidates:IntelligenceItem[],mrs:MRSResult):IntelligenceProjection{
  const reviewedCandidateIds=new Set([...(mrs.priorReviewedCandidateIds??[]),...(mrs.reviewedCandidateIds??[])]);
  const proposalMap=new Map(mrs.proposals.map(p=>[p.candidateId,p]));const verified=candidates.map(c=>{const p=proposalMap.get(c.id);if(!p)return reviewedCandidateIds.has(c.id)?{...c,verification:'REJECTED' as IntelligenceVerification,rationale:'MRS reviewed this candidate and did not promote it.'}:c;const evidenceIds=p.evidenceIds?.length?p.evidenceIds:c.evidenceIds;const grounded=evidenceIds.every(id=>c.evidenceIds.includes(id))&&evidenceExists(evidenceIds,input);return{...c,kind:p.classification??c.kind,importance:clamp(p.importance??c.importance),novelty:clamp(p.novelty??c.novelty),rationale:p.rationale??c.rationale,evidenceIds,verification:grounded?'MRS_VERIFIED':'REJECTED' as IntelligenceVerification};});
  const sort=(xs:IntelligenceItem[])=>xs.sort((a,b)=>b.importance-a.importance||b.truthConfidence-a.truthConfidence);
  const unresolved=sort(verified.filter(x=>x.verification==='MRS_PENDING'));
  const projection={version:BRAIN2_INTELLIGENCE_VERSION,projectId:input.project.id,generatedAt:new Date().toISOString(),mrsRuntime:mrs.state,currentTruth:sort(verified.filter(x=>x.kind==='TRUTH')).slice(0,25),importantIdeas:sort(verified.filter(x=>x.kind==='IMPORTANT_IDEA'&&x.verification!=='REJECTED')).slice(0,20),changes:sort(verified.filter(x=>x.kind==='CHANGE')).slice(0,20),connections:sort(verified.filter(x=>x.kind==='CONNECTION')).slice(0,15),openQuestions:sort(verified.filter(x=>x.kind==='OPEN_QUESTION')).slice(0,15),unresolved:unresolved.slice(0,50),unresolvedTotal:unresolved.length,mrsReviewedCandidateIds:[...reviewedCandidateIds].slice(-1000)};
  const verificationCounts=verified.reduce((counts,item)=>({...counts,[item.verification]:(counts[item.verification]??0)+1}),{} as Partial<Record<IntelligenceVerification,number>>);
  brain2MRSLog('merge.project-intelligence.result',{projectId:input.project.id,mrsRuntime:mrs.state,proposals:mrs.proposals.length,reviewedCandidateIds:mrs.reviewedCandidateIds?.length??0,priorReviewedCandidateIds:mrs.priorReviewedCandidateIds?.length??0,mrsVerified:verificationCounts.MRS_VERIFIED??0,mrsPending:verificationCounts.MRS_PENDING??0,rejected:verificationCounts.REJECTED??0,importantIdeas:projection.importantIdeas.length,unresolvedShown:projection.unresolved.length,unresolvedTotal:projection.unresolvedTotal});
  return projection;
}

async function runMRS(project:ProjectRecord,candidates:IntelligenceItem[],runtimeReadyOnly=false):Promise<MRSResult>{
  if(typeof window==='undefined')return{state:'NOT_CONFIGURED',proposals:[]};
  const pendingCandidates=candidates.filter(c=>c.verification==='MRS_PENDING').slice(0,40);
  const reviewCandidates=pendingCandidates.slice(0,BRAIN2_MRS_REVIEW_CANDIDATE_LIMIT).map(c=>({id:c.id,kind:c.kind,statement:c.statement,evidenceIds:c.evidenceIds,importance:c.importance,novelty:c.novelty,truthConfidence:c.truthConfidence}));
  const availability=getBrain2RuntimeAvailabilityHint();
  if(runtimeReadyOnly&&!availability.hasCachedRuntime){
    brain2MRSLog('lifecycle.skip-not-ready',{projectId:project.id,pendingCandidates:pendingCandidates.length,runtimeReadyOnly});
    return{state:'NOT_CONFIGURED',proposals:[]};
  }
  if(!reviewCandidates.length)return{state:'NOT_REQUIRED',proposals:[]};
  try{
    brain2MRSLog('lifecycle.project-review.start',{projectId:project.id,projectName:project.name,pendingCandidates:pendingCandidates.length,reviewing:reviewCandidates.length,reviewCandidateIds:reviewCandidates.map(candidate=>candidate.id),runtimeReadyOnly,hasCachedRuntime:availability.hasCachedRuntime,hasRecentSelfTest:availability.hasRecentSelfTest});
    const proposals=await reviewBrain2Intelligence({project:{id:project.id,name:project.name},candidates:reviewCandidates});
    brain2MRSLog('lifecycle.project-review.done',{projectId:project.id,reviewedCandidateIds:reviewCandidates.map(candidate=>candidate.id),proposals:Array.isArray(proposals)?proposals.length:0});
    return{state:'CONNECTED',proposals:proposals as MRSProposal[],reviewedCandidateIds:reviewCandidates.map((candidate)=>candidate.id)};
  }catch(error){
    brain2MRSError('lifecycle.project-review.error',{projectId:project.id,error:error instanceof Error?error.message:String(error)});
    return{state:'ERROR',proposals:[]};
  }
}

export async function buildProjectIntelligenceSourceVersion(input:IntelligenceInput){
  return sha256(JSON.stringify({
    ruleVersion:BRAIN2_PROJECT_INTELLIGENCE_RULE_VERSION,
    projectId:input.project.id,
    projectUpdatedAt:input.project.updatedAt,
    atomCount:input.atoms.length,
    truthCount:input.truths.length,
    decisionCount:input.decisions.length,
    patternCount:input.patterns.length,
    experimentCount:input.experiments.length,
    tickCount:input.ticks.length,
    atomTail:input.atoms.slice(0,40).map(x=>[x.id,x.createdAt,x.truthStatus,x.confidence]),
    truthTail:input.truths.slice(0,40).map(x=>[x.id,x.status,x.updatedAt,x.confidence]),
    patternTail:input.patterns.slice(0,20).map(x=>[x.id,x.updatedAt,x.status,x.strength]),
    decisionTail:input.decisions.slice(-20).map(x=>[x.id,x.createdAt]),
    experimentTail:input.experiments.slice(-20).map(x=>[x.id,x.updatedAt,x.status]),
    tickTail:input.ticks.slice(-20).map(x=>[x.id,x.updatedAt,x.status]),
  }));
}

export async function buildDeterministicProjectIntelligence(input:IntelligenceInput):Promise<IntelligenceProjection>{
  const candidates=await discover(input);
  return mergeProposals(input,candidates,{state:candidates.some(c=>c.verification==='MRS_PENDING')?'DEFERRED':'NOT_REQUIRED',proposals:[]});
}

export async function refineProjectIntelligenceWithMRS(input:IntelligenceInput,base?:IntelligenceProjection,options:{runtimeReadyOnly?:boolean}={}):Promise<IntelligenceProjection>{
  const deterministic=base??await buildDeterministicProjectIntelligence(input);
  if(!(deterministic.unresolvedTotal ?? deterministic.unresolved.length))return {...deterministic,mrsRuntime:'NOT_REQUIRED'};
  const priorReviewedCandidateIds=deterministic.mrsReviewedCandidateIds??[];
  const priorReviewedCandidateSet=new Set(priorReviewedCandidateIds);
  const candidates=(await discover(input)).map((candidate)=>priorReviewedCandidateSet.has(candidate.id)&&candidate.verification==='MRS_PENDING'?{...candidate,verification:'REJECTED' as IntelligenceVerification,rationale:'MRS already reviewed this candidate and did not promote it.'}:candidate);
  const mrs=await runMRS(input.project,candidates,options.runtimeReadyOnly===true);
  return mergeProposals(input,candidates,mrs.state==='CONNECTED'?{...mrs,priorReviewedCandidateIds}:{state:mrs.state,proposals:[],priorReviewedCandidateIds});
}

export async function buildProjectIntelligence(input:IntelligenceInput,options:{allowMRS?:boolean;runtimeReadyOnly?:boolean}={}):Promise<IntelligenceProjection>{
  const deterministic=await buildDeterministicProjectIntelligence(input);
  if(!options.allowMRS)return deterministic;
  return refineProjectIntelligenceWithMRS(input,deterministic,{runtimeReadyOnly:options.runtimeReadyOnly});
}
