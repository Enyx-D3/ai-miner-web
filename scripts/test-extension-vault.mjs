import fs from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const workerCode = fs.readFileSync("extension/service_worker.js", "utf8");

function b64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

async function legacyPassphraseFixture(passphrase) {
  const enc = new TextEncoder();
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const base = await webcrypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const raw = new Uint8Array(await webcrypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 200000 },
    base,
    256,
  ));
  const key = await webcrypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const clear = enc.encode(JSON.stringify({
    kind: "brain2-vault",
    createdAt: "2026-10-03T00:00:00.000Z",
  }));
  const cipher = new Uint8Array(await webcrypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    clear,
  ));
  return {
    b2_vault_mode: "passphrase",
    b2_salt: b64(salt),
    b2_sentinel: { iv: b64(iv), data: b64(cipher) },
  };
}

function createStorageArea(data) {
  return {
    async get(keys) {
      if (keys == null) return { ...data };
      if (typeof keys === "string") return { [keys]: data[keys] };
      if (Array.isArray(keys)) {
        const out = {};
        for (const key of keys) out[key] = data[key];
        return out;
      }
      const out = {};
      for (const [key, fallback] of Object.entries(keys || {})) {
        out[key] = key in data ? data[key] : fallback;
      }
      return out;
    },
    async set(value) {
      Object.assign(data, value);
    },
    async remove(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
    },
    async clear() {
      for (const key of Object.keys(data)) delete data[key];
    },
  };
}

async function createHarness(initialLocal = {}, initialSession = {}) {
  const local = { ...initialLocal };
  const session = { ...initialSession };
  let onMessage;
  const noopEvent = { addListener() {} };

  const chrome = {
    storage: {
      local: createStorageArea(local),
      session: createStorageArea(session),
    },
    runtime: {
      getManifest() { return { version: "0.8.6" }; },
      onInstalled: noopEvent,
      onStartup: noopEvent,
      onMessage: { addListener(fn) { onMessage = fn; } },
    },
    alarms: {
      create() {},
      onAlarm: noopEvent,
    },
    tabs: {
      async query() { return []; },
      async sendMessage() { return { ok: true }; },
    },
    scripting: {
      async unregisterContentScripts() {},
      async registerContentScripts() {},
      async executeScript() {},
    },
    permissions: {
      async request() { return true; },
      async remove() { return true; },
    },
    sidePanel: {
      async setPanelBehavior() {},
    },
  };

  const context = {
    chrome,
    crypto: webcrypto,
    TextEncoder,
    TextDecoder,
    btoa,
    atob,
    URL,
    console,
    setTimeout,
    clearTimeout,
  };

  vm.createContext(context);
  vm.runInContext(workerCode, context);

  if (typeof onMessage !== "function") {
    throw new Error("Service worker did not register onMessage.");
  }

  // Let the service worker's startup initializeVault() settle before assertions.
  await new Promise((resolve) => setTimeout(resolve, 25));

  function send(message, sender = {}) {
    return new Promise((resolve, reject) => {
      try {
        const keepOpen = onMessage(message, sender, resolve);
        if (!keepOpen) resolve(undefined);
      } catch (error) {
        reject(error);
      }
    });
  }

  return { local, session, send };
}

