import { canonicalId, normalizeText, sha256 } from "./identity";
import { canonicalJson } from "./syncProtocol";
import type {
  Brain2Snapshot,
  FailureMemoryRecord,
  ProjectRecord,
  TickRecord,
  TruthRecord,
} from "./types";
import type { B2JobPackage } from "./jobs";
import { issueUserR1Allow, requireR1Allow } from "./r1Authority";
import { findContinuitySnapshot, type ContinuitySnapshot } from "./continuityIntelligence";

export type GlobalContextResumeCapsule = {
  format: "GLOBAL_CONTEXT_RESUME";
  version: 1;
  memoryRoot: string;
  projectId: string;
  projectName: string;
  projectAliases: string[];
  goal: string;
  currentTruth: Array<{
    id: string;
    kind: string;
    text: string;
    confidence: number;
    updatedAt: string;
    evidenceAtomIds: string[];
  }>;
  openTicks: Array<{
    id: string;
    title: string;
    detail: string;
    priority: string;
    actionType?: string;
    evidenceAtomIds: string[];
  }>;
  knownFailures: Array<{
    id: string;
    failureSignature: string;
    title: string;
    cause: string;
    repairThatWorked?: string;
    boundaryConditions: string[];
    occurrenceCount: number;
  }>;
  recentChanges: Array<{
    id: string;
    status: string;
    kind: string;
    text: string;
    updatedAt: string;
  }>;
  nextAction: {
    kind: "TICK" | "TASK" | "CONTINUE";
    text: string;
    refId?: string;
  };
  evidenceRefs: string[];
  generatedAt: string;
  continuity?: { goalId:string; stateHash:string; checklistSummary:{open:number;blocked:number;gates:number;done:number;unknown:number}; recap:ContinuitySnapshot["recap"]; prescription:string[]; avoidedWorkLedger:ContinuitySnapshot["avoidedWorkLedger"] };
  capsuleHash: string;
};

export type GlobalContextCompilerSupplement = {
  format: "B2JOB";
  version: 2;
  jobId: string;
  databoxHash: string;
  evidenceHash: string;
  evidenceIds: string[];
  sufficiencyState: string;
  route: string;
  supplementHash: string;
};

export type GlobalContextPackage = {
  format: "GLOBAL_CONTEXT_PACKAGE";
  version: 1;
  memoryRoot: string;
  projectId: string;
  projectName: string;
  task: string;
  resumeCapsule: GlobalContextResumeCapsule;
  policy: {
    bounded: true;
    fullArchiveIncluded: false;
    askEveryTime: true;
    resultWritePolicy: "PROPOSE_THEN_VERIFY";
    currentTruthWritePolicy: "R1_OR_TICK_AFTER_VERIFY";
  };
  compilerSupplement?: GlobalContextCompilerSupplement;
  packageHash: string;
  generatedAt: string;
};

export type AntiReinventionHit = {
  id: string;
  kind: "CURRENT_TRUTH" | "HISTORICAL_TRUTH" | "FAILURE" | "DECISION" | "PORTABLE_EXPERTISE";
  projectId?: string;
  title: string;
  detail: string;
  score: number;
  action: "REUSE" | "REVIEW" | "BRAKE_CANDIDATE";
  evidenceRefs: string[];
};

function byUpdatedDesc<T extends {updatedAt?: string; createdAt?: string}>(a:T,b:T) {
  return (b.updatedAt ?? b.createdAt ?? "").localeCompare(a.updatedAt ?? a.createdAt ?? "");
}

export function resolveGlobalContextProject(snapshot: Brain2Snapshot, ref?: string): ProjectRecord | undefined {
  const needle = normalizeText(ref ?? "").toLowerCase();
  if (!needle) return [...snapshot.projects].sort(byUpdatedDesc)[0];
  return snapshot.projects.find((project) =>
    [project.id, project.slug, project.name, ...(project.aliases ?? [])]
      .some((value) => normalizeText(value).toLowerCase() === needle)
  );
}

