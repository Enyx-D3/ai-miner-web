import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const BASE_URL = process.env.BRAIN2_PROFILE_BASE_URL ?? "http://127.0.0.1:3100";
const EDGE_PATH = process.env.BRAIN2_PROFILE_BROWSER ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DB_NAME = "brain2-ai-miner";
const DB_VERSION = 11;
const HOT_MESSAGE_LIMIT = 600;
const HOT_ATOM_LIMIT = 1200;

const TABLES = [
  "sources","conversations","messages","atoms","truths","projects","ticks","decisions","patterns","experiments","missions","checkpoints","mutations","devices","verifications","transactions","journals","contextVaultRuns","patternTests","portableExpertise","compiledCapabilities","reasoningTrajectories","failureMemories","derivedArtifacts","databoxes","retrievalTelemetry","evidenceBlocks","searchDocs","syncPeers","syncConflicts","meta",
];

function isoAt(offsetMs) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function projectRecord(index) {
  const createdAt = isoAt(-(index + 10) * 60000);
  const atomIds = Array.from({ length: 24 }, (_, n) => `atom_p${index}_${n}`);
  return {
    id: `project_${index}`,
    slug: `project-${index}`,
    name: `Project ${index}`,
    summary: `Synthetic performance project ${index}`,
    createdAt,
    updatedAt: isoAt(-(index + 1) * 20000),
    conversationIds: [`conv_${index}`],
    atomIds: atomIds.slice(-256),
    recentAtomIds: atomIds,
    atomCount: atomIds.length,
    openTickIds: [],
    tags: ["synthetic", "performance", `p${index}`],
    resolutionConfidence: 1,
    schemaVersion: 11,
  };
}

