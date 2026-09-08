"use client";

import {
  addVerification,
  bootBrain2,
  checkpointMission,
  createMission,
  currentBrain2DeviceId,
  getBrain2Snapshot,
  loadConversationMessages,
  loadProjectAtoms,
  searchBrain2Async,
} from "./store";

type BridgeCommand = {
  requestId: string;
  method: string;
  params?: Record<string, unknown>;
};

type BridgeResponse = {
  requestId: string;
  sessionId: string;
  ok: boolean;
  result?: unknown;
  error?: string;
};

const SESSION_KEY = "brain2-mcp-browser-session-v1";
const APP_VERSION = "0.9.13-g10.1";
const MAX_PAGE = 200;

let activeStop: (() => void) | null = null;

function newSessionId() {
  return crypto.randomUUID?.() ?? `b2web_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function sessionId() {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = newSessionId();
    sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return newSessionId();
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function resolveProject(ref: unknown) {
  const needle = asString(ref).trim().toLowerCase();
  if (!needle) return undefined;
  return getBrain2Snapshot().projects.find((project) =>
    project.id.toLowerCase() === needle ||
    project.slug.toLowerCase() === needle ||
    project.name.toLowerCase() === needle ||
    (project.aliases ?? []).some((alias) => alias.toLowerCase() === needle)
  );
}

function projectSourceIds(projectId: string) {
  const snapshot = getBrain2Snapshot();
  const ids = new Set<string>();
  for (const conversation of snapshot.conversations) {
    if (conversation.projectId === projectId) ids.add(conversation.sourceId);
  }
  for (const atom of snapshot.atoms) {
    if (atom.projectId === projectId) ids.add(atom.sourceId);
  }
  return ids;
}

function projectSources(projectId: string) {
  const ids = projectSourceIds(projectId);
  return getBrain2Snapshot().sources.filter((source) => ids.has(source.id));
}

function projectTruths(projectId: string) {
  return getBrain2Snapshot().truths.filter((truth) => truth.projectId === projectId);
}

async function exhaustiveProjectRecords(projectId: string) {
  const project = getBrain2Snapshot().projects.find((item) => item.id === projectId);
  if (!project) return [];
  const messageGroups = await Promise.all(
    project.conversationIds.map((conversationId) => loadConversationMessages(conversationId, 10_000)),
  );
  const atoms = await loadProjectAtoms(projectId, 10_000);
  const truths = projectTruths(projectId);
  return [
    ...messageGroups.flat().map((record) => ({ recordType: "message", ...record })),
    ...atoms.map((record) => ({ recordType: "atom", ...record })),
    ...truths.map((record) => ({ recordType: "truth", ...record })),
  ];
}

function textOf(record: Record<string, unknown>) {
  return [
    record.text,
    record.title,
    record.subject,
    record.value,
    record.role,
    record.kind,
    record.recordType,
  ].filter(Boolean).join(" ").toLowerCase();
}

function recordProjectId(record: Record<string, unknown>) {
  if (typeof record.projectId === "string") return record.projectId;
  const conversationId = typeof record.conversationId === "string" ? record.conversationId : "";
  if (!conversationId) return "";
  return getBrain2Snapshot().conversations.find((item) => item.id === conversationId)?.projectId ?? "";
}

async function bridgeSearch(params: Record<string, unknown>) {
  const query = asString(params.query).trim();
  const projectId = asString(params.projectId).trim();
  const modeRaw = asString(params.mode || "evidence");
  const mode = ["find", "current", "history", "evidence", "discover"].includes(modeRaw)
    ? modeRaw as "find"|"current"|"history"|"evidence"|"discover"
    : "evidence";
  const kinds = Array.isArray(params.kinds) ? new Set(params.kinds.map(asString).filter(Boolean)) : null;
  const pageLimit = Math.max(1, Math.min(MAX_PAGE, asInt(params.limit, 100)));
  const offset = Math.max(0, asInt(params.cursor, 0));

  let records: Array<Record<string, unknown>>;
  let exhaustive = false;

  if (projectId && query === "*") {
    records = await exhaustiveProjectRecords(projectId) as Array<Record<string, unknown>>;
    exhaustive = true;
  } else if (projectId && (mode === "current" || mode === "history")) {
    records = projectTruths(projectId)
      .filter((truth) => mode === "current" ? truth.status === "CURRENT" : truth.status !== "CURRENT")
      .map((truth) => ({ recordType: "truth", ...truth })) as Array<Record<string, unknown>>;
    const needle = query.toLowerCase();
    if (needle && needle !== "*") records = records.filter((record) => textOf(record).includes(needle));
    exhaustive = true;
  } else {
    const raw = await searchBrain2Async(query, mode);
    records = raw.map((record) => ({ ...record })) as Array<Record<string, unknown>>;
    if (projectId) records = records.filter((record) => recordProjectId(record) === projectId);
  }

  if (kinds?.size) {
    records = records.filter((record) => {
      const kind = asString(record.kind || record.recordType || record.role);
      return kinds.has(kind);
    });
  }

  const totalMatches = records.length;
  const results = records.slice(offset, offset + pageLimit);
  const nextOffset = offset + results.length;
  const exhausted = nextOffset >= totalMatches;
  const snapshot = getBrain2Snapshot();

  return {
    query,
    projectId: projectId || undefined,
    results,
    totalMatches,
    nextCursor: exhausted ? null : String(nextOffset),
    exhausted,
    snapshotVersion: snapshot.version,
    memoryRoot: snapshot.memoryRoot,
    coverage: {
      searchIndexComplete: exhaustive || snapshot.storage.retrievalIndexStatus === "READY",
      exhaustive,
      returnedMatches: results.length,
      totalMatches,
    },
  };
}

async function dispatch(method: string, params: Record<string, unknown>) {
  await bootBrain2();
  const snapshot = getBrain2Snapshot();

  if (method === "health") {
    return {
      ok: true,
      sourceOfTruth: "browser-indexeddb",
      memoryRoot: snapshot.memoryRoot,
      snapshotVersion: snapshot.version,
      storage: snapshot.storage,
    };
  }

  if (method === "listProjects") {
    return {
      projects: snapshot.projects,
      memoryRoot: snapshot.memoryRoot,
      snapshotVersion: snapshot.version,
    };
  }

  if (method === "getProject") return resolveProject(params.project);
  if (method === "search") return bridgeSearch(params);

  if (method === "inventory") {
    return {
      sourceOfTruth: "browser-indexeddb",
      memoryRoot: snapshot.memoryRoot,
      snapshotVersion: snapshot.version,
      storage: snapshot.storage,
      projects: snapshot.projects.map((project) => ({
        id: project.id,
        slug: project.slug,
        name: project.name,
        atomCount: project.atomCount ?? project.atomIds.length,
        conversationCount: project.conversationIds.length,
        updatedAt: project.updatedAt,
      })),
      totals: {
        projects: snapshot.projects.length,
        sources: snapshot.sources.length,
        conversations: snapshot.storage.totalConversations,
        messages: snapshot.storage.totalMessages,
        atoms: snapshot.storage.totalAtoms,
        truths: snapshot.storage.totalTruths,
      },
      searchIndexComplete: snapshot.storage.retrievalIndexStatus === "READY",
    };
  }

  if (method === "currentTruth") {
    const projectId = asString(params.projectId);
    return {
      projectId,
      current: projectTruths(projectId).filter((truth) => truth.status === "CURRENT"),
      snapshotVersion: snapshot.version,
      memoryRoot: snapshot.memoryRoot,
    };
  }

  if (method === "sources") {
    const projectId = asString(params.projectId);
    return { projectId, sources: projectSources(projectId) };
  }

  if (method === "getSource") {
    const sourceId = asString(params.sourceId);
    return snapshot.sources.find((source) => source.id === sourceId);
  }

  if (method === "bootstrap") {
    const project = resolveProject(params.project);
    if (!project) throw new Error(`Project not found in AI Miner: ${asString(params.project)}`);
    const currentTruth = projectTruths(project.id).filter((truth) => truth.status === "CURRENT");
    const sources = projectSources(project.id);
    return {
      projectId: project.id,
      projectName: project.name,
      project,
      currentTruth,
      sources,
      atomCount: project.atomCount ?? project.atomIds.length,
      conversationIds: project.conversationIds,
      entityTerms: project.entityTerms ?? [],
      memoryRoot: snapshot.memoryRoot,
      snapshotVersion: snapshot.version,
      storage: snapshot.storage,
    };
  }

  if (method === "createMission") {
    const title = asString(params.title);
    const objective = asString(params.objective);
    if (!title || !objective) throw new Error("createMission requires title and objective.");
    await createMission({ title, objective, projectId: asString(params.projectId) || undefined });
    return getBrain2Snapshot().missions
      .filter((mission) => mission.title === title && mission.objective === objective)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? { ok: true };
  }

  if (method === "checkpointMission") {
    const missionId = asString(params.missionId || params.id);
    const state = asString(params.state);
    const note = asString(params.note);
    if (!missionId || !state) throw new Error("checkpointMission requires missionId and state.");
    await checkpointMission(missionId, state, note);
    return getBrain2Snapshot().missions.find((mission) => mission.id === missionId);
  }

  if (method === "addVerification") {
    const entityType = asString(params.entityType);
    const entityId = asString(params.entityId);
    const status = asString(params.status) as "PASS"|"FAIL"|"PENDING";
    const detail = asString(params.detail);
    if (!entityType || !entityId || !["PASS", "FAIL", "PENDING"].includes(status)) {
      throw new Error("addVerification requires entityType, entityId and PASS|FAIL|PENDING status.");
    }
    await addVerification(entityType, entityId, status, detail);
    return { ok: true };
  }

  throw new Error(`Unsupported Brain2 browser bridge method: ${method}`);
}

async function sendResponse(response: BridgeResponse) {
  const request = await fetch("/api/brain2-mcp-bridge/respond", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(response),
    cache: "no-store",
  });
  if (!request.ok) {
    const body = await request.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Bridge respond failed (${request.status})`);
  }
}

