import type { AtomKind } from "./types";
import { BRAIN2_ATOM_VERSION } from "./contracts";
import { keywords, normalizeText } from "./identity";
import { intrinsicAtomSufficiency } from "./atomizationStack";

export type AtomSemanticSubtype =
  | "decision"
  | "rule_constraint"
  | "definition"
  | "conditional"
  | "causal"
  | "quantified_claim"
  | "event_temporal"
  | "question"
  | "task"
  | "idea"
  | "claim";

export type AtomCandidate={
  kind:AtomKind;
  semanticSubtype:AtomSemanticSubtype;
  text:string;
  subject:string;
  canonicalSubject:string;
  value?:string;
  polarity:"POSITIVE"|"NEGATIVE"|"NEUTRAL";
  scope?:string;
  sourceStart?:number;
  sourceEnd?:number;
  confidence:number;
  keywords:string[];
  extractionVersion:string;
  ruleTrace:string[];
  relationSafe:boolean;
  atomizationArm:"G_ADAPTIVE_HETEROGENEOUS";
  boundarySignals:string[];
  hierarchyRole:"PARENT"|"CHILD"|"LEAF";
  parentCandidateKey?:string;
  sequenceIndex?:number;
  cohesionType:"PROCEDURE"|"NARRATIVE"|"CAUSAL"|"NONE";
  intrinsicSufficiency:number;
  fallbackPolicy:"B_250_CHUNK";
};

const STRONG_RELATION=/\b(if|unless|because|therefore|due to)\b/i;
const VERB=/\b(is|are|was|were|has|have|costs?|includes?|uses?|approved|pending|remains?|run|record|install|restart|cites?|supports?|requires?|selected|rejected|replaced|changed?|switch(?:ed)?|build|ship|fix)\b/i;
const NUMUNIT=/\b\d+(?:\.\d+)?\s*(?:%|GB|MB|KB|TB|hours?|days?|pages?|users?|seconds?|ms|USD|\$)?\b/i;
const DATE=/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+\d{4}\b/i;
const UI_JUNK_PATTERNS = [
  /this block is not supported on your current device yet/i,
  /browser cache is not available in this environment/i,
  /brain2 mrs could not activate/i,
  /retry after checking browser network\/storage\/console/i,
  /^```/,
  /^`{1,3}\s*$/,
  /\bcopy code\b/i,
  /\bopen in (?:chatgpt|codex)\b/i,
  /\bdownload local mrs\b/i,
  /\brestore cached mrs\b/i,
  /\brun mrs self-test\b/i,
  /\bbrain2 ai runtime\b/i,
];

function semanticSubtype(sentence:string):AtomSemanticSubtype{
  const text=sentence.toLowerCase();
  if(/\b(decid(?:e|ed)|approved|selected|rejected|replaced|chosen|canonical|going forward|switch(?:ed)? to|replace(?:d)? with)\b/.test(text))return"decision";
  if(/\b(must|must not|never|required|only|do not|don't|cannot|can't|constraint)\b/.test(text))return"rule_constraint";
  if(/\b(is defined as|means|refers to)\b/.test(text))return"definition";
  if(/\b(if|unless|when)\b/.test(text))return"conditional";
  if(/\b(because|therefore|due to)\b/.test(text))return"causal";
  if(DATE.test(sentence))return"event_temporal";
  if(NUMUNIT.test(sentence))return"quantified_claim";
  if(sentence.trim().endsWith("?")||/^(why|how|what|when|where|who|can|could|should|would|is|are|do|does)\b/i.test(sentence.trim()))return"question";
  if(/\b(todo|to do|need to|next step|action item|implement|build|finish|fix|ship|deliver)\b/.test(text))return"task";
  if(/\b(idea|what if|could we|could be|maybe|perhaps|imagine|concept|propose)\b/.test(text))return"idea";
  return"claim";
}

function kindFromSubtype(subtype:AtomSemanticSubtype,sentence:string):AtomKind{
  if(subtype==="decision")return"decision";
  if(subtype==="rule_constraint")return"constraint";
  if(subtype==="question")return"question";
  if(subtype==="task")return"task";
  if(subtype==="idea")return"idea";
  if(subtype==="definition"||subtype==="quantified_claim"||subtype==="event_temporal"||/\b(is|are|was|were|has|have|means|equals|contains|supports|uses|costs?|price|version|status)\b/i.test(sentence))return"fact";
  return"statement";
}

function polarity(sentence:string):"POSITIVE"|"NEGATIVE"|"NEUTRAL"{
  if(/\b(no|not|never|without|cannot|can't|don't|doesn't|won't|isn't|aren't|remove|stop using|disallow|disabled|off)\b/i.test(sentence))return"NEGATIVE";
  if(/\b(is|are|will|use|uses|enable|enabled|allow|allowed|selected|chosen|decided|must|required|on)\b/i.test(sentence))return"POSITIVE";
  return"NEUTRAL";
}

