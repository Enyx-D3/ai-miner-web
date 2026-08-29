import fs from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const data = {};
let onMessage;
const noopEvent = { addListener() {} };
const chrome = {
  storage: { local: {
    async get(keys) {
      if (typeof keys === "string") return { [keys]: data[keys] };
      const out = {};
      for (const key of keys || []) out[key] = data[key];
      return out;
    },
    async set(value) { Object.assign(data, value); },
  } },
  runtime: { getManifest() { return { version: "0.7.0" }; }, onInstalled: noopEvent, onStartup: noopEvent, onMessage: { addListener(fn) { onMessage = fn; } } },
  alarms: { create() {}, onAlarm: noopEvent },
  tabs: { async query() { return []; } },
  scripting: { async unregisterContentScripts() {}, async registerContentScripts() {} },
  permissions: { async request() { return true; } },
};

const context = { chrome, crypto: webcrypto, TextEncoder, TextDecoder, btoa, atob, URL, console, setTimeout, clearTimeout };
vm.createContext(context);
vm.runInContext(fs.readFileSync("extension/service_worker.js", "utf8"), context);

function send(message, sender={}) {
  return new Promise((resolve, reject) => {
    try {
      const keepOpen = onMessage(message, sender, resolve);
      if (!keepOpen) resolve(undefined);
    } catch (error) { reject(error); }
  });
}

let status = await send({ type: "BRAIN2_STATUS" });
if (!status.locked) throw new Error("Vault must start locked");
let result = await send({ type: "BRAIN2_UNLOCK", passphrase: "test-passphrase" });
if (!result.ok) throw new Error("Unlock failed");
const record = { id: "ext_1", provider: "chatgpt", conversationExternalId: "c1", conversationTitle: "T", role: "user", text: "secret plaintext", url: "https://chatgpt.com/c/1" };
result = await send({ type: "BRAIN2_CAPTURE", record });
if (!result.ok) throw new Error("Capture failed");
if (JSON.stringify(data).includes("secret plaintext")) throw new Error("Plaintext leaked into extension storage");
result = await send({ type: "BRAIN2_GET_BATCH" });
if (result.records?.[0]?.text !== "secret plaintext") throw new Error("Decrypt batch failed");
await send({ type: "BRAIN2_ACK", acceptedIds: ["ext_1"] });
status = await send({ type: "BRAIN2_STATUS" });
if (status.queueCount !== 0) throw new Error("ACK did not delete queued record");
await send({ type: "BRAIN2_LOCK" });
result = await send({ type: "BRAIN2_CAPTURE", record });
if (!result.locked) throw new Error("Locked capture must be rejected");
result = await send({ type: "BRAIN2_UNLOCK", passphrase: "wrong" });
if (result.ok) throw new Error("Wrong passphrase was accepted");
result = await send({ type: "BRAIN2_UNLOCK", passphrase: "test-passphrase" });
if (!result.ok) throw new Error("Correct passphrase did not re-unlock");

// Browser-connector binding: the extension authorizes exactly the configured Brain2 website origin.
result = await send({ type: "BRAIN2_CONFIG_ORIGIN", origin: "https://brain2.test" });
if (!result.ok || result.origin !== "https://brain2.test") throw new Error("Website origin configuration failed");
const connector = await send({ type: "BRAIN2_CONNECT_WEBSITE", websiteOrigin: "https://brain2.test", websiteInstanceId: "web_1", memoryRoot: "root_1" }, { tab: { url: "https://brain2.test/devices" } });
if (!connector.ok || !connector.installId || !connector.capabilities?.includes("encrypted-capture-queue")) throw new Error("Website connector handshake failed");
let wrongOriginRejected=false;
const badConnector = await send({ type: "BRAIN2_CONNECT_WEBSITE", websiteOrigin: "https://evil.test", websiteInstanceId: "web_2", memoryRoot: "root_1" }, { tab: { url: "https://evil.test/" } });
wrongOriginRejected = !badConnector?.ok;
if (!wrongOriginRejected) throw new Error("Unconfigured website origin connected to extension");

console.log("Extension vault + browser connector smoke PASS: locked default, ciphertext-only queue, ACK delete, wrong-pass reject, re-unlock, configured-origin website handshake.");
