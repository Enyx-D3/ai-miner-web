import { canonicalId, keywords, normalizeText, tokenOverlap } from "./identity";
import type { B2JobPackage, B2ResultPackage } from "./jobs";
import { compileB2Job } from "./jobs";
import { retrieveReasoningMemory, type ReasoningMemory } from "./reasoningCompiler";
import { runBrain2StructuredResidualReasoner, type Brain2ResidualReasonerOutput } from "./transformersRuntime";
import type { Brain2Snapshot, PatternRecord } from "./types";

export const BRAIN2_MRS_CONTROLLER_VERSION = "B2_MRS_CONTROLLER_V1";

export type MRSStageName =
  | "BRANCH_ZERO"
  | "CAPABILITY_LOOKUP"
  | "PATTERN_MEMORY"
  | "COGNITIVE_R1"
  | "TRACE"
  | "RPVM"
  | "TINY_SPECIALIST"
  | "MRS_MODEL"
  | "VERIFIER"
  | "REPAIR";

export type MRSStageRecord = {
  name: MRSStageName;
  status: "PASS" | "SKIP" | "FAIL";
  detail: string;
  confidence?: number;
  evidenceIds?: string[];
};

export type CapabilityMatch = {
  id: string;
  title: string;
  source: "registry" | "portable-expertise";
  score: number;
  verificationState?: string;
  version?: number;
  triggerConditions: string[];
  procedure: string[];
  verifier: string;
  provenanceAtomIds: string[];
};

export type PatternMatch = {
  id: string;
  label: string;
  score: number;
  status: PatternRecord["status"];
  mechanism?: string;
  predictions: string[];
  atomIds: string[];
};

export type MRSVerifierResult = {
  status: "PASS" | "FAIL" | "PENDING";
  detail: string;
  missingEvidenceIds: string[];
  outsideJobEvidenceIds: string[];
};

export type MRSControllerRun = {
  format: "B2_MRS_CONTROLLER_RUN";
  version: 1;
  id: string;
  question: string;
  projectId?: string;
  createdAt: string;
  usedMRS: boolean;
  terminatedBy: "BRANCH_ZERO" | "TINY_SPECIALIST" | "MRS_MODEL" | "REPAIR";
  confidence: number;
  job: B2JobPackage;
  result: B2ResultPackage;
  verification: MRSVerifierResult;
  stages: MRSStageRecord[];
  acceptanceTrace: string[];
  reasoningMemory: {
    capabilityCount: number;
    successfulTrajectoryCount: number;
    failureMemoryCount: number;
    knownRepairCount: number;
    boundaryConditions: string[];
  };
  capabilityMatches: CapabilityMatch[];
  patternMatches: PatternMatch[];
};

type ControllerContext = {
  snapshot: Brain2Snapshot;
  job: B2JobPackage;
  question: string;
  projectId?: string;
  reasoningMemory: ReasoningMemory;
  capabilityMatches: CapabilityMatch[];
  patternMatches: PatternMatch[];
};

