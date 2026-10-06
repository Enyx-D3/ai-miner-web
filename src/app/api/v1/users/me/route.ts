import { NextResponse } from "next/server";
import { authContextFromToken, bearerFromRequest, AUTH_COOKIES, readUserProfile } from "@/server/auth/session";

export async function GET(request: Request) {
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
