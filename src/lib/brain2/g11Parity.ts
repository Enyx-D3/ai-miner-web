import type { AtomRecord, TruthRecord } from "./types";
import { projectR1Graph, r1CurrentTruth } from "./r1Graph";
import { assertR2CannotMutateR1, buildR2Graph } from "./r2Graph";

type GoldenFixture = {
  format: "B2_V1_GOLDEN_GRAPH_FIXTURE";
  version: 1;
  projectId: string;
  atoms: unknown[];
  truths: unknown[];
  assertions: {
    currentTruthSourceIds: string[];
    supersededTruthSourceIds: string[];
    mustContainEdgeTypes: string[];
    r2MayNotBecomeCurrentTruth: boolean;
  };
  expected: {
    identityVersion: string;
    r1GraphVersion: string;
    r1RootHash: string;
    r1NodeCount: number;
    r1EdgeCount: number;
  };
};

export type G11ParityReport = {
  format: "B2_G11_PARITY_REPORT";
  version: 1;
  surface: "WEB";
  pass: boolean;
  projectId: string;
  r1RootHash: string;
  expectedR1RootHash: string;
  nodeCount: number;
  edgeCount: number;
  currentTruthSourceIds: string[];
  supersededTruthSourceIds: string[];
  edgeTypes: string[];
  r2SelfPromotionRejected: boolean;
  checks: Record<string, boolean>;
};

function sameStrings(a: string[], b: string[]) {
  return [...a].sort().join("\u241f") === [...b].sort().join("\u241f");
}

export async function verifyG11GoldenParity(raw: unknown): Promise<G11ParityReport> {
  const fixture = raw as GoldenFixture;
  if (!fixture || fixture.format !== "B2_V1_GOLDEN_GRAPH_FIXTURE" || fixture.version !== 1) {
    throw new Error("Unsupported G11 golden fixture.");
  }

  const graph = await projectR1Graph({
    atoms: fixture.atoms as AtomRecord[],
    truths: fixture.truths as TruthRecord[],
  });

  const currentTruthSourceIds = r1CurrentTruth(graph, fixture.projectId)
    .filter((node) => node.kind === "TRUTH" || node.kind === "DECISION" || node.kind === "CONSTRAINT")
    .map((node) => node.sourceRecordId)
    .filter((value): value is string => Boolean(value))
    .filter((value) => fixture.truths.some((truth) => (truth as { id?: string }).id === value))
    .sort();

  const supersededTruthSourceIds = graph.nodes
    .filter((node) => node.truthStatus === "SUPERSEDED")
    .map((node) => node.sourceRecordId)
    .filter((value): value is string => Boolean(value))
    .filter((value) => fixture.truths.some((truth) => (truth as { id?: string }).id === value))
    .sort();

  const edgeTypes = [...new Set<string>(graph.edges.map((edge) => edge.type))].sort();

  const source = graph.nodes.find((node) => node.sourceRecordId === fixture.assertions.currentTruthSourceIds[0]);
  if (!source) throw new Error("Golden fixture lacks an R1 source node for the R2 boundary test.");

  let r2SelfPromotionRejected = false;
  if (fixture.assertions.r2MayNotBecomeCurrentTruth) {
    const r2 = await buildR2Graph(graph, [{
      kind: "HYPOTHESIS",
      projectId: fixture.projectId,
      statement: "Golden fixture provisional hypothesis.",
      derivedFrom: [source.id],
      confidence: 0.5,
      status: "PROVISIONAL",
      requiredEvidence: ["independent confirmation"],
      staleWhen: ["R1 source changes"],
      metadata: { currentTruth: true },
    }]);
    try {
      assertR2CannotMutateR1(graph, r2);
    } catch {
      r2SelfPromotionRejected = true;
    }
  }

  const checks = {
    root: graph.rootHash === fixture.expected.r1RootHash,
    nodeCount: graph.nodes.length === fixture.expected.r1NodeCount,
    edgeCount: graph.edges.length === fixture.expected.r1EdgeCount,
    currentTruth: sameStrings(currentTruthSourceIds, fixture.assertions.currentTruthSourceIds),
    supersededTruth: sameStrings(supersededTruthSourceIds, fixture.assertions.supersededTruthSourceIds),
    requiredEdges: fixture.assertions.mustContainEdgeTypes.every((type) => edgeTypes.includes(type)),
    r2Boundary: !fixture.assertions.r2MayNotBecomeCurrentTruth || r2SelfPromotionRejected,
  };

  return {
    format: "B2_G11_PARITY_REPORT",
    version: 1,
    surface: "WEB",
    pass: Object.values(checks).every(Boolean),
    projectId: fixture.projectId,
    r1RootHash: graph.rootHash,
    expectedR1RootHash: fixture.expected.r1RootHash,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    currentTruthSourceIds,
    supersededTruthSourceIds,
    edgeTypes,
    r2SelfPromotionRejected,
    checks,
  };
}
