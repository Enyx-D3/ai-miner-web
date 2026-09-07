import type { AtomRecord, PatternRecord, PatternTestRecord, TruthRecord } from "./types";
import { BRAIN2_PATTERN_VERSION } from "./contracts";
import { canonicalId, normalizeText } from "./identity";
import { evaluatePattern } from "./patternLab";

export type PatternAggregate = {patternKey:string;label:string;kind:string;evidenceCount:number;projectIds:Set<string>;atomIds:string[];counterexampleAtomIds:string[]};
const STOP_TERMS=new Set(["the","a","an","and","or","to","of","in","on","for","with","without","this","that","these","those","it","its","be","is","are","was","were","as","by","from","must","should","need","needs","want","use","using","used","treated","good","bad","thing","stuff","one","two"]);
const BLOCKED_STRICT_RULES=new Set(["assistant_or_unknown_author","question","code_or_log","labelled_answer","quoted_text","meta_task","chat_task","anaphora","duplicate_claim","transient_observation","speculation","invalid_source","invalid_timestamp","empty_candidate"]);
function strictRule(atom:AtomRecord){return atom.ruleTrace?.filter((item)=>item.startsWith("strict_truth:")&&!item.endsWith(":eligible")&&!item.endsWith(":residual")).at(-1)?.replace(/^strict_truth:/,"");}
function strictEligible(atom:AtomRecord){return atom.ruleTrace?.includes("strict_truth:eligible")===true;}
function cleanTerms(value:string){return normalizeText(value).toLowerCase().replace(/[`*_>#<>{}()[\]|=:+/\\.,;!?'"“”‘’]/g," ").split(/\s+/).map((term)=>term.trim()).filter((term)=>term.length>=3&&!STOP_TERMS.has(term)&&!/^\d+$/.test(term)).slice(0,8);}
function patternTermsForAtom(atom:AtomRecord){const subjectTerms=cleanTerms(atom.canonicalSubject||atom.subject||"");const fallbackTerms=cleanTerms((atom.keywords??[]).join(" "));const terms=(subjectTerms.length>=2?subjectTerms:fallbackTerms).slice(0,4).sort();return [...new Set(terms)];}
function hasStrongTwoTermPatternSubject(atom:AtomRecord,terms:string[]){
  if(terms.length!==2)return false;
  const subject=normalizeText(atom.canonicalSubject||atom.subject||"");
  const value=normalizeText(atom.value||"");
  if(cleanTerms(subject).length!==2)return false;
  if(value.length<4&&atom.truthStatus!=="CURRENT"&&!strictEligible(atom))return false;
  return atom.kind==="decision"||atom.kind==="constraint"||atom.truthStatus==="CURRENT"||strictEligible(atom);
}
function patternEligibleAtom(atom:AtomRecord){
  if(!["decision","constraint","fact","idea"].includes(atom.kind))return false;
  if(atom.confidence<.65)return false;
  const rule=strictRule(atom);
  if(rule&&BLOCKED_STRICT_RULES.has(rule))return false;
  const text=normalizeText(atom.text);
  if(text.length<18)return false;
  if(/```|^\s*(import|export|const|let|var|function|class)\b|GET\s+\/|POST\s+\/|console\.|stack trace|error:/i.test(text))return false;
  if(/\bmust be treated as\s+\d+\b/i.test(text))return false;
  if(/<[^>]+>/.test(text)&&/\b(?:class|meta-data|android:name|div|span|image|svg|import|export|const)\b/i.test(text))return false;
  if(/^(?:yes|no|ok|okay|thanks|done|sure)\b/i.test(text))return false;
  if(atom.kind==="idea"&&!strictEligible(atom)&&atom.truthStatus!=="CURRENT"&&!atom.relationSafe)return false;
  const terms=patternTermsForAtom(atom);
  if(terms.length>=3)return true;
  return hasStrongTwoTermPatternSubject(atom,terms);
}
export function patternKeyForAtom(atom:AtomRecord):string{const terms=patternTermsForAtom(atom);return `${atom.kind}:${terms.join("-")||"unresolved"}`;}
export function patternLabelForAtom(atom:AtomRecord):string{const terms=patternTermsForAtom(atom);const subject=normalizeText(atom.subject||atom.canonicalSubject||"");return subject&&cleanTerms(subject).length>=2?subject:terms.join(" ");}
export function accumulatePattern(map:Map<string,PatternAggregate>,atom:AtomRecord,conflictingAtomIds:Set<string>){if(!patternEligibleAtom(atom))return;const patternKey=patternKeyForAtom(atom);const aggregate=map.get(patternKey)??{patternKey,label:patternLabelForAtom(atom),kind:atom.kind,evidenceCount:0,projectIds:new Set<string>(),atomIds:[],counterexampleAtomIds:[]};aggregate.evidenceCount+=1;aggregate.projectIds.add(atom.projectId);aggregate.atomIds.push(atom.id);if(aggregate.atomIds.length>300)aggregate.atomIds.shift();if(conflictingAtomIds.has(atom.id)){aggregate.counterexampleAtomIds.push(atom.id);if(aggregate.counterexampleAtomIds.length>100)aggregate.counterexampleAtomIds.shift();}map.set(patternKey,aggregate);}
export async function buildPatternsFromAggregates(aggregates:Iterable<PatternAggregate>,limit=250,tests:PatternTestRecord[]=[]):Promise<PatternRecord[]>{const patterns:PatternRecord[]=[];for(const group of aggregates){const evidenceCount=group.evidenceCount;const crossProject=group.projectIds.size;if(evidenceCount<3)continue;if(crossProject<2&&evidenceCount<5)continue;const counterexampleRatio=group.counterexampleAtomIds.length/Math.max(1,evidenceCount);const transferBoost=crossProject>=2?Math.min(.22,crossProject*.055):0;const singleProjectPenalty=crossProject<2?.12:0;const strength=Math.max(0,Math.min(1,.18+Math.log2(evidenceCount+1)/10+transferBoost-counterexampleRatio*.5-singleProjectPenalty));let status:PatternRecord["status"]="OBSERVED";let verificationStatus:PatternRecord["verificationStatus"]="UNTESTED";let maturity:NonNullable<PatternRecord["maturity"]>="L1_OBSERVATION";if(evidenceCount>=5)maturity="L2_CANDIDATE";if(evidenceCount>=8&&crossProject>=2){status="CANDIDATE";maturity="L3_HYPOTHESIS";}if(evidenceCount>=14&&crossProject>=2){status="TESTING";verificationStatus=group.counterexampleAtomIds.length?"COUNTEREXAMPLE_FOUND":"NEEDS_TRANSFER_TEST";}let pattern:PatternRecord={id:await canonicalId("pat",group.patternKey),label:group.label,status,strength,projectIds:[...group.projectIds],atomIds:group.atomIds,evidenceCount,counterexamples:group.counterexampleAtomIds.length,counterexampleAtomIds:group.counterexampleAtomIds,hypothesis:`Repeated ${group.kind||"knowledge"} evidence around ${group.label}.`,boundaryConditions:crossProject<2?["Observed in only one project; not a transfer pattern yet"]:[],verificationStatus,patternKey:group.patternKey,patternVersion:BRAIN2_PATTERN_VERSION,updatedAt:new Date().toISOString(),maturity,falsificationStatus:"UNTESTED",predictions:[]};const evaluation=evaluatePattern(pattern,tests);pattern={...pattern,status:evaluation.status,maturity:evaluation.maturity,verificationStatus:evaluation.verificationStatus,falsificationStatus:evaluation.falsificationStatus,transferTestIds:evaluation.transferTestIds,boundaryConditions:evaluation.boundaryConditions,strength:Math.max(pattern.strength,evaluation.supportScore)};patterns.push(pattern);}return patterns.sort((a,b)=>b.strength-a.strength||b.evidenceCount-a.evidenceCount).slice(0,limit);}
export async function buildPatterns(atoms:AtomRecord[],truths:TruthRecord[],limit=250,tests:PatternTestRecord[]=[]):Promise<PatternRecord[]>{const conflicts=new Set(truths.filter((truth)=>truth.status==="CONFLICTING").flatMap((truth)=>truth.evidenceAtomIds??[truth.atomId]));const aggregates=new Map<string,PatternAggregate>();for(const atom of atoms)accumulatePattern(aggregates,atom,conflicts);return buildPatternsFromAggregates(aggregates.values(),limit,tests);}