type CandidateAnswer = {
  answer: string;
  evidenceIds: string[];
  confidence: number;
  terminationReason: string;
  residuals: string[];
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function topEvidence(job: B2JobPackage, limit = 3) {
  return [...job.evidence]
    .sort((a, b) => b.score - a.score || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, limit);
}

function matchScore(queryTerms: string[], text: string) {
  const textTerms = keywords(text, 20);
  return tokenOverlap(queryTerms, textTerms);
}

function currentTruthEvidence(job: B2JobPackage) {
  return job.evidence.filter((item) => item.type === "truth" && item.truthStatus === "CURRENT");
}

function conflictingEvidence(job: B2JobPackage) {
  return job.evidence.filter((item) => item.truthStatus === "CONFLICTING");
}

function capabilityScore(queryTerms: string[], text: string, base = 0) {
  return clamp(matchScore(queryTerms, text) * 0.55 + base);
}

function registryCapabilityMatches(snapshot: Brain2Snapshot, question: string, projectId: string | undefined, job: B2JobPackage, memory: ReasoningMemory): CapabilityMatch[] {
  const queryTerms = keywords(question, 16);
  const allowed = new Set(job.evidence.map((item) => item.id));
  return memory.capabilities.map((item) => {
    const provenance = item.evidenceIds.filter((id) => allowed.has(id));
    const score = capabilityScore(queryTerms, `${item.title} ${item.preconditions.join(" ")} ${item.procedure.join(" ")}`, (item.verificationState === "VERIFIED" ? 0.28 : item.verificationState === "TRANSFER_VERIFIED" ? 0.2 : 0.12) + Math.min(0.1, provenance.length * 0.03));
    return {
      id: item.id,
      title: item.title,
      source: "registry" as const,
      score,
      verificationState: item.verificationState,
      version: item.version,
      triggerConditions: item.preconditions,
      procedure: item.procedure,
      verifier: "B2VERIFY",
      provenanceAtomIds: provenance,
    };
  }).filter((item) => item.score >= 0.24);
}

function portableExpertiseMatches(snapshot: Brain2Snapshot, question: string, projectId: string | undefined, job: B2JobPackage): CapabilityMatch[] {
  const queryTerms = keywords(question, 16);
  const allowed = new Set(job.evidence.map((item) => item.id));
  const evidenceText = job.evidence.map((item) => item.text).join("\n");
  return snapshot.portableExpertise
    .map((item) => {
      const triggerText = item.triggerConditions.join(" ");
      const procedureText = item.procedure.join(" ");
      const overlap = matchScore(queryTerms, `${item.title} ${triggerText} ${procedureText} ${evidenceText}`);
      const provenanceHits = item.provenanceAtomIds.filter((id) => allowed.has(id)).length;
      const projectBoost = projectId && item.transferDomains.some((domain) => normalizeText(domain).includes(normalizeText(projectId))) ? 0.05 : 0;
      const score = clamp(overlap * 0.55 + item.confidence * 0.3 + Math.min(0.15, provenanceHits * 0.05) + projectBoost);
      return {
        id: item.id,
        title: item.title,
        source: "portable-expertise" as const,
        score,
        verificationState: "TRANSFER_VERIFIED",
        version: item.version,
        triggerConditions: item.triggerConditions,
        procedure: item.procedure,
        verifier: item.verifier,
        provenanceAtomIds: item.provenanceAtomIds.filter((id) => allowed.has(id)),
        raw: item,
      };
    })
    .filter((item) => item.score >= 0.28 || item.provenanceAtomIds.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ raw: _raw, ...rest }) => rest);
}

function lookupCapabilities(snapshot: Brain2Snapshot, question: string, projectId: string | undefined, job: B2JobPackage, memory: ReasoningMemory): CapabilityMatch[] {
  return [...registryCapabilityMatches(snapshot, question, projectId, job, memory), ...portableExpertiseMatches(snapshot, question, projectId, job)]
    .sort((a, b) => b.score - a.score || (a.source === "registry" ? -1 : 1))
    .slice(0, 6);
}