function tickPriority(tick: TickRecord) {
  return tick.priority === "HIGH" ? 3 : tick.priority === "MEDIUM" ? 2 : 1;
}

function minimalTruth(truth: TruthRecord) {
  return {
    id: truth.id,
    kind: truth.kind,
    text: truth.text,
    confidence: truth.confidence,
    updatedAt: truth.updatedAt,
    evidenceAtomIds: [...new Set(truth.evidenceAtomIds ?? [truth.atomId])].sort(),
  };
}

function minimalTick(tick: TickRecord) {
  return {
    id: tick.id,
    title: tick.title,
    detail: tick.detail,
    priority: tick.priority,
    actionType: tick.actionType,
    evidenceAtomIds: [...new Set(tick.evidenceAtomIds ?? [])].sort(),
  };
}

function minimalFailure(failure: FailureMemoryRecord) {
  return {
    id: failure.id,
    failureSignature: failure.failureSignature,
    title: failure.title,
    cause: failure.cause,
    repairThatWorked: failure.repairThatWorked,
    boundaryConditions: [...new Set(failure.boundaryConditions ?? [])].sort(),
    occurrenceCount: failure.occurrenceCount,
  };
}

export async function buildGlobalContextResumeCapsule(
  snapshot: Brain2Snapshot,
  projectRef: string,
): Promise<GlobalContextResumeCapsule> {
  const project = resolveGlobalContextProject(snapshot, projectRef);
  if (!project) throw new Error(`Global Context project not found: ${projectRef}`);

  const current = snapshot.truths
    .filter((truth) => truth.projectId === project.id && truth.status === "CURRENT")
    .sort(byUpdatedDesc);
  const changes = snapshot.truths
    .filter((truth) => truth.projectId === project.id && truth.status !== "CURRENT")
    .sort(byUpdatedDesc)
    .slice(0, 12);
  const ticks = snapshot.ticks
    .filter((tick) => tick.projectId === project.id && tick.status === "OPEN")
    .sort((a,b) => tickPriority(b) - tickPriority(a) || b.updatedAt.localeCompare(a.updatedAt));
  const failures = snapshot.failureMemories
    .filter((failure) => failure.projectId === project.id)
    .sort(byUpdatedDesc)
    .slice(0, 8);

  const continuity=findContinuitySnapshot(snapshot.intelligenceSnapshots as unknown as Array<Record<string,unknown>>,project.id);
  const currentTask = current.find((truth) => truth.kind === "task");
  const goal = normalizeText(continuity?.goal.text || currentTask?.text || project.summary || project.name);
  const primaryTick = ticks[0];
  const nextAction = primaryTick
    ? { kind: "TICK" as const, text: primaryTick.title, refId: primaryTick.id }
    : currentTask
      ? continuity?.prescription[0]
        ? { kind: "CONTINUE" as const, text: continuity.prescription[0], refId: continuity.id }
        : { kind: "TASK" as const, text: currentTask.text, refId: currentTask.id }
      : continuity?.prescription[0]
        ? { kind: "CONTINUE" as const, text: continuity.prescription[0], refId: continuity.id }
        : { kind: "CONTINUE" as const, text: `Continue ${project.name} from the latest verified project state.` };

  const evidenceRefs = [...new Set([
    ...current.flatMap((truth) => truth.evidenceAtomIds ?? [truth.atomId]),
    ...ticks.flatMap((tick) => tick.evidenceAtomIds ?? []),
    ...failures.flatMap((failure) => failure.evidenceIds ?? []),
    ...(continuity?.checklist.flatMap((item)=>item.evidenceAtomIds) ?? []),
  ])].sort();

  // Hash only stable semantic state. generatedAt is deliberately excluded.
  const stable = {
    format: "GLOBAL_CONTEXT_RESUME",
    version: 1,
    memoryRoot: snapshot.memoryRoot,
    projectId: project.id,
    projectName: project.name,
    projectAliases: [...new Set(project.aliases ?? [])].sort(),
    goal,
    currentTruth: current.map(minimalTruth).sort((a,b)=>a.id.localeCompare(b.id)),
    openTicks: ticks.map(minimalTick).sort((a,b)=>a.id.localeCompare(b.id)),
    knownFailures: failures.map(minimalFailure).sort((a,b)=>a.id.localeCompare(b.id)),
    recentChanges: changes.map((truth)=>({
      id: truth.id,
      status: truth.status,
      kind: truth.kind,
      text: truth.text,
      updatedAt: truth.updatedAt,
    })).sort((a,b)=>a.id.localeCompare(b.id)),
    nextAction,
    evidenceRefs,
    ...(continuity?{continuity:{goalId:continuity.goal.id,stateHash:continuity.stateHash,checklistSummary:{open:continuity.recap.open,blocked:continuity.recap.blocked,gates:continuity.recap.gates,done:continuity.recap.done,unknown:continuity.recap.unknown},recap:continuity.recap,prescription:[...continuity.prescription],avoidedWorkLedger:continuity.avoidedWorkLedger.map((item)=>({...item}))}}:{}),
  };
  const capsuleHash = await sha256(canonicalJson(stable));
  return {
    ...stable,
    format: "GLOBAL_CONTEXT_RESUME",
    version: 1,
    generatedAt: new Date().toISOString(),
    capsuleHash,
  };
}

