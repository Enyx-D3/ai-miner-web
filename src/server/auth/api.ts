import { NextResponse } from "next/server";
import { assertSameOriginMutation, requirePaidRequest } from "@/server/auth/core";

export async function requirePaidApi(request: Request, mutation = false) {
  try {
    if (mutation) assertSameOriginMutation(request);
    await requirePaidRequest(request);
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Access denied.";
    const status = message.includes("Authentication required") ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