function buildSeed({ projectCount, messagesPerProject, atomsPerMessage, committedProjectCount = 0, includeDerivedArtifacts }) {
  const sources = [{ id: "src_seed", provider: "chatgpt", label: "Synthetic Seed", sourceType: "profile", createdAt: isoAt(-86400000), lastSeenAt: isoAt(-1000), schemaVersion: 11 }];
  const conversations = [];
  const messages = [];
  const atoms = [];
  const truths = [];
  const projects = [];
  const journals = [];
  const derivedArtifacts = [];
  const evidenceBlocks = [];
  let truthSeq = 0;
  let atomSeq = 0;
  let messageSeq = 0;

  for (let p = 0; p < projectCount; p += 1) {
    const project = projectRecord(p);
    projects.push(project);
    const conversationId = `conv_${p}`;
    conversations.push({
      id: conversationId,
      sourceId: "src_seed",
      provider: "chatgpt",
      externalId: `external_${p}`,
      title: `Synthetic conversation ${p}`,
      createdAt: isoAt(-(p + 20) * 60000),
      updatedAt: isoAt(-(p + 1) * 15000),
      projectId: project.id,
      messageCount: messagesPerProject,
      wordCount: messagesPerProject * 24,
      selectedBranchId: "main",
      branchIds: ["main"],
      projectResolutionConfidence: 1,
      schemaVersion: 11,
    });

    const conversationMessageIds = [];
    const projectAtomIds = [];
    for (let m = 0; m < messagesPerProject; m += 1) {
      const messageId = `msg_${messageSeq++}`;
      conversationMessageIds.push(messageId);
      const createdAt = isoAt(-((p * messagesPerProject) + m + 1) * 1000);
      messages.push({
        id: messageId,
        conversationId,
        sourceId: "src_seed",
        provider: "chatgpt",
        externalId: messageId,
        role: m % 2 === 0 ? "user" : "assistant",
        text: `Project ${p} message ${m} about performance hot path and intelligence derivation.`,
        createdAt,
        occurredAt: createdAt,
        capturedAt: createdAt,
        timestampSource: "archive",
        sequence: m + 1,
        hash: `hash_${messageId}`,
        wordCount: 12,
        schemaVersion: 11,
      });

      for (let a = 0; a < atomsPerMessage; a += 1) {
        const atomId = `atom_${atomSeq++}`;
        const truthId = `truth_${truthSeq++}`;
        const atomCreatedAt = createdAt;
        projectAtomIds.push(atomId);
        atoms.push({
          id: atomId,
          messageId,
          conversationId,
          projectId: project.id,
          sourceId: "src_seed",
          kind: a % 4 === 0 ? "decision" : a % 3 === 0 ? "task" : "fact",
          subject: `subject ${p} ${a}`,
          canonicalSubject: `subject_${p}_${a}`,
          text: `Synthetic atom ${a} for project ${p}`,
          createdAt: atomCreatedAt,
          confidence: 0.82,
          provenance: [messageId],
          keywords: ["performance", "brain2", "synthetic", `project${p}`],
          hash: `hash_${atomId}`,
          truthStatus: "CURRENT",
          truthRelation: "NEW",
          truthRecordId: truthId,
          schemaVersion: 11,
        });
        truths.push({
          id: truthId,
          key: `truth_key_${p}_${a}_${m}`,
          projectId: project.id,
          atomId,
          text: `Current truth ${truthId}`,
          kind: a % 4 === 0 ? "decision" : a % 3 === 0 ? "task" : "fact",
          status: "CURRENT",
          confidence: 0.84,
          createdAt: atomCreatedAt,
          updatedAt: atomCreatedAt,
          relation: "NEW",
          evidenceAtomIds: [atomId],
          canonicalSubject: `subject_${p}_${a}`,
          schemaVersion: 11,
        });
      }
    }

    project.atomIds = projectAtomIds.slice(-512);
    project.recentAtomIds = projectAtomIds.slice(-256);
    project.atomCount = projectAtomIds.length;
    evidenceBlocks.push({
      id: `block_${p}`,
      conversationId,
      projectId: project.id,
      sourceId: "src_seed",
      blockNumber: 1,
      firstSequence: 1,
      lastSequence: messagesPerProject,
      messageIds: conversationMessageIds.slice(0, Math.min(250, conversationMessageIds.length)),
      atomIds: projectAtomIds.slice(0, Math.min(250, projectAtomIds.length)),
      byteEstimate: 8192,
      hash: `hash_block_${p}`,
      updatedAt: isoAt(-(p + 1) * 12000),
      schemaVersion: 11,
    });

    const status = p < committedProjectCount ? "COMMITTED" : "DERIVED";
    journals.push({
      id: `journal_${p}`,
      sourceId: "src_seed",
      conversationExternalId: `external_${p}`,
      conversationId,
      provider: "chatgpt",
      status,
      receivedAt: isoAt(-(p + 3) * 60000),
      updatedAt: isoAt(-(p + 2) * 60000),
      payloadHash: `payload_${p}`,
      messageCount: messagesPerProject,
      committedMessageIds: conversationMessageIds,
      committedAtomIds: projectAtomIds,
      schemaVersion: 11,
    });

    if (includeDerivedArtifacts) {
      derivedArtifacts.push({
        id: `derived_project_intelligence_${project.id}`,
        kind: "PROJECT_INTELLIGENCE",
        cacheKey: `PROJECT_INTELLIGENCE:${project.id}`,
        projectId: project.id,
        sourceVersion: `seed-v1-${project.id}`,
        state: "DETERMINISTIC_READY",
        mrsRuntime: "NOT_REQUIRED",
        payloadJson: JSON.stringify({
          currentTruth: [{ id: `truth_stub_${p}`, kind: "CURRENT_TRUTH", statement: `Truth for ${project.name}`, rationale: "seed", importance: 0.8, verification: "CURRENT", evidenceIds: [`truth_${p}`] }],
          importantIdeas: [],
          changes: [],
          connections: [],
          openQuestions: [],
          unresolved: [],
          mrsRuntime: "NOT_REQUIRED",
        }),
        createdAt: isoAt(-(p + 4) * 60000),
        updatedAt: isoAt(-(p + 1) * 60000),
        schemaVersion: 11,
      });
    }
  }

  return { sources, conversations, messages, atoms, truths, projects, journals, derivedArtifacts, evidenceBlocks };
}

