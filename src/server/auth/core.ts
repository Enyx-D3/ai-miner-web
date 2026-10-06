import type { NextRequest, NextResponse } from "next/server";

export const AUTH_COOKIES = {
  access: "b2ic_session_access",
  refresh: "b2ic_session_refresh",
  oauthState: "b2ic_oauth_state",
  oauthVerifier: "b2ic_oauth_verifier",
  oauthCallback: "b2ic_oauth_callback",
} as const;

export type Brain2User = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type Brain2Entitlement = {
  status: "NONE" | "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "EXPIRED";
  plan: string | null;
  active: boolean;
  currentPeriodEnd: string | null;
};

export type Brain2AuthContext = {
  user: Brain2User;
  entitlement: Brain2Entitlement;
};

export type Brain2SessionTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

type CookieReader = { get(name: string): { value: string } | undefined };

const ACTIVE_STATUSES = new Set(["ACTIVE"]);

export function authConfigured() {
  return Boolean(
    process.env.AUTH_PROVIDER === "supabase" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function requireAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.AUTH_PROVIDER !== "supabase" || !url || !anonKey) {
    throw new Error("Supabase auth is not configured.");
  }
  return { url, anonKey, serviceRoleKey };
}

export function internalPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const parsed = new URL(value, "http://brain2.local");
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return fallback;
  }
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" || process.env.BRAIN2_DEPLOY_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function clearAuthCookies(response: NextResponse) {
  for (const name of [
    AUTH_COOKIES.access,
    AUTH_COOKIES.refresh,
    AUTH_COOKIES.oauthState,
    AUTH_COOKIES.oauthVerifier,
    AUTH_COOKIES.oauthCallback,
    "brain2LocalAuth",
    "accessToken",
    "refreshToken",
  ]) {
    response.cookies.set(name, "", { path: "/", maxAge: 0, sameSite: "lax" });
  }
}

export function bearerFromRequest(request: Request | NextRequest) {
  const header = request.headers.get("authorization") || "";
  return header.replace(/^Bearer\s+/i, "").trim();
}

export function cookieValueFromRequest(request: Request | NextRequest, name: string) {
  const nextCookie = "cookies" in request ? request.cookies.get(name)?.value : "";
  if (nextCookie) return nextCookie;
  const cookie = request.headers.get("cookie") || "";
  const raw = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.split("=").slice(1).join("=") || "";
  try {
    return raw ? decodeURIComponent(raw) : "";
  } catch {
    return "";
  }
}

export function accessTokenFromRequest(request: NextRequest) {
  return cookieValueFromRequest(request, AUTH_COOKIES.access) || bearerFromRequest(request);
}

export function refreshTokenFromRequest(request: Request | NextRequest) {
  return cookieValueFromRequest(request, AUTH_COOKIES.refresh);
}

export async function accessTokenFromCookies(reader: CookieReader) {
  return reader.get(AUTH_COOKIES.access)?.value || "";
}

