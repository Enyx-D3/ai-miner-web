import type { RetrievalRoute } from "./contracts";
import { normalizeText } from "./identity";

const TEMPORAL = /\b(current|currently|latest|now|changed|change|before|after|timeline|history|supersed|replaced|decision|decided|version|status|what are we using|what did we decide)\b/i;
const HETEROGENEOUS = /\b(compare|comparison|relationship|relate|connect|connection|across|contradiction|conflict|why|cause|depends|dependency|multiple|projects|pattern)\b/i;

export type RetrievalPlan = {
  route: RetrievalRoute;
  fallback?: RetrievalRoute;
  reason: string;
  candidateCap: number;
  truthBoost: number;
  diversityBoost: number;
};

export function planRetrieval(query: string): RetrievalPlan {
  const text = normalizeText(query);
  if (TEMPORAL.test(text)) return { route:"F_TEMPORAL_TRUTH", fallback:"B_250_CHUNK", reason:"temporal/current-truth query", candidateCap:192, truthBoost:3.2, diversityBoost:0.2 };
  if (HETEROGENEOUS.test(text)) return { route:"G_ADAPTIVE_HETEROGENEOUS", fallback:"B_250_CHUNK", reason:"multi-unit/relationship query", candidateCap:320, truthBoost:2.4, diversityBoost:0.9 };
  return { route:"B_250_CHUNK", reason:"bounded recall safety route", candidateCap:256, truthBoost:2.2, diversityBoost:0.35 };
}
