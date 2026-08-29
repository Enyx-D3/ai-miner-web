import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const BASE_URL = process.env.BRAIN2_REAL_EXPORT_BASE_URL ?? "http://127.0.0.1:3100";
const EDGE_PATH = process.env.BRAIN2_PROFILE_BROWSER ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const ZIP_PATH = process.env.BRAIN2_REAL_EXPORT_ZIP ?? "C:\\Users\\yeasi.YEASINKABIRJOY\\Downloads\\data-2798529d-d5b4-4ff4-acca-0e0fa063f888-1786637544-48811a57-batch-0000.zip";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readDbSummary(page) {
  return page.evaluate(async () => {
    const open = await new Promise((resolve, reject) => {
      const request = indexedDB.open("brain2-ai-miner", 11);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const count = (table) => new Promise((resolve, reject) => {
      const req = open.transaction(table, "readonly").objectStore(table).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const all = (table) => new Promise((resolve, reject) => {
      const req = open.transaction(table, "readonly").objectStore(table).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const [messages, atoms, truths, projects, conversations, journals, artifacts, telemetry] = await Promise.all([
      count("messages"),
      count("atoms"),
      count("truths"),
      count("projects"),
      count("conversations"),
      all("journals"),
      all("derivedArtifacts"),
      all("retrievalTelemetry"),
    ]);
    open.close();
    const journalCounts = journals.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    }, {});
    const artifactCounts = artifacts.reduce((acc, item) => {
      const key = `${item.kind}:${item.state}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return {
      messages,
      atoms,
      truths,
      projects,
      conversations,
      journalCounts,
      artifactCounts,
      responsivenessTelemetry: telemetry.filter((item) => item.telemetryKind === "RESPONSIVENESS").slice(-20),
    };
  });
}

async function waitForImport(page, timeoutMs = 8 * 60 * 1000) {
  const startedAt = Date.now();
  let last = null;
  while (Date.now() - startedAt < timeoutMs) {
    await sleep(2000);
    last = await readDbSummary(page);
    const ready = last.messages > 0
      && (last.journalCounts.DERIVED ?? 0) > 0
      && (last.journalCounts.COMMITTED ?? 0) === 0;
    if (ready) return last;
  }
  return last;
}

async function routeTiming(page, path) {
  const startedAt = Date.now();
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle", timeout: 120000 });
  const elapsedMs = Date.now() - startedAt;
  return { path, elapsedMs, title: await page.title() };
}

async function readRuntimePanel(page) {
  const root = page.locator("text=Brain2 AI Runtime").first();
  if (!(await root.count())) return null;
  const text = await root.locator("xpath=..").innerText().catch(() => "");
  return text.trim();
}

async function maybeTriggerMRS(page) {
  const button = page.locator("button").filter({ hasText: /Enable local MRS|Download local MRS|Restore cached MRS|Retry model download/i }).first();
  if (!(await button.count())) {
    return { attempted: false, panel: await readRuntimePanel(page) };
  }
  await button.click();
  const startedAt = Date.now();
  let lastPanel = "";
  while (Date.now() - startedAt < 45000) {
    await sleep(3000);
    lastPanel = (await readRuntimePanel(page)) ?? "";
    if (/ACTIVE|UNAVAILABLE|NOT ACTIVE|download failed|could not activate/i.test(lastPanel)) break;
  }
  return { attempted: true, panel: lastPanel || await readRuntimePanel(page) };
}

async function readLiveNotebooks(page) {
  const cards = page.locator("a").filter({ has: page.locator("text=Live Intelligence") });
  const count = await cards.count();
  const items = [];
  for (let i = 0; i < Math.min(count, 8); i += 1) {
    const card = cards.nth(i);
    items.push({
      text: (await card.innerText()).trim().slice(0, 700),
      href: await card.getAttribute("href"),
    });
  }
  return { count, items };
}

async function readProjectsPage(page) {
  const links = page.locator('a[href^="/projects/"]');
  const count = await links.count();
  const projects = [];
  for (let i = 0; i < Math.min(count, 8); i += 1) {
    const link = links.nth(i);
    projects.push({
      text: (await link.innerText()).trim().slice(0, 400),
      href: await link.getAttribute("href"),
    });
  }
  return { count, projects };
}

async function readWikiPage(page) {
  const body = await page.locator("body").innerText();
  return body.slice(0, 5000);
}

async function readProjectPage(page) {
  const body = await page.locator("body").innerText();
  return body.slice(0, 5000);
}

const browser = await chromium.launch({ headless: true, executablePath: EDGE_PATH });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];

page.on("console", (msg) => {
  if (msg.type() === "error" || msg.type() === "warning") consoleErrors.push(msg.text());
});
page.on("pageerror", (error) => pageErrors.push(String(error)));

try {
  const timings = [];
  await routeTiming(page, "/memory");
  await page.setInputFiles('input[type="file"][accept*=".zip"]', ZIP_PATH);
  const afterImport = await waitForImport(page);
  await sleep(10000);
  const settledSummary = await readDbSummary(page);

  timings.push(await routeTiming(page, "/dashboard"));
  timings.push(await routeTiming(page, "/operations"));
  const operationsRuntime = await readRuntimePanel(page);
  const mrsAttempt = await maybeTriggerMRS(page);
  timings.push(await routeTiming(page, "/live-notebooks"));
  const notebooks = await readLiveNotebooks(page);
  timings.push(await routeTiming(page, "/projects"));
  const projectList = await readProjectsPage(page);

  let firstProjectRoute = null;
  let firstProjectBody = null;
  if (projectList.projects[0]?.href) {
    firstProjectRoute = await routeTiming(page, projectList.projects[0].href);
    firstProjectBody = await readProjectPage(page);
  }

  timings.push(await routeTiming(page, "/wiki"));
  const wikiBody = await readWikiPage(page);
  timings.push(await routeTiming(page, "/search"));
  timings.push(await routeTiming(page, "/timeline"));
  timings.push(await routeTiming(page, "/conversations"));

  const finalSummary = await readDbSummary(page);
  const report = {
    schema: "B2_V9_REAL_EXPORT_TEST_V1",
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    zipPath: ZIP_PATH,
    import: {
      afterImport,
      settledSummary,
      finalSummary,
    },
    timings,
    firstProjectRoute,
    notebooks,
    projectList,
    operationsRuntime,
    mrsAttempt,
    wikiBody,
    firstProjectBody,
    consoleErrors,
    pageErrors,
  };
  const target = join(process.cwd(), "REAL_EXPORT_TEST_REPORT.json");
  writeFileSync(target, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await context.close();
  await browser.close();
}
