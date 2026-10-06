import { NextResponse } from "next/server";

const COOKIES = ["brain2LocalAuth", "accessToken", "refreshToken"];

export async function POST() {
  const response = NextResponse.json({ ok: true });
  for (const name of COOKIES) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}