async function configured() {
  const response = await fetch("/api/brain2-mcp-bridge/status", { cache: "no-store" });
  if (!response.ok) return false;
  const body = await response.json().catch(() => ({})) as { enabled?: boolean };
  return Boolean(body.enabled);
}

export function startBrain2McpBrowserBridge() {
  if (typeof window === "undefined") return () => {};
  if (activeStop) return activeStop;

  let stopped = false;
  let currentAbort: AbortController | null = null;
  const sid = sessionId();

  const stop = () => {
    stopped = true;
    currentAbort?.abort();
    currentAbort = null;
    if (activeStop === stop) activeStop = null;
  };
  activeStop = stop;

  void (async () => {
    let backoff = 250;
    while (!stopped) {
      try {
        if (!(await configured())) {
          throw new Error("Web MCP bridge proxy is not configured yet.");
        }
        await bootBrain2();
        const snapshot = getBrain2Snapshot();
        const deviceId = currentBrain2DeviceId();
        currentAbort = new AbortController();
        const response = await fetch("/api/brain2-mcp-bridge/poll", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId: sid,
            deviceId,
            memoryRoot: snapshot.memoryRoot,
            snapshotVersion: snapshot.version,
            websiteOrigin: window.location.origin,
            appVersion: APP_VERSION,
          }),
          cache: "no-store",
          signal: currentAbort.signal,
        });
        currentAbort = null;

        if (response.status === 204) {
          backoff = 250;
          continue;
        }
        if (!response.ok) {
          const body = await response.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error || `Bridge poll failed (${response.status})`);
        }

        const command = await response.json() as BridgeCommand;
        if (!command.requestId || !command.method) throw new Error("Malformed MCP browser bridge command.");

        try {
          const result = await dispatch(command.method, command.params ?? {});
          await sendResponse({ requestId: command.requestId, sessionId: sid, ok: true, result });
        } catch (error) {
          await sendResponse({
            requestId: command.requestId,
            sessionId: sid,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        backoff = 250;
      } catch (error) {
        if (stopped) break;
        console.warn("[Brain2 MCP bridge] retrying", error instanceof Error ? error.message : String(error));
        await new Promise((resolve) => window.setTimeout(resolve, backoff));
        backoff = Math.min(backoff * 2, 10_000);
      }
    }
  })();

  return stop;
}
