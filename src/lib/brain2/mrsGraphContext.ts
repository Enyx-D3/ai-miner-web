import type { B2JobPackage } from "./jobs";
import type { R1EdgeType, R1Graph, R1GraphNode } from "./r1Graph";
import type { R2Graph, R2GraphNode } from "./r2Graph";

export const BRAIN2_MRS_GRAPH_CONTEXT_VERSION = "B2_MRS_GRAPH_CONTEXT_V1" as const;
export type MRSGraphContext = {
  format: "B2_MRS_GRAPH_CONTEXT";
  version: 1;
  contextVersion: typeof BRAIN2_MRS_GRAPH_CONTEXT_VERSION;
  r1NodeIds: string[];
  r2NodeIds: string[];
  traversal: Array<{ from: string; to: string; type: string }>;
  depth: number;
  nodeBudget: number;
  truncated: boolean;
};

const DEFAULT_EDGE_TYPES: R1EdgeType[] = ["SUPPORTS","CONTRADICTS","SUPERSEDES","DEPENDS_ON","REQUIRES","VERIFIED_BY","DERIVED_FROM","BLOCKS","AFFECTS"];

function evidenceSeedNodes(job: B2JobPackage, graph: R1Graph): R1GraphNode[] {
  const evidenceIds = new Set(job.evidence.map((item) => item.id));
  return graph.nodes.filter((node) => Boolean(node.sourceRecordId && evidenceIds.has(node.sourceRecordId)) || node.evidenceIds.some((id) => evidenceIds.has(id)));
}

export function buildMRSGraphContext(input: { job: B2JobPackage; r1: R1Graph; r2?: R2Graph; graphDepth?: number; nodeBudget?: number; allowedEdgeTypes?: R1EdgeType[] }): MRSGraphContext {
  const depth = Math.max(0, Math.min(8, input.graphDepth ?? 2));
  const nodeBudget = Math.max(1, Math.min(256, input.nodeBudget ?? Math.max(24, input.job.evidencePolicy.limit * 3)));
  const allowed = new Set(input.allowedEdgeTypes ?? DEFAULT_EDGE_TYPES);
  const selected = new Set<string>();
  const traversal: Array<{ from: string; to: string; type: string }> = [];
  const queue: Array<{ id: string; depth: number }> = [];
  for (const seed of evidenceSeedNodes(input.job, input.r1).sort((a,b)=>a.id.localeCompare(b.id))) {
    if (selected.size >= nodeBudget) break; selected.add(seed.id); queue.push({ id: seed.id, depth: 0 });
  }
  let truncated = false;
  while (queue.length) {
    const current = queue.shift()!; if (current.depth >= depth) continue;
    const outgoing = input.r1.edges.filter((edge) => allowed.has(edge.type) && (edge.from === current.id || edge.to === current.id)).sort((a,b)=>a.id.localeCompare(b.id));
    for (const edge of outgoing) {
      const next = edge.from === current.id ? edge.to : edge.from;
      traversal.push({ from: current.id, to: next, type: edge.type });
      if (selected.has(next)) continue;
      if (selected.size >= nodeBudget) { truncated = true; continue; }
      selected.add(next); queue.push({ id: next, depth: current.depth + 1 });
    }
  }
  const r1NodeIds = [...selected].sort();
  const r2NodeIds: string[] = [];
  if (input.r2) {
    for (const node of input.r2.nodes.sort((a,b)=>a.id.localeCompare(b.id))) {
      if (!node.derivedFrom.some((id) => selected.has(id))) continue;
      if (r1NodeIds.length + r2NodeIds.length >= nodeBudget) { truncated = true; break; }
      r2NodeIds.push(node.id);
    }
  }
  return { format:"B2_MRS_GRAPH_CONTEXT", version:1, contextVersion:BRAIN2_MRS_GRAPH_CONTEXT_VERSION, r1NodeIds, r2NodeIds, traversal, depth, nodeBudget, truncated };
}

export function graphContextInstructions(context: MRSGraphContext): string[] {
  return [
    `R1 graph context: ${context.r1NodeIds.length} authoritative node(s).`,
    `R2 graph context: ${context.r2NodeIds.length} provisional node(s); R2 is never Current Truth.`,
    context.truncated ? "Graph traversal hit its node budget; treat omitted neighbors as unknown." : "Graph traversal completed within its bounded budget.",
    "Prefer R1 evidence and deterministic graph relations. Treat R2 as hypotheses requiring verification.",
  ];
}

export type GraphAwareMRSInput = { job: B2JobPackage; graphContext: MRSGraphContext; r1Nodes: R1GraphNode[]; r2Nodes: R2GraphNode[] };
export function bindGraphContext(job: B2JobPackage, r1: R1Graph, r2: R2Graph | undefined, context: MRSGraphContext): GraphAwareMRSInput {
  const r1Ids = new Set(context.r1NodeIds), r2Ids = new Set(context.r2NodeIds);
  return { job, graphContext: context, r1Nodes: r1.nodes.filter((n)=>r1Ids.has(n.id)), r2Nodes: (r2?.nodes ?? []).filter((n)=>r2Ids.has(n.id)) };
}
