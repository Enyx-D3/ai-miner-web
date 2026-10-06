(() => {
  if (globalThis.__brain2CaptureV083) return;
  globalThis.__brain2CaptureV083 = true;

  const providerAdapter = globalThis.Brain2ProviderAdapters?.resolve?.(location.hostname);
  if (!providerAdapter) return;
  const provider = providerAdapter.id;

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
    return [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
  }

  function visible(el) {
    if (!el || typeof getComputedStyle !== "function") return false;
    const style = getComputedStyle(el);
    return style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0";
  }

  function anyVisible(documentLike, selectors) {
    return selectors.some((selector) =>
      [...documentLike.querySelectorAll(selector)].some(visible)
    );
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
    const time = node.querySelector?.("time[datetime]") ||
      node.closest?.("article,section")?.querySelector?.("time[datetime]");
    if (time?.getAttribute?.("datetime")) {
      return { value: parseTime(time.getAttribute("datetime")), source: "dom" };
    }
    for (const attr of [
      "data-create-time",
      "data-created-at",
      "data-timestamp",
      "data-message-timestamp"
    ]) {
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

  const adapterHelpers = {
    cleanText,
    anyVisible,
    timeFrom,
    idFrom,
    documentOrder,
    uniqueTurns
  };

  function conversationId() {
    return providerAdapter.conversationId(location);
  }

  function conversationTitle() {
    return providerAdapter.conversationTitle(document, location, adapterHelpers);
  }

  function isGenerating() {
    return providerAdapter.isGenerating(document, adapterHelpers);
  }

  function candidateTurns() {
    const result = providerAdapter.extractTurns(document, adapterHelpers);
    lastSelectorMode = result?.selectorMode || `${provider}-none`;
    return Array.isArray(result?.turns) ? result.turns : [];
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
    if (!response?.ok) {
      throw new Error(
        response?.locked
          ? "Capture vault is locked."
          : (response?.error || "Capture queue rejected the turn.")
      );
    }
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
          adapterVersion: globalThis.Brain2ProviderAdapters?.version || 0,
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

      const signature = turns
        .map((t) => `${t.role}:${t.providerNodeId || t.providerMessageId || ""}:${t.text}`)
        .join("\n---\n");
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
    if (!turns.length) {
      throw new Error(`No ${provider} turns detected (${lastSelectorMode}).`);
    }
    if (isGenerating()) {
      throw new Error("The provider is still generating. Wait for the response to finish.");
    }
    const result = await captureTurn(turns[turns.length - 1], { manual: true });
    lastError = "";
    await reportHealth({ manualCaptureTestAt: new Date().toISOString() });
    return {
      ok: true,
      provider,
      role: turns[turns.length - 1].role,
      duplicate: result.duplicate,
      queueCount: result.count,
      turnCount: turns.length,
      selectorMode: lastSelectorMode
    };
  }

  function schedule(delay = 350) {
    clearTimeout(timer);
    timer = setTimeout(scan, Math.max(50, delay));
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "BRAIN2_CAPTURE_LATEST") {
      captureLatestForTest()
        .then(sendResponse)
        .catch((error) => sendResponse({
          ok: false,
          error: error?.message || String(error),
          provider,
          turnCount: lastTurnCount,
          selectorMode: lastSelectorMode
        }));
      return true;
    }
    if (message?.type === "BRAIN2_CAPTURE_DIAGNOSTIC") {
      sendResponse({
        ok: true,
        provider,
        adapterVersion: globalThis.Brain2ProviderAdapters?.version || 0,
        turnCount: lastTurnCount,
        selectorMode: lastSelectorMode,
        baselineReady,
        baselineTurns,
        captureCount,
        lastCaptureAt,
        lastError,
        isGenerating: isGenerating()
      });
    }
  });

  const observer = new MutationObserver(() => schedule());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [
      "datetime",
      "data-message-id",
      "data-testid",
      "data-turn",
      "data-turn-id",
      "data-is-streaming",
      "data-message-author-role",
      "data-message-author"
    ]
  });

  window.addEventListener("popstate", () => {
    baselineReady = false;
    schedule(250);
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) schedule(100);
  });
  setInterval(() => { void reportHealth(); }, HEALTH_MS);
  void reportHealth({ contentScriptReady: true });
  schedule(450);
})();
