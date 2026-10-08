import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const billingCore = read("src/server/billing/core.ts");
const checkoutRoute = read("src/app/api/v1/billing/checkout/route.ts");
const portalRoute = read("src/app/api/v1/billing/portal/route.ts");
const webhookRoute = read("src/app/api/v1/billing/webhook/route.ts");
const migration = read("supabase/migrations/20261006010000_billing_entitlements.sql");

check("Billing plans include monthly yearly lifetime", billingCore.includes("pro_monthly") && billingCore.includes("pro_yearly") && billingCore.includes("founder_lifetime"));
check("Checkout validates server-side plan allowlist", billingCore.includes("planPriceId") && !checkoutRoute.includes("priceId"));
check("Checkout requires auth and CSRF", checkoutRoute.includes("authContextFromRequest") && checkoutRoute.includes("assertSameOriginMutation"));
check("Portal requires auth and CSRF", portalRoute.includes("authContextFromRequest") && portalRoute.includes("assertSameOriginMutation"));
check("Webhook verifies Stripe signature", webhookRoute.includes("verifyStripeSignature") && billingCore.includes("timingSafeEqual"));
check("Migration stores customer events audit", migration.includes("brain2_stripe_customers") && migration.includes("brain2_billing_events") && migration.includes("brain2_billing_audit"));
check("Migration keeps RLS enabled", migration.match(/enable row level security/g)?.length >= 3);
check("Lifetime price env exists", read(".env.example").includes("STRIPE_PRICE_FOUNDER_LIFETIME"));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name}`);
if (failed.length) process.exit(1);

const js = ts.transpileModule(billingCore, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const oldEnv = { ...process.env };
Object.assign(process.env, {
  AUTH_PROVIDER: "supabase",
  NEXT_PUBLIC_SUPABASE_URL: "https://supabase.test",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  STRIPE_SECRET_KEY: "sk_test_mock",
  STRIPE_WEBHOOK_SECRET: "whsec_mock",
  STRIPE_PRICE_PRO_MONTHLY: "price_monthly",
  STRIPE_PRICE_PRO_YEARLY: "price_yearly",
  STRIPE_PRICE_FOUNDER_LIFETIME: "price_lifetime",
});

const db = {
  customers: new Map(),
  entitlements: new Map(),
  events: new Map(),
  licenses: new Map(),
  subscriptions: new Map(),
  writes: [],
  stripeSessions: new Map(),
  stripeSubscriptions: new Map(),
  failProcessedPatch: false,
  processors: 0,
};

globalThis.fetch = async (url, init = {}) => {
  const href = String(url);
  if (href.includes("api.stripe.com/v1/customers") && init.method === "POST") {
    return Response.json({ id: "cus_user_a" });
  }
  if (href.includes("api.stripe.com/v1/checkout/sessions") && init.method === "POST") {
    const body = new URLSearchParams(init.body);
    if (body.get("line_items[0][price]") === "attacker") return new Response("bad", { status: 400 });
    return Response.json({ id: "cs_test", url: "https://checkout.stripe.test/session" });
  }
  if (href.includes("api.stripe.com/v1/checkout/sessions/") && init.method === "GET") {
    const id = decodeURIComponent(href.match(/checkout\/sessions\/([^?]+)/)?.[1] || "");
    const session = db.stripeSessions.get(id);
    return session ? Response.json(session) : new Response("not found", { status: 404 });
  }
  if (href.includes("api.stripe.com/v1/subscriptions/") && init.method === "GET") {
    const id = decodeURIComponent(href.match(/subscriptions\/([^?]+)/)?.[1] || "");
    const subscription = db.stripeSubscriptions.get(id);
    return subscription ? Response.json(subscription) : new Response("not found", { status: 404 });
  }
  if (href.includes("api.stripe.com/v1/billing_portal/sessions")) {
    return Response.json({ url: "https://billing.stripe.test/session" });
  }
  if (href.includes("/rest/v1/rpc/brain2_billing_rate_limit")) {
    return Response.json(true);
  }
  if (href.includes("/rest/v1/rpc/brain2_claim_billing_event")) {
    const { p_event_id, p_event_type } = JSON.parse(init.body);
    const existing = db.events.get(p_event_id);
    if (existing?.processed_at) return Response.json("processed");
    if (existing?.processing_started_at && !existing.failed_at) return Response.json("processing");
    db.events.set(p_event_id, { stripe_event_id: p_event_id, event_type: p_event_type, processing_started_at: new Date().toISOString(), processed_at: null, failed_at: null });
    db.writes.push({ table: "events_claim", row: db.events.get(p_event_id) });
    db.processors += 1;
    return Response.json("claimed");
  }
  if (href.includes("/rest/v1/brain2_stripe_customers") && init.method !== "POST") {
    const byUser = href.match(/user_id=eq\.([^&]+)/)?.[1];
    const byCustomer = href.match(/stripe_customer_id=eq\.([^&]+)/)?.[1];
    const row = byUser
      ? db.customers.get(decodeURIComponent(byUser))
      : [...db.customers.values()].find((item) => item.stripe_customer_id === decodeURIComponent(byCustomer || ""));
    return Response.json(row ? [row] : []);
  }
  if (href.includes("/rest/v1/brain2_stripe_customers") && init.method === "POST") {
    const row = JSON.parse(init.body);
    db.customers.set(row.user_id, row);
    db.writes.push({ table: "customers", row });
    return Response.json([row]);
  }
  if (href.includes("/rest/v1/brain2_entitlements") && init.method !== "POST") {
    const user = decodeURIComponent(href.match(/user_id=eq\.([^&]+)/)?.[1] || "");
    return Response.json(db.entitlements.has(user) ? [db.entitlements.get(user)] : []);
  }
  if (href.includes("/rest/v1/brain2_entitlements") && init.method === "POST") {
    const row = JSON.parse(init.body);
    db.entitlements.set(row.user_id, row);
    db.writes.push({ table: "entitlements", row });
    return Response.json([row]);
  }
  if (href.includes("/rest/v1/brain2_subscriptions") && init.method !== "POST") {
    const user = decodeURIComponent(href.match(/user_id=eq\.([^&]+)/)?.[1] || "");
    const rows = [...db.subscriptions.values()]
      .filter((row) => row.user_id === user)
      .filter((row) => !href.includes("status=eq.ACTIVE") || row.status === "ACTIVE")
      .filter((row) => !href.includes("current_period_end=gt.") || Date.parse(row.current_period_end || "1970-01-01") > Date.now())
      .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
    return Response.json(rows.slice(0, 1));
  }
  if (href.includes("/rest/v1/brain2_subscriptions") && init.method === "POST") {
    const row = JSON.parse(init.body);
    db.subscriptions.set(row.stripe_subscription_id, row);
    db.writes.push({ table: "subscriptions", row });
    return Response.json([row]);
  }
  if (href.includes("/rest/v1/brain2_lifetime_licenses") && init.method === "PATCH") {
    const pi = decodeURIComponent(href.match(/stripe_payment_intent_id=eq\.([^&]+)/)?.[1] || "");
    db.licenses.set(pi, { ...db.licenses.get(pi), ...JSON.parse(init.body) });
    db.writes.push({ table: "licenses_patch", row: db.licenses.get(pi) });
    return new Response(null, { status: 204 });
  }
  if (href.includes("/rest/v1/brain2_lifetime_licenses") && init.method !== "POST") {
    const pi = decodeURIComponent(href.match(/stripe_payment_intent_id=eq\.([^&]+)/)?.[1] || "");
    const user = decodeURIComponent(href.match(/user_id=eq\.([^&]+)/)?.[1] || "");
    const row = pi ? db.licenses.get(pi) : [...db.licenses.values()].find((item) => item.user_id === user && (!href.includes("status=eq.ACTIVE") || item.status === "ACTIVE") && (!href.includes("revoked_at=is.null") || !item.revoked_at));
    return Response.json(row && (!href.includes("status=eq.ACTIVE") || row.status === "ACTIVE") && (!href.includes("revoked_at=is.null") || !row.revoked_at) ? [row] : []);
  }
  if (href.includes("/rest/v1/brain2_lifetime_licenses") && init.method === "POST") {
    const row = JSON.parse(init.body);
    db.licenses.set(row.stripe_payment_intent_id, row);
    db.writes.push({ table: "licenses", row });
    return Response.json([row]);
  }
  if (href.includes("/rest/v1/brain2_billing_events") && init.method === "PATCH") {
    if (db.failProcessedPatch && String(init.body).includes("processed_at")) return new Response("db down", { status: 500 });
    const eventId = decodeURIComponent(href.match(/stripe_event_id=eq\.([^&]+)/)?.[1] || "");
    db.events.set(eventId, { ...db.events.get(eventId), ...JSON.parse(init.body) });
    db.writes.push({ table: "events_patch", row: db.events.get(eventId) });
    return new Response(null, { status: 204 });
  }
  if (href.includes("/rest/v1/brain2_billing_events") && init.method !== "POST") {
    const eventId = decodeURIComponent(href.match(/stripe_event_id=eq\.([^&]+)/)?.[1] || "");
    return Response.json(db.events.has(eventId) ? [db.events.get(eventId)] : []);
  }
  if (href.includes("/rest/v1/brain2_billing_events") && init.method === "POST") {
    const row = JSON.parse(init.body);
    if (db.events.has(row.stripe_event_id)) return Response.json([]);
    db.events.set(row.stripe_event_id, row);
    db.writes.push({ table: "events", row });
    return Response.json([row], { status: 201 });
  }
  if (href.includes("/rest/v1/brain2_billing_audit")) return new Response("", { status: 201 });
  return new Response("not found", { status: 404 });
};

const mod = { exports: {} };
const fakeRequire = (id) => {
  if (id === "node:crypto") return awaitImportCrypto;
  if (id === "@/server/auth/core") {
    return { requireAuthConfig: () => ({ url: "https://supabase.test", anonKey: "anon", serviceRoleKey: "service" }) };
  }
  throw new Error(`unexpected require ${id}`);
};
const awaitImportCrypto = await import("node:crypto");
new Function("exports", "module", "require", "process", "fetch", "URLSearchParams", "Buffer", js)(mod.exports, mod, fakeRequire, process, fetch, URLSearchParams, Buffer);
const billing = mod.exports;

if (billing.planPriceId("pro_monthly").priceId !== "price_monthly") throw new Error("monthly plan not mapped");
let rejected = false;
try { billing.planPriceId("price_monthly"); } catch { rejected = true; }
if (!rejected) throw new Error("client-supplied price id accepted");

const context = { user: { id: "user_a", email: "a@example.com", displayName: null, avatarUrl: null }, entitlement: { active: false, status: "NONE", plan: null, currentPeriodEnd: null } };
const checkout = await billing.createCheckoutUrl(new Request("https://app.test/api/v1/billing/checkout"), context, "pro_monthly");
if (!checkout.url.includes("checkout.stripe.test")) throw new Error("authenticated unpaid checkout failed");
const portal = await billing.createPortalUrl(new Request("https://app.test/api/v1/billing/portal"), context);
if (!portal.url.includes("billing.stripe.test")) throw new Error("portal failed for owned customer");

let signatureRejected = false;
try { billing.verifyStripeSignature("{}", "t=1,v1=bad"); } catch { signatureRejected = true; }
if (!signatureRejected) throw new Error("invalid webhook signature accepted");
let expiredRejected = false;
try {
  const oldRaw = "{}";
  const oldSig = createHmac("sha256", "whsec_mock").update(`1.${oldRaw}`).digest("hex");
  billing.verifyStripeSignature(oldRaw, `t=1,v1=${oldSig}`);
} catch { expiredRejected = true; }
if (!expiredRejected) throw new Error("expired webhook signature accepted");
const raw = JSON.stringify({ id: "evt_sig", type: "noop", data: { object: {} } });
const nowTs = Math.floor(Date.now() / 1000);
const sig = createHmac("sha256", "whsec_mock").update(`${nowTs}.${raw}`).digest("hex");
billing.verifyStripeSignature(raw, `t=${nowTs},v1=bad,v1=${sig}`);

db.stripeSubscriptions.set("sub_unpaid", { id: "sub_unpaid", customer: "cus_user_a", status: "active", current_period_end: 4102444800, latest_invoice: { id: "in_unpaid", status: "open", paid: false, payment_intent: { status: "requires_payment_method" } }, items: { data: [{ price: { id: "price_monthly" } }] } });
let unpaidRejected = false;
try {
  await billing.processStripeEvent({ id: "evt_unpaid", type: "customer.subscription.updated", data: { object: { id: "sub_unpaid" } } });
} catch { unpaidRejected = true; }
if (!unpaidRejected || db.entitlements.get("user_a")?.status === "ACTIVE") throw new Error("active subscription with unpaid invoice granted access");

db.stripeSubscriptions.set("sub_1", { id: "sub_1", customer: "cus_user_a", status: "active", current_period_end: 4102444800, latest_invoice: { id: "in_paid", status: "paid", paid: true, payment_intent: { status: "succeeded" } }, items: { data: [{ price: { id: "price_monthly" } }] } });
await billing.processStripeEvent({
  id: "evt_monthly",
  type: "customer.subscription.updated",
  data: { object: { id: "sub_1", customer: "cus_user_a", status: "active", current_period_end: 4102444800 } },
});
if (db.entitlements.get("user_a")?.status !== "ACTIVE") throw new Error("completed monthly payment did not activate user");
const writesAfterFirst = db.writes.length;
await billing.processStripeEvent({ id: "evt_monthly", type: "customer.subscription.updated", data: { object: { id: "sub_1", customer: "cus_user_a", status: "canceled" } } });
if (db.writes.length !== writesAfterFirst) throw new Error("duplicate webhook was not idempotent");
const processorsBeforeConcurrent = db.processors;
await Promise.all([
  billing.processStripeEvent({ id: "evt_concurrent", type: "customer.subscription.updated", data: { object: { id: "sub_1" } } }),
  billing.processStripeEvent({ id: "evt_concurrent", type: "customer.subscription.updated", data: { object: { id: "sub_1" } } }),
]);
if (db.processors - processorsBeforeConcurrent !== 1) throw new Error("concurrent duplicate webhook had more than one processor");

db.failProcessedPatch = true;
let processedFailureRejected = false;
try {
  await billing.processStripeEvent({ id: "evt_processed_fail", type: "customer.subscription.updated", data: { object: { id: "sub_1" } } });
} catch { processedFailureRejected = true; }
db.failProcessedPatch = false;
if (!processedFailureRejected) throw new Error("processed marker DB failure did not fail webhook");

db.stripeSubscriptions.set("sub_wrong_price", { id: "sub_wrong_price", customer: "cus_user_a", status: "active", current_period_end: 4102444800, items: { data: [{ price: { id: "price_other" } }] } });
let wrongPriceRejected = false;
try {
  await billing.processStripeEvent({ id: "evt_wrong_price", type: "customer.subscription.updated", data: { object: { id: "sub_wrong_price" } } });
} catch { wrongPriceRejected = true; }
if (!wrongPriceRejected) throw new Error("unknown subscription price activated access");

db.stripeSubscriptions.set("sub_missing_period", { id: "sub_missing_period", customer: "cus_user_a", status: "active", items: { data: [{ price: { id: "price_monthly" } }] } });
let missingPeriodRejected = false;
try {
  await billing.processStripeEvent({ id: "evt_missing_period", type: "customer.subscription.updated", data: { object: { id: "sub_missing_period" } } });
} catch { missingPeriodRejected = true; }
if (!missingPeriodRejected) throw new Error("missing recurring period granted access");

db.stripeSubscriptions.set("sub_1", { id: "sub_1", customer: "cus_user_a", status: "past_due", current_period_end: 4102444800, items: { data: [{ price: { id: "price_monthly" } }] } });
await billing.processStripeEvent({
  id: "evt_failed",
  type: "customer.subscription.updated",
  data: { object: { id: "sub_1", customer: "cus_user_a", status: "past_due", current_period_end: 4102444800 } },
});
if (db.entitlements.get("user_a")?.status !== "PAST_DUE") throw new Error("failed payment did not deny paid status");

db.stripeSessions.set("cs_unrelated", { id: "cs_unrelated", mode: "payment", payment_status: "paid", customer: "cus_user_a", client_reference_id: "attacker", payment_intent: "pi_bad", line_items: { data: [{ price: { id: "price_lifetime" } }] } });
let unrelatedRejected = false;
try {
  await billing.processStripeEvent({ id: "evt_unrelated_lifetime", type: "checkout.session.completed", data: { object: { id: "cs_unrelated" } } });
} catch { unrelatedRejected = true; }
if (!unrelatedRejected) throw new Error("unrelated payment granted founder access");

db.stripeSessions.set("cs_wrong_price", { id: "cs_wrong_price", mode: "payment", payment_status: "paid", customer: "cus_user_a", client_reference_id: "user_a", payment_intent: "pi_wrong", line_items: { data: [{ price: { id: "price_other" } }] } });
await billing.processStripeEvent({ id: "evt_wrong_lifetime_price", type: "checkout.session.completed", data: { object: { id: "cs_wrong_price" } } });
if (db.licenses.has("pi_wrong")) throw new Error("wrong lifetime price granted founder access");

db.stripeSessions.set("cs_lifetime", { id: "cs_lifetime", mode: "payment", payment_status: "paid", customer: "cus_user_a", client_reference_id: "user_a", payment_intent: "pi_1", line_items: { data: [{ price: { id: "price_lifetime" } }] } });
await billing.processStripeEvent({
  id: "evt_lifetime",
  type: "checkout.session.completed",
  data: { object: { id: "cs_lifetime" } },
});
if (!db.entitlements.get("user_a")?.lifetime) throw new Error("lifetime payment did not activate license");
await billing.processStripeEvent({ id: "evt_unrelated_refund", type: "charge.refunded", data: { object: { customer: "cus_user_a", payment_intent: "pi_other" } } });
if (db.entitlements.get("user_a")?.status !== "ACTIVE") throw new Error("unrelated refund revoked lifetime license");
db.stripeSubscriptions.set("sub_1", { id: "sub_1", customer: "cus_user_a", status: "active", current_period_end: 4102444800, latest_invoice: { id: "in_paid_2", status: "paid", paid: true, payment_intent: { status: "succeeded" } }, items: { data: [{ price: { id: "price_monthly" } }] } });
await billing.processStripeEvent({ id: "evt_active_before_refund", type: "customer.subscription.updated", data: { object: { id: "sub_1" } } });
await billing.processStripeEvent({ id: "evt_refund", type: "charge.refunded", data: { object: { customer: "cus_user_a", payment_intent: "pi_1" } } });
if (db.entitlements.get("user_a")?.status !== "ACTIVE" || db.entitlements.get("user_a")?.lifetime) throw new Error("lifetime refund overwrote valid subscription access");

db.stripeSessions.set("cs_lifetime_2", { id: "cs_lifetime_2", mode: "payment", payment_status: "paid", customer: "cus_user_a", client_reference_id: "user_a", payment_intent: "pi_2", line_items: { data: [{ price: { id: "price_lifetime" } }] } });
await billing.processStripeEvent({ id: "evt_lifetime_2", type: "checkout.session.completed", data: { object: { id: "cs_lifetime_2" } } });
db.stripeSubscriptions.set("sub_1", { id: "sub_1", customer: "cus_user_a", status: "canceled", current_period_end: 4102444800, items: { data: [{ price: { id: "price_monthly" } }] } });
await billing.processStripeEvent({ id: "evt_sub_cancel_after_lifetime", type: "customer.subscription.deleted", data: { object: { id: "sub_1", customer: "cus_user_a", status: "canceled" } } });
if (!db.entitlements.get("user_a")?.lifetime || db.entitlements.get("user_a")?.status !== "ACTIVE") throw new Error("subscription cancellation overwrote valid lifetime license");
await billing.processStripeEvent({ id: "evt_refund_2", type: "charge.refunded", data: { object: { customer: "cus_user_a", payment_intent: "pi_2" } } });
if (db.entitlements.get("user_a")?.status === "ACTIVE") throw new Error("both invalid sources still granted access");

process.env = oldEnv;
console.log("PASS Runtime billing security checks");
