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
  events: new Set(),
  writes: [],
};

globalThis.fetch = async (url, init = {}) => {
  const href = String(url);
  if (href.includes("api.stripe.com/v1/customers") && init.method === "POST") {
    return Response.json({ id: "cus_user_a" });
  }
  if (href.includes("api.stripe.com/v1/checkout/sessions")) {
    const body = new URLSearchParams(init.body);
    if (body.get("line_items[0][price]") === "attacker") return new Response("bad", { status: 400 });
    return Response.json({ id: "cs_test", url: "https://checkout.stripe.test/session" });
  }
  if (href.includes("api.stripe.com/v1/billing_portal/sessions")) {
    return Response.json({ url: "https://billing.stripe.test/session" });
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
  if (href.includes("/rest/v1/brain2_billing_events") && init.method !== "POST") {
    const eventId = decodeURIComponent(href.match(/stripe_event_id=eq\.([^&]+)/)?.[1] || "");
    return Response.json(db.events.has(eventId) ? [{ stripe_event_id: eventId }] : []);
  }
  if (href.includes("/rest/v1/brain2_billing_events") && init.method === "POST") {
    const row = JSON.parse(init.body);
    db.events.add(row.stripe_event_id);
    db.writes.push({ table: "events", row });
    return new Response("", { status: 201 });
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
const raw = JSON.stringify({ id: "evt_sig", type: "noop", data: { object: {} } });
const sig = createHmac("sha256", "whsec_mock").update(`1.${raw}`).digest("hex");
billing.verifyStripeSignature(raw, `t=1,v1=${sig}`);

await billing.processStripeEvent({
  id: "evt_monthly",
  type: "customer.subscription.updated",
  data: { object: { id: "sub_1", customer: "cus_user_a", status: "active", current_period_end: 4102444800 } },
});
if (db.entitlements.get("user_a")?.status !== "ACTIVE") throw new Error("completed monthly payment did not activate user");
const writesAfterFirst = db.writes.length;
await billing.processStripeEvent({ id: "evt_monthly", type: "customer.subscription.updated", data: { object: { id: "sub_1", customer: "cus_user_a", status: "canceled" } } });
if (db.writes.length !== writesAfterFirst) throw new Error("duplicate webhook was not idempotent");

await billing.processStripeEvent({
  id: "evt_failed",
  type: "customer.subscription.updated",
  data: { object: { id: "sub_1", customer: "cus_user_a", status: "past_due", current_period_end: 4102444800 } },
});
if (db.entitlements.get("user_a")?.status !== "PAST_DUE") throw new Error("failed payment did not deny paid status");

await billing.processStripeEvent({
  id: "evt_lifetime",
  type: "checkout.session.completed",
  data: { object: { mode: "payment", payment_status: "paid", customer: "cus_user_a", client_reference_id: "user_a" } },
});
if (!db.entitlements.get("user_a")?.lifetime) throw new Error("lifetime payment did not activate license");
await billing.processStripeEvent({ id: "evt_sub_cancel_after_lifetime", type: "customer.subscription.deleted", data: { object: { id: "sub_1", customer: "cus_user_a", status: "canceled" } } });
if (!db.entitlements.get("user_a")?.lifetime || db.entitlements.get("user_a")?.status !== "ACTIVE") throw new Error("subscription cancellation overwrote valid lifetime license");
await billing.processStripeEvent({ id: "evt_refund", type: "charge.refunded", data: { object: { customer: "cus_user_a", payment_intent: "pi_1" } } });
if (db.entitlements.get("user_a")?.status !== "EXPIRED") throw new Error("refunded lifetime was not revoked");

process.env = oldEnv;
console.log("PASS Runtime billing security checks");
