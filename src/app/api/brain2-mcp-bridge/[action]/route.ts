import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_UPSTREAM = "http://127.0.0.1:8787";
const ALLOWED_ACTIONS = new Set(["poll", "respond", "status"]);

function bridgeToken() {
  return process.env.BRAIN2_BRIDGE_TOKEN?.trim() ?? "";
}

function upstreamBase() {
  const raw = (process.env.BRAIN2_MCP_BRIDGE_URL ?? DEFAULT_UPSTREAM).trim().replace(/\/$/, "");
  const url = new URL(raw);
  const allowRemote = process.env.BRAIN2_MCP_ALLOW_REMOTE === "1";
  const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  if (!allowRemote && !localHosts.has(url.hostname)) {
    throw new Error("Brain2 MCP bridge upstream must be loopback unless BRAIN2_MCP_ALLOW_REMOTE=1.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Brain2 MCP bridge upstream must use http(s).");
  }
  return url.toString().replace(/\/$/, "");
}

async function actionFrom(context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!ALLOWED_ACTIONS.has(action)) throw new Error("Unsupported Brain2 MCP bridge action.");
  return action;
}

async function upstreamHealth(upstream: string) {
  try {
    const response = await fetch(`${upstream}/healthz`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2_500),
    });
    if (!response.ok) return { reachable: false, status: response.status };
    const body = await response.json().catch(() => ({})) as {
      bridge?: { ok?: boolean; activeSessions?: unknown[]; pendingRequests?: number };
      service?: string;
      aiMinerTransport?: string;
    };
    return {
      reachable: true,
      status: response.status,
      service: body.service,
      aiMinerTransport: body.aiMinerTransport,
      bridgeOk: Boolean(body.bridge?.ok),
      activeSessionCount: Array.isArray(body.bridge?.activeSessions) ? body.bridge!.activeSessions!.length : 0,
      pendingRequests: Number(body.bridge?.pendingRequests ?? 0),
    };
  } catch (error) {
    return {
      reachable: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ action: string }> },
) {
  const action = await actionFrom(context).catch(() => "");
  if (action !== "status") return NextResponse.json({ error: "Not found" }, { status: 404 });

  let upstreamConfigured = false;
  let upstream = "";
  try {
    upstream = upstreamBase();
    upstreamConfigured = true;
  } catch {}

  const health = upstreamConfigured ? await upstreamHealth(upstream) : { reachable: false };
  return NextResponse.json({
    enabled: Boolean(bridgeToken()) && upstreamConfigured,
    tokenConfigured: Boolean(bridgeToken()),
    upstreamConfigured,
    upstreamReachable: health.reachable,
    upstream: {
      service: "service" in health ? health.service : undefined,
      aiMinerTransport: "aiMinerTransport" in health ? health.aiMinerTransport : undefined,
      bridgeOk: "bridgeOk" in health ? health.bridgeOk : false,
      activeSessionCount: "activeSessionCount" in health ? health.activeSessionCount : 0,
      pendingRequests: "pendingRequests" in health ? health.pendingRequests : 0,
      error: "error" in health ? health.error : undefined,
    },
  }, { headers: { "cache-control": "no-store" } });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  let action: string;
  try {
    action = await actionFrom(context);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 404 });
  }

  const token = bridgeToken();
  if (!token) {
    return NextResponse.json(
      { error: "Brain2 MCP browser bridge is not configured on the Web server." },
      { status: 503 },
    );
  }

  let upstream: string;
  try {
    upstream = upstreamBase();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }

  const body = await request.text();
  try {
    const response = await fetch(`${upstream}/bridge/${action}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    if (response.status === 204) {
      return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
    }
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Brain2 MCP bridge upstream unavailable: ${error instanceof Error ? error.message : String(error)}` },
      { status: 502 },
    );
  }
}
