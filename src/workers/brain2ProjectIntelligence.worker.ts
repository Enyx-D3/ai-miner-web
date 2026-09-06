/// <reference lib="webworker" />

import {
  buildDeterministicProjectIntelligence,
  type IntelligenceInput,
  type IntelligenceProjection,
} from "../lib/brain2/intelligenceLayer";

export type ProjectIntelligenceWorkerRequest =
  | { type: "build"; requestId: string; input: IntelligenceInput }
  | { type: "cancel"; requestId?: string };

export type ProjectIntelligenceWorkerEvent =
  | { type: "done"; requestId: string; projection: IntelligenceProjection }
  | { type: "error"; requestId: string; error: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const cancelled = new Set<string>();

ctx.onmessage = (event: MessageEvent<ProjectIntelligenceWorkerRequest>) => {
  if (event.data.type === "cancel") {
    if (event.data.requestId) cancelled.add(event.data.requestId);
    return;
  }

  const { requestId, input } = event.data;
  void (async () => {
    try {
      const projection = await buildDeterministicProjectIntelligence(input);
      if (cancelled.has(requestId)) {
        cancelled.delete(requestId);
        return;
      }
      ctx.postMessage({ type: "done", requestId, projection } satisfies ProjectIntelligenceWorkerEvent);
    } catch (error) {
      if (cancelled.has(requestId)) {
        cancelled.delete(requestId);
        return;
      }
      ctx.postMessage({
        type: "error",
        requestId,
        error: error instanceof Error ? error.message : String(error),
      } satisfies ProjectIntelligenceWorkerEvent);
    }
  })();
};
