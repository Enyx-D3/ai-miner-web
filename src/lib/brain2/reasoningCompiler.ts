import { BRAIN2_SCHEMA_VERSION } from "./contracts";
import { canonicalId, keywords, normalizeText, sha256, tokenOverlap } from "./identity";
import type {
  Brain2Snapshot,
  CompiledCapabilityRecord,
  FailureMemoryRecord,
  ReasoningTrajectoryRecord,
} from "./types";

type ControllerRunLike = {
  id: string;
  question: string;
  projectId?: string;
  createdAt: string;
  usedMRS: boolean;
  terminatedBy: "BRANCH_ZERO" | "TINY_SPECIALIST" | "MRS_MODEL" | "REPAIR";
  confidence: number;
  result: { answer: string; evidenceIds: string[] };
  verification: { status: "PASS" | "FAIL" | "PENDING"; detail: string };
  job: { id: string; databox: { id: string; hash: string }; evidencePolicy: { sufficiencyState: string }; evidence: Array<{ id: string }> };
  stages: Array<{ name: string; status: "PASS" | "SKIP" | "FAIL"; detail: string }>;
  capabilityMatches: Array<{ id: string; title: string; score: number; source?: string; verificationState?: string; procedure: string[]; triggerConditions: string[]; provenanceAtomIds: string[] }>;
  patternMatches: Array<{ id: string; label: string; score: number }>;
  acceptanceTrace?: string[];
};

