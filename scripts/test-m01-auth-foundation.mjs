import { readFileSync, existsSync } from "node:fs";

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
check("Entitlements default deny", authCore.includes('status: "NONE"') && authCore.includes("ACTIVE_STATUSES"));
check("Browser auth state has no readable token persistence", !authSlice.includes("js-cookie") && !authSlice.includes("accessToken") && !authSlice.includes("refreshToken"));
check("RTK base query sends cookies only", baseApi.includes('credentials: "same-origin"') && !baseApi.includes("headers.set(\"Authorization\""));
check("Migration enables RLS", migration.match(/enable row level security/g)?.length >= 2);
check("Migration default-denies paid access", migration.includes("default 'NONE'"));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name}`);
if (failed.length) process.exit(1);
