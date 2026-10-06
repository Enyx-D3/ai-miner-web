import { NextResponse } from "next/server";
import { assertSameOriginMutation, clearAuthCookies } from "@/server/auth/session";

export async function POST(request: Request) {
  try {
    assertSameOriginMutation(request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Access denied." }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