function assignmentParts(sentence:string):{subject?:string;value?:string}{
  const normalized=normalizeText(sentence);
  const patterns=[
    /^(?:going forward[,;:]?\s*)?(.{2,90}?)\s+(?:is|are|=|becomes?|will be|should be|must be|set to|changed? to|switch(?:ed)? to|replace(?:d)? with)\s+([^;!?]{1,100})/i,
    /\b(?:set|change|switch|replace)\s+(.{2,70}?)\s+(?:to|with)\s+([^;!?]{1,100})/i,
  ];
  for(const pattern of patterns){const m=normalized.match(pattern);if(m?.[1]&&m?.[2])return{subject:normalizeText(m[1]),value:normalizeText(m[2]).replace(/[.]+$/ ,"")};}
  return{};
}

function valueFor(sentence:string):string|undefined{
  const assigned=assignmentParts(sentence).value;
  if(assigned)return assigned.slice(0,100).toLowerCase();
  const candidates=sentence.match(/(?:\$|€|£)?\d+(?:\.\d+)?(?:\s?%|\s?(?:kb|mb|gb|tb|ms|s|sec|seconds?|minutes?|hours?|days?|weeks?|months?|years?))?|\bv?\d+(?:\.\d+){1,3}\b|\b(?:true|false|enabled|disabled|on|off)\b/gi);
  return candidates?.length?candidates.slice(0,4).map((value)=>normalizeText(value).toLowerCase()).join(" | "):undefined;
}

function subjectFor(sentence:string):{display:string;canonical:string}{
  const assigned=assignmentParts(sentence).subject;
  if(assigned){const display=assigned.replace(/^(?:we|our|the)\s+/i,"").slice(0,90);return{display,canonical:normalizeText(display).toLowerCase()};}
  const terms=keywords(sentence,6);
  const canonical=terms.slice(0,4).sort().join(" ")||normalizeText(sentence).slice(0,80).toLowerCase();
  return{display:terms.length?terms.join(" "):normalizeText(sentence).slice(0,80),canonical};
}

function scopeFor(sentence:string):string|undefined{
  const m=sentence.match(/\b(?:for|on|in|within|during)\s+(project\s+[A-Z0-9_-]+|v?\d+(?:\.\d+){1,3}|today|now|this\s+(?:project|version|phase|release|test)|[A-Z][A-Za-z0-9_-]+\s+(?:project|release|experiment))\b/i);
  return m?.[1]?normalizeText(m[1]).toLowerCase():undefined;
}

