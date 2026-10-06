import { NextResponse } from "next/server";
import {
  AUTH_COOKIES,
  clearAuthCookies,
  internalPath,
  readEntitlement,
  requireAuthConfig,
  sessionCookieOptions,
  upsertUserProfile,
  validateSupabaseAccessToken,
} from "@/server/auth/session";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("error")) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(url.searchParams.get("error_description") || "oauth_failed")}`, request.url));
  }

  let config: ReturnType<typeof requireAuthConfig>;
  try {
    config = requireAuthConfig();
  } catch {
    return NextResponse.redirect(new URL("/login?error=auth_not_configured", request.url));
  }

  const cookie = request.headers.get("cookie") || "";
  const cookieMap = Object.fromEntries(cookie.split(";").map((part) => {
    const [name, ...rest] = part.trim().split("=");
    return [name, decodeURIComponent(rest.join("=") || "")];
  }).filter(([name]) => Boolean(name)));
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const verifier = cookieMap[AUTH_COOKIES.oauthVerifier] || "";
  const expectedState = cookieMap[AUTH_COOKIES.oauthState] || "";
  const callbackUrl = internalPath(cookieMap[AUTH_COOKIES.oauthCallback]);

  if (!code || !verifier || !state || state !== expectedState) {
    const response = NextResponse.redirect(new URL("/login?error=invalid_oauth_state", request.url));
    clearAuthCookies(response);
    return response;
  }

  const tokenResponse = await fetch(`${config.url}/auth/v1/token?grant_type=pkce`, {
    method: "POST",
    cache: "no-store",
    headers: { apikey: config.anonKey, "content-type": "application/json" },
    body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
  }).catch(() => null);
  if (!tokenResponse?.ok) {
    const response = NextResponse.redirect(new URL("/login?error=session_exchange_failed", request.url));
    clearAuthCookies(response);
    return response;
  }

  const tokens = await tokenResponse.json().catch(() => ({})) as TokenResponse;
  if (!tokens.access_token || !tokens.refresh_token) {
    const response = NextResponse.redirect(new URL("/login?error=session_exchange_failed", request.url));
    clearAuthCookies(response);
    return response;
  }

  const user = await validateSupabaseAccessToken(tokens.access_token);
  if (!user) {
    const response = NextResponse.redirect(new URL("/login?error=session_validation_failed", request.url));
    clearAuthCookies(response);
    return response;
  }

  try {
    await upsertUserProfile(user);
  } catch {
    const response = NextResponse.redirect(new URL("/login?error=account_profile_failed", request.url));
    clearAuthCookies(response);
    return response;
  }

  const entitlement = await readEntitlement(user.id);
  const response = NextResponse.redirect(new URL(entitlement.active ? callbackUrl : "/subscribe", request.url));
  clearAuthCookies(response);
  response.cookies.set(AUTH_COOKIES.access, tokens.access_token, sessionCookieOptions(Math.max(60, Number(tokens.expires_in) || 3600)));
  response.cookies.set(AUTH_COOKIES.refresh, tokens.refresh_token, sessionCookieOptions(60 * 60 * 24 * 30));
  return response;
}