async function supabaseFetch(path: string, init: RequestInit = {}, privileged = false) {
  const { url, anonKey, serviceRoleKey } = requireAuthConfig();
  const key = privileged ? serviceRoleKey : anonKey;
  if (privileged && !key) throw new Error("Supabase service role is not configured.");
  return fetch(`${url}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: key || anonKey,
      authorization: `Bearer ${key || anonKey}`,
      ...(init.headers || {}),
    },
  });
}

export async function validateSupabaseAccessToken(accessToken: string): Promise<Brain2User | null> {
  if (!accessToken || !authConfigured()) return null;
  const { url, anonKey } = requireAuthConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    cache: "no-store",
    headers: { apikey: anonKey, authorization: `Bearer ${accessToken}` },
  }).catch(() => null);
  if (!response?.ok) return null;
  const data = await response.json().catch(() => null) as { id?: string; email?: string; user_metadata?: Record<string, unknown> } | null;
  if (!data?.id || !data.email) return null;
  return {
    id: data.id,
    email: data.email.toLowerCase(),
    displayName: typeof data.user_metadata?.full_name === "string" ? data.user_metadata.full_name : null,
    avatarUrl: typeof data.user_metadata?.avatar_url === "string" ? data.user_metadata.avatar_url : null,
  };
}

export async function refreshSupabaseSession(refreshToken: string): Promise<Brain2SessionTokens | null> {
  if (!refreshToken || !authConfigured()) return null;
  const { url, anonKey } = requireAuthConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    cache: "no-store",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  }).catch(() => null);
  if (!response?.ok) return null;
  const data = await response.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number } | null;
  if (!data?.access_token || !data.refresh_token) return null;
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: Math.max(60, Number(data.expires_in) || 3600) };
}

export async function upsertUserProfile(user: Brain2User) {
  const payload = {
    user_id: user.id,
    email: user.email,
    display_name: user.displayName,
    avatar_url: user.avatarUrl,
    updated_at: new Date().toISOString(),
  };
  const response = await supabaseFetch(
    "/rest/v1/brain2_user_profiles?on_conflict=user_id",
    {
      method: "POST",
      headers: { "content-type": "application/json", prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload),
    },
    true,
  );
  if (!response.ok) throw new Error("Could not upsert Brain2 user profile.");
  return (await response.json().catch(() => []))[0] ?? payload;
}

export async function readUserProfile(userId: string) {
  const response = await supabaseFetch(
    `/rest/v1/brain2_user_profiles?user_id=eq.${encodeURIComponent(userId)}&select=user_id,email,display_name,avatar_url,created_at,updated_at&limit=1`,
    {},
    true,
  ).catch(() => null);
  if (!response?.ok) return null;
  return (await response.json().catch(() => []))[0] ?? null;
}

export async function readEntitlement(userId: string): Promise<Brain2Entitlement> {
  const response = await supabaseFetch(
    `/rest/v1/brain2_entitlements?user_id=eq.${encodeURIComponent(userId)}&select=status,plan,current_period_end&limit=1`,
    {},
    true,
  ).catch(() => null);
  if (!response?.ok) return { status: "NONE", plan: null, active: false, currentPeriodEnd: null };
  const row = (await response.json().catch(() => []))[0] as { status?: string; plan?: string | null; current_period_end?: string | null } | undefined;
  const status = String(row?.status || "NONE").toUpperCase() as Brain2Entitlement["status"];
  const currentPeriodEnd = row?.current_period_end ?? null;
  const unexpired = !currentPeriodEnd || Date.parse(currentPeriodEnd) > Date.now();
  return { status, plan: row?.plan ?? null, currentPeriodEnd, active: ACTIVE_STATUSES.has(status) && unexpired };
}

export async function authContextFromToken(accessToken: string): Promise<Brain2AuthContext | null> {
  const user = await validateSupabaseAccessToken(accessToken);
  if (!user) return null;
  const entitlement = await readEntitlement(user.id);
  return { user, entitlement };
}

export async function authContextFromRequest(request: Request | NextRequest): Promise<Brain2AuthContext | null> {
  return authContextFromToken(cookieValueFromRequest(request, AUTH_COOKIES.access) || bearerFromRequest(request));
}

export function assertSameOriginMutation(request: Request | NextRequest) {
  if (!cookieValueFromRequest(request, AUTH_COOKIES.access) && !cookieValueFromRequest(request, AUTH_COOKIES.refresh)) return;
  const expected = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const actual = origin || (referer ? new URL(referer).origin : "");
  if (actual && actual !== expected) throw new Error("Cross-origin authenticated mutation rejected.");
}

export async function requirePaidRequest(request: Request | NextRequest): Promise<Brain2AuthContext> {
  const context = await authContextFromRequest(request);
  if (!context) throw new Error("Authentication required.");
  if (!context.entitlement.active) throw new Error("Active paid entitlement required.");
  return context;
}

export async function authContextFromCookieReader(reader: CookieReader): Promise<Brain2AuthContext | null> {
  return authContextFromToken(await accessTokenFromCookies(reader));
}
