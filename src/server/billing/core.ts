import { createHmac, timingSafeEqual } from "node:crypto";
import type { Brain2AuthContext } from "@/server/auth/core";
import { requireAuthConfig } from "@/server/auth/core";

export type BillingPlanKey = "pro_monthly" | "pro_yearly" | "founder_lifetime";

export type BillingPlan = {
  key: BillingPlanKey;
  name: string;
  priceLabel: string;
  mode: "subscription" | "payment";
  env: "STRIPE_PRICE_PRO_MONTHLY" | "STRIPE_PRICE_PRO_YEARLY" | "STRIPE_PRICE_FOUNDER_LIFETIME";
  plan: "pro" | "founder";
};

export const BILLING_PLANS: Record<BillingPlanKey, BillingPlan> = {
  pro_monthly: { key: "pro_monthly", name: "Pro Monthly", priceLabel: "$9.99/month", mode: "subscription", env: "STRIPE_PRICE_PRO_MONTHLY", plan: "pro" },
  pro_yearly: { key: "pro_yearly", name: "Pro Yearly", priceLabel: "$79/year", mode: "subscription", env: "STRIPE_PRICE_PRO_YEARLY", plan: "pro" },
  founder_lifetime: { key: "founder_lifetime", name: "Founder Lifetime", priceLabel: "$299 once", mode: "payment", env: "STRIPE_PRICE_FOUNDER_LIFETIME", plan: "founder" },
};

type StripeObject = Record<string, unknown>;
type EntitlementStatus = "NONE" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function appOrigin(request: Request) {
  return (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
}

export function publicPlans() {
  return Object.values(BILLING_PLANS).map((plan) => ({
    key: plan.key,
    name: plan.name,
    priceLabel: plan.priceLabel,
    mode: plan.mode,
    configured: Boolean(process.env[plan.env]),
  }));
}

export function planPriceId(planKey: unknown) {
  const plan = BILLING_PLANS[String(planKey) as BillingPlanKey];
  if (!plan) throw new Error("Unknown billing plan.");
  const priceId = process.env[plan.env]?.trim();
  if (!priceId) throw new Error("Billing plan is not configured.");
  return { plan, priceId };
}

export function assertRateLimit(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) throw new Error("Rate limit exceeded.");
}

function stripeSecret() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("Stripe secret key is not configured.");
  return key;
}

async function stripeRequest(path: string, body?: URLSearchParams, method = "POST") {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    cache: "no-store",
    headers: {
      authorization: `Bearer ${stripeSecret()}`,
      ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
  });
  const data = await response.json().catch(() => ({})) as StripeObject;
  if (!response.ok) throw new Error(typeof data.error === "object" && data.error && "message" in data.error ? String(data.error.message) : "Stripe request failed.");
  return data;
}

