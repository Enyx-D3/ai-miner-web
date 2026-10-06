import { NextResponse } from "next/server";
import { AUTH_COOKIES, internalPath, requireAuthConfig, sessionCookieOptions } from "@/server/auth/session";

function randomBase64Url(bytes = 32) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function challenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function GET(request: Request) {
  let config: ReturnType<typeof requireAuthConfig>;
  try {
    config = requireAuthConfig();
  } catch {
    return NextResponse.redirect(new URL("/login?error=auth_not_configured", request.url));
  }

  const requestUrl = new URL(request.url);
  const callbackUrl = internalPath(requestUrl.searchParams.get("callbackUrl"));
  const state = randomBase64Url(24);
  const verifier = randomBase64Url(48);
  const redirectTo = new URL("/auth/callback", request.url);
  const authorize = new URL(`${config.url}/auth/v1/authorize`);
  authorize.searchParams.set("provider", "google");
  authorize.searchParams.set("redirect_to", redirectTo.toString());
  authorize.searchParams.set("code_challenge", await challenge(verifier));
  authorize.searchParams.set("code_challenge_method", "s256");
  authorize.searchParams.set("state", state);

  const response = NextResponse.redirect(authorize);
  response.cookies.set(AUTH_COOKIES.oauthState, state, sessionCookieOptions(10 * 60));
  response.cookies.set(AUTH_COOKIES.oauthVerifier, verifier, sessionCookieOptions(10 * 60));
  response.cookies.set(AUTH_COOKIES.oauthCallback, callbackUrl, sessionCookieOptions(10 * 60));
  return response;
}
