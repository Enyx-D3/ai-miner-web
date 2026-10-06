import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "brain2LocalAuth";
const TOKEN = "brain2-local-auth-v1";

export function proxy(request: NextRequest) {
  if (request.cookies.get(COOKIE)?.value === TOKEN) return NextResponse.next();
  if (request.cookies.get("accessToken")?.value) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
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
