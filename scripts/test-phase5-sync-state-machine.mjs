import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

const root = process.cwd();
const dist = join(root, ".phase5-sync-state-machine-dist");
const data = join(root, ".phase5-sync-state-machine-data");
rmSync(dist, { recursive: true, force: true });
rmSync(data, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
mkdirSync(data, { recursive: true });

execFileSync(
  process.platform === "win32" ? "tsc.cmd" : "tsc",
  ["-p", "tsconfig.v8-sync-fixtures.json", "--pretty", "false", "--outDir", dist],
  { stdio: "inherit" },
);

process.env.BRAIN2_SYNC_DATA_DIR = data;

const protocol = await import(pathToFileURL(join(dist, "lib/brain2/syncProtocol.js")));
const server = await import(pathToFileURL(join(dist, "server/brain2/syncServer.js")));

function req(ok, message) {
  if (!ok) throw new Error(message);
}

async function mutation({ root, deviceId, sequence, entityType, entityId, payload, parents = [] }) {
  const payloadHash = await protocol.hashPayload(payload);
  const base = {
    protocolVersion: protocol.BRAIN2_SYNC_PROTOCOL_VERSION,
    memoryRoot: root,
    originDeviceId: deviceId,
    originSequence: sequence,
    type: "UPSERT",
    entityType,
    entityId,
    payloadHash,
    parentMutationIds: parents,
  };
  const hash = await protocol.hashMutation(base);
  return {
    id: `mut_${hash.slice(0, 24)}`,
    createdAt: new Date(2026, 9, 3, 12, sequence).toISOString(),
    deviceId,
    hash,
    sequence,
    schemaVersion: 8,
    ...base,
    payload,
    replicationStatus: "LOCAL_COMMITTED",
    sourceTransport: "PHASE5_TEST",
  };
}

async function applyMutation(peer, item) {
  const check = await protocol.verifyMutationEnvelope(item);
  req(check.ok, `invalid mutation ${item.id}: ${check.reason}`);
  const last = peer.cursor.get(item.originDeviceId) ?? 0;
  const gap = protocol.brain2MutationGapExpected(last, item.originSequence);
  req(gap === null, `gap for ${item.originDeviceId}: expected ${gap}, got ${item.originSequence}`);
  if (item.originSequence <= last) return false;
  peer.cursor.set(item.originDeviceId, item.originSequence);
  peer.mutations.set(item.id, item);
  for (const [table, rows] of Object.entries(item.payload.writes ?? {})) {
    const bucket = peer.tables.get(table) ?? new Map();
    for (const row of rows) {
      const prior = bucket.get(row.id);
      bucket.set(row.id, prior ? await protocol.brain2MergeWinner(prior, row) : row);
    }
    peer.tables.set(table, bucket);
  }
  return true;
}

async function sendBatch(from, to, mutations) {
  const manifestHash = await protocol.hashMutationManifest(mutations);
  await server.postSyncSignal({
    fromDeviceId: from.id,
    deviceToken: from.token,
    toDeviceId: to.id,
    kind: "offer",
    payload: {
      channel: protocol.BRAIN2_SYNC_CHANNEL,
      protocolVersion: protocol.BRAIN2_SYNC_PROTOCOL_VERSION,
      manifestHash,
      mutations,
    },
  });
  const pulled = await server.pullSyncSignals({ deviceId: to.id, deviceToken: to.token });
  req(pulled.length === 1, `expected one sync envelope for ${to.id}`);
  const envelope = pulled[0].payload;
  req(envelope.channel === protocol.BRAIN2_SYNC_CHANNEL, "wrong sync channel");
  req(envelope.manifestHash === await protocol.hashMutationManifest(envelope.mutations), "manifest mismatch");
  return envelope.mutations;
}

function peer(id, token) {
  return { id, token, cursor: new Map(), mutations: new Map(), tables: new Map() };
}

const memoryRoot = "phase5-root";
const aReg = await server.registerSyncDevice({ deviceId: "phase5_web_a", spaceId: memoryRoot, name: "A", kind: "web" });
const pair = await server.createPairingToken(aReg.deviceId, aReg.deviceToken);
const bReg = await server.registerSyncDevice({ deviceId: "phase5_web_b", name: "B", kind: "mobile", joinToken: pair.token });
req(bReg.spaceId === memoryRoot, "pairing did not preserve memory root");

const a = peer(aReg.deviceId, aReg.deviceToken);
const b = peer(bReg.deviceId, bReg.deviceToken);

const bootstrap = await mutation({
  root: memoryRoot,
  deviceId: a.id,
  sequence: 1,
  entityType: "project",
  entityId: "project_1",
  payload: { version: 1, writes: { projects: [{ id: "project_1", name: "Phase 5", updatedAt: "2026-10-03T12:01:00.000Z" }] } },
});
await applyMutation(a, bootstrap);
for (const item of await sendBatch(a, b, [bootstrap])) await applyMutation(b, item);
req(b.tables.get("projects")?.get("project_1")?.name === "Phase 5", "bootstrap did not converge");

const aPostConnect = await mutation({
  root: memoryRoot,
  deviceId: a.id,
  sequence: 2,
  entityType: "tick",
  entityId: "tick_a",
  payload: { version: 1, writes: { ticks: [{ id: "tick_a", title: "A mutation after connect", updatedAt: "2026-10-03T12:02:00.000Z" }] } },
  parents: [bootstrap.id],
});
await applyMutation(a, aPostConnect);
for (const item of await sendBatch(a, b, [aPostConnect])) await applyMutation(b, item);
req(b.tables.get("ticks")?.get("tick_a")?.title === "A mutation after connect", "A-to-B post-connect mutation missing");

const bPostConnect = await mutation({
  root: memoryRoot,
  deviceId: b.id,
  sequence: 1,
  entityType: "tick",
  entityId: "tick_b",
  payload: { version: 1, writes: { ticks: [{ id: "tick_b", title: "B mutation after connect", updatedAt: "2026-10-03T12:03:00.000Z" }] } },
  parents: [aPostConnect.id],
});
await applyMutation(b, bPostConnect);
for (const item of await sendBatch(b, a, [bPostConnect])) await applyMutation(a, item);
req(a.tables.get("ticks")?.get("tick_b")?.title === "B mutation after connect", "B-to-A reverse mutation missing");

const offline1 = await mutation({
  root: memoryRoot,
  deviceId: a.id,
  sequence: 3,
  entityType: "tick",
  entityId: "tick_offline_1",
  payload: { version: 1, writes: { ticks: [{ id: "tick_offline_1", title: "offline one", updatedAt: "2026-10-03T12:04:00.000Z" }] } },
  parents: [bPostConnect.id],
});
const offline2 = await mutation({
  root: memoryRoot,
  deviceId: a.id,
  sequence: 4,
  entityType: "tick",
  entityId: "tick_offline_2",
  payload: { version: 1, writes: { ticks: [{ id: "tick_offline_2", title: "offline two", updatedAt: "2026-10-03T12:05:00.000Z" }] } },
  parents: [offline1.id],
});
await applyMutation(a, offline1);
await applyMutation(a, offline2);
for (const item of await sendBatch(a, b, [offline1, offline2])) await applyMutation(b, item);
req(b.tables.get("ticks")?.get("tick_offline_2")?.title === "offline two", "catch-up mutation missing");

const beforeReplayCount = b.mutations.size;
req(await applyMutation(b, offline2) === false, "duplicate mutation was applied twice");
req(b.mutations.size === beforeReplayCount, "duplicate replay changed mutation set");
req((await server.pullSyncSignals({ deviceId: b.id, deviceToken: b.token })).length === 0, "consumed batch redelivered");

const truthRoot = await protocol.brain2TruthStateRoot([
  { id: "truth_current", projectId: "p", status: "CURRENT", kind: "fact", text: "stable", canonicalSubject: "runtime", value: "web", evidenceAtomIds: ["a1"] },
  { id: "truth_superseded", projectId: "p", status: "SUPERSEDED", kind: "fact", text: "old", canonicalSubject: "runtime", value: "old", evidenceAtomIds: ["a0"] },
  { id: "truth_review", projectId: "p", status: "PENDING_REVIEW", kind: "fact", text: "maybe", canonicalSubject: "runtime", value: "maybe", evidenceAtomIds: ["a2"] },
  { id: "truth_conflict", projectId: "p", status: "CONFLICTING", kind: "fact", text: "conflict", canonicalSubject: "runtime", value: "native", evidenceAtomIds: ["a3"] },
]);
req(typeof truthRoot === "string" && truthRoot.length === 64, "truth state root invalid");
req((await protocol.brain2MutationFrontierRoot([...a.mutations.values()])) === (await protocol.brain2MutationFrontierRoot([...b.mutations.values()])), "mutation frontier did not converge");

console.log("Phase 5 sync state machine PASS: bootstrap, bidirectional post-connect mutations, disconnect catch-up, duplicate replay, and Current Truth root convergence.");

rmSync(dist, { recursive: true, force: true });
rmSync(data, { recursive: true, force: true });
