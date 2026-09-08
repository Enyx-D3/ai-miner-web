import type { AtomRecord, TruthRecord, TruthStatus } from "./types";
import { canonicalId, sha256 } from "./identity";

export const BRAIN2_R1_GRAPH_VERSION = "B2_R1_GRAPH_V1" as const;

export type R1NodeKind =
  | "ATOM" | "TRUTH" | "EVIDENCE" | "DECISION" | "CONSTRAINT" | "FAILURE"
  | "EXPERIMENT" | "RESULT" | "ARTIFACT" | "PROCEDURE" | "TASK" | "OPEN_QUESTION"
  | "RELEASE_GATE";

export type R1VerificationState = "VERIFIED" | "PARTIAL" | "CONFLICTING" | "UNVERIFIED" | "INVALID" | "NEEDS_REVERIFY";
export type R1EdgeType = "SUPPORTS" | "CONTRADICTS" | "SUPERSEDES" | "DEPENDS_ON" | "REQUIRES" | "PRODUCED_BY" | "VERIFIED_BY" | "FAILED_BY" | "RESOLVES" | "DERIVED_FROM" | "BLOCKS" | "IMPLEMENTS" | "AFFECTS" | "RELATED_TO";

export type R1GraphNode = {
  id: string;
  kind: R1NodeKind;
  projectId?: string;
  label: string;
  sourceRecordId?: string;
  truthStatus?: TruthStatus;
  verificationState: R1VerificationState;
  evidenceIds: string[];
  metadata?: Record<string, unknown>;
};

export type R1GraphEdge = { id: string; from: string; to: string; type: R1EdgeType; metadata?: Record<string, unknown> };
export type R1Graph = { format: "B2_R1_GRAPH"; version: 1; graphVersion: typeof BRAIN2_R1_GRAPH_VERSION; nodes: R1GraphNode[]; edges: R1GraphEdge[]; rootHash: string };

export type R1ReleaseGateDefinition = { id: string; label: string; projectId?: string; requires: string[]; evidenceNodeIds?: string[] };
export type R1ReleaseGateState = "PASS" | "FAIL" | "BLOCKED" | "NEEDS_REVERIFY" | "UNKNOWN";

function unique(values: Array<string | undefined>): string[] { return [...new Set(values.filter((value): value is string => Boolean(value)))].sort(); }
function nodeVerification(status?: TruthStatus): R1VerificationState {
  if (status === "CURRENT" || status === "HISTORICAL" || status === "SUPERSEDED") return "VERIFIED";
  if (status === "CONFLICTING") return "CONFLICTING";
  return "UNVERIFIED";
}
function atomNodeKind(atom: AtomRecord): R1NodeKind {
  if (atom.kind === "decision") return "DECISION";
  if (atom.kind === "constraint") return "CONSTRAINT";
  if (atom.kind === "task") return "TASK";
  if (atom.kind === "question") return "OPEN_QUESTION";
  return "ATOM";
}
async function edge(from: string, to: string, type: R1EdgeType, metadata?: Record<string, unknown>): Promise<R1GraphEdge> {
  return { id: await canonicalId("r1e", BRAIN2_R1_GRAPH_VERSION, from, type, to), from, to, type, ...(metadata ? { metadata } : {}) };
}

