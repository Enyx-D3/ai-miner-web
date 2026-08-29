import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtDecode } from "jwt-decode";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("accessToken")?.value;
  const loginUrl = new URL("/login", request.url);

  // Redirect to login if token is not present
  if (!token) {
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("X-Redirect-Reason", "No Token");
    return response;
    // return NextResponse.redirect(loginUrl);
  }

  try {
    const user = jwtDecode(token);
    console.log(user, "user from proxy");

    // check the user role and redirect and restrict here
  } catch (error) {
    console.error("Error decoding token:", error);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("X-Redirect-Reason", "Invalid Token");
    return response;
  }

  // Proceed to the requested route
  return NextResponse.next();
}

// "Matching Paths"
export const config = {
  matcher: [
    "/booking",
    "/booking/:path*",
  ],
};
