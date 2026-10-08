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

export async function assertRateLimit(key: string, limit = 20, windowMs = 60_000) {
  const response = await supabaseFetch("/rest/v1/rpc/brain2_billing_rate_limit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ p_key: key, p_limit: limit, p_window_seconds: Math.ceil(windowMs / 1000) }),
  });
  if (!response.ok) throw new Error(await response.text().catch(() => "Billing rate limit check failed."));
  const allowed = await response.json().catch(() => false);
  if (!allowed) throw new Error("Rate limit exceeded.");
}

function stripeSecret() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("Stripe secret key is not configured.");
  return key;
}

async function stripeRequest(path: string, body?: URLSearchParams, method = "POST", idempotencyKey?: string) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    cache: "no-store",
    headers: {
      authorization: `Bearer ${stripeSecret()}`,
      ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
    },
    body,
  });
  const data = await response.json().catch(() => ({})) as StripeObject;
  if (!response.ok) throw new Error(typeof data.error === "object" && data.error && "message" in data.error ? String(data.error.message) : "Stripe request failed.");
  return data;
}

async function stripeGet(path: string) {
  return stripeRequest(path, undefined, "GET");
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
  const customer = await stripeRequest("/customers", body, "POST", `brain2_customer_${context.user.id}`);
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
  const session = await stripeRequest("/checkout/sessions", body, "POST", `brain2_checkout_${context.user.id}_${plan.key}_${Date.now()}`);
  return { id: String(session.id || ""), url: String(session.url || "") };
}

export async function createPortalUrl(request: Request, context: Brain2AuthContext) {
  const customer = await readBillingCustomer(context.user.id);
  if (!customer?.stripe_customer_id) throw new Error("No Stripe customer exists for this account.");
  const body = new URLSearchParams();
  body.set("customer", customer.stripe_customer_id);
  body.set("return_url", `${appOrigin(request)}/subscribe`);
  const session = await stripeRequest("/billing_portal/sessions", body, "POST", `brain2_portal_${context.user.id}_${Date.now()}`);
  return { url: String(session.url || "") };
}

export async function entitlementStatus(userId: string) {
  return readOne(`/rest/v1/brain2_entitlements?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`);
}

export function verifyStripeSignature(rawBody: string, signature: string | null, toleranceSeconds = 300) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) throw new Error("Stripe webhook signature missing.");
  const parts = signature.split(",").map((part) => part.split("=", 2) as [string, string]);
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signedValues = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !signedValues.length) throw new Error("Stripe webhook signature malformed.");
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > toleranceSeconds) throw new Error("Stripe webhook signature expired.");
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const ok = signedValues.some((signed) => {
    const b = Buffer.from(signed);
    return a.length === b.length && timingSafeEqual(a, b);
  });
  if (!ok) throw new Error("Stripe webhook signature invalid.");
}

async function claimEvent(event: StripeObject) {
  const response = await supabaseFetch("/rest/v1/rpc/brain2_claim_billing_event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ p_event_id: String(event.id), p_event_type: String(event.type) }),
  });
  if (!response.ok) throw new Error(await response.text().catch(() => "Billing event claim failed."));
  return await response.json().catch(() => "") === "claimed";
}

async function markEventProcessed(event: StripeObject) {
  const response = await supabaseFetch(
    `/rest/v1/brain2_billing_events?stripe_event_id=eq.${encodeURIComponent(String(event.id))}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({ processed_at: new Date().toISOString(), failed_at: null, error: null }),
    },
  );
  if (!response.ok) throw new Error(await response.text().catch(() => "Billing event processed update failed."));
}

async function markEventFailed(event: StripeObject, error: unknown) {
  const response = await supabaseFetch(
    `/rest/v1/brain2_billing_events?stripe_event_id=eq.${encodeURIComponent(String(event.id))}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({ failed_at: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) }),
    },
  );
  if (!response.ok) throw new Error(await response.text().catch(() => "Billing event failure update failed."));
}

async function userIdForCustomer(customerId: string) {
  const row = await readOne<{ user_id: string }>(`/rest/v1/brain2_stripe_customers?stripe_customer_id=eq.${encodeURIComponent(customerId)}&select=user_id&limit=1`);
  return row?.user_id || "";
}

function stripePriceId(item: unknown) {
  const record = item as { price?: { id?: unknown } } | undefined;
  return String(record?.price?.id || "");
}

function stripeItems(object: StripeObject) {
  const items = object.items as { data?: unknown[] } | undefined;
  const lineItems = object.line_items as { data?: unknown[] } | undefined;
  return items?.data || lineItems?.data || [];
}

function approvedSubscriptionPrice(priceId: string) {
  return priceId === process.env.STRIPE_PRICE_PRO_MONTHLY || priceId === process.env.STRIPE_PRICE_PRO_YEARLY;
}

