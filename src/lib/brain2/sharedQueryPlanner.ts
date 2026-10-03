export const SHARED_QUERY_PLANNER_VERSION = "B2_QUERY_PLANNER_V1" as const;

export type SharedQueryClass =
  | "EXACT"
  | "TEMPORAL"
  | "CONTRADICTION"
  | "FAILURE"
  | "SEMANTIC"
  | "GENEALOGY_ARCHAEOLOGY"
  | "MULTI_PROJECT";

export type SharedQueryMode = "FAST" | "STANDARD" | "DEEP";
export type SharedQueryRoute = "B_250_CHUNK" | "F_TEMPORAL_TRUTH" | "G_ADAPTIVE_HETEROGENEOUS";

export type SharedQueryPlan = {
  version: typeof SHARED_QUERY_PLANNER_VERSION;
  queryClass: SharedQueryClass;
  mode: SharedQueryMode;
  route: SharedQueryRoute;
  normalizedQuery: string;
  reasons: string[];
  exhaustiveRequested: boolean;
  projectCount: number;
};

const DEEP = /\b(deep archaeology|deep search|archaeolog(?:y|ical)|search everything|search all|all evidence|exhaustive|nothing (?:is|was) missed|make sure nothing|full genealogy|lineage|origin trail|trace back)\b/i;
const MULTI = /\b(across projects?|multiple projects?|cross[- ]project|all projects?|compare projects?|compare across)\b/i;
const CONTRADICTION = /\b(contradict(?:ion|s|ed|ory)?|conflict(?:ing|s|ed)?|disagree|inconsistent|mismatch|which is true)\b/i;
const FAILURE = /\b(fail(?:ed|ure|ing)?|error|bug|crash|broken|didn['’]?t work|doesn['’]?t work|known bad|repair)\b/i;
const TEMPORAL = /\b(current|currently|latest|now|changed|change|before|after|timeline|history|supersed\w*|replaced|decision|decided|version|status|when did|what did we use|what are we using|what did we decide)\b/i;
const RELATIONAL = /\b(why|cause|causal|depends?|dependency|relationship|relate|connect|connection|pattern)\b/i;
const EXACT = /(?:\b(?:id|hash|sha|version|commit|receipt|mission)\b\s*[:=#-]?\s*[a-z0-9_.:-]{5,}|["“”'][^"“”']{3,}["“”'])/i;

export function normalizeSharedQuery(value: string): string {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function planSharedQuery(
  query: string,
  options: { requestedMode?: SharedQueryMode; projectCount?: number } = {},
): SharedQueryPlan {
  const normalizedQuery = normalizeSharedQuery(query);
  const projectCount = Math.max(0, Math.trunc(options.projectCount ?? 0));
  const reasons: string[] = [];
  let queryClass: SharedQueryClass;
  let mode: SharedQueryMode;
  let route: SharedQueryRoute;

  if (DEEP.test(normalizedQuery)) {
    queryClass = "GENEALOGY_ARCHAEOLOGY";
    mode = "DEEP";
    route = "G_ADAPTIVE_HETEROGENEOUS";
    reasons.push("explicit genealogy/archaeology or exhaustive-search intent");
  } else if (MULTI.test(normalizedQuery) || projectCount > 1) {
    queryClass = "MULTI_PROJECT";
    mode = "STANDARD";
    route = "G_ADAPTIVE_HETEROGENEOUS";
    reasons.push("cross-project or multi-project retrieval");
  } else if (CONTRADICTION.test(normalizedQuery)) {
    queryClass = "CONTRADICTION";
    mode = "STANDARD";
    route = "F_TEMPORAL_TRUTH";
    reasons.push("conflict/contradiction resolution requires truth lineage");
  } else if (FAILURE.test(normalizedQuery)) {
    queryClass = "FAILURE";
    mode = "STANDARD";
    route = "G_ADAPTIVE_HETEROGENEOUS";
    reasons.push("failure/repair memory requested");
  } else if (TEMPORAL.test(normalizedQuery)) {
    queryClass = "TEMPORAL";
    mode = "STANDARD";
    route = "F_TEMPORAL_TRUTH";
    reasons.push("current-state/history/timeline intent");
  } else if (RELATIONAL.test(normalizedQuery)) {
    queryClass = "SEMANTIC";
    mode = "STANDARD";
    route = "G_ADAPTIVE_HETEROGENEOUS";
    reasons.push("relationship/dependency/causal retrieval");
  } else if (EXACT.test(normalizedQuery)) {
    queryClass = "EXACT";
    mode = "FAST";
    route = "B_250_CHUNK";
    reasons.push("exact identifier/quoted-literal lookup");
  } else {
    queryClass = "SEMANTIC";
    mode = "FAST";
    route = "B_250_CHUNK";
    reasons.push("bounded semantic retrieval");
  }

  if (options.requestedMode && options.requestedMode !== mode) {
    mode = options.requestedMode;
    reasons.push(`explicit mode override: ${options.requestedMode}`);
  }

  return {
    version: SHARED_QUERY_PLANNER_VERSION,
    queryClass,
    mode,
    route,
    normalizedQuery,
    reasons,
    exhaustiveRequested: queryClass === "GENEALOGY_ARCHAEOLOGY" || mode === "DEEP",
    projectCount,
  };
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
}

export async function hashSharedQueryPlan(plan: SharedQueryPlan): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(plan));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b)=>b.toString(16).padStart(2,"0")).join("");
}
