import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_COOKIES,
  accessTokenFromRequest,
  authContextFromToken,
  refreshSupabaseSession,
  refreshTokenFromRequest,
  sessionCookieOptions,
} from "@/server/auth/core";

export async function proxy(request: NextRequest) {
  let context = await authContextFromToken(accessTokenFromRequest(request));
  const refreshed = context ? null : await refreshSupabaseSession(refreshTokenFromRequest(request));
  if (refreshed) context = await authContextFromToken(refreshed.accessToken);

  if (!context) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }
  if (!context.entitlement.active) {
    const subscribeUrl = new URL("/subscribe", request.url);
    subscribeUrl.searchParams.set("reason", "subscription_required");
    return NextResponse.redirect(subscribeUrl);
  }
  const response = NextResponse.next();
  if (refreshed) {
    response.cookies.set(AUTH_COOKIES.access, refreshed.accessToken, sessionCookieOptions(refreshed.expiresIn));
    response.cookies.set(AUTH_COOKIES.refresh, refreshed.refreshToken, sessionCookieOptions(60 * 60 * 24 * 30));
  }
  return response;
}

export const config = {
  matcher: [
    "/dashboard",
    "/ask",
    "/continue",
    "/conversations/:path*",
    "/decisions",
    "/devices",
    "/discover",
    "/experiments",
    "/live-notebooks",
    "/memory",
    "/missions",
    "/models",
    "/operations",
    "/outputs",
    "/patterns",
    "/projects/:path*",
    "/search",
    "/ticks",
    "/timeline",
    "/wiki",
  ],
};
