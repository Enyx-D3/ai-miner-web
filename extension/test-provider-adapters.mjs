import fs from "node:fs";
import vm from "node:vm";

const code = fs.readFileSync(new URL("./provider_adapters.js", import.meta.url), "utf8");
const context = vm.createContext({});
vm.runInContext(code, context);
const registry = context.Brain2ProviderAdapters;
function req(ok, msg) { if (!ok) throw new Error(msg); }

req(registry?.version === 2, "adapter registry version");
for (const id of ["chatgpt", "claude", "gemini"]) {
  const adapter = registry.adapters[id];
  req(adapter?.id === id, `${id} adapter exists`);
  for (const fn of ["conversationId", "conversationTitle", "isGenerating", "extractTurns"]) {
    req(typeof adapter[fn] === "function", `${id}.${fn}`);
  }
}

req(registry.resolve("chatgpt.com")?.id === "chatgpt", "chatgpt resolve");
req(registry.resolve("foo.chatgpt.com")?.id === "chatgpt", "chatgpt subdomain resolve");
req(registry.resolve("claude.ai")?.id === "claude", "claude resolve");
req(registry.resolve("gemini.google.com")?.id === "gemini", "gemini resolve");
req(registry.resolve("example.com") === null, "unknown host rejected");

const loc = (pathname, search = "") => ({ pathname, search });
req(registry.adapters.chatgpt.conversationId(loc("/c/abc")) === "abc", "chatgpt conversation id");
req(registry.adapters.claude.conversationId(loc("/chat/def")) === "def", "claude conversation id");
req(registry.adapters.gemini.conversationId(loc("/app/ghi")) === "ghi", "gemini conversation id");
req(
  registry.adapters.chatgpt.conversationId(loc("/")) === "chatgpt:/",
  "chatgpt deterministic fallback"
);

const invisibleDocument = { querySelectorAll() { return []; } };
const helpers = { anyVisible(doc, selectors) { return selectors.some(s => doc.querySelectorAll(s).length > 0); } };
for (const id of ["chatgpt", "claude", "gemini"]) {
  req(registry.adapters[id].isGenerating(invisibleDocument, helpers) === false, `${id} idle state`);
}

console.log("Brain2 extension provider adapter v2 deterministic contract PASS");
