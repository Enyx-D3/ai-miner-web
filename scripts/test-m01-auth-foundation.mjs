import { readFileSync, existsSync } from "node:fs";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const exists = (path) => existsSync(new URL(path, root));
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const loginPage = read("src/app/(auth)/login/page.tsx");
const localLogin = read("src/app/api/local-auth/login/route.ts");
const proxy = read("src/proxy.ts");
const authCore = read("src/server/auth/core.ts");
const authSlice = read("src/redux/features/authSlice.ts");
const baseApi = read("src/redux/api/baseApi.ts");
const migration = read("supabase/migrations/20261006000000_auth_foundation.sql");
const syncDevices = read("src/app/api/brain2-sync/devices/route.ts");
const syncPairing = read("src/app/api/brain2-sync/pairing/route.ts");
const syncSignals = read("src/app/api/brain2-sync/signals/route.ts");
const mcpBridge = read("src/app/api/brain2-mcp-bridge/[action]/route.ts");

check("Google OAuth start route exists", exists("src/app/api/v1/auth/google/route.ts"));
check("OAuth callback route exists", exists("src/app/auth/callback/route.ts"));
check("Session API exists", exists("src/app/api/v1/auth/session/route.ts"));
check("Current-user API exists", exists("src/app/api/v1/users/me/route.ts"));
check("Logout API exists", exists("src/app/api/v1/auth/logout/route.ts"));
check("Login page uses Google OAuth", loginPage.includes("/api/v1/auth/google"));
check("Login page does not post static password auth", !loginPage.includes("/api/local-auth/login") && !loginPage.includes("inContext009"));
check("Local password endpoint retired", localLogin.includes("410") && !localLogin.includes("enyx.d3@gmail.com") && !localLogin.includes("inContext009"));
check("Proxy validates Supabase session", proxy.includes("authContextFromToken") && proxy.includes("/subscribe"));
check("Proxy does not trust legacy cookies", !proxy.includes("brain2LocalAuth") && !proxy.includes('"accessToken"') && !proxy.includes("'accessToken'"));
check("Auth core validates and refreshes Supabase tokens", authCore.includes("validateSupabaseAccessToken") && authCore.includes("refreshSupabaseSession"));
check("Entitlements default deny and paid-only", authCore.includes('status: "NONE"') && authCore.includes('new Set(["ACTIVE"])'));
check("Browser auth state has no readable token persistence", !authSlice.includes("js-cookie") && !authSlice.includes("accessToken") && !authSlice.includes("refreshToken"));
check("RTK base query sends cookies only", baseApi.includes('credentials: "same-origin"') && !baseApi.includes("headers.set(\"Authorization\""));
check("Migration enables RLS", migration.match(/enable row level security/g)?.length >= 2);
check("Migration default-denies paid access", migration.includes("default 'NONE'"));
check("Sync APIs require paid account auth", [syncDevices, syncPairing, syncSignals].every((source) => source.includes("requirePaidApi")));
check("MCP bridge requires paid account auth", mcpBridge.includes("requirePaidApi"));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name}`);
if (failed.length) process.exit(1);

const coreJs = ts.transpileModule(authCore, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = { exports: {} };
const oldEnv = { ...process.env };
process.env.AUTH_PROVIDER = "supabase";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service";

globalThis.fetch = async (url, init = {}) => {
  const href = String(url);
  const auth = init.headers?.authorization || init.headers?.Authorization || "";
  if (href.endsWith("/auth/v1/user")) {
    const token = String(auth).replace(/^Bearer\s+/i, "");
    if (["paid", "trial", "expired", "none"].includes(token)) {
      return Response.json({ id: token, email: `${token}@example.com`, user_metadata: { full_name: token } });
    }
    return new Response("invalid", { status: 401 });
  }
  if (href.includes("/rest/v1/brain2_entitlements")) {
    const user = decodeURIComponent(href.match(/user_id=eq\.([^&]+)/)?.[1] || "");
    if (user === "paid") return Response.json([{ status: "ACTIVE", plan: "pro", current_period_end: "2999-01-01T00:00:00.000Z" }]);
    if (user === "trial") return Response.json([{ status: "TRIALING", plan: "pro", current_period_end: "2999-01-01T00:00:00.000Z" }]);
    if (user === "expired") return Response.json([{ status: "ACTIVE", plan: "pro", current_period_end: "2000-01-01T00:00:00.000Z" }]);
    return Response.json([]);
  }
  if (href.includes("/auth/v1/token?grant_type=refresh_token")) {
    const body = JSON.parse(init.body || "{}");
    if (body.refresh_token === "refresh-paid") return Response.json({ access_token: "paid", refresh_token: "refresh-paid-next", expires_in: 3600 });
    return new Response("invalid", { status: 401 });
  }
  return new Response("not found", { status: 404 });
};

new Function("exports", "module", "process", "fetch", "Response", "Request", "URL", coreJs)(mod.exports, mod, process, fetch, Response, Request, URL);
const core = mod.exports;

const paid = await core.authContextFromToken("paid");
if (!paid?.entitlement.active) throw new Error("paid entitlement denied");
const trial = await core.authContextFromToken("trial");
if (trial?.entitlement.active) throw new Error("trialing entitlement accepted for paid-only product");
const expired = await core.authContextFromToken("expired");
if (expired?.entitlement.active) throw new Error("expired entitlement accepted");
const invalid = await core.authContextFromToken("revoked");
if (invalid) throw new Error("revoked/invalid token accepted");
const refreshed = await core.refreshSupabaseSession("refresh-paid");
if (refreshed?.accessToken !== "paid") throw new Error("valid refresh token was not exchanged");

function assertCsrfRejected(request, label) {
  let rejected = false;
  try {
    core.assertSameOriginMutation(request);
  } catch { rejected = true; }
  if (!rejected) throw new Error(`${label} accepted`);
}

assertCsrfRejected(new Request("https://app.test/api/x", {
  method: "POST",
  headers: { cookie: "b2ic_session_access=paid" },
}), "cookie mutation without origin/referer");

assertCsrfRejected(new Request("https://app.test/api/x", {
  method: "POST",
  headers: { cookie: "b2ic_session_access=paid", origin: "https://evil.test" },
}), "cross-origin cookie mutation");

core.assertSameOriginMutation(new Request("https://app.test/api/x", {
  method: "POST",
  headers: { cookie: "b2ic_session_access=paid", origin: "https://app.test" },
}));
core.assertSameOriginMutation(new Request("https://app.test/api/x", {
  method: "POST",
  headers: { cookie: "b2ic_session_access=paid", referer: "https://app.test/dashboard" },
}));
core.assertSameOriginMutation(new Request("https://app.test/api/x", {
  method: "POST",
  headers: { authorization: "Bearer paid" },
}));

process.env = oldEnv;
console.log("PASS Runtime auth security checks");
