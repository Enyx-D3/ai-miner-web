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

const headingHelpers = {
  cleanText(value) { return String(value || "").trim(); },
  anyVisible: helpers.anyVisible,
  timeFrom() { return { value: undefined, source: "unknown" }; },
  idFrom() { return undefined; },
  documentOrder(items) { return items; },
  uniqueTurns(items) { return items.map((item, sequence) => ({ ...item, sequence })); }
};
const userRoot = { innerText: "You said:\nhello", textContent: "You said:\nhello" };
const assistantRoot = { innerText: "ChatGPT said:\n\nworld", textContent: "ChatGPT said:\n\nworld" };
const headingDocument = {
  querySelectorAll(selector) {
    if (selector !== "h4") return [];
    return [
      { textContent: "You said:", parentElement: userRoot },
      { textContent: "ChatGPT said:", parentElement: assistantRoot }
    ];
  }
};
const headingTurns = registry.adapters.chatgpt.extractTurns(headingDocument, headingHelpers);
req(headingTurns.selectorMode === "chatgpt-heading-turns", "chatgpt heading fallback selector");
req(headingTurns.turns.length === 2 && headingTurns.turns[0].role === "user" && headingTurns.turns[1].role === "assistant", "chatgpt heading fallback turns");

console.log("Brain2 extension provider adapter v2 deterministic contract PASS");
