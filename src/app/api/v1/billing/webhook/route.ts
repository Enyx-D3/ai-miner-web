import { NextResponse } from "next/server";
import { processStripeEvent, verifyStripeSignature } from "@/server/billing/core";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const raw = await request.text();
  try {
    verifyStripeSignature(raw, request.headers.get("stripe-signature"));
    const event = JSON.parse(raw) as Record<string, unknown>;
    const result = await processStripeEvent(event);
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook rejected." }, { status: 400 });
  }
}
