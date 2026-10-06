import { NextResponse } from "next/server";
import { assertSameOriginMutation, authContextFromRequest } from "@/server/auth/core";
import { assertRateLimit, createCheckoutUrl } from "@/server/billing/core";

export async function POST(request: Request) {
  try {
    assertSameOriginMutation(request);
    const context = await authContextFromRequest(request);
    if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    assertRateLimit(`checkout:${context.user.id}`, 10);
    const body = await request.json().catch(() => ({})) as { plan?: unknown };
    const session = await createCheckoutUrl(request, context, body.plan);
    if (!session.url) throw new Error("Stripe checkout did not return a URL.");
    return NextResponse.json({ url: session.url, id: session.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed.";
    const status = message.includes("Rate limit") ? 429 : message.includes("Authentication") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