function isLifetimePrice(priceId: string) {
  return Boolean(priceId && priceId === process.env.STRIPE_PRICE_FOUNDER_LIFETIME);
}

function subscriptionPeriodEnd(subscription: StripeObject) {
  const value = Number(subscription.current_period_end || 0);
  if (!value) throw new Error("Stripe subscription missing paid period end.");
  const iso = new Date(value * 1000).toISOString();
  if (Date.parse(iso) <= Date.now()) throw new Error("Stripe subscription paid period is expired.");
  return iso;
}

function invoiceIsPaid(invoice: unknown) {
  const record = invoice as StripeObject | undefined;
  const paymentIntent = record?.payment_intent as StripeObject | undefined;
  return Boolean(record && record.status === "paid" && record.paid === true && typeof paymentIntent === "object" && paymentIntent.status === "succeeded");
}

async function upsertEntitlement(input: { userId: string; status: EntitlementStatus; plan: string | null; customerId?: string; subscriptionId?: string | null; paymentIntentId?: string | null; periodEnd?: string | null; lifetime?: boolean; revokedAt?: string | null; cancelAtPeriodEnd?: boolean }) {
  await writeRows(
    "/rest/v1/brain2_entitlements?on_conflict=user_id",
    {
      user_id: input.userId,
      status: input.status,
      plan: input.plan,
      stripe_customer_id: input.customerId ?? null,
      stripe_subscription_id: input.subscriptionId ?? null,
      stripe_payment_intent_id: input.paymentIntentId ?? null,
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

async function upsertSubscriptionSource(input: { userId: string; customerId: string; subscriptionId: string; priceId: string; status: EntitlementStatus; periodEnd?: string | null; latestInvoiceId?: string | null; cancelAtPeriodEnd?: boolean }) {
  await writeRows(
    "/rest/v1/brain2_subscriptions?on_conflict=stripe_subscription_id",
    {
      user_id: input.userId,
      stripe_customer_id: input.customerId,
      stripe_subscription_id: input.subscriptionId,
      price_id: input.priceId,
      status: input.status,
      current_period_end: input.periodEnd ?? null,
      latest_invoice_id: input.latestInvoiceId ?? null,
      cancel_at_period_end: Boolean(input.cancelAtPeriodEnd),
      updated_at: new Date().toISOString(),
    },
    "resolution=merge-duplicates,return=representation",
  );
}

async function activeLifetime(userId: string) {
  return readOne<{ stripe_customer_id: string; stripe_payment_intent_id: string }>(`/rest/v1/brain2_lifetime_licenses?user_id=eq.${encodeURIComponent(userId)}&status=eq.ACTIVE&revoked_at=is.null&select=stripe_customer_id,stripe_payment_intent_id&limit=1`);
}

async function activeSubscription(userId: string) {
  return readOne<{ stripe_customer_id: string; stripe_subscription_id: string; status: EntitlementStatus; current_period_end: string | null; cancel_at_period_end?: boolean }>(`/rest/v1/brain2_subscriptions?user_id=eq.${encodeURIComponent(userId)}&status=eq.ACTIVE&current_period_end=gt.${encodeURIComponent(new Date().toISOString())}&select=stripe_customer_id,stripe_subscription_id,status,current_period_end,cancel_at_period_end&limit=1`);
}

async function latestSubscription(userId: string) {
  return readOne<{ stripe_customer_id: string; stripe_subscription_id: string; status: EntitlementStatus; current_period_end: string | null; cancel_at_period_end?: boolean }>(`/rest/v1/brain2_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=stripe_customer_id,stripe_subscription_id,status,current_period_end,cancel_at_period_end&order=updated_at.desc&limit=1`);
}

async function recomputeEffectiveEntitlement(userId: string, fallbackCustomerId?: string) {
  const lifetime = await activeLifetime(userId);
  if (lifetime) {
    await upsertEntitlement({ userId, status: "ACTIVE", plan: "founder", customerId: lifetime.stripe_customer_id, paymentIntentId: lifetime.stripe_payment_intent_id, periodEnd: null, lifetime: true });
    return;
  }
  const subscription = await activeSubscription(userId);
  if (subscription) {
    await upsertEntitlement({ userId, status: "ACTIVE", plan: "pro", customerId: subscription.stripe_customer_id, subscriptionId: subscription.stripe_subscription_id, periodEnd: subscription.current_period_end, cancelAtPeriodEnd: subscription.cancel_at_period_end });
    return;
  }
  const last = await latestSubscription(userId);
  await upsertEntitlement({
    userId,
    status: last?.status && last.status !== "ACTIVE" ? last.status : "EXPIRED",
    plan: last ? "pro" : null,
    customerId: last?.stripe_customer_id ?? fallbackCustomerId,
    subscriptionId: last?.stripe_subscription_id ?? null,
    periodEnd: last?.current_period_end ?? null,
    cancelAtPeriodEnd: last?.cancel_at_period_end,
  });
}

async function persistLifetimeLicense(input: { userId: string; customerId: string; session: StripeObject; paymentIntent: string }) {
  await writeRows(
    "/rest/v1/brain2_lifetime_licenses?on_conflict=stripe_payment_intent_id",
    {
      user_id: input.userId,
      stripe_customer_id: input.customerId,
      stripe_checkout_session_id: input.session.id,
      stripe_payment_intent_id: input.paymentIntent,
      status: "ACTIVE",
      revoked_at: null,
      updated_at: new Date().toISOString(),
    },
    "resolution=merge-duplicates,return=representation",
  );
}

async function revokeLifetimeByPaymentIntent(paymentIntent: string) {
  const license = await readOne<{ user_id: string; stripe_customer_id: string }>(`/rest/v1/brain2_lifetime_licenses?stripe_payment_intent_id=eq.${encodeURIComponent(paymentIntent)}&status=eq.ACTIVE&select=user_id,stripe_customer_id&limit=1`);
  if (!license) return false;
  const response = await supabaseFetch(
    `/rest/v1/brain2_lifetime_licenses?stripe_payment_intent_id=eq.${encodeURIComponent(paymentIntent)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({ status: "REVOKED", revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
    },
  );
  if (!response.ok) throw new Error(await response.text().catch(() => "Lifetime license revocation failed."));
  await recomputeEffectiveEntitlement(license.user_id, license.stripe_customer_id);
  return true;
}

export async function processStripeEvent(event: StripeObject) {
  const eventId = String(event.id || "");
  const eventType = String(event.type || "");
  if (!eventId || !eventType) throw new Error("Invalid Stripe event.");
  if (!await claimEvent(event)) return { duplicate: true };
  try {
    const object = (event.data as { object?: StripeObject } | undefined)?.object || {};

    if (eventType === "checkout.session.completed") {
      const sessionId = String(object.id || "");
      const session = await stripeGet(`/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=line_items`);
      const customerId = String(session.customer || "");
      const userId = String(session.client_reference_id || (session.metadata as Record<string, unknown> | undefined)?.brain2_user_id || "") || await userIdForCustomer(customerId);
      const owner = await userIdForCustomer(customerId);
      const paymentIntent = String(session.payment_intent || "");
      const prices = stripeItems(session).map(stripePriceId);
      if (!userId || owner !== userId) throw new Error("Stripe checkout customer ownership mismatch.");
      if (session.mode === "payment" && session.payment_status === "paid" && paymentIntent && prices.some(isLifetimePrice)) {
        await persistLifetimeLicense({ userId, customerId, session, paymentIntent });
        await recomputeEffectiveEntitlement(userId, customerId);
      }
    }

    if (eventType.startsWith("customer.subscription.")) {
      const subscriptionId = String(object.id || "");
      const subscription = await stripeGet(`/subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=latest_invoice.payment_intent&expand[]=items.data.price`);
      const customerId = String(subscription.customer || "");
      const userId = await userIdForCustomer(customerId);
      if (userId) {
        const priceId = stripeItems(subscription).map(stripePriceId).find(Boolean) || "";
        if (!approvedSubscriptionPrice(priceId)) throw new Error("Stripe subscription price is not approved.");
        const status = subscription.status === "active" ? "ACTIVE" : subscription.status === "past_due" ? "PAST_DUE" : subscription.status === "canceled" ? "CANCELED" : "NONE";
        const periodEnd = status === "ACTIVE" ? subscriptionPeriodEnd(subscription) : null;
        if (status === "ACTIVE" && !invoiceIsPaid(subscription.latest_invoice)) throw new Error("Stripe subscription invoice is not paid.");
        const latestInvoice = subscription.latest_invoice as StripeObject | undefined;
        await upsertSubscriptionSource({
          userId,
          customerId,
          subscriptionId,
          priceId,
          status,
          periodEnd,
          latestInvoiceId: typeof latestInvoice === "object" ? String(latestInvoice.id || "") : String(subscription.latest_invoice || ""),
          cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        });
        await recomputeEffectiveEntitlement(userId, customerId);
      }
    }

    if (["charge.refunded", "charge.dispute.created"].includes(eventType)) {
      const paymentIntent = String(object.payment_intent || "");
      if (paymentIntent && !await revokeLifetimeByPaymentIntent(paymentIntent)) {
        await writeRows("/rest/v1/brain2_billing_audit", { user_id: null, action: "unmatched_refund_or_dispute", stripe_object_id: paymentIntent, created_at: new Date().toISOString() }, "return=minimal");
      }
    }

    await markEventProcessed(event);
    return { duplicate: false };
  } catch (error) {
    await markEventFailed(event, error);
    throw error;
  }
}
