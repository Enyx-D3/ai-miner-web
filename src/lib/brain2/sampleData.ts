"use client";

import {
  checkpointMission,
  createExperiment,
  createMission,
  createTick,
  ingestExtensionBatch,
  verifyMemoryStorage,
} from "./store";
import type { ExtensionCapture } from "./types";

export async function loadSampleDemoDataset(onProgress?: (msg: string) => void): Promise<void> {
  onProgress?.("Generating sample conversations & source messages…");

  const sampleCaptures: ExtensionCapture[] = [
    {
      id: "demo_cap_1",
      provider: "chatgpt",
      conversationExternalId: "conv_dist_arch",
      conversationTitle: "Distributed Vector Memory Architecture",
      messageExternalId: "msg_dva_1",
      role: "user",
      text: "We need an ultra-low latency memory store for AI agents that works locally in the browser with IndexedDB and replicates via WebRTC P2P.",
      url: "https://chatgpt.com/c/sample-1",
      occurredAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
      sequence: 1,
    },
    {
      id: "demo_cap_2",
      provider: "chatgpt",
      conversationExternalId: "conv_dist_arch",
      conversationTitle: "Distributed Vector Memory Architecture",
      messageExternalId: "msg_dva_2",
      role: "assistant",
      text: "Decision: Use bounded hot-working set with ASIF RapidRetrieve indexer. Constraint: All local mutations must produce verifiable SHA-256 hash chains. Fact: WebRTC DTLS ensures end-to-end peer encryption without intermediary servers. Idea: Employ heterogeneous atomization with deterministic fallbacks.",
      url: "https://chatgpt.com/c/sample-1",
      occurredAt: new Date(Date.now() - 3600000 * 24 * 3 + 120000).toISOString(),
      sequence: 2,
    },
    {
      id: "demo_cap_3",
      provider: "claude",
      conversationExternalId: "conv_agent_consensus",
      conversationTitle: "Autonomous Agent Consensus Protocol",
      messageExternalId: "msg_aac_1",
      role: "user",
      text: "How should multiple distributed agent replicas resolve conflicting truth updates when operating offline?",
      url: "https://claude.ai/chat/sample-2",
      occurredAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      sequence: 1,
    },
    {
      id: "demo_cap_4",
      provider: "claude",
      conversationExternalId: "conv_agent_consensus",
      conversationTitle: "Autonomous Agent Consensus Protocol",
      messageExternalId: "msg_aac_2",
      role: "assistant",
      text: "Decision: Reject silent last-write-wins; create explicit sync conflicts in the operator queue whenever entity before-hashes diverge. Task: Implement automated repair heuristics for deterministic fact divergence. Fact: Reconciled truth candidates require minimum 85% provenance confidence.",
      url: "https://claude.ai/chat/sample-2",
      occurredAt: new Date(Date.now() - 3600000 * 24 * 2 + 180000).toISOString(),
      sequence: 2,
    },
    {
      id: "demo_cap_5",
      provider: "gemini",
      conversationExternalId: "conv_local_infer",
      conversationTitle: "Next-Gen Local Inference Pipeline",
      messageExternalId: "msg_nli_1",
      role: "user",
      text: "Can we run local Qwen2.5-0.5B ONNX models with Transformers.js inside Web Workers for residual verification?",
      url: "https://gemini.google.com/app/sample-3",
      occurredAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
      sequence: 1,
    },
    {
      id: "demo_cap_6",
      provider: "gemini",
      conversationExternalId: "conv_local_infer",
      conversationTitle: "Next-Gen Local Inference Pipeline",
      messageExternalId: "msg_nli_2",
      role: "assistant",
      text: "Idea: Route high-confidence queries to Deterministic Branch Zero and invoke WebAssembly ONNX runtime only when deterministic sufficiency is below threshold. Fact: WASM q8 quantization maintains 94% reasoning fidelity while reducing memory footprint to ~380MB.",
      url: "https://gemini.google.com/app/sample-3",
      occurredAt: new Date(Date.now() - 3600000 * 24 * 1 + 95000).toISOString(),
      sequence: 2,
    },
  ];

  await ingestExtensionBatch(sampleCaptures);

  onProgress?.("Creating active missions & durable checkpoints…");
  try {
    await createMission({
      title: "Core Mesh Synchronization Engine",
      objective: "Deploy DTLS-encrypted WebRTC replication across local browser instances with verifiable hash lineages.",
    });
  } catch {}

  try {
    const mission = (await createMission({
      title: "Cognitive Atomization & Reconciliation v2",
      objective: "Achieve 98% precision on multi-turn statement decomposition and causal link extraction.",
    })) as unknown as { id: string } | undefined;
    if (mission?.id) {
      await checkpointMission(mission.id, "running", "Decomposition pass verified against 150 test gold standards");
    }
  } catch {}

  onProgress?.("Recording active experiments…");
  try {
    await createExperiment({
      title: "Zero-latency ASIF Token Stream Filtering",
      hypothesis: "Pre-filtering candidate tokens via Bloom index reduces full-text scan latency by >65% on large corpora.",
    });
  } catch {}

  onProgress?.("Adding operator attention items (Ticks)…");
  try {
    await createTick({
      title: "Review Conflicting Truth Candidate in P2P Consensus",
      detail: "Two peers proposed divergent resolution policies for transaction ledger pruning. Human confirmation needed.",
      priority: "HIGH",
    });
    await createTick({
      title: "Optimize WASM WebWorker Memory Envelope",
      detail: "Peak memory reached 420MB during multi-batch ONNX inference. Validate garbage collection triggers.",
      priority: "MEDIUM",
    });
  } catch {}

  onProgress?.("Finalizing local storage verification…");
  await verifyMemoryStorage();
  onProgress?.("Demo intelligence dataset loaded successfully!");
}