export async function projectR1Graph(input: { atoms: AtomRecord[]; truths: TruthRecord[]; releaseGates?: R1ReleaseGateDefinition[] }): Promise<R1Graph> {
  const nodes: R1GraphNode[] = [];
  const edges: R1GraphEdge[] = [];
  const truthNodeByRecordId = new Map<string, string>();
  const atomNodeByRecordId = new Map<string, string>();

  for (const atom of input.atoms) {
    const id = await canonicalId("r1n", BRAIN2_R1_GRAPH_VERSION, "atom", atom.id);
    atomNodeByRecordId.set(atom.id, id);
    nodes.push({
      id, kind: atomNodeKind(atom), projectId: atom.projectId, label: atom.text, sourceRecordId: atom.id,
      truthStatus: atom.truthStatus, verificationState: nodeVerification(atom.truthStatus),
      evidenceIds: unique([atom.messageId, atom.sourceId, ...atom.provenance]),
      metadata: { atomKind: atom.kind, canonicalSubject: atom.canonicalSubject, scope: atom.scope, value: atom.value, confidence: atom.confidence, hash: atom.hash },
    });
  }

  for (const truth of input.truths) {
    const id = await canonicalId("r1n", BRAIN2_R1_GRAPH_VERSION, "truth", truth.id);
    truthNodeByRecordId.set(truth.id, id);
    nodes.push({
      id, kind: truth.kind === "decision" ? "DECISION" : truth.kind === "constraint" ? "CONSTRAINT" : "TRUTH",
      projectId: truth.projectId, label: truth.text, sourceRecordId: truth.id, truthStatus: truth.status,
      verificationState: nodeVerification(truth.status),
      evidenceIds: unique([truth.atomId, truth.sourceId, ...(truth.evidenceAtomIds ?? [])]),
      metadata: { key: truth.key, canonicalSubject: truth.canonicalSubject, scope: truth.scope, value: truth.value, confidence: truth.confidence, relation: truth.relation, updatedAt: truth.updatedAt },
    });
  }

  for (const atom of input.atoms) {
    const from = atomNodeByRecordId.get(atom.id)!;
    if (atom.parentAtomId && atomNodeByRecordId.has(atom.parentAtomId)) edges.push(await edge(from, atomNodeByRecordId.get(atom.parentAtomId)!, "DERIVED_FROM"));
    if (atom.truthRecordId && truthNodeByRecordId.has(atom.truthRecordId)) edges.push(await edge(from, truthNodeByRecordId.get(atom.truthRecordId)!, "SUPPORTS"));
    if (atom.supersedesTruthId && truthNodeByRecordId.has(atom.supersedesTruthId)) edges.push(await edge(from, truthNodeByRecordId.get(atom.supersedesTruthId)!, "SUPERSEDES"));
  }

  for (const truth of input.truths) {
    const from = truthNodeByRecordId.get(truth.id)!;
    const sourceAtom = atomNodeByRecordId.get(truth.atomId);
    if (sourceAtom) edges.push(await edge(from, sourceAtom, "DERIVED_FROM"));
    for (const evidenceId of truth.evidenceAtomIds ?? []) {
      const evidence = atomNodeByRecordId.get(evidenceId);
      if (evidence) edges.push(await edge(evidence, from, "SUPPORTS"));
    }
    if (truth.supersedes && truthNodeByRecordId.has(truth.supersedes)) edges.push(await edge(from, truthNodeByRecordId.get(truth.supersedes)!, "SUPERSEDES"));
    for (const relatedId of truth.relatedTruthIds ?? []) {
      const related = truthNodeByRecordId.get(relatedId);
      if (!related) continue;
      const relation = truth.relation === "CONTRADICTS" ? "CONTRADICTS" : truth.relation === "SUPERSEDES" ? "SUPERSEDES" : "RELATED_TO";
      edges.push(await edge(from, related, relation));
    }
  }

  for (const gate of input.releaseGates ?? []) {
    const gateId = await canonicalId("r1n", BRAIN2_R1_GRAPH_VERSION, "release_gate", gate.id);
    nodes.push({ id: gateId, kind: "RELEASE_GATE", projectId: gate.projectId, label: gate.label, sourceRecordId: gate.id, verificationState: "UNVERIFIED", evidenceIds: unique(gate.evidenceNodeIds ?? []), metadata: { gateKey: gate.id } });
    for (const required of gate.requires) {
      const target = nodes.find((n) => n.id === required || n.sourceRecordId === required)?.id;
      if (target) edges.push(await edge(gateId, target, "REQUIRES"));
    }
  }

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  const dedupedEdges = [...new Map(edges.map((item) => [item.id, item])).values()].sort((a, b) => a.id.localeCompare(b.id));
  const rootMaterial = [
    nodes.map((node) => [node.id, node.kind, node.projectId ?? "", node.label, node.sourceRecordId ?? "", node.truthStatus ?? "", node.verificationState, node.evidenceIds]),
    dedupedEdges.map((item) => [item.id, item.from, item.to, item.type]),
  ];
  const rootHash = await sha256(JSON.stringify(rootMaterial));
  return { format: "B2_R1_GRAPH", version: 1, graphVersion: BRAIN2_R1_GRAPH_VERSION, nodes, edges: dedupedEdges, rootHash };
}

export function getR1Node(graph: R1Graph, id: string): R1GraphNode | undefined { return graph.nodes.find((node) => node.id === id || node.sourceRecordId === id); }
export function r1Neighbors(graph: R1Graph, id: string, edgeTypes?: R1EdgeType[]): R1GraphNode[] {
  const node = getR1Node(graph, id); if (!node) return [];
  const allowed = edgeTypes ? new Set(edgeTypes) : undefined;
  const ids = new Set<string>();
  for (const e of graph.edges) {
    if (allowed && !allowed.has(e.type)) continue;
    if (e.from === node.id) ids.add(e.to);
    if (e.to === node.id) ids.add(e.from);
  }
  return graph.nodes.filter((candidate) => ids.has(candidate.id));
}
export function r1Dependencies(graph: R1Graph, id: string): R1GraphNode[] {
  const node = getR1Node(graph, id); if (!node) return [];
  const ids = new Set(graph.edges.filter((e) => e.from === node.id && (e.type === "DEPENDS_ON" || e.type === "REQUIRES")).map((e) => e.to));
  return graph.nodes.filter((candidate) => ids.has(candidate.id));
}
export function r1Dependents(graph: R1Graph, id: string): R1GraphNode[] {
  const node = getR1Node(graph, id); if (!node) return [];
  const ids = new Set(graph.edges.filter((e) => e.to === node.id && (e.type === "DEPENDS_ON" || e.type === "REQUIRES")).map((e) => e.from));
  return graph.nodes.filter((candidate) => ids.has(candidate.id));
}
export function r1CurrentTruth(graph: R1Graph, projectId?: string): R1GraphNode[] {
  return graph.nodes.filter((node) => node.kind !== "RELEASE_GATE" && node.truthStatus === "CURRENT" && (!projectId || node.projectId === projectId));
}
export function evaluateR1ReleaseGate(graph: R1Graph, gateId: string): R1ReleaseGateState {
  const gate = getR1Node(graph, gateId); if (!gate || gate.kind !== "RELEASE_GATE") return "UNKNOWN";
  const deps = r1Dependencies(graph, gate.id); if (!deps.length) return "UNKNOWN";
  if (deps.some((node) => node.verificationState === "INVALID" || node.truthStatus === "CONFLICTING")) return "FAIL";
  if (deps.some((node) => node.verificationState === "NEEDS_REVERIFY")) return "NEEDS_REVERIFY";
  if (deps.some((node) => node.verificationState !== "VERIFIED")) return "BLOCKED";
  return "PASS";
}
