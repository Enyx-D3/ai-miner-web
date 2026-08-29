import fs from "node:fs";
import path from "node:path";

const required = [
  "src/lib/brain2/types.ts",
  "src/lib/brain2/identity.ts",
  "src/lib/brain2/atomizer.ts",
  "src/lib/brain2/store.ts",
  "src/lib/brain2/archiveImport.ts",
  "src/lib/brain2/jobs.ts",
  "src/components/brain2/Brain2Provider.tsx",
  "src/features/brain2/Brain2Workspace.tsx",
  "src/features/brain2/Brain2Landing.tsx",
  "src/features/brain2/Brain2PublicInfo.tsx",
  "src/app/(dashboardLayout)/ask/page.tsx",
  "src/app/(dashboardLayout)/outputs/page.tsx",
  "src/app/(dashboardLayout)/projects/[slug]/page.tsx",
  "src/app/(dashboardLayout)/conversations/[id]/page.tsx",
  "src/app/(dashboardLayout)/live-notebooks/page.tsx",
  "src/app/(dashboardLayout)/wiki/page.tsx",
  "src/app/(dashboardLayout)/ticks/page.tsx",
  "src/app/(dashboardLayout)/decisions/page.tsx",
  "src/app/(dashboardLayout)/discover/page.tsx",
  "src/app/(dashboardLayout)/patterns/page.tsx",
  "src/app/(dashboardLayout)/experiments/page.tsx",
  "src/app/(dashboardLayout)/missions/page.tsx",
  "src/app/(dashboardLayout)/memory/page.tsx",
  "src/app/(dashboardLayout)/devices/page.tsx",
  "src/app/(dashboardLayout)/operations/page.tsx",
  "extension/manifest.json",
  "extension/service_worker.js",
  "extension/capture.js",
  "extension/bridge.js",
  "extension/popup.html",
];

const missing = required.filter((file) => !fs.existsSync(path.resolve(file)));
if (missing.length) {
  console.error("Missing required Brain2 files:\n" + missing.map((file) => `- ${file}`).join("\n"));
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync("extension/manifest.json", "utf8"));
const expectedHosts = ["chatgpt.com", "claude.ai", "gemini.google.com"];
for (const host of expectedHosts) {
  if (!manifest.host_permissions.some((entry) => entry.includes(host))) {
    console.error(`Extension missing provider host permission: ${host}`);
    process.exit(1);
  }
}

const sidebar = fs.readFileSync("src/components/Sidebar/AppSidebar.tsx", "utf8");
const routes = ["/ask", "/search", "/projects", "/live-notebooks", "/wiki", "/ticks", "/decisions", "/discover", "/patterns", "/experiments", "/missions", "/outputs", "/memory", "/devices", "/operations"];
for (const route of routes) {
  if (!sidebar.includes(route)) {
    console.error(`Sidebar missing route: ${route}`);
    process.exit(1);
  }
}

const navbar = fs.readFileSync("src/components/Navbar/page.tsx", "utf8");
if (navbar.includes('label: "Pricing"') || navbar.includes("AI Chat Refinery")) {
  console.error("Public navbar still exposes legacy Refinery/Pricing product surface.");
  process.exit(1);
}
const netlify = fs.readFileSync("netlify.toml", "utf8");
if (netlify.includes("api.example.com")) {
  console.error("Netlify config still contains a fake backend URL.");
  process.exit(1);
}

console.log(`Brain2 acceptance PASS: ${required.length} required artifacts, ${routes.length} workspace routes, 3 provider hosts.`);