function lookupPatterns(snapshot: Brain2Snapshot, question: string, projectId: string | undefined, job: B2JobPackage): PatternMatch[] {
  const queryTerms = keywords(question, 16);
  const text = job.evidence.map((item) => item.text).join("\n");
  return snapshot.patterns
    .filter((item) => !projectId || item.projectIds.includes(projectId))
    .map((item) => {
      const overlap = matchScore(queryTerms, `${item.label} ${item.hypothesis ?? ""} ${item.mechanism ?? ""} ${text}`);
      const strength = clamp(item.strength);
      const verificationBoost = item.status === "VERIFIED" ? 0.18 : item.status === "TESTING" ? 0.1 : 0;
      const score = clamp(overlap * 0.55 + strength * 0.3 + verificationBoost);
      return {
        id: item.id,
        label: item.label,
        score,
        status: item.status,
        mechanism: item.mechanism,
        predictions: item.predictions ?? [],
        atomIds: item.atomIds.slice(0, 8),
      };
    })
    .filter((item) => item.score >= 0.24)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function buildBranchZeroCandidate(context: ControllerContext): CandidateAnswer | null {
  const job = context.job;
  const registryCapability = context.capabilityMatches.find((item) => item.source === "registry" && item.score >= 0.56 && item.provenanceAtomIds.length);
  if (registryCapability) {
    return {
      answer: `Branch Zero compiled capability execution: ${registryCapability.title}. Procedure: ${registryCapability.procedure.slice(0, 4).join(" ")}`,
      evidenceIds: unique(registryCapability.provenanceAtomIds.slice(0, 6)),
      confidence: clamp(0.8 + registryCapability.score * 0.12),
      terminationReason: "Branch Zero executed a compiled deterministic capability from the Capability Registry.",
      residuals: [],
    };
  }
  const truths = currentTruthEvidence(job);
  const conflicts = conflictingEvidence(job);
  const evidence = topEvidence(job, 3);
  const top = evidence[0];
  if (!top) return null;
  const base = clamp(job.evidencePolicy.sufficiencyScore);
  const topScore = clamp(top.score / 8);
  const truthBoost = truths.length ? 0.12 : 0;
  const conflictPenalty = conflicts.length ? 0.22 : 0;
  const confidence = clamp(base * 0.5 + topScore * 0.28 + truthBoost - conflictPenalty);
  if (job.evidencePolicy.sufficiencyState !== "SUFFICIENT" || confidence < 0.84) return null;
  const chosen = truths.length ? truths.slice(0, 2) : evidence.slice(0, 2);
  const answer = truths.length
    ? `Deterministic answer from current evidence: ${chosen.map((item) => item.text).join(" ")}`
    : `Best deterministic evidence-backed answer: ${chosen.map((item) => item.text).join(" ")}`;
  return {
    answer,
    evidenceIds: unique(chosen.map((item) => item.id)),
    confidence,
    terminationReason: "Branch Zero accepted the current deterministic answer path.",
    residuals: [],
  };
}

function cognitiveR1(context: ControllerContext, branchZero: CandidateAnswer | null) {
  const topCapability = context.capabilityMatches[0];
  const topPattern = context.patternMatches[0];
  const conflicts = conflictingEvidence(context.job).length;
  const knownFailure = context.reasoningMemory.failureMemories[0];
  const knownRepair = context.reasoningMemory.knownRepairs[0];
  const lowDeterministicConfidence = !branchZero || branchZero.confidence < 0.84;
  if (!lowDeterministicConfidence) return { operation: "STOP_DETERMINISTIC", confidence: branchZero.confidence, reason: "Branch Zero produced a high-confidence grounded answer." as const };
  if (topCapability && topCapability.score >= 0.55 && topCapability.provenanceAtomIds.length) return { operation: "CALL_SPECIALIST", confidence: clamp(0.72 + topCapability.score * 0.18), reason: `${topCapability.source === "registry" ? "Compiled capability" : "Portable expertise"} matches the request and is already grounded by current evidence.` as const };
  if (knownFailure && knownRepair) return { operation: "CALL_SPECIALIST", confidence: 0.74, reason: "Failure memory found a prior repairable path, so the next useful operation is a bounded specialist repair rather than fresh model-first reasoning." as const };
  if (conflicts > 0) return { operation: "CALL_TINY_SPECIALIST", confidence: 0.76, reason: "Conflict-aware synthesis is needed before any residual model escalation." as const };
  if (topPattern && topPattern.score >= 0.5) return { operation: "CALL_SPECIALIST", confidence: clamp(0.68 + topPattern.score * 0.16), reason: "Pattern memory offers a bounded specialist synthesis path." as const };
  return { operation: "ESCALATE_MRS_MODEL", confidence: 0.58, reason: "Deterministic evidence is bounded but not decisive enough; residual reasoning is warranted." as const };
}

function traceStage(context: ControllerContext, r1: ReturnType<typeof cognitiveR1>) {
  const hasEvidence = context.job.evidence.length > 0;
  const hasDependencies = r1.operation !== "CALL_SPECIALIST" || Boolean(context.capabilityMatches[0] || context.patternMatches[0] || conflictingEvidence(context.job).length || currentTruthEvidence(context.job).length);
  const deterministicOnly = r1.operation !== "ESCALATE_MRS_MODEL";
  return {
    status: hasEvidence && hasDependencies ? "PASS" : "FAIL",
    confidence: clamp((hasEvidence ? 0.55 : 0) + (hasDependencies ? 0.2 : 0) + (deterministicOnly ? 0.15 : 0.05)),
    detail: !hasEvidence
      ? "TRACE rejected the request because no bounded evidence was available."
      : !hasDependencies
        ? "TRACE failed closed because the proposed operation lacked the required capability/pattern/evidence dependencies."
        : deterministicOnly
          ? "TRACE accepted a bounded grounded path without mandatory MRS escalation."
          : "TRACE accepted residual escalation because the Databox is bounded but not yet decisive.",
  } as const;
}

function rpvmStage(context: ControllerContext, branchZero: CandidateAnswer | null, r1: ReturnType<typeof cognitiveR1>, trace: ReturnType<typeof traceStage>) {
  const lowConfidence = !branchZero || branchZero.confidence < 0.84;
  const job = context.job;
  const knownRepair = context.reasoningMemory.knownRepairs[0];
  if (trace.status === "FAIL") {
    return {
      escalateToMRSModel: false,
      confidence: 0.12,
      detail: "RPVM failed closed because TRACE rejected the proposed transition.",
    };
  }
  const escalate = !knownRepair && (r1.operation === "ESCALATE_MRS_MODEL" || (lowConfidence && job.evidencePolicy.sufficiencyState !== "SUFFICIENT"));
  return {
    escalateToMRSModel: escalate,
    confidence: escalate ? 0.6 : 0.82,
    detail: escalate
      ? "RPVM kept MRS behind a low-confidence gate and opened the browser MRS model residual lane."
      : knownRepair
        ? "RPVM selected a known bounded repair/capability path from failure memory instead of escalating to the browser MRS model."
        : "RPVM kept execution deterministic because confidence remained acceptable without MRS.",
  };
}

function runTinySpecialist(context: ControllerContext): CandidateAnswer | null {
  const capability = context.capabilityMatches[0];
  if (capability && capability.score >= 0.55 && capability.provenanceAtomIds.length) {
    const steps = capability.procedure.slice(0, 3).join(" ");
    return {
      answer: `Tiny Specialist procedure match: ${capability.title}. Recommended bounded procedure: ${steps}${capability.verifier ? ` Verifier: ${capability.verifier}.` : ""}`,
      evidenceIds: unique(capability.provenanceAtomIds.slice(0, 4)),
      confidence: clamp(0.72 + capability.score * 0.18),
      terminationReason: "Tiny Specialist answered from portable expertise grounded in the Databox.",
      residuals: [],
    };
  }
  const conflicts = conflictingEvidence(context.job);
  if (conflicts.length) {
    const supporting = topEvidence(context.job, 3);
    return {
      answer: `Tiny Specialist conflict report: the current evidence is not fully settled. Conflicting items include ${conflicts.slice(0, 2).map((item) => item.text).join(" ")} Use the supporting Databox evidence before committing a single truth.`,
      evidenceIds: unique([...conflicts.slice(0, 2).map((item) => item.id), ...supporting.slice(0, 2).map((item) => item.id)]),
      confidence: 0.78,
      terminationReason: "Tiny Specialist stopped on a conflict-aware bounded answer.",
      residuals: ["Conflict remains unresolved in the current Databox."],
    };
  }
  const truths = currentTruthEvidence(context.job);
  if (truths.length) {
    return {
      answer: `Tiny Specialist current-truth synthesis: ${truths.slice(0, 2).map((item) => item.text).join(" ")}`,
      evidenceIds: unique(truths.slice(0, 2).map((item) => item.id)),
      confidence: 0.76,
      terminationReason: "Tiny Specialist synthesized the strongest current truth items.",
      residuals: [],
    };
  }
  return null;
}

function buildResidualContext(context: ControllerContext) {
  return JSON.stringify({
    question: context.question,
    databox: {
      id: context.job.databox.id,
      hash: context.job.databox.hash,
      route: context.job.databox.retrievalRoute,
      sufficiency: context.job.evidencePolicy.sufficiencyState,
      score: context.job.evidencePolicy.sufficiencyScore,
      currentTruthCount: context.job.databox.currentTruthCount,
      conflictCount: context.job.databox.conflictCount,
    },
    capabilityMatches: context.capabilityMatches.map((item) => ({
      id: item.id,
      title: item.title,
      score: item.score,
      triggerConditions: item.triggerConditions,
      procedure: item.procedure.slice(0, 4),
      verifier: item.verifier,
      provenanceAtomIds: item.provenanceAtomIds,
    })),
    patternMatches: context.patternMatches.map((item) => ({
      id: item.id,
      label: item.label,
      score: item.score,
      status: item.status,
      mechanism: item.mechanism,
      predictions: item.predictions.slice(0, 3),
      atomIds: item.atomIds.slice(0, 5),
    })),
    evidence: context.job.evidence.slice(0, 10).map((item) => ({
      id: item.id,
      type: item.type,
      truthStatus: item.truthStatus,
      score: item.score,
      text: item.text,
    })),
  });
}

function buildResult(job: B2JobPackage, candidate: CandidateAnswer, model: string): B2ResultPackage {
  return {
    format: "B2RESULT",
    version: 2,
    jobId: job.id,
    databoxHash: job.databox.hash,
    answer: candidate.answer.trim(),
    evidenceIds: unique(candidate.evidenceIds),
    model,
    createdAt: new Date().toISOString(),
  };
}

function verifyResultAgainstJob(job: B2JobPackage, result: B2ResultPackage): MRSVerifierResult {
  const allowed = new Set(job.evidence.map((item) => item.id));
  const uniqueEvidenceIds = unique(result.evidenceIds);
  const outsideJobEvidenceIds = uniqueEvidenceIds.filter((id) => !allowed.has(id));
  const missingEvidenceIds: string[] = [];
  if (result.databoxHash !== job.databox.hash) {
    return {
      status: "FAIL",
      detail: "Result Databox hash does not match the compiled B2JOB Databox.",
      missingEvidenceIds,
      outsideJobEvidenceIds,
    };
  }
  if (!uniqueEvidenceIds.length) {
    return {
      status: "PENDING",
      detail: "No evidence IDs were cited.",
      missingEvidenceIds,
      outsideJobEvidenceIds,
    };
  }
  if (outsideJobEvidenceIds.length) {
    return {
      status: "FAIL",
      detail: `Result cites ${outsideJobEvidenceIds.length} evidence ID(s) outside the compiled B2JOB.`,
      missingEvidenceIds,
      outsideJobEvidenceIds,
    };
  }
  return {
    status: "PASS",
    detail: `Explicit controller verification PASS: all ${uniqueEvidenceIds.length} cited evidence ID(s) belong to the compiled B2JOB.`,
    missingEvidenceIds,
    outsideJobEvidenceIds,
  };
}

function repairCandidate(context: ControllerContext, proposal: CandidateAnswer | null, verification: MRSVerifierResult): CandidateAnswer {
  if (proposal && verification.status === "PASS") return proposal;
  const tiny = runTinySpecialist(context);
  if (tiny) return { ...tiny, confidence: clamp(Math.max(tiny.confidence, 0.74)) };
  const fallback = topEvidence(context.job, 2);
  return {
    answer: `Repair fallback from verified Databox evidence: ${fallback.map((item) => item.text).join(" ")}`.trim(),
    evidenceIds: fallback.map((item) => item.id),
    confidence: 0.7,
    terminationReason: "Repair rebuilt the answer from bounded verified evidence after verifier rejection.",
    residuals: [`Repair reason: ${verification.detail}`],
  };
}

function proposalToCandidate(proposal: Brain2ResidualReasonerOutput): CandidateAnswer {
  return {
    answer: proposal.answer,
    evidenceIds: proposal.evidenceIds,
    confidence: clamp(proposal.confidence),
    terminationReason: proposal.terminationReason,
    residuals: proposal.residuals,
  };
}

function buildAcceptanceTrace(stages: MRSStageRecord[], usedMRS: boolean) {
  const trace = ["DATABOX", "BRANCH_ZERO", "CAPABILITY_LOOKUP", "PATTERN_MEMORY", "COGNITIVE_R1", "TRACE_RPVM", "TINY_SPECIALIST"] as string[];
  if (usedMRS) trace.push("WEB_MRS_MODEL");
  trace.push("VERIFY");
  if (stages.some((item) => item.name === "REPAIR" && item.status !== "SKIP")) trace.push("REPAIR");
  return trace;
}

export async function runExplicitMRSController(snapshot: Brain2Snapshot, question: string, projectId?: string, limit = 24): Promise<MRSControllerRun> {
  const createdAt = new Date().toISOString();
  const job = await compileB2Job(snapshot, question, projectId, limit);
  const reasoningMemory = retrieveReasoningMemory(snapshot, { question, projectId });
  const capabilityMatches = lookupCapabilities(snapshot, question, projectId, job, reasoningMemory);
  const patternMatches = lookupPatterns(snapshot, question, projectId, job);
  const stages: MRSStageRecord[] = [];
  const context: ControllerContext = { snapshot, job, question, projectId, reasoningMemory, capabilityMatches, patternMatches };

  const branchZero = buildBranchZeroCandidate(context);
  stages.push({
    name: "BRANCH_ZERO",
    status: branchZero ? "PASS" : "SKIP",
    detail: branchZero
      ? "Branch Zero found a sufficiently grounded deterministic answer."
      : "Branch Zero did not find a high-confidence deterministic answer.",
    confidence: branchZero?.confidence,
    evidenceIds: branchZero?.evidenceIds,
  });
  stages.push({
    name: "CAPABILITY_LOOKUP",
    status: capabilityMatches.length ? "PASS" : "SKIP",
    detail: capabilityMatches.length
      ? `Capability Lookup found ${capabilityMatches.length} bounded capability candidate(s), including ${capabilityMatches.filter((item) => item.source === "registry").length} registry hit(s).`
      : "Capability Lookup found no grounded compiled capability or portable-expertise match.",
    confidence: capabilityMatches[0]?.score,
    evidenceIds: capabilityMatches.flatMap((item) => item.provenanceAtomIds).slice(0, 6),
  });
  stages.push({
    name: "PATTERN_MEMORY",
    status: patternMatches.length ? "PASS" : "SKIP",
    detail: `Pattern Memory loaded ${patternMatches.length} pattern signal(s), ${reasoningMemory.successfulTrajectories.length} successful trajectory match(es), ${reasoningMemory.failureMemories.length} failure memory match(es), and ${reasoningMemory.knownRepairs.length} known repair candidate(s).`,
    confidence: patternMatches[0]?.score,
    evidenceIds: patternMatches.flatMap((item) => item.atomIds).slice(0, 6),
  });

  const r1 = cognitiveR1(context, branchZero);
  stages.push({
    name: "COGNITIVE_R1",
    status: "PASS",
    detail: `${r1.reason} Operation=${r1.operation}.`,
    confidence: r1.confidence,
  });

  const trace = traceStage(context, r1);
  stages.push({
    name: "TRACE",
    status: trace.status,
    detail: trace.detail,
    confidence: trace.confidence,
  });

  const rpvm = rpvmStage(context, branchZero, r1, trace);
  stages.push({
    name: "RPVM",
    status: "PASS",
    detail: rpvm.detail,
    confidence: rpvm.confidence,
  });

  let terminatedBy: MRSControllerRun["terminatedBy"] = "BRANCH_ZERO";
  let usedMRS = false;
  let candidate = branchZero;
  let finalConfidence = branchZero?.confidence ?? 0;

  if ((!candidate || candidate.confidence < 0.84) && trace.status === "FAIL") {
    stages.push({
      name: "TINY_SPECIALIST",
      status: "SKIP",
      detail: "Tiny Specialist skipped because TRACE failed closed on the proposed transition.",
    });
    stages.push({
      name: "MRS_MODEL",
      status: "SKIP",
      detail: "Browser MRS model residual lane skipped because TRACE / RPVM rejected the transition before neural escalation.",
    });
  } else if (!candidate || candidate.confidence < 0.84) {
    const tiny = runTinySpecialist(context);
    stages.push({
      name: "TINY_SPECIALIST",
      status: tiny ? "PASS" : "SKIP",
      detail: tiny ? tiny.terminationReason : "Tiny Specialist had no bounded specialist answer to contribute.",
      confidence: tiny?.confidence,
      evidenceIds: tiny?.evidenceIds,
    });
    if (tiny && (!rpvm.escalateToMRSModel || tiny.confidence >= 0.78)) {
      candidate = tiny;
      terminatedBy = "TINY_SPECIALIST";
      finalConfidence = tiny.confidence;
    } else {
      stages.push({
        name: "MRS_MODEL",
        status: "PASS",
        detail: "Browser MRS model residual lane activated because deterministic confidence was not yet good enough.",
        confidence: rpvm.confidence,
      });
      usedMRS = true;
      const mrsModelProposal = await runBrain2StructuredResidualReasoner({
        task: question,
        context: buildResidualContext(context),
        evidence: job.evidence.map((item) => ({
          id: item.id,
          type: item.type,
          text: item.text,
          score: item.score,
          truthStatus: item.truthStatus,
        })),
        maxTokens: 176,
      });
      candidate = proposalToCandidate(mrsModelProposal);
      finalConfidence = candidate.confidence;
      stages[stages.length - 1] = {
        name: "MRS_MODEL",
        status: "PASS",
        detail: candidate.terminationReason,
        confidence: candidate.confidence,
        evidenceIds: candidate.evidenceIds,
      };
      terminatedBy = "MRS_MODEL";
    }
  } else {
    stages.push({
      name: "TINY_SPECIALIST",
      status: "SKIP",
      detail: "Tiny Specialist skipped because Branch Zero already met the confidence gate.",
    });
    stages.push({
      name: "MRS_MODEL",
      status: "SKIP",
      detail: "Browser MRS model residual lane skipped because deterministic confidence was already high enough.",
    });
  }

  let result = buildResult(job, candidate ?? repairCandidate(context, null, { status: "FAIL", detail: "No candidate answer was produced.", missingEvidenceIds: [], outsideJobEvidenceIds: [] }), usedMRS ? "brain2-mrs-model-residual" : "brain2-deterministic");
  let verification = verifyResultAgainstJob(job, result);
  stages.push({
    name: "VERIFIER",
    status: verification.status === "PASS" ? "PASS" : verification.status === "PENDING" ? "SKIP" : "FAIL",
    detail: verification.detail,
    confidence: candidate?.confidence,
    evidenceIds: result.evidenceIds,
  });

  if (verification.status !== "PASS") {
    const repaired = repairCandidate(context, candidate, verification);
    result = buildResult(job, repaired, usedMRS ? "brain2-mrs-model-repair" : "brain2-deterministic-repair");
    verification = verifyResultAgainstJob(job, result);
    finalConfidence = repaired.confidence;
    stages.push({
      name: "REPAIR",
      status: verification.status === "PASS" ? "PASS" : "FAIL",
      detail: repaired.terminationReason,
      confidence: repaired.confidence,
      evidenceIds: repaired.evidenceIds,
    });
    terminatedBy = "REPAIR";
  } else {
    stages.push({
      name: "REPAIR",
      status: "SKIP",
      detail: "Repair skipped because the verifier passed on the first grounded result.",
    });
  }

  const acceptanceTrace = buildAcceptanceTrace(stages, usedMRS);

  const id = await canonicalId(BRAIN2_MRS_CONTROLLER_VERSION, snapshot.memoryRoot, normalizeText(question), job.id, createdAt);
  return {
    format: "B2_MRS_CONTROLLER_RUN",
    version: 1,
    id,
    question: normalizeText(question),
    projectId,
    createdAt,
    usedMRS,
    terminatedBy,
    confidence: clamp(finalConfidence || 0.7),
    job,
    result,
    verification,
    stages,
    acceptanceTrace,
    reasoningMemory: {
      capabilityCount: reasoningMemory.capabilities.length,
      successfulTrajectoryCount: reasoningMemory.successfulTrajectories.length,
      failureMemoryCount: reasoningMemory.failureMemories.length,
      knownRepairCount: reasoningMemory.knownRepairs.length,
      boundaryConditions: reasoningMemory.boundaryConditions,
    },
    capabilityMatches,
    patternMatches,
  };
}