function tokenSet(value: string) {
  return new Set(
    normalizeText(value).toLowerCase().match(/[a-z0-9][a-z0-9'-]{2,}/g) ?? []
  );
}

function overlapScore(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export function findAntiReinvention(
  snapshot: Brain2Snapshot,
  query: string,
  projectId?: string,
  limit = 6,
): AntiReinventionHit[] {
  const q = tokenSet(query);
  if (!q.size) return [];
  const hits: AntiReinventionHit[] = [];

  for (const truth of snapshot.truths) {
    if (projectId && truth.projectId !== projectId) continue;
    const score = overlapScore(q, tokenSet(`${truth.kind} ${truth.text} ${truth.canonicalSubject ?? ""}`));
    if (score < .18) continue;
    hits.push({
      id: truth.id,
      kind: truth.status === "CURRENT" ? "CURRENT_TRUTH" : "HISTORICAL_TRUTH",
      projectId: truth.projectId,
      title: truth.status === "CURRENT" ? "Existing Current Truth" : `Existing ${truth.status.toLowerCase()} work`,
      detail: truth.text,
      score: Math.min(1, score + (truth.status === "CURRENT" ? .18 : .04)),
      action: truth.status === "CURRENT" ? "REUSE" : "REVIEW",
      evidenceRefs: [...new Set(truth.evidenceAtomIds ?? [truth.atomId])],
    });
  }

  for (const failure of snapshot.failureMemories) {
    if (projectId && failure.projectId && failure.projectId !== projectId) continue;
    const score = overlapScore(q, tokenSet([
      failure.title,
      failure.cause,
      failure.knownBadOperation ?? "",
      ...(failure.boundaryConditions ?? []),
    ].join(" ")));
    if (score < .16) continue;
    hits.push({
      id: failure.id,
      kind: "FAILURE",
      projectId: failure.projectId,
      title: "Known failed route",
      detail: `${failure.title}: ${failure.cause}`,
      score: Math.min(1, score + .22),
      action: "BRAKE_CANDIDATE",
      evidenceRefs: failure.evidenceIds ?? [],
    });
  }

  for (const decision of snapshot.decisions) {
    if (projectId && decision.projectId !== projectId) continue;
    const score = overlapScore(q, tokenSet(decision.title));
    if (score < .2) continue;
    hits.push({
      id: decision.id,
      kind: "DECISION",
      projectId: decision.projectId,
      title: "Previous decision",
      detail: decision.title,
      score: Math.min(1, score + .1),
      action: "REVIEW",
      evidenceRefs: decision.evidenceAtomIds ?? [decision.atomId],
    });
  }

  for (const expertise of snapshot.portableExpertise) {
    const text = [
      expertise.title,
      ...(expertise.triggerConditions ?? []),
      ...(expertise.procedure ?? []),
      ...(expertise.operatingBoundaries ?? []),
    ].join(" ");
    const score = overlapScore(q, tokenSet(text));
    if (score < .2) continue;
    hits.push({
      id: expertise.id,
      kind: "PORTABLE_EXPERTISE",
      title: "Reusable verified know-how",
      detail: expertise.title,
      score: Math.min(1, score + .14),
      action: "REUSE",
      evidenceRefs: expertise.provenanceAtomIds ?? [],
    });
  }

  return hits
    .sort((a,b)=>b.score-a.score || a.id.localeCompare(b.id))
    .filter((hit,index,array)=>array.findIndex((item)=>item.id===hit.id)===index)
    .slice(0, Math.max(1, limit));
}

export async function buildGlobalContextPackage(
  snapshot: Brain2Snapshot,
  task: string,
  projectRef: string,
  job?: B2JobPackage,
): Promise<GlobalContextPackage> {
  const project = resolveGlobalContextProject(snapshot, projectRef);
  if (!project) throw new Error(`Global Context project not found: ${projectRef}`);
  const cleanTask = normalizeText(task);
  if (!cleanTask) throw new Error("Global Context handoff requires a task.");
  const resumeCapsule = await buildGlobalContextResumeCapsule(snapshot, project.id);

  let compilerSupplement: GlobalContextCompilerSupplement | undefined;
  if (job) {
    const supplementCore = {
      format: "B2JOB" as const,
      version: 2 as const,
      jobId: job.id,
      databoxHash: job.databox.hash,
      evidenceHash: job.evidenceHash,
      evidenceIds: [...new Set(job.evidence.map((item)=>item.id))].sort(),
      sufficiencyState: job.evidencePolicy.sufficiencyState,
      route: job.evidencePolicy.route,
    };
    compilerSupplement = {
      ...supplementCore,
      supplementHash: await sha256(canonicalJson(supplementCore)),
    };
  }

  const policy = {
    bounded: true as const,
    fullArchiveIncluded: false as const,
    askEveryTime: true as const,
    resultWritePolicy: "PROPOSE_THEN_VERIFY" as const,
    currentTruthWritePolicy: "R1_OR_TICK_AFTER_VERIFY" as const,
  };
  const stable = {
    format: "GLOBAL_CONTEXT_PACKAGE",
    version: 1,
    memoryRoot: snapshot.memoryRoot,
    projectId: project.id,
    projectName: project.name,
    task: cleanTask,
    resumeCapsuleHash: resumeCapsule.capsuleHash,
    currentTruthIds: resumeCapsule.currentTruth.map((item)=>item.id).sort(),
    openTickIds: resumeCapsule.openTicks.map((item)=>item.id).sort(),
    failureSignatures: resumeCapsule.knownFailures.map((item)=>item.failureSignature).sort(),
    compilerSupplementHash: compilerSupplement?.supplementHash ?? "",
    policy,
  };
  const packageHash = await sha256(canonicalJson(stable));
  return {
    format: "GLOBAL_CONTEXT_PACKAGE",
    version: 1,
    memoryRoot: snapshot.memoryRoot,
    projectId: project.id,
    projectName: project.name,
    task: cleanTask,
    resumeCapsule,
    policy,
    compilerSupplement,
    packageHash,
    generatedAt: new Date().toISOString(),
  };
}

export function renderGlobalContextOutbound(pkg: GlobalContextPackage) {
  const truth = pkg.resumeCapsule.currentTruth.slice(0, 12);
  const ticks = pkg.resumeCapsule.openTicks.slice(0, 8);
  const failures = pkg.resumeCapsule.knownFailures.slice(0, 6);
  const evidenceIds = pkg.compilerSupplement?.evidenceIds ?? pkg.resumeCapsule.evidenceRefs;
  return [
    "GLOBAL CONTEXT — BOUNDED CONTINUATION PACKAGE",
    `Project: ${pkg.projectName}`,
    `Task: ${pkg.task}`,
    `Current goal: ${pkg.resumeCapsule.goal}`,
    "",
    "CURRENT TRUTH:",
    ...(truth.length ? truth.map((item)=>`- [${item.kind}] ${item.text}`) : ["- No promoted Current Truth for this project."]),
    "",
    "OPEN HUMAN CONTROL POINTS:",
    ...(ticks.length ? ticks.map((item)=>`- [${item.priority}] ${item.title}: ${item.detail}`) : ["- None."]),
    "",
    "KNOWN FAILED ROUTES / REPAIRS:",
    ...(failures.length ? failures.map((item)=>`- ${item.title}: ${item.cause}${item.repairThatWorked ? ` | repair: ${item.repairThatWorked}` : ""}`) : ["- None recorded."]),
    "",
    `EXACT NEXT ACTION: ${pkg.resumeCapsule.nextAction.text}`,
    ...(pkg.resumeCapsule.continuity?.prescription?.length?["", "CONTINUITY PRESCRIPTION:", ...pkg.resumeCapsule.continuity.prescription.map((item)=>`- ${item}`)]:[]),
    "",
    `SELECTED EVIDENCE IDS (${evidenceIds.length}): ${evidenceIds.slice(0,64).join(", ")}`,
    "",
    "BOUNDARIES:",
    "- Use only this bounded package plus evidence explicitly provided with it.",
    "- Preserve uncertainty, conflict and superseded history; do not flatten them into Current Truth.",
    "- Do not treat this package as permission to read or transmit the full archive.",
    "- Returned results are proposals until source/provenance verification passes.",
    "",
    `GLOBAL_CONTEXT_PACKAGE_HASH: ${pkg.packageHash}`,
  ].join("\n");
}

export async function buildGlobalContextHandoffReceipt(input:{
  pkg: GlobalContextPackage;
  outbound: string;
  destination: "chatgpt"|"claude"|"gemini"|"manual";
  sourceSurface: "web"|"android"|"extension"|"mcp";
}) {
  const outboundHash = await sha256(input.outbound);
  const r1Authority=requireR1Allow(await issueUserR1Allow({
    action:"GLOBAL_CONTEXT_HANDOFF",
    scope:`${input.pkg.projectId}:${input.destination}:${input.pkg.packageHash}`,
    reason:"User explicitly approved this exact bounded outbound package.",
    evidenceRefs:[input.pkg.packageHash,outboundHash],
  }),"GLOBAL_CONTEXT_HANDOFF",`${input.pkg.projectId}:${input.destination}:${input.pkg.packageHash}`);
  const approvedAt = new Date().toISOString();
  const stable = {
    format: "GLOBAL_CONTEXT_HANDOFF",
    version: 1,
    memoryRoot: input.pkg.memoryRoot,
    projectId: input.pkg.projectId,
    destination: input.destination,
    packageHash: input.pkg.packageHash,
    outboundHash,
    sourceSurface: input.sourceSurface,
    consent: "EXPLICIT_USER_ACTION",
    r1Signal:r1Authority.signal,
    r1Hash:r1Authority.hash,
  };
  return {
    ...stable,
    id: await canonicalId("gch", input.pkg.memoryRoot, input.pkg.projectId, input.pkg.packageHash, outboundHash, input.destination),
    approvedAt,
    hash: await sha256(canonicalJson(stable)),
  };
}
