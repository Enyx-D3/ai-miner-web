import { getG11SyncProofMaterial } from "./store";
import { brain2MutationFrontier, brain2MutationFrontierRoot, brain2TruthStateRoot } from "./syncProtocol";

export type Brain2G11SyncProof = {
  format: "B2_G11_SYNC_PROOF";
  version: 1;
  surface: "WEB";
  deviceId: string;
  memoryRoot: string;
  snapshotVersion: number;
  totalMessages: number;
  totalAtoms: number;
  totalTruths: number;
  currentTruthCount: number;
  mutationCount: number;
  truthStateRoot: string;
  mutationFrontierRoot: string;
  mutationFrontier: Array<[string, number]>;
  openConflicts: number;
  completeTruthMaterial: boolean;
  generatedAt: string;
};

export async function buildBrain2G11SyncProof(): Promise<Brain2G11SyncProof> {
  const material = await getG11SyncProofMaterial();
  const currentTruthCount = material.truths.filter((truth) => truth.status === "CURRENT").length;
  const truthStateRoot = await brain2TruthStateRoot(material.truths);
  const mutationFrontier = brain2MutationFrontier(material.mutations);
  const mutationFrontierRoot = await brain2MutationFrontierRoot(material.mutations);

  return {
    format: "B2_G11_SYNC_PROOF",
    version: 1,
    surface: "WEB",
    deviceId: material.summary.deviceId,
    memoryRoot: material.summary.memoryRoot,
    snapshotVersion: material.snapshotVersion,
    totalMessages: material.summary.totalMessages,
    totalAtoms: material.summary.totalAtoms,
    totalTruths: material.summary.totalTruths,
    currentTruthCount,
    mutationCount: material.mutations.length,
    truthStateRoot,
    mutationFrontierRoot,
    mutationFrontier,
    openConflicts: material.summary.conflicts,
    completeTruthMaterial: material.truths.length === material.summary.totalTruths,
    generatedAt: new Date().toISOString(),
  };
}
