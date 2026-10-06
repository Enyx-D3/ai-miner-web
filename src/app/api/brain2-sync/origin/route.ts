import { networkInterfaces } from "node:os";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isLoopback(host: string) {
  const value = host.toLowerCase().replace(/^\[|\]$/g, "");
  return value === "localhost" ||
    value === "::1" ||
    value === "0.0.0.0" ||
    value.startsWith("127.");
}

function isPrivateV4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

function preferredLanAddress() {
  const override = process.env.BRAIN2_LAN_HOST?.trim();
  if (override) return override;
  const candidates: string[] = [];
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      if (isPrivateV4(entry.address)) candidates.push(entry.address);
    }
  }
  return candidates.sort()[0] ?? null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || url.protocol.replace(":", "") || "http";
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = forwardedHost || request.headers.get("host") || url.host;
  const requestHostname = requestHost.replace(/:\d+$/, "").replace(/^\[|\]$/g, "");

  if (!isLoopback(requestHostname)) {
    return NextResponse.json({
      origin: `${protocol}://${requestHost}`,
      source: "request",
      physicalDeviceReachable: true,
    });
  }

  const lan = preferredLanAddress();
  if (!lan) {
    return NextResponse.json({
      error: "No LAN IPv4 address was detected. Set BRAIN2_LAN_HOST or NEXT_PUBLIC_BRAIN2_SIGNALING_URL.",
      physicalDeviceReachable: false,
    }, { status: 409 });
  }

  const port = url.port || requestHost.match(/:(\d+)$/)?.[1] || "3000";
  return NextResponse.json({
    origin: `${protocol}://${lan}:${port}`,
    source: "lan",
    physicalDeviceReachable: true,
  });
}