// ---------------------------------------------------------------------------
// Fresh install: automatic device-local AES-GCM vault.
// ---------------------------------------------------------------------------
{
  const { local, send } = await createHarness();

  let status = await send({ type: "BRAIN2_STATUS" });
  if (status.locked) throw new Error("Fresh device vault must auto-initialize unlocked.");
  if (status.vaultMode !== "device") throw new Error(`Expected device vault, got ${status.vaultMode}`);
  if (!local.b2_device_key) throw new Error("Fresh device vault did not persist its local device key.");

  const unlock = await send({
    type: "BRAIN2_UNLOCK",
    passphrase: "not-needed",
  });
  if (unlock?.ok) throw new Error("Device vault must not pretend to require/accept a passphrase.");

  const record = {
    id: "ext_device_1",
    provider: "chatgpt",
    conversationExternalId: "c1",
    conversationTitle: "T",
    role: "user",
    text: "secret device plaintext",
    url: "https://chatgpt.com/c/1",
  };

  let result = await send({ type: "BRAIN2_CAPTURE", record });
  if (!result.ok) throw new Error(`Device-vault capture failed: ${result.error || "unknown"}`);
  if (JSON.stringify(local).includes("secret device plaintext")) {
    throw new Error("Device-vault plaintext leaked into durable extension storage.");
  }

  result = await send({ type: "BRAIN2_GET_BATCH" });
  if (result.records?.[0]?.text !== "secret device plaintext") {
    throw new Error("Device-vault batch decrypt failed.");
  }

  await send({ type: "BRAIN2_ACK", acceptedIds: ["ext_device_1"] });
  status = await send({ type: "BRAIN2_STATUS" });
  if (status.queueCount !== 0) throw new Error("Device-vault ACK did not delete queued record.");

  // Device mode may clear the in-memory key, but it must self-restore from b2_device_key.
  await send({ type: "BRAIN2_LOCK" });
  result = await send({ type: "BRAIN2_CAPTURE", record: { ...record, id: "ext_device_2" } });
  if (!result.ok) throw new Error("Device vault did not self-restore after in-memory lock.");

  // Browser-connector binding remains exact-origin only.
  result = await send({
    type: "BRAIN2_CONFIG_ORIGIN",
    origin: "https://brain2.test",
  });
  if (!result.ok || result.origin !== "https://brain2.test") {
    throw new Error("Website origin configuration failed.");
  }

  const connector = await send(
    {
      type: "BRAIN2_CONNECT_WEBSITE",
      websiteOrigin: "https://brain2.test",
      websiteInstanceId: "web_1",
      memoryRoot: "root_1",
    },
    { tab: { url: "https://brain2.test/devices" } },
  );
  if (
    !connector.ok ||
    !connector.installId ||
    !connector.capabilities?.includes("encrypted-capture-queue")
  ) {
    throw new Error("Configured-origin website connector handshake failed.");
  }

  const badConnector = await send(
    {
      type: "BRAIN2_CONNECT_WEBSITE",
      websiteOrigin: "https://evil.test",
      websiteInstanceId: "web_2",
      memoryRoot: "root_1",
    },
    { tab: { url: "https://evil.test/" } },
  );
  if (badConnector?.ok) {
    throw new Error("Unconfigured website origin connected to extension.");
  }
}

// ---------------------------------------------------------------------------
// Upgraded legacy install: passphrase mode remains locked until unlocked.
// ---------------------------------------------------------------------------
{
  const fixture = await legacyPassphraseFixture("test-passphrase");
  const { send } = await createHarness(fixture);

  let status = await send({ type: "BRAIN2_STATUS" });
  if (!status.locked) throw new Error("Legacy passphrase vault must start locked without session key.");
  if (status.vaultMode !== "passphrase") {
    throw new Error(`Expected passphrase vault, got ${status.vaultMode}`);
  }

  let result = await send({
    type: "BRAIN2_UNLOCK",
    passphrase: "wrong",
  });
  if (result?.ok) throw new Error("Wrong legacy passphrase was accepted.");

  result = await send({
    type: "BRAIN2_UNLOCK",
    passphrase: "test-passphrase",
  });
  if (!result?.ok) throw new Error(`Correct legacy passphrase failed: ${result?.error || "unknown"}`);

  status = await send({ type: "BRAIN2_STATUS" });
  if (status.locked) throw new Error("Legacy passphrase vault remained locked after correct unlock.");

  await send({ type: "BRAIN2_LOCK" });
  status = await send({ type: "BRAIN2_STATUS" });
  if (!status.locked) throw new Error("Legacy passphrase vault did not re-lock.");
}

console.log(
  "Extension vault + browser connector smoke PASS: fresh device vault auto-ready + ciphertext-only queue + ACK, " +
  "legacy passphrase lock/wrong-pass/correct-pass behavior, exact-origin website handshake."
);