async function openSeededPage(browser, seed, path) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/memory`, { waitUntil: "networkidle" });
  await page.evaluate(async ({ DB_NAME, DB_VERSION, TABLES, seed }) => {
    await new Promise((resolve, reject) => {
      const del = indexedDB.deleteDatabase(DB_NAME);
      del.onsuccess = () => resolve();
      del.onerror = () => reject(del.error);
      del.onblocked = () => resolve();
    });
    await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        const tx = request.transaction;
        for (const table of TABLES) {
          if (!db.objectStoreNames.contains(table)) db.createObjectStore(table, { keyPath: "id" });
        }
        if (!tx) return;
        const ensureIndex = (store, name, keyPath, options = {}) => {
          if (!store.indexNames.contains(name)) store.createIndex(name, keyPath, options);
        };
        ensureIndex(tx.objectStore("conversations"), "byProjectId", "projectId");
        ensureIndex(tx.objectStore("conversations"), "byExternalId", "externalId");
        ensureIndex(tx.objectStore("messages"), "byConversationId", "conversationId");
        ensureIndex(tx.objectStore("messages"), "byConversationSequence", ["conversationId", "sequence"]);
        ensureIndex(tx.objectStore("messages"), "bySourceId", "sourceId");
        ensureIndex(tx.objectStore("messages"), "byExternalId", "externalId");
        ensureIndex(tx.objectStore("messages"), "byHash", "hash");
        ensureIndex(tx.objectStore("messages"), "byCreatedAt", "createdAt");
        ensureIndex(tx.objectStore("atoms"), "byMessageId", "messageId");
        ensureIndex(tx.objectStore("atoms"), "byConversationId", "conversationId");
        ensureIndex(tx.objectStore("atoms"), "byProjectId", "projectId");
        ensureIndex(tx.objectStore("atoms"), "byProjectCreatedAt", ["projectId", "createdAt"]);
        ensureIndex(tx.objectStore("atoms"), "byKind", "kind");
        ensureIndex(tx.objectStore("atoms"), "byCreatedAt", "createdAt");
        ensureIndex(tx.objectStore("truths"), "byProjectId", "projectId");
        ensureIndex(tx.objectStore("truths"), "byProjectKind", ["projectId", "kind"]);
        ensureIndex(tx.objectStore("truths"), "byProjectStatus", ["projectId", "status"]);
        ensureIndex(tx.objectStore("truths"), "byStatus", "status");
        ensureIndex(tx.objectStore("truths"), "byKey", "key");
        ensureIndex(tx.objectStore("truths"), "byUpdatedAt", "updatedAt");
        ensureIndex(tx.objectStore("decisions"), "byAtomId", "atomId");
        ensureIndex(tx.objectStore("decisions"), "byProjectId", "projectId");
        ensureIndex(tx.objectStore("mutations"), "byCreatedAt", "createdAt");
        ensureIndex(tx.objectStore("mutations"), "bySequence", "sequence");
        ensureIndex(tx.objectStore("mutations"), "byOriginSequence", ["originDeviceId", "originSequence"]);
        ensureIndex(tx.objectStore("mutations"), "byReplicationStatus", "replicationStatus");
        ensureIndex(tx.objectStore("syncPeers"), "byPeerDeviceId", "peerDeviceId");
        ensureIndex(tx.objectStore("syncPeers"), "byStatus", "status");
        ensureIndex(tx.objectStore("syncConflicts"), "byMutationId", "mutationId");
        ensureIndex(tx.objectStore("syncConflicts"), "byStatus", "status");
        ensureIndex(tx.objectStore("transactions"), "byType", "type");
        ensureIndex(tx.objectStore("transactions"), "byCreatedAt", "createdAt");
        ensureIndex(tx.objectStore("journals"), "byStatus", "status");
        ensureIndex(tx.objectStore("journals"), "byConversationExternalId", "conversationExternalId");
        ensureIndex(tx.objectStore("journals"), "byUpdatedAt", "updatedAt");
        ensureIndex(tx.objectStore("patternTests"), "byPatternId", "patternId");
        ensureIndex(tx.objectStore("patternTests"), "byKind", "kind");
        ensureIndex(tx.objectStore("patternTests"), "byStatus", "status");
        ensureIndex(tx.objectStore("portableExpertise"), "byPatternId", "patternId");
        ensureIndex(tx.objectStore("compiledCapabilities"), "byRegistryKey", "registryKey");
        ensureIndex(tx.objectStore("compiledCapabilities"), "byProjectId", "projectId");
        ensureIndex(tx.objectStore("compiledCapabilities"), "byVerificationState", "verificationState");
        ensureIndex(tx.objectStore("reasoningTrajectories"), "byTrajectoryKey", "trajectoryKey");
        ensureIndex(tx.objectStore("reasoningTrajectories"), "byProjectId", "projectId");
        ensureIndex(tx.objectStore("reasoningTrajectories"), "byVerificationStatus", "verificationStatus");
        ensureIndex(tx.objectStore("reasoningTrajectories"), "byUpdatedAt", "updatedAt");
        ensureIndex(tx.objectStore("failureMemories"), "byFailureSignature", "failureSignature");
        ensureIndex(tx.objectStore("failureMemories"), "byProjectId", "projectId");
        ensureIndex(tx.objectStore("failureMemories"), "byLastSeenAt", "lastSeenAt");
        ensureIndex(tx.objectStore("derivedArtifacts"), "byKind", "kind");
        ensureIndex(tx.objectStore("derivedArtifacts"), "byCacheKey", "cacheKey");
        ensureIndex(tx.objectStore("derivedArtifacts"), "byProjectId", "projectId");
        ensureIndex(tx.objectStore("derivedArtifacts"), "byUpdatedAt", "updatedAt");
        ensureIndex(tx.objectStore("databoxes"), "byProjectId", "projectId");
        ensureIndex(tx.objectStore("databoxes"), "byCreatedAt", "createdAt");
        ensureIndex(tx.objectStore("retrievalTelemetry"), "byCreatedAt", "createdAt");
        ensureIndex(tx.objectStore("evidenceBlocks"), "byConversationId", "conversationId");
        ensureIndex(tx.objectStore("evidenceBlocks"), "byProjectId", "projectId");
        ensureIndex(tx.objectStore("evidenceBlocks"), "byUpdatedAt", "updatedAt");
        ensureIndex(tx.objectStore("searchDocs"), "byTerm", "terms", { multiEntry: true });
        ensureIndex(tx.objectStore("searchDocs"), "byKind", "kind");
        ensureIndex(tx.objectStore("searchDocs"), "byProjectId", "projectId");
        ensureIndex(tx.objectStore("searchDocs"), "byCreatedAt", "createdAt");
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(TABLES, "readwrite");
        for (const [table, values] of Object.entries(seed)) {
          const store = tx.objectStore(table);
          for (const value of values) store.put(value);
        }
        tx.objectStore("meta").put({ id: "memoryRoot", value: "seed-root" });
        tx.objectStore("meta").put({ id: "searchIndexVersion", value: "B2_SEARCH_DOC_V1" });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error("seed transaction aborted"));
      };
      request.onerror = () => reject(request.error);
    });
  }, { DB_NAME, DB_VERSION, TABLES, seed });
  const startedAt = Date.now();
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
  const interactiveMs = Date.now() - startedAt;
  return { context, page, interactiveMs };
}

async function readTelemetry(page) {
  return page.evaluate(async () => {
    const records = await new Promise((resolve, reject) => {
      const request = indexedDB.open("brain2-ai-miner", 11);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("retrievalTelemetry", "readonly");
        const index = tx.objectStore("retrievalTelemetry").index("byCreatedAt");
        const getAll = index.getAll();
        getAll.onsuccess = () => { db.close(); resolve(getAll.result); };
        getAll.onerror = () => reject(getAll.error);
      };
      request.onerror = () => reject(request.error);
    });
    return records;
  });
}

async function runScenario(browser, scenario) {
  const { context, page, interactiveMs } = await openSeededPage(browser, scenario.seed, scenario.path);
  if (scenario.waitMs) await page.waitForTimeout(scenario.waitMs);
  const telemetry = await readTelemetry(page);
  const responsiveness = telemetry.filter((item) => item.telemetryKind === "RESPONSIVENESS");
  const longTasks = responsiveness.filter((item) => item.route === "browser.longtask.window");
  const boot = responsiveness.find((item) => item.route === "boot.initial_hydration");
  const secondary = responsiveness.find((item) => item.route === "boot.secondary_hydration");
  const deferred = responsiveness.find((item) => item.route === "derivations.deferred_queue");
  const result = {
    scenario: scenario.name,
    route: scenario.path,
    interactiveMs,
    bootMs: boot?.durationMs ?? null,
    secondaryHydrationMs: secondary?.durationMs ?? null,
    deferredDerivationsMs: deferred?.durationMs ?? null,
    longTaskWindows: longTasks.length,
    maxLongTaskMs: longTasks.reduce((max, item) => Math.max(max, item.durationMs), 0),
    telemetryCount: responsiveness.length,
  };
  await context.close();
  return result;
}

const scenarios = [
  {
    name: "boot_hot_dashboard",
    path: "/",
    waitMs: 1500,
    seed: buildSeed({ projectCount: 24, messagesPerProject: 60, atomsPerMessage: 2, committedProjectCount: 0, includeDerivedArtifacts: true }),
  },
  {
    name: "notebooks_cached_intelligence",
    path: "/live-notebooks",
    waitMs: 1500,
    seed: buildSeed({ projectCount: 48, messagesPerProject: 45, atomsPerMessage: 2, committedProjectCount: 0, includeDerivedArtifacts: true }),
  },
  {
    name: "boot_with_deferred_derivations",
    path: "/operations",
    waitMs: 5000,
    seed: buildSeed({ projectCount: 16, messagesPerProject: 40, atomsPerMessage: 2, committedProjectCount: 6, includeDerivedArtifacts: false }),
  },
];

const browser = await chromium.launch({ headless: true, executablePath: EDGE_PATH });
try {
  const results = [];
  for (const scenario of scenarios) {
    results.push(await runScenario(browser, scenario));
  }
  const out = {
    schema: "B2_V9_BROWSER_PROFILE_V1",
    baseUrl: BASE_URL,
    browser: EDGE_PATH,
    hotSetLimits: { messages: HOT_MESSAGE_LIMIT, atoms: HOT_ATOM_LIMIT },
    generatedAt: new Date().toISOString(),
    scenarios: results,
  };
  const target = join(process.cwd(), "BROWSER_PERFORMANCE_PROFILE_V9.json");
  writeFileSync(target, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
} finally {
  await browser.close();
}
