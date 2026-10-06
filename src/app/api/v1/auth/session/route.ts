import { NextResponse } from "next/server";
import { authContextFromToken, bearerFromRequest, AUTH_COOKIES, cookieValueFromRequest, refreshSupabaseSession, refreshTokenFromRequest, sessionCookieOptions } from "@/server/auth/session";

export async function GET(request: Request) {
  const access = cookieValueFromRequest(request, AUTH_COOKIES.access) || bearerFromRequest(request);
  let context = await authContextFromToken(access);
  const refreshed = context ? null : await refreshSupabaseSession(refreshTokenFromRequest(request));
  if (refreshed) context = await authContextFromToken(refreshed.accessToken);
  if (!context) return NextResponse.json({ authenticated: false, entitlement: { active: false, status: "NONE" } }, { status: 401 });
  const response = NextResponse.json({
    authenticated: true,
    user: context.user,
    entitlement: context.entitlement,
  });
  if (refreshed) {
    response.cookies.set(AUTH_COOKIES.access, refreshed.accessToken, sessionCookieOptions(refreshed.expiresIn));
    response.cookies.set(AUTH_COOKIES.refresh, refreshed.refreshToken, sessionCookieOptions(60 * 60 * 24 * 30));
  }
  return response;
}
