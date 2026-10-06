import { NextResponse } from "next/server";
import { assertSameOriginMutation, authContextFromRequest } from "@/server/auth/core";
import { assertRateLimit, createPortalUrl } from "@/server/billing/core";

export async function POST(request: Request) {
  try {
    assertSameOriginMutation(request);
    const context = await authContextFromRequest(request);
    if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    assertRateLimit(`portal:${context.user.id}`, 10);
    return NextResponse.json(await createPortalUrl(request, context));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Billing portal failed.";
    const status = message.includes("Rate limit") ? 429 : message.includes("Authentication") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
