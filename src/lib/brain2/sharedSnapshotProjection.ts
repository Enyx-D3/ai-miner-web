import type { IntelligenceItem, IntelligenceProjection, IntelligenceKind } from "./intelligenceLayer";
import type { SharedStateSnapshotRecord } from "./types";

function rows(value:unknown): Array<Record<string,unknown>> { return Array.isArray(value) ? value.filter((item):item is Record<string,unknown>=>Boolean(item)&&typeof item==="object"&&!Array.isArray(item)) : []; }
function ids(value:unknown): string[] { return Array.isArray(value) ? [...new Set(value.map(String).filter(Boolean))] : []; }
function item(projectId:string, raw:Record<string,unknown>, kind:IntelligenceKind, verification:IntelligenceItem["verification"]): IntelligenceItem {
  const statement=String(raw.text ?? raw.statement ?? raw.title ?? raw.value ?? "").trim();
  const evidence=ids(raw.evidenceAtomIds ?? raw.evidenceIds);
  return {id:String(raw.id ?? raw.atomId ?? `${kind}:${statement}`),projectId,kind,title:String(raw.title ?? raw.kind ?? kind.replaceAll("_"," ")),statement,evidenceIds:evidence.length?evidence:(String(raw.atomId ?? "")?[String(raw.atomId)]:[]),truthConfidence:Number(raw.confidence ?? .7),importance:Number(raw.importance ?? (kind==="TRUTH"?1:.65)),novelty:Number(raw.novelty ?? .5),verification,rationale:String(raw.rationale ?? "Shared canonical project snapshot"),createdAt:typeof raw.createdAt==="string"?raw.createdAt:undefined};
}

export function projectionFromSharedSnapshots(wiki:SharedStateSnapshotRecord|undefined, notebook:SharedStateSnapshotRecord|undefined): IntelligenceProjection|null {
  const projectId=String(wiki?.projectId ?? notebook?.projectId ?? ""); if(!projectId)return null;
  const currentRaw=rows(wiki?.currentTruth ?? notebook?.currentTruth ?? notebook?.now);
  const ideaRaw=rows(wiki?.importantIdeas ?? notebook?.importantIdeas);
  const changeRaw=rows(wiki?.changes ?? notebook?.whatChanged);
  const conflictRaw=rows(wiki?.conflicts ?? notebook?.blockers);
  const questionRaw=rows(wiki?.openQuestions ?? notebook?.openQuestions);
  return {version:"GLOBAL_CONTEXT_SHARED_SNAPSHOT_V1",projectId,generatedAt:String(wiki?.updatedAt ?? notebook?.updatedAt ?? wiki?.createdAt ?? notebook?.createdAt ?? new Date(0).toISOString()),mrsRuntime:"NOT_REQUIRED",currentTruth:currentRaw.map(r=>item(projectId,r,"TRUTH","DETERMINISTIC_VERIFIED")).filter(x=>x.statement),importantIdeas:ideaRaw.map(r=>item(projectId,r,"IMPORTANT_IDEA","MRS_PENDING")).filter(x=>x.statement),changes:[...changeRaw.map(r=>item(projectId,r,"CHANGE","DETERMINISTIC_VERIFIED")),...conflictRaw.map(r=>item(projectId,r,"CHANGE","DETERMINISTIC_VERIFIED"))].filter(x=>x.statement),connections:[],openQuestions:questionRaw.map(r=>item(projectId,r,"OPEN_QUESTION","DETERMINISTIC_VERIFIED")).filter(x=>x.statement),unresolved:conflictRaw.map(r=>item(projectId,r,"CHANGE","DETERMINISTIC_VERIFIED")).filter(x=>x.statement),unresolvedTotal:conflictRaw.length};
}