export type ReasoningMemory = {
  capabilities: CompiledCapabilityRecord[];
  successfulTrajectories: ReasoningTrajectoryRecord[];
  failureMemories: FailureMemoryRecord[];
  knownRepairs: FailureMemoryRecord[];
  boundaryConditions: string[];
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function overlapForQuery(question: string, text: string) {
  return tokenOverlap(keywords(question, 14), keywords(text, 18));
}

export function retrieveReasoningMemory(snapshot: Brain2Snapshot, input: { question: string; projectId?: string }): ReasoningMemory {
  const capabilities = (snapshot.compiledCapabilities ?? [])
    .filter((item) => (!input.projectId || item.projectId === input.projectId || !item.projectId) && item.verificationState !== "REJECTED" && item.verificationState !== "DEPRECATED")
    .map((item) => ({ item, score: overlapForQuery(input.question, `${item.title} ${item.preconditions.join(" ")} ${item.procedure.join(" ")}`) + (item.verificationState === "VERIFIED" ? 0.25 : item.verificationState === "TRANSFER_VERIFIED" ? 0.18 : 0) }))
    .filter((item) => item.score >= 0.18)
    .sort((a, b) => b.score - a.score || (b.item.successfulRuns - a.item.successfulRuns))
    .slice(0, 5)
    .map((item) => item.item);

  const successfulTrajectories = (snapshot.reasoningTrajectories ?? [])
    .filter((item) => item.verificationStatus === "PASS" && item.outcome !== "FAILURE" && (!input.projectId || item.projectId === input.projectId || !item.projectId))
    .map((item) => ({ item, score: overlapForQuery(input.question, item.question) }))
    .filter((item) => item.score >= 0.16)
    .sort((a, b) => b.score - a.score || b.item.updatedAt.localeCompare(a.item.updatedAt))
    .slice(0, 6)
    .map((item) => item.item);

  const failureMemories = (snapshot.failureMemories ?? [])
    .filter((item) => (!input.projectId || item.projectId === input.projectId || !item.projectId))
    .map((item) => ({ item, score: overlapForQuery(input.question, `${item.title} ${item.cause} ${item.boundaryConditions.join(" ")} ${item.knownBadOperation ?? ""}`) }))
    .filter((item) => item.score >= 0.15)
    .sort((a, b) => b.score - a.score || b.item.lastSeenAt.localeCompare(a.item.lastSeenAt))
    .slice(0, 6)
    .map((item) => item.item);

  const knownRepairs = failureMemories.filter((item) => Boolean(item.repairThatWorked));
  const boundaryConditions = [...new Set([
    ...capabilities.flatMap((item) => item.boundaryConditions),
    ...successfulTrajectories.flatMap((item) => item.boundaryConditions),
    ...failureMemories.flatMap((item) => item.boundaryConditions),
  ])].slice(0, 12);

  return { capabilities, successfulTrajectories, failureMemories, knownRepairs, boundaryConditions };
}

function trajectoryOutcome(run: ControllerRunLike): ReasoningTrajectoryRecord["outcome"] {
  if (run.terminatedBy === "REPAIR") return "REPAIR";
  if (run.verification.status === "PASS") return "SUCCESS";
  return "FAILURE";
}

function stageDetail(run: ControllerRunLike, name: string) {
  return run.stages.find((item) => item.name === name)?.detail;
}

export async function buildReasoningTrajectory(run: ControllerRunLike, memory: ReasoningMemory): Promise<ReasoningTrajectoryRecord> {
  const acceptanceTrace = run.acceptanceTrace ?? [];
  const operationSequence = run.stages
    .filter((item) => item.name === "COGNITIVE_R1" || item.name === "TRACE" || item.name === "RPVM" || item.name === "TINY_SPECIALIST" || item.name === "MRS_MODEL" || item.name === "REPAIR")
    .map((item) => `${item.name}:${item.status}`);
  const boundaryConditions = [...new Set([
    ...memory.boundaryConditions,
    stageDetail(run, "PATTERN_MEMORY")?.includes("no strong recurring pattern") ? "No strong historical pattern match" : "",
    run.job.evidencePolicy.sufficiencyState !== "SUFFICIENT" ? `Databox sufficiency ${run.job.evidencePolicy.sufficiencyState}` : "",
  ].filter(Boolean))];
  const trajectoryKey = normalizeText(keywords(run.question, 8).join(" ") || run.question).slice(0, 160);
  const failureSource = stageDetail(run, "VERIFIER") || stageDetail(run, "REPAIR") || run.verification.detail;
  const failureSignature = run.verification.status === "PASS" && run.terminatedBy !== "REPAIR"
    ? undefined
    : normalizeText([run.terminatedBy, failureSource].filter(Boolean).join(" | "));
  const payload = {
    trajectoryKey,
    question: run.question,
    projectId: run.projectId,
    databoxId: run.job.databox.id,
    databoxHash: run.job.databox.hash,
    stageTrace: acceptanceTrace,
    operationSequence,
    evidenceIds: run.result.evidenceIds,
    capabilityId: run.capabilityMatches[0]?.source === "registry" ? run.capabilityMatches[0]?.id : undefined,
    successPatternIds: run.patternMatches.map((item) => item.id).slice(0, 6),
    failureMemoryIds: memory.failureMemories.map((item) => item.id).slice(0, 6),
    boundaryConditions,
    verificationStatus: run.verification.status,
    outcome: trajectoryOutcome(run),
    usedMRS: run.usedMRS,
    terminatedBy: run.terminatedBy,
    residualCount: stageDetail(run, "REPAIR")?.includes("skipped") ? 0 : Number(run.terminatedBy === "REPAIR"),
    repairApplied: run.terminatedBy === "REPAIR",
    failureSignature,
    createdAt: run.createdAt,
    updatedAt: run.createdAt,
  };
  const hash = await sha256(JSON.stringify(payload));
  return {
    id: await canonicalId("trajectory", trajectoryKey, run.job.id, run.createdAt),
    ...payload,
    hash,
    schemaVersion: BRAIN2_SCHEMA_VERSION,
  };
}

export async function buildFailureMemory(run: ControllerRunLike, trajectory: ReasoningTrajectoryRecord): Promise<FailureMemoryRecord | null> {
  if (trajectory.verificationStatus === "PASS" && !trajectory.repairApplied) return null;
  const failureSignature = trajectory.failureSignature ?? normalizeText(`${trajectory.terminatedBy} ${run.verification.detail}`);
  const cause = stageDetail(run, "VERIFIER") || run.verification.detail;
  const repairThatWorked = run.terminatedBy === "REPAIR" ? (stageDetail(run, "REPAIR") || "Residual-only repair") : undefined;
  const repairNotApplicableWhen = trajectory.boundaryConditions.filter((item) => /No strong historical pattern match|Databox sufficiency/i.test(item));
  const payload = {
    failureSignature,
    title: `Failure memory: ${run.question.slice(0, 96)}`,
    projectId: run.projectId,
    trajectoryId: trajectory.id,
    failedStage: run.terminatedBy === "REPAIR" ? "VERIFIER" : run.terminatedBy,
    cause,
    knownBadOperation: stageDetail(run, "COGNITIVE_R1"),
    stageTrace: trajectory.stageTrace,
    evidenceIds: trajectory.evidenceIds,
    boundaryConditions: trajectory.boundaryConditions,
    repairThatWorked,
    repairNotApplicableWhen,
    occurrenceCount: 1,
    lastSeenAt: run.createdAt,
    createdAt: run.createdAt,
  };
  const hash = await sha256(JSON.stringify(payload));
  return {
    id: await canonicalId("failure-memory", failureSignature, run.projectId, run.createdAt),
    ...payload,
    hash,
    schemaVersion: BRAIN2_SCHEMA_VERSION,
  };
}

export async function compileCapabilityFromControllerRun(snapshot: Brain2Snapshot, run: ControllerRunLike, trajectory: ReasoningTrajectoryRecord): Promise<CompiledCapabilityRecord | null> {
  if (run.verification.status !== "PASS" || !run.result.evidenceIds.length) return null;
  const registryKey = normalizeText(keywords(run.question, 8).join(" ") || run.question).slice(0, 160);
  const existing = (snapshot.compiledCapabilities ?? []).filter((item) => item.registryKey === registryKey && item.projectId === run.projectId);
  const prior = existing.sort((a, b) => b.version - a.version)[0];
  const topCapability = run.capabilityMatches[0];
  const version = (prior?.version ?? 0) + 1;
  const repeatedSuccesses = (snapshot.reasoningTrajectories ?? []).filter((item) => item.trajectoryKey === trajectory.trajectoryKey && item.verificationStatus === "PASS").length;
  const verificationState: CompiledCapabilityRecord["verificationState"] =
    topCapability?.source === "registry" && topCapability.verificationState === "VERIFIED" ? "VERIFIED" :
    topCapability?.source === "portable-expertise" ? "TRANSFER_VERIFIED" :
    !run.usedMRS && repeatedSuccesses >= 1 ? "VERIFIED" :
    !run.usedMRS ? "REPLAY_VERIFIED" :
    "CANDIDATE";
  const boundaryConditions = [...new Set([
    ...trajectory.boundaryConditions,
    ...run.capabilityMatches.flatMap((item) => item.triggerConditions).slice(0, 6),
  ])].slice(0, 12);
  const procedure = topCapability?.procedure?.length
    ? topCapability.procedure.slice(0, 6)
    : [
        `Compile bounded Databox for: ${run.question}`,
        "Run Branch Zero and capability lookup before neural escalation.",
        `Terminate via ${run.terminatedBy} when the verifier passes.`,
      ];
  const stageOrigin: CompiledCapabilityRecord["stageOrigin"] = run.usedMRS
    ? (run.terminatedBy === "MRS_MODEL" ? "WEB_MRS_MODEL" : "REPAIR")
    : (run.terminatedBy === "BRANCH_ZERO" ? "BRANCH_ZERO" : "TINY_SPECIALIST");
  const payload = {
    registryKey,
    title: topCapability?.title || `Compiled capability for ${run.question.slice(0, 72)}`,
    projectId: run.projectId,
    sourcePatternId: run.patternMatches[0]?.id,
    sourceTrajectoryId: trajectory.id,
    version,
    stageOrigin,
    preconditions: [...new Set([
      `Databox sufficiency ${run.job.evidencePolicy.sufficiencyState}`,
      ...run.capabilityMatches.flatMap((item) => item.triggerConditions),
    ])].slice(0, 10),
    inputShape: ["task:string", "databox:evidence-bounded", run.projectId ? "projectScope:required" : "projectScope:optional"],
    outputShape: ["answer:string", "evidenceIds:string[]", "verification:PASS|FAIL|PENDING"],
    dependencies: [...new Set(["B2JOB", "B2VERIFY", ...(run.usedMRS ? ["WEB_MRS_MODEL"] : []), ...((run.acceptanceTrace ?? []).filter((item) => item !== "DATABOX"))])].slice(0, 12),
    procedure,
    boundaryConditions,
    repairHints: run.terminatedBy === "REPAIR" ? [stageDetail(run, "REPAIR") || "Residual-only repair may be required."] : [],
    evidenceIds: run.result.evidenceIds.slice(0, 8),
    verificationState,
    successfulRuns: (prior?.successfulRuns ?? 0) + 1,
    failedRuns: prior?.failedRuns ?? 0,
    lastUsedAt: run.createdAt,
    lastVerifiedAt: run.createdAt,
    rollbackCapabilityId: prior?.id,
    createdAt: run.createdAt,
    updatedAt: run.createdAt,
  };
  const hash = await sha256(JSON.stringify(payload));
  return {
    id: await canonicalId("capability", registryKey, version, run.projectId),
    ...payload,
    hash,
    schemaVersion: BRAIN2_SCHEMA_VERSION,
  };
}