async function supabaseFetch(path: string, init: RequestInit = {}) {
  const { url, serviceRoleKey } = requireAuthConfig();
  if (!serviceRoleKey) throw new Error("Supabase service role is not configured.");
  return fetch(`${url}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      ...(init.headers || {}),
    },
  });
}

async function readOne<T>(path: string): Promise<T | null> {
  const response = await supabaseFetch(path).catch(() => null);
  if (!response?.ok) return null;
  return ((await response.json().catch(() => [])) as T[])[0] ?? null;
}

async function writeRows(path: string, payload: unknown, prefer = "return=representation") {
  const response = await supabaseFetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", prefer },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await response.text().catch(() => "Supabase write failed."));
  return response.json().catch(() => []);
}

export async function readBillingCustomer(userId: string) {
  return readOne<{ user_id: string; stripe_customer_id: string }>(`/rest/v1/brain2_stripe_customers?user_id=eq.${encodeURIComponent(userId)}&select=user_id,stripe_customer_id&limit=1`);
}

export async function ensureBillingCustomer(context: Brain2AuthContext) {
  const existing = await readBillingCustomer(context.user.id);
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;
  const body = new URLSearchParams();
  body.set("email", context.user.email);
  body.set("metadata[brain2_user_id]", context.user.id);
  const customer = await stripeRequest("/customers", body);
  const customerId = String(customer.id || "");
  if (!customerId) throw new Error("Stripe customer creation failed.");
  await writeRows(
    "/rest/v1/brain2_stripe_customers?on_conflict=user_id",
    { user_id: context.user.id, stripe_customer_id: customerId, email: context.user.email, updated_at: new Date().toISOString() },
    "resolution=merge-duplicates,return=representation",
  );
  return customerId;
}

export async function createCheckoutUrl(request: Request, context: Brain2AuthContext, planKey: unknown) {
  const { plan, priceId } = planPriceId(planKey);
  const customerId = await ensureBillingCustomer(context);
  const origin = appOrigin(request);
  const body = new URLSearchParams();
  body.set("mode", plan.mode);
  body.set("customer", customerId);
  body.set("client_reference_id", context.user.id);
  body.set("line_items[0][price]", priceId);
  body.set("line_items[0][quantity]", "1");
  body.set("success_url", `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`);
  body.set("cancel_url", `${origin}/checkout?canceled=1`);
  body.set("metadata[brain2_user_id]", context.user.id);
  body.set("metadata[brain2_plan]", plan.key);
  if (plan.mode === "subscription") {
    body.set("subscription_data[metadata][brain2_user_id]", context.user.id);
    body.set("subscription_data[metadata][brain2_plan]", plan.key);
  } else {
    body.set("payment_intent_data[metadata][brain2_user_id]", context.user.id);
    body.set("payment_intent_data[metadata][brain2_plan]", plan.key);
  }
  const session = await stripeRequest("/checkout/sessions", body);
  return { id: String(session.id || ""), url: String(session.url || "") };
}

export async function createPortalUrl(request: Request, context: Brain2AuthContext) {
  const customer = await readBillingCustomer(context.user.id);
  if (!customer?.stripe_customer_id) throw new Error("No Stripe customer exists for this account.");
  const body = new URLSearchParams();
  body.set("customer", customer.stripe_customer_id);
  body.set("return_url", `${appOrigin(request)}/subscribe`);
  const session = await stripeRequest("/billing_portal/sessions", body);
  return { url: String(session.url || "") };
}

export async function entitlementStatus(userId: string) {
  return readOne(`/rest/v1/brain2_entitlements?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`);
}

export function verifyStripeSignature(rawBody: string, signature: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) throw new Error("Stripe webhook signature missing.");
  const parts = Object.fromEntries(signature.split(",").map((part) => part.split("=", 2) as [string, string]));
  const timestamp = parts.t;
  const signed = parts.v1;
  if (!timestamp || !signed) throw new Error("Stripe webhook signature malformed.");
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signed);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Stripe webhook signature invalid.");
}

async function eventAlreadyProcessed(eventId: string) {
  return Boolean(await readOne(`/rest/v1/brain2_billing_events?stripe_event_id=eq.${encodeURIComponent(eventId)}&select=stripe_event_id&limit=1`));
}

async function markEventProcessed(event: StripeObject) {
  await writeRows(
    "/rest/v1/brain2_billing_events?on_conflict=stripe_event_id",
    { stripe_event_id: event.id, event_type: event.type, processed_at: new Date().toISOString() },
    "resolution=ignore-duplicates,return=minimal",
  );
}

async function userIdForCustomer(customerId: string) {
  const row = await readOne<{ user_id: string }>(`/rest/v1/brain2_stripe_customers?stripe_customer_id=eq.${encodeURIComponent(customerId)}&select=user_id&limit=1`);
  return row?.user_id || "";
}

async function hasActiveLifetime(userId: string) {
  const row = await readOne<{ status?: string; lifetime?: boolean; revoked_at?: string | null }>(`/rest/v1/brain2_entitlements?user_id=eq.${encodeURIComponent(userId)}&select=status,lifetime,revoked_at&limit=1`);
  return Boolean(row?.lifetime && row.status === "ACTIVE" && !row.revoked_at);
}

async function upsertEntitlement(input: { userId: string; status: EntitlementStatus; plan: string | null; customerId?: string; subscriptionId?: string | null; periodEnd?: string | null; lifetime?: boolean; revokedAt?: string | null; cancelAtPeriodEnd?: boolean }) {
  await writeRows(
    "/rest/v1/brain2_entitlements?on_conflict=user_id",
    {
      user_id: input.userId,
      status: input.status,
      plan: input.plan,
      stripe_customer_id: input.customerId ?? null,
      stripe_subscription_id: input.subscriptionId ?? null,
      current_period_end: input.periodEnd ?? null,
      source: input.lifetime ? "stripe_lifetime" : "stripe_subscription",
      lifetime: Boolean(input.lifetime),
      revoked_at: input.revokedAt ?? null,
      cancel_at_period_end: Boolean(input.cancelAtPeriodEnd),
      updated_at: new Date().toISOString(),
    },
    "resolution=merge-duplicates,return=representation",
  );
}

function periodEndFromSubscription(subscription: StripeObject) {
  const value = Number(subscription.current_period_end || 0);
  return value ? new Date(value * 1000).toISOString() : null;
}

export async function processStripeEvent(event: StripeObject) {
  const eventId = String(event.id || "");
  const eventType = String(event.type || "");
  if (!eventId || !eventType) throw new Error("Invalid Stripe event.");
  if (await eventAlreadyProcessed(eventId)) return { duplicate: true };
  const object = (event.data as { object?: StripeObject } | undefined)?.object || {};

  if (eventType === "checkout.session.completed") {
    const mode = String(object.mode || "");
    const customerId = String(object.customer || "");
    const metadata = object.metadata as Record<string, unknown> | undefined;
    const userId = String(object.client_reference_id || metadata?.brain2_user_id || "") || await userIdForCustomer(customerId);
    if (userId && customerId && mode === "payment" && object.payment_status === "paid") {
      await upsertEntitlement({ userId, status: "ACTIVE", plan: "founder", customerId, periodEnd: null, lifetime: true });
    }
  }

  if (eventType.startsWith("customer.subscription.")) {
    const customerId = String(object.customer || "");
    const userId = await userIdForCustomer(customerId);
    if (userId) {
      if (await hasActiveLifetime(userId)) {
        await markEventProcessed(event);
        return { duplicate: false, preservedLifetime: true };
      }
      const status = object.status === "active" ? "ACTIVE" : object.status === "past_due" ? "PAST_DUE" : object.status === "canceled" ? "CANCELED" : "NONE";
      const periodEnd = periodEndFromSubscription(object);
      await upsertEntitlement({
        userId,
        status,
        plan: "pro",
        customerId,
        subscriptionId: String(object.id || ""),
        periodEnd,
        cancelAtPeriodEnd: Boolean(object.cancel_at_period_end),
      });
    }
  }

  if (["charge.refunded", "charge.dispute.created"].includes(eventType)) {
    const paymentIntent = String(object.payment_intent || "");
    const customerId = String(object.customer || "");
    const userId = await userIdForCustomer(customerId);
    if (userId) await upsertEntitlement({ userId, status: "EXPIRED", plan: "founder", customerId, periodEnd: null, lifetime: true, revokedAt: new Date().toISOString() });
    if (!userId && paymentIntent) {
      await writeRows("/rest/v1/brain2_billing_audit", { user_id: null, action: "unmatched_refund_or_dispute", stripe_object_id: paymentIntent, created_at: new Date().toISOString() }, "return=minimal");
    }
  }

  await markEventProcessed(event);
  return { duplicate: false };
}