function isUIJunkSegment(sentence:string){
  const normalized=normalizeText(sentence);
  if(!normalized)return true;
  if(normalized.length<8)return true;
  if(UI_JUNK_PATTERNS.some((pattern)=>pattern.test(normalized)))return true;
  const stripped=normalized.replace(/[`*_#>\-\[\]()]/g," ").replace(/\s+/g," ").trim();
  if(!stripped)return true;
  if(/^(?:model|mrs|backend|status|progress|loading|download(?:ing)?)[:\s]/i.test(stripped))return true;
  if(stripped.split(" ").length<=3 && !/[.?]/.test(stripped))return true;
  return false;
}


function boundarySignalsFor(sentence:string,subtype:AtomSemanticSubtype,value?:string):string[]{
  const signals:string[]=[];
  if(value)signals.push("single_predicate_value");
  if(["decision","rule_constraint","quantified_claim","event_temporal","task","question"].includes(subtype))signals.push("independent_retrieval_value");
  if(/\b(now|today|from now on|going forward|updated?|changed?|replaced?|supersed|previously|formerly)\b/i.test(sentence))signals.push("independent_validity_window");
  if(/\b(not|never|instead|versus|vs\.?|conflict|contradict|rejected)\b/i.test(sentence))signals.push("independent_contradiction_risk");
  if(/\b(because|therefore|due to|if|unless)\b/i.test(sentence))signals.push("causal_cohesion");
  if(/(?:^|\s)(?:step\s+\d+|\d+[.)]|first|second|third|then|finally)\b/i.test(sentence))signals.push("procedure_cohesion");
  if(signals.length<2&&VERB.test(sentence))signals.push("semantic_predicate");
  return signals;
}

function cohesionTypeFor(sentence:string):"PROCEDURE"|"NARRATIVE"|"CAUSAL"|"NONE"{
  if(/(?:^|\s)(?:step\s+\d+|\d+[.)]|first|second|third|then|finally)\b/i.test(sentence))return"PROCEDURE";
  if(/\b(if|unless|because|therefore|due to)\b/i.test(sentence))return"CAUSAL";
  if(/\b(for example|for instance|story|example|rationale|reasoning)\b/i.test(sentence))return"NARRATIVE";
  return"NONE";
}

function conservativeSplit(sentence:string):{text:string;trace:string[]}[]{
  // Universal Atomizer smoke evidence showed conservative clause splitting improved its
  // synthetic boundary proxy while preserving provenance. Strong condition/causal relations
  // stay whole so we do not sever condition->consequence or cause->effect meaning.
  if(STRONG_RELATION.test(sentence))return[{text:sentence,trace:["sentence","relation_guard"]}];
  let parts=[{text:sentence,trace:["sentence"]}];
  const splitWith=(current:typeof parts,fn:(text:string)=>string[]):typeof parts=>current.flatMap((item)=>{
    const next=fn(item.text).map(normalizeText).filter(Boolean);
    return next.length>1?next.map((text)=>({text,trace:[...item.trace,"clause_lite"]})):item;
  });
  parts=splitWith(parts,(text)=>text.split(/\s*;\s*/));
  parts=splitWith(parts,(text)=>{const m=text.match(/^(.{12,}?):\s+(.{12,})$/);return m?[m[1],m[2]]:[text];});
  parts=splitWith(parts,(text)=>{
    const m=text.match(/^(.{12,}?)\s+(and|but)\s+(.{12,})$/i);
    if(!m||!VERB.test(m[1])||!VERB.test(m[3]))return[text];
    return[m[1],`${m[2]} ${m[3]}`];
  });
  // A narrow independently-mutable numeric attribute family from the recovered experiment.
  parts=parts.flatMap((item)=>{
    const patterns=[
      /^(.*?\bcosts?\s+\$?\d+(?:\.\d+)?)\s+and\s+(includes?\s+.+)$/i,
      /^(.*?\buses?\s+\d+(?:\.\d+)?\s*(?:GB|MB|KB))\s+and\s+(.+?\buses?\s+\d+(?:\.\d+)?\s*(?:GB|MB|KB)\.?$)/i,
    ];
    for(const pattern of patterns){const m=item.text.match(pattern);if(m)return[{text:normalizeText(m[1]),trace:[...item.trace,"independent_change"]},{text:normalizeText(m[2]),trace:[...item.trace,"independent_change"]}];}
    return[item];
  });
  return parts;
}

function sentenceSegments(cleaned:string):{text:string;sourceStart:number;sourceEnd:number;trace:string[]}[]{
  const coarse=cleaned.split(/(?<=[.!?])\s+|\n+/).map(normalizeText).filter((part)=>part.length>=12).slice(0,48);
  const source=coarse.length?coarse:[cleaned];
  let cursor=0;
  const out:{text:string;sourceStart:number;sourceEnd:number;trace:string[]}[]=[];
  for(const sentence of source){
    const sentenceStart=cleaned.indexOf(sentence,cursor);
    const safeStart=sentenceStart>=0?sentenceStart:cursor;
    for(const fragment of conservativeSplit(sentence)){
      const probe=fragment.text.replace(/^(and|but)\s+/i,"");
      let found=cleaned.indexOf(fragment.text,safeStart);
      let actual=fragment.text;
      if(found<0&&probe!==fragment.text){found=cleaned.indexOf(probe,safeStart);actual=probe;}
      if(found<0){found=safeStart;actual=fragment.text;}
      out.push({text:actual,sourceStart:found,sourceEnd:Math.min(cleaned.length,found+actual.length),trace:fragment.trace});
    }
    if(sentenceStart>=0)cursor=sentenceStart+sentence.length;
  }
  return out;
}

export function atomizeMessage(text:string,role:string):AtomCandidate[]{
  const cleaned=normalizeText(text);
  if(!cleaned)return[];
  const segments=sentenceSegments(cleaned).filter((segment)=>!isUIJunkSegment(segment.text));
  const scored=segments.map((segment)=>{
    const sentence=segment.text;
    const subtype=semanticSubtype(sentence);
    const kind=kindFromSubtype(subtype,sentence);
    const roleBias=role==="user"?.08:role==="assistant"?0:-.08;
    const kindBias=kind==="decision"||kind==="constraint"?.09:kind==="task"||kind==="question"?.05:0;
    const subject=subjectFor(sentence);
    const value=valueFor(sentence);
    const structured=Boolean(assignmentParts(sentence).subject&&value);
    const relationSafe=STRONG_RELATION.test(sentence)||!segment.trace.includes("clause_lite");
    const boundarySignals=boundarySignalsFor(sentence,subtype,value);
    const cohesionType=cohesionTypeFor(sentence);
    const intrinsicSufficiency=intrinsicAtomSufficiency(sentence,subject.display,value,relationSafe);
    return{
      kind,
      semanticSubtype:subtype,
      text:sentence,
      subject:subject.display,
      canonicalSubject:subject.canonical,
      value,
      polarity:polarity(sentence),
      scope:scopeFor(sentence),
      sourceStart:segment.sourceStart,
      sourceEnd:segment.sourceEnd,
      confidence:Math.max(.48,Math.min(.98,.68+roleBias+kindBias+(structured?.08:0)+(subtype!=="claim"?.025:0))),
      keywords:keywords(sentence,14),
      extractionVersion:BRAIN2_ATOM_VERSION,
      ruleTrace:segment.trace,
      relationSafe,
      atomizationArm:"G_ADAPTIVE_HETEROGENEOUS",
      boundarySignals,
      hierarchyRole:cohesionType==="NONE"?"LEAF":"PARENT",
      cohesionType,
      intrinsicSufficiency,
      fallbackPolicy:"B_250_CHUNK",
    } satisfies AtomCandidate;
  });
  return scored.sort((a,b)=>b.confidence-a.confidence||b.text.length-a.text.length).slice(0,role==="user"?24:14);
}
