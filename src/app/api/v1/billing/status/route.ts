import { NextResponse } from "next/server";
import { authContextFromRequest } from "@/server/auth/core";
import { entitlementStatus, readBillingCustomer } from "@/server/billing/core";

export async function GET(request: Request) {
  const context = await authContextFromRequest(request);
  if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const [entitlement, customer] = await Promise.all([
    entitlementStatus(context.user.id),
    readBillingCustomer(context.user.id),
  ]);
  return NextResponse.json({
    user: context.user,
    entitlement: entitlement ?? context.entitlement,
    hasStripeCustomer: Boolean(customer?.stripe_customer_id),
  }, { headers: { "cache-control": "no-store" } });
}
