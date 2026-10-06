import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/server/auth/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
