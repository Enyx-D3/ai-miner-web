import { canonicalId, sha256 } from "./identity";
import type { R1Graph, R1GraphNode } from "./r1Graph";

export const BRAIN2_R2_GRAPH_VERSION = "B2_R2_GRAPH_V1" as const;
export type R2NodeKind = "HYPOTHESIS" | "CAUSAL_HYPOTHESIS" | "POSSIBLE_RELATION" | "MISSING_EVIDENCE" | "RESEARCH_QUESTION" | "CANDIDATE_ACTION" | "COUNTERFACTUAL" | "RISK" | "OPPORTUNITY" | "PREDICTION";
export type R2NodeStatus = "PROVISIONAL" | "TESTABLE" | "DISPROVED" | "STALE" | "PROMOTION_CANDIDATE";
export type R2EdgeType = "DERIVED_FROM" | "SUGGESTS" | "MAY_CAUSE" | "MAY_BLOCK" | "REQUIRES_EVIDENCE" | "ALTERNATIVE_TO" | "AFFECTS";
export type R2GraphNode = { id: string; kind: R2NodeKind; projectId?: string; statement: string; derivedFrom: string[]; confidence: number; status: R2NodeStatus; requiredEvidence: string[]; staleWhen: string[]; metadata?: Record<string, unknown> };
export type R2GraphEdge = { id: string; from: string; to: string; type: R2EdgeType };
export type R2Graph = { format: "B2_R2_GRAPH"; version: 1; graphVersion: typeof BRAIN2_R2_GRAPH_VERSION; nodes: R2GraphNode[]; edges: R2GraphEdge[]; rootHash: string };
export type R2Proposal = Omit<R2GraphNode, "id" | "derivedFrom"> & { derivedFrom: Array<R1GraphNode | string> };

function normalizeRefs(refs: Array<R1GraphNode | string>): string[] { return [...new Set(refs.map((ref) => typeof ref === "string" ? ref : ref.id))].sort(); }
async function edge(from: string, to: string, type: R2EdgeType): Promise<R2GraphEdge> { return { id: await canonicalId("r2e", BRAIN2_R2_GRAPH_VERSION, from, type, to), from, to, type }; }

export async function buildR2Graph(r1: R1Graph, proposals: R2Proposal[]): Promise<R2Graph> {
  const r1Ids = new Set(r1.nodes.map((node) => node.id));
  const nodes: R2GraphNode[] = [];
  const edges: R2GraphEdge[] = [];
  for (const proposal of proposals) {
    const derivedFrom = normalizeRefs(proposal.derivedFrom);
    if (!derivedFrom.length || derivedFrom.some((id) => !r1Ids.has(id))) throw new Error("Every R2 node must derive from existing R1 node IDs.");
    const id = await canonicalId("r2n", BRAIN2_R2_GRAPH_VERSION, proposal.kind, proposal.projectId, proposal.statement, ...derivedFrom);
    const node: R2GraphNode = { ...proposal, id, derivedFrom, confidence: Math.max(0, Math.min(1, proposal.confidence)), requiredEvidence: [...new Set(proposal.requiredEvidence)].sort(), staleWhen: [...new Set(proposal.staleWhen)].sort() };
    nodes.push(node);
    for (const source of derivedFrom) edges.push(await edge(id, source, "DERIVED_FROM"));
  }
  nodes.sort((a, b) => a.id.localeCompare(b.id));
  const dedupedEdges = [...new Map(edges.map((item) => [item.id, item])).values()].sort((a, b) => a.id.localeCompare(b.id));
  const rootMaterial = [
    nodes.map((node) => [node.id, node.kind, node.projectId ?? "", node.statement, node.derivedFrom, node.confidence, node.status, node.requiredEvidence, node.staleWhen]),
    dedupedEdges.map((item) => [item.id, item.from, item.to, item.type]),
  ];
  const rootHash = await sha256(JSON.stringify(rootMaterial));
  return { format: "B2_R2_GRAPH", version: 1, graphVersion: BRAIN2_R2_GRAPH_VERSION, nodes, edges: dedupedEdges, rootHash };
}

export function getR2Node(graph: R2Graph, id: string): R2GraphNode | undefined { return graph.nodes.find((node) => node.id === id); }
export function r2PromotionCandidates(graph: R2Graph): R2GraphNode[] { return graph.nodes.filter((node) => node.status === "PROMOTION_CANDIDATE"); }
export function assertR2CannotMutateR1(_r1: R1Graph, r2: R2Graph): void {
  for (const node of r2.nodes) {
    if (!node.derivedFrom.length) throw new Error(`R2 node ${node.id} has no R1 derivation.`);
    if ((node.metadata as { currentTruth?: unknown } | undefined)?.currentTruth === true) throw new Error(`R2 node ${node.id} attempted to self-promote to Current Truth.`);
  }
}
