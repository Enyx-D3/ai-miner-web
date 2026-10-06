import { NextResponse } from "next/server";
import { AUTH_COOKIES, clearAuthCookies, requireAuthConfig } from "@/server/auth/session";

export async function POST(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const access = decodeURIComponent(cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${AUTH_COOKIES.access}=`))?.split("=").slice(1).join("=") || "");
  try {
    const { url, anonKey } = requireAuthConfig();
    if (access) {
      await fetch(`${url}/auth/v1/logout`, {
        method: "POST",
        cache: "no-store",
        headers: { apikey: anonKey, authorization: `Bearer ${access}` },
      });
    }
  } catch {}
  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
