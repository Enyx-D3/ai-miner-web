import { NextResponse } from "next/server";
import { authContextFromToken, bearerFromRequest, AUTH_COOKIES, localDevDemoContextFromRequest, readUserProfile } from "@/server/auth/session";

export async function GET(request: Request) {
  const demo = localDevDemoContextFromRequest(request);
  if (demo) return NextResponse.json({ user: demo.user, profile: null, entitlement: demo.entitlement, developmentMode: true }, { headers: { "cache-control": "no-store" } });
  const cookie = request.headers.get("cookie") || "";
  const access = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${AUTH_COOKIES.access}=`))?.split("=").slice(1).join("=") || bearerFromRequest(request);
  const context = await authContextFromToken(decodeURIComponent(access));
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await readUserProfile(context.user.id);
  return NextResponse.json({
    user: context.user,
    profile,
    entitlement: context.entitlement,
  });
}
