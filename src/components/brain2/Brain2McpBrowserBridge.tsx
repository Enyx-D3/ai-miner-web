"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect } from "react";
import {
  addVerification,
  bootBrain2,
  checkpointMission,
  createMission,
  currentBrain2DeviceId,
  getBrain2Snapshot,
  getBrain2SearchInventory,
  getSyncReplicaSummary,
  loadProjectAtoms,
  loadProjectTruthSummary,
  memoryHealth,
  searchBrain2Async,
  searchBrain2ExactPage,
} from "@/lib/brain2/store";

type BridgeCommand = {
  requestId: string;
  method: string;
  params?: Record<string, unknown>;
};

type SearchMode = "find" | "current" | "history" | "evidence" | "discover";

const BRIDGE_BASE = (
  process.env.NEXT_PUBLIC_BRAIN2_MCP_BRIDGE_URL ?? ""
).replace(/\/$/, "");
const BRIDGE_TOKEN = process.env.NEXT_PUBLIC_BRAIN2_MCP_BRIDGE_TOKEN ?? "";
const POLL_TIMEOUT_MS = 28_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asString(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function cloneJson<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function findProject(projectRef: string) {
  const snapshot = getBrain2Snapshot() as any;
  const needle = projectRef.trim().toLowerCase();
  const projects = Array.isArray(snapshot.projects) ? snapshot.projects : [];
  const exact = projects.find((p: any) =>
    [p?.id, p?.slug, p?.name, p?.title]
      .filter(Boolean)
      .some((x) => asString(x).toLowerCase() === needle),
  );
  if (exact) return exact;
  const partial = projects.filter((p: any) =>
    [p?.name, p?.title, p?.slug]
      .filter(Boolean)
      .some((x) => asString(x).toLowerCase().includes(needle)),
  );
  if (partial.length === 1) return partial[0];
  if (partial.length > 1)
    throw new Error(`Ambiguous project reference: ${projectRef}`);
  throw new Error(`Project not found: ${projectRef}`);
}

function projectSources(projectId: string) {
  const snapshot = getBrain2Snapshot() as any;
  const conversations = (
    Array.isArray(snapshot.conversations) ? snapshot.conversations : []
  ).filter((c: any) => asString(c?.projectId) === projectId);
  const sourceIds = new Set(
    conversations.map((c: any) => asString(c?.sourceId)).filter(Boolean),
  );
  return (Array.isArray(snapshot.sources) ? snapshot.sources : []).filter(
    (s: any) => sourceIds.has(asString(s?.id)),
  );
}

function sourceById(sourceId: string) {
  const snapshot = getBrain2Snapshot() as any;
  return (
    (Array.isArray(snapshot.sources) ? snapshot.sources : []).find(
      (s: any) => asString(s?.id) === sourceId,
    ) ?? null
  );
}

async function execute(method: string, params: Record<string, unknown> = {}) {
  await bootBrain2();
  const snapshot = getBrain2Snapshot() as any;

  switch (method) {
    case "health":
      return {
        ok: true,
        memoryHealth: memoryHealth(),
        replica: await getSyncReplicaSummary(),
        snapshotVersion: snapshot.version,
        loaded: snapshot.loaded,
      };

    case "listProjects":
      return {
        projects: cloneJson(
          Array.isArray(snapshot.projects) ? snapshot.projects : [],
        ),
        snapshotVersion: snapshot.version,
      };

    case "getProject": {
      const project = findProject(asString(params.project));
      return cloneJson(project);
    }

    case "sources": {
      const project = findProject(asString(params.project ?? params.projectId));
      return { sources: cloneJson(projectSources(asString(project.id))) };
    }

    case "getSource":
      return cloneJson(sourceById(asString(params.sourceId)));

    case "currentTruth": {
      const project = findProject(asString(params.project ?? params.projectId));
      return cloneJson(await loadProjectTruthSummary(asString(project.id)));
    }

    case "projectAtoms": {
      const project = findProject(asString(params.project ?? params.projectId));
      const limit = Math.max(1, Math.min(1000, Number(params.limit ?? 250)));
      return {
        atoms: cloneJson(await loadProjectAtoms(asString(project.id), limit)),
      };
    }

    case "search": {
      const query = asString(params.query).trim();
      if (!query) throw new Error("Missing search query");
      const modeRaw = asString(params.mode || "evidence");
      const mode: SearchMode = [
        "find",
        "current",
        "history",
        "evidence",
        "discover",
      ].includes(modeRaw)
        ? (modeRaw as SearchMode)
        : "evidence";

      if (mode === "current" || mode === "history" || mode === "discover") {
        const rawResults = await searchBrain2Async(query, mode);
        return {
          query,
          mode,
          results: cloneJson(rawResults),
          legacyMode: true,
        };
      }

      const kindsRaw = Array.isArray(params.kinds)
        ? params.kinds.map(asString)
        : undefined;
      const kinds = kindsRaw?.filter(
        (kind): kind is "message" | "atom" | "truth" =>
          ["message", "atom", "truth"].includes(kind),
      );
      const result = await searchBrain2ExactPage(query, {
        projectId: asString(params.projectId) || undefined,
        cursor: asString(params.cursor) || undefined,
        limit: Number(params.limit ?? 100),
        kinds,
      });
      return cloneJson({ ...result, mode });
    }

    case "inventory":
      return cloneJson(await getBrain2SearchInventory());

    case "bootstrap": {
      const project = findProject(asString(params.project));
      const projectId = asString(project.id);
      const currentTruth = await loadProjectTruthSummary(projectId);
      const sources = projectSources(projectId);
      return {
        project: cloneJson(project),
        projectId,
        projectName: asString(
          project.name || project.title || project.slug || project.id,
        ),
        currentTruth: cloneJson(currentTruth),
        sources: cloneJson(sources),
        snapshotStamp: {
          memoryRoot: snapshot.memoryRoot,
          snapshotVersion: snapshot.version,
          totalMessages: snapshot.storage?.totalMessages ?? 0,
          totalAtoms: snapshot.storage?.totalAtoms ?? 0,
          totalTruths: snapshot.storage?.totalTruths ?? 0,
        },
      };
    }

    case "createMission": {
      const mission = await createMission({
        title: asString(params.title),
        objective: asString(params.objective),
        projectId: asString(params.projectId) || undefined,
      });
      return cloneJson(mission);
    }

    case "checkpointMission": {
      const missionId = asString(params.missionId);
      await checkpointMission(
        missionId,
        asString(params.state),
        asString(params.note),
      );
      const next =
        (getBrain2Snapshot() as any).missions?.find(
          (m: any) => asString(m?.id) === missionId,
        ) ?? null;
      return cloneJson(next);
    }

    case "addVerification": {
      await addVerification(
        asString(params.entityType),
        asString(params.entityId),
        asString(params.status) as any,
        asString(params.detail),
      );
      return { ok: true };
    }

    default:
      throw new Error(`Unsupported Brain2 bridge method: ${method}`);
  }
}

async function postJson(path: string, body: unknown, signal?: AbortSignal) {
  const response = await fetch(`${BRIDGE_BASE}${path}`, {
    method: "POST",
    mode: "cors",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${BRIDGE_TOKEN}`,
    },
    body: JSON.stringify(body),
    signal,
  });
  if (response.status === 204) return null;
  const text = await response.text();
  if (!response.ok)
    throw new Error(
      `Brain2 MCP bridge ${path} failed: HTTP ${response.status} ${text.slice(0, 500)}`,
    );
  return text ? JSON.parse(text) : null;
}

export default function Brain2McpBrowserBridge() {
  useEffect(() => {
    if (!BRIDGE_BASE || !BRIDGE_TOKEN) {
      console.info(
        "[Brain2 MCP Bridge] disabled: set NEXT_PUBLIC_BRAIN2_MCP_BRIDGE_URL and NEXT_PUBLIC_BRAIN2_MCP_BRIDGE_TOKEN",
      );
      return;
    }

    let stopped = false;
    const sessionId =
      sessionStorage.getItem("brain2-mcp-bridge-session") ||
      (() => {
        const c = globalThis.crypto;

        if (typeof c?.randomUUID === "function") {
          return c.randomUUID();
        }

        if (typeof c?.getRandomValues === "function") {
          const bytes = new Uint8Array(16);
          c.getRandomValues(bytes);

          // RFC 4122 UUID v4 bits.
          bytes[6] = (bytes[6] & 0x0f) | 0x40;
          bytes[8] = (bytes[8] & 0x3f) | 0x80;

          const hex = Array.from(bytes, (b) =>
            b.toString(16).padStart(2, "0"),
          ).join("");

          return [
            hex.slice(0, 8),
            hex.slice(8, 12),
            hex.slice(12, 16),
            hex.slice(16, 20),
            hex.slice(20),
          ].join("-");
        }

        // Last-resort bridge-session identifier.
        return `b2bridge_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      })();
    sessionStorage.setItem("brain2-mcp-bridge-session", sessionId);

    const run = async () => {
      await bootBrain2();
      console.info("[Brain2 MCP Bridge] active", {
        bridge: BRIDGE_BASE,
        sessionId,
      });

      while (!stopped) {
        const controller = new AbortController();
        const timer = window.setTimeout(
          () => controller.abort(),
          POLL_TIMEOUT_MS,
        );
        try {
          const snapshot = getBrain2Snapshot() as any;
          const command = (await postJson(
            "/bridge/poll",
            {
              sessionId,
              deviceId: currentBrain2DeviceId(),
              memoryRoot: snapshot.memoryRoot,
              snapshotVersion: snapshot.version,
              websiteOrigin: window.location.origin,
              appVersion: document.body?.dataset?.brain2Version ?? "unknown",
            },
            controller.signal,
          )) as BridgeCommand | null;
          if (!command?.requestId) continue;

          try {
            const result = await execute(command.method, command.params ?? {});
            await postJson("/bridge/respond", {
              sessionId,
              requestId: command.requestId,
              ok: true,
              result,
            });
          } catch (error) {
            await postJson("/bridge/respond", {
              sessionId,
              requestId: command.requestId,
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        } catch (error) {
          if (
            !stopped &&
            !(error instanceof DOMException && error.name === "AbortError")
          ) {
            console.warn("[Brain2 MCP Bridge] poll error", error);
            await sleep(1000);
          }
        } finally {
          window.clearTimeout(timer);
        }
      }
    };

    void run();
    return () => {
      stopped = true;
    };
  }, []);

  return null;
}
