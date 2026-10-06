import type { RetrievalRoute } from "./contracts";
import { planSharedQuery } from "./sharedQueryPlanner";

export type RetrievalPlan = {
  route: RetrievalRoute;
  fallback?: RetrievalRoute;
  reason: string;
  candidateCap: number;
  truthBoost: number;
  diversityBoost: number;
};

export function planRetrieval(query: string): RetrievalPlan {
  const shared = planSharedQuery(query);
  if (shared.route === "F_TEMPORAL_TRUTH") return { route:shared.route, fallback:"B_250_CHUNK", reason:`${shared.queryClass}: ${shared.reasons.join("; ")}`, candidateCap:192, truthBoost:3.2, diversityBoost:0.2 };
  if (shared.route === "G_ADAPTIVE_HETEROGENEOUS") return { route:shared.route, fallback:"B_250_CHUNK", reason:`${shared.queryClass}: ${shared.reasons.join("; ")}`, candidateCap:shared.mode === "DEEP" ? 512 : 320, truthBoost:2.4, diversityBoost:0.9 };
  return { route:"B_250_CHUNK", reason:`${shared.queryClass}: ${shared.reasons.join("; ")}`, candidateCap:256, truthBoost:2.2, diversityBoost:0.35 };
}
