import { NextResponse } from "next/server";
import { authContextFromToken, bearerFromRequest, AUTH_COOKIES, refreshSupabaseSession, sessionCookieOptions } from "@/server/auth/session";

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const access = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${AUTH_COOKIES.access}=`))?.split("=").slice(1).join("=") || bearerFromRequest(request);
  const refresh = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${AUTH_COOKIES.refresh}=`))?.split("=").slice(1).join("=") || "";
  let context = await authContextFromToken(decodeURIComponent(access));
  const refreshed = context ? null : await refreshSupabaseSession(decodeURIComponent(refresh));
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
