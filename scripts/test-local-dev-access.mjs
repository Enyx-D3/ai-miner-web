import { readFileSync } from "node:fs";
import ts from "typescript";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const source = read("src/server/auth/core.ts");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const testProcess = { env: { NODE_ENV: "development", BRAIN2_DEPLOY_ENV: "development", LOCAL_DEMO_MODE: "1" } };
const mod = { exports: {} };
new Function("exports", "module", "process", "URL", "Request", js)(mod.exports, mod, testProcess, URL, Request);
const auth = mod.exports;

function check(condition, label) {
  if (!condition) throw new Error(`FAIL ${label}`);
  console.log(`PASS ${label}`);
}

const localhost = new Request("http://localhost:3000/api/v1/auth/session");
const remote = new Request("http://dev-host.example:3000/api/v1/auth/session");
const dev = auth.localDevDemoContextFromRequest(localhost);
check(dev?.user.id === "brain2-local-dev" && dev?.entitlement.active === true, "explicit local dev identity with active mock entitlement");
check(dev?.entitlement.plan === "local_development", "local entitlement is visibly synthetic");
check(auth.localDevDemoContextFromRequest(new Request("http://127.0.0.1:3000/dashboard")) !== null, "IPv4 loopback allowed");
check(auth.localDevDemoContextFromRequest(remote) === null, "remote development host denied");
check((await auth.requirePaidRequest(localhost)).user.id === "brain2-local-dev", "server API paid gate accepts local demo");

testProcess.env.LOCAL_DEMO_MODE = "0";
check(auth.localDevDemoContextFromRequest(localhost) === null, "demo defaults off");
testProcess.env.LOCAL_DEMO_MODE = "1";
testProcess.env.NODE_ENV = "production";
check(auth.localDevDemoContextFromRequest(localhost) === null, "production build ignores demo flag");
testProcess.env.NODE_ENV = "development";
testProcess.env.BRAIN2_DEPLOY_ENV = "production";
check(auth.localDevDemoContextFromRequest(localhost) === null, "production deployment ignores demo flag");

check(read("src/proxy.ts").includes("localDevDemoContextFromRequest"), "page proxy uses local-only gate");
check(read("src/server/auth/session.ts").includes("localDevDemoContext"), "dashboard layout receives dev identity");
check(read("src/app/api/v1/auth/session/route.ts").includes("localDevDemoContextFromRequest"), "Code Registry session API receives dev identity");
check(read("src/app/api/v1/users/me/route.ts").includes("localDevDemoContextFromRequest"), "user profile API receives dev identity");
check(read("src/app/api/v1/billing/status/route.ts").includes("localDevDemoContextFromRequest"), "billing status stays synthetic");
check(["checkout", "portal"].every((kind) => read(`src/app/api/v1/billing/${kind}/route.ts`).includes("disabled in local demo mode")), "Stripe purchase actions remain disabled");
check(read("src/app/(auth)/login/page.tsx").includes("session?.developmentMode"), "login page sends demo visitors to workspace");
check(read("src/app/(defaultLayout)/subscribe/page.tsx").includes("localDevDemoContext"), "subscribe page does not block local demo");
check(read("package.json").includes("LOCAL_DEMO_MODE=1 next dev --webpack -H 127.0.0.1"), "local demo script binds to loopback");

console.log("PASS Local dev access contract");
