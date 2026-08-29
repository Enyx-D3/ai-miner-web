(() => {
  if (globalThis.__brain2CaptureV082) return;
  globalThis.__brain2CaptureV082 = true;

  const provider = location.hostname === "claude.ai"
    ? "claude"
    : location.hostname === "gemini.google.com"
      ? "gemini"
      : "chatgpt";

  const STABLE_MS = 1100;
  const HEALTH_MS = 5000;
  const enc = new TextEncoder();
  let timer = null;
  let lastConversation = "";
  let baselineReady = false;
  let seenFingerprints = new Set();
  let lastStableSignature = "";
  let stableSince = 0;
  let lastCaptureAt = "";
  let lastError = "";
  let captureCount = 0;
  let lastTurnCount = 0;
  let lastSelectorMode = "none";
  let baselineTurns = 0;
  let newlyQueued = 0;

  async function sha256(text) {
    const digest = await crypto.subtle.digest("SHA-256", enc.encode(text));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
  }

  function visible(el) {
    if (!(el instanceof Element)) return false;
    const style = getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  }

  function conversationId() {
    const parts = location.pathname.split("/").filter(Boolean);
    if (provider === "chatgpt") {
      const c = parts.indexOf("c");
      if (c >= 0 && parts[c + 1]) return parts[c + 1];
    }
    if (provider === "claude") {
      const chat = parts.indexOf("chat");
      if (chat >= 0 && parts[chat + 1]) return parts[chat + 1];
    }
    if (provider === "gemini") {
      const app = parts.indexOf("app");
      if (app >= 0 && parts[app + 1]) return parts[app + 1];
    }
    return `${provider}:${location.pathname}${location.search}`;
  }

  function conversationTitle() {
    if (provider === "claude") {
      const header = document.querySelector('[data-testid="page-header"]');
      const text = cleanText(header?.innerText);
      if (text) return text.split("\n")[0];
    }
    return cleanText(document.title)
      .replace(/\s*[|–—-]\s*(ChatGPT|Claude|Gemini).*$/i, "")
      .replace(/^Gemini\s*[-–—|]\s*/i, "") || `${provider} conversation`;
  }

  function isGenerating() {
    const selectors = provider === "chatgpt"
      ? [
          '[data-testid="stop-button"]',
          'button[aria-label*="Stop generating" i]',
          'button[aria-label*="Stop streaming" i]'
        ]
      : provider === "claude"
        ? [
            '[data-is-streaming="true"]',
            'button[aria-label*="Stop" i]',
            '[data-testid*="stop" i]'
          ]
        : [
            'button[aria-label*="Stop response" i]',
            'button[aria-label*="Stop" i]',
            '[data-test-id*="stop" i]'
          ];
    return selectors.some((selector) => [...document.querySelectorAll(selector)].some(visible));
  }

  function parseTime(raw) {
    if (!raw) return undefined;
    const number = Number(raw);
    if (Number.isFinite(number) && number > 1e9) {
      const milliseconds = number > 1e12 ? number : number * 1000;
      const date = new Date(milliseconds);
      return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
    }
    const parsed = Date.parse(String(raw));
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
  }

  function timeFrom(node) {
    const time = node.querySelector?.("time[datetime]") || node.closest?.("article,section")?.querySelector?.("time[datetime]");
    if (time?.getAttribute("datetime")) return { value: parseTime(time.getAttribute("datetime")), source: "dom" };
    for (const attr of ["data-create-time", "data-created-at", "data-timestamp", "data-message-timestamp"]) {
      const value = parseTime(node.getAttribute?.(attr));
      if (value) return { value, source: "dom" };
    }
    return { value: undefined, source: "unknown" };
  }

  function idFrom(node) {
    return node.getAttribute?.("data-message-id") ||
      node.getAttribute?.("data-message-uuid") ||
      node.getAttribute?.("data-turn-id") ||
      node.getAttribute?.("data-uuid") ||
      node.getAttribute?.("data-testid") ||
      undefined;
  }

  function documentOrder(items) {
    return items.sort((a, b) => {
      if (a.node === b.node) return 0;
      const pos = a.node.compareDocumentPosition(b.node);
      return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  }

  function uniqueTurns(items) {
    const seen = new Set();
    const out = [];
    for (const item of items) {
      const key = `${item.role}|${item.providerNodeId || ""}|${item.text}`;
      if (!item.text || item.text.length < 2 || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out.map((item, index) => ({
      ...item,
      sequence: index,
      parentProviderNodeId: index > 0 ? out[index - 1].providerNodeId : undefined
    }));
  }

  function textFromRoot(root, role) {
    if (provider === "chatgpt") {
      const roleNode = root.matches?.('[data-message-author-role]') ? root : root.querySelector?.('[data-message-author-role]');
      if (roleNode) {
        const markdown = roleNode.querySelector?.('.markdown, .whitespace-pre-wrap');
        return cleanText((markdown || roleNode).innerText || (markdown || roleNode).textContent);
      }
      const markdown = root.querySelector?.('.markdown, .whitespace-pre-wrap');
      if (markdown) return cleanText(markdown.innerText || markdown.textContent);
    }
    if (provider === "claude") {
      if (role === "assistant") {
        const actual = root.querySelector?.('.row-start-2 .standard-markdown, .row-start-2 .progressive-markdown, .standard-markdown, .progressive-markdown');
        if (actual) return cleanText(actual.innerText || actual.textContent).replace(/^Claude responded:\s*/i, "");
      }
      return cleanText(root.innerText || root.textContent).replace(/^You said:\s*/i, "").replace(/^Claude responded:\s*/i, "");
    }
    return cleanText(root.innerText || root.textContent);
  }

  function chatgptTurns() {
    const selector = [
      'section[data-turn="user"]','section[data-turn="assistant"]',
      'article[data-turn="user"]','article[data-turn="assistant"]',
      'section[data-testid^="conversation-turn-"]',
      'article[data-testid^="conversation-turn-"]',
      '[data-message-author-role="user"]','[data-message-author-role="assistant"]'
    ].join(',');
    const roots = [...document.querySelectorAll(selector)];
    const items = [];
    for (const root of roots) {
      const roleNode = root.matches?.('[data-message-author-role]') ? root : root.querySelector?.('[data-message-author-role]');
      const roleRaw = root.getAttribute?.("data-turn") || roleNode?.getAttribute("data-message-author-role") || "";
      const role = roleRaw === "user" ? "user" : roleRaw === "assistant" ? "assistant" : null;
      if (!role) continue;
      const canonicalRoot = root.closest?.('section[data-turn],article[data-turn],section[data-testid^="conversation-turn-"],article[data-testid^="conversation-turn-"]') || root;
      const text = textFromRoot(canonicalRoot, role);
      if (text.length < 2) continue;
      const t = timeFrom(canonicalRoot);
      items.push({ role, text, providerMessageId: canonicalRoot.getAttribute?.("data-message-id") || undefined, providerNodeId: idFrom(canonicalRoot), occurredAt: t.value, timestampSource: t.source });
    }
    lastSelectorMode = roots.length ? "chatgpt-semantic-turns" : "chatgpt-none";
    return uniqueTurns(items);
  }

  function claudeTurns() {
    const selector = [
      '[data-testid="user-message"]','[data-testid="human-message"]','[data-testid="message-human"]','.font-user-message',
      '.font-claude-response','[data-testid="ai-message"]','[data-testid="message-assistant"]','.font-claude-message'
    ].join(',');
    const nodes = documentOrder([...document.querySelectorAll(selector)].map((node) => ({ node })));
    const items = [];
    for (const { node } of nodes) {
      let role = null;
      if (node.matches('[data-testid="user-message"],[data-testid="human-message"],[data-testid="message-human"],.font-user-message')) role = "user";
      if (node.matches('.font-claude-response,[data-testid="ai-message"],[data-testid="message-assistant"],.font-claude-message')) role = "assistant";
      if (!role) continue;
      const text = textFromRoot(node, role);
      if (text.length < 2) continue;
      const root = node.closest?.('[data-testid*="message"],article,section') || node;
      const t = timeFrom(root);
      items.push({ role, text, providerMessageId: root.getAttribute?.("data-message-id") || undefined, providerNodeId: idFrom(root), occurredAt: t.value, timestampSource: t.source });
    }
    lastSelectorMode = nodes.length ? "claude-semantic-turns" : "claude-none";
    return uniqueTurns(items);
  }

  function geminiTurns() {
    const selector = [
      'user-query','model-response','message-content',
      '.query-text','.user-query','.model-response-text','.response-content',
      '[data-message-author="user"]','[data-message-author="assistant"]',
      '[data-test-id="user-query"]','[data-test-id="model-response"]'
    ].join(',');
    const nodes = documentOrder([...document.querySelectorAll(selector)].map((node) => ({ node })));
    const items = [];
    for (const { node } of nodes) {
      let role = null;
      if (node.matches('user-query,.query-text,.user-query,[data-message-author="user"],[data-test-id="user-query"]')) role = "user";
      if (node.matches('model-response,message-content,.model-response-text,.response-content,[data-message-author="assistant"],[data-test-id="model-response"]')) role = "assistant";
      if (!role) continue;
      const text = cleanText(node.innerText || node.textContent);
      if (text.length < 2) continue;
      const root = node.closest?.('[data-message-id],[data-test-id],article,section,user-query,model-response') || node;
      const t = timeFrom(root);
      items.push({ role, text, providerMessageId: root.getAttribute?.("data-message-id") || undefined, providerNodeId: idFrom(root), occurredAt: t.value, timestampSource: t.source });
    }
    lastSelectorMode = nodes.length ? "gemini-semantic-turns" : "gemini-none";
    return uniqueTurns(items);
  }

  function candidateTurns() {
    if (provider === "chatgpt") return chatgptTurns();
    if (provider === "claude") return claudeTurns();
    return geminiTurns();
  }

  async function fingerprint(turn) {
    const native = turn.providerMessageId || turn.providerNodeId;
    const seed = native
      ? `${provider}|${conversationId()}|native|${native}|${turn.role}`
      : `${provider}|${conversationId()}|content|${turn.role}|${turn.text}`;
    return (await sha256(seed)).slice(0, 32);
  }

  async function captureTurn(turn, { manual = false } = {}) {
    const fp = await fingerprint(turn);
    const id = `ext_${fp.slice(0, 28)}`;
    const native = turn.providerMessageId || turn.providerNodeId;
    const capturedAt = new Date().toISOString();
    const response = await chrome.runtime.sendMessage({
      type: "BRAIN2_CAPTURE",
      record: {
        id,
        provider,
        conversationExternalId: conversationId(),
        conversationTitle: conversationTitle(),
        messageExternalId: native || `${conversationId()}-${turn.role}-${fp.slice(0, 12)}`,
        providerMessageId: turn.providerMessageId,
        providerNodeId: turn.providerNodeId,
        parentProviderNodeId: turn.parentProviderNodeId,
        sequence: turn.sequence,
        role: turn.role,
        text: turn.text,
        url: location.href,
        occurredAt: turn.occurredAt,
        capturedAt,
        timestampSource: turn.timestampSource || "unknown",
        captureMode: manual ? "manual-test" : "automatic"
      }
    });
    if (!response?.ok) throw new Error(response?.locked ? "Capture vault is locked." : (response?.error || "Capture queue rejected the turn."));
    seenFingerprints.add(fp);
    if (!response.duplicate) {
      captureCount += 1;
      lastCaptureAt = capturedAt;
      newlyQueued += 1;
    }
    return { id, duplicate: Boolean(response.duplicate), count: response.count };
  }

  async function reportHealth(extra = {}) {
    try {
      await chrome.runtime.sendMessage({
        type: "BRAIN2_PROVIDER_HEALTH",
        health: {
          provider,
          url: location.href,
          conversationExternalId: conversationId(),
          lastCaptureAt,
          captureCount,
          lastError,
          isGenerating: isGenerating(),
          turnCount: lastTurnCount,
          selectorMode: lastSelectorMode,
          baselineReady,
          baselineTurns,
          newlyQueued,
          lastScanAt: new Date().toISOString(),
          contentScriptReady: true,
          ...extra
        }
      });
    } catch {}
  }

  async function establishBaseline(turns) {
    seenFingerprints = new Set();
    for (const turn of turns) seenFingerprints.add(await fingerprint(turn));
    baselineReady = true;
    baselineTurns = turns.length;
    lastConversation = conversationId();
    lastError = "";
    await reportHealth({ baselineEstablishedAt: new Date().toISOString() });
  }

  async function scan() {
    try {
      const currentConversation = conversationId();
      const turns = candidateTurns();
      lastTurnCount = turns.length;

      if (!turns.length) {
        lastError = `No ${provider} conversation turns detected. selector=${lastSelectorMode}`;
        await reportHealth();
        return;
      }

      if (!baselineReady || currentConversation !== lastConversation) {
        await establishBaseline(turns);
        return;
      }

      if (isGenerating()) {
        lastError = "";
        await reportHealth({ waitingForCompletion: true });
        schedule(650);
        return;
      }

      const signature = turns.map((t) => `${t.role}:${t.providerNodeId || t.providerMessageId || ""}:${t.text}`).join("\n---\n");
      if (signature !== lastStableSignature) {
        lastStableSignature = signature;
        stableSince = Date.now();
        schedule(STABLE_MS);
        return;
      }
      if (Date.now() - stableSince < STABLE_MS) {
        schedule(STABLE_MS - (Date.now() - stableSince) + 60);
        return;
      }

      const fresh = [];
      for (const turn of turns) {
        const fp = await fingerprint(turn);
        if (!seenFingerprints.has(fp)) fresh.push(turn);
      }

      if (!fresh.length) {
        lastError = "";
        await reportHealth({ freshTurns: 0 });
        return;
      }

      let failed = false;
      newlyQueued = 0;
      for (const turn of fresh) {
        try {
          await captureTurn(turn);
        } catch (error) {
          failed = true;
          lastError = error?.message || String(error);
          break;
        }
      }
      if (!failed) lastError = "";
      await reportHealth({ freshTurns: fresh.length, newlyQueued });
      if (failed) schedule(1500);
    } catch (error) {
      lastError = error?.message || String(error);
      await reportHealth();
      schedule(1800);
    }
  }

  async function captureLatestForTest() {
    const turns = candidateTurns();
    lastTurnCount = turns.length;
    if (!turns.length) throw new Error(`No ${provider} turns detected (${lastSelectorMode}).`);
    if (isGenerating()) throw new Error("The provider is still generating. Wait for the response to finish.");
    const result = await captureTurn(turns[turns.length - 1], { manual: true });
    lastError = "";
    await reportHealth({ manualCaptureTestAt: new Date().toISOString() });
    return { ok: true, provider, role: turns[turns.length - 1].role, duplicate: result.duplicate, queueCount: result.count, turnCount: turns.length, selectorMode: lastSelectorMode };
  }

  function schedule(delay = 350) {
    clearTimeout(timer);
    timer = setTimeout(scan, Math.max(50, delay));
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "BRAIN2_CAPTURE_LATEST") {
      captureLatestForTest().then(sendResponse).catch((error) => sendResponse({ ok: false, error: error?.message || String(error), provider, turnCount: lastTurnCount, selectorMode: lastSelectorMode }));
      return true;
    }
    if (message?.type === "BRAIN2_CAPTURE_DIAGNOSTIC") {
      sendResponse({ ok: true, provider, turnCount: lastTurnCount, selectorMode: lastSelectorMode, baselineReady, baselineTurns, captureCount, lastCaptureAt, lastError, isGenerating: isGenerating() });
    }
  });

  const observer = new MutationObserver(() => schedule());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["datetime", "data-message-id", "data-testid", "data-turn", "data-turn-id", "data-is-streaming", "data-message-author-role", "data-message-author"]
  });

  window.addEventListener("popstate", () => { baselineReady = false; schedule(250); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(100); });
  setInterval(() => { void reportHealth(); }, HEALTH_MS);
  void reportHealth({ contentScriptReady: true });
  schedule(450);
})();
