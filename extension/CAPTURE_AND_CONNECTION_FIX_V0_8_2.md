# Brain2 Extension v0.8.2 — Capture + Connection State Fix

## Connection UI
- If no Brain2 origin is configured: show **Connect active Brain2 tab**.
- If a Brain2 origin is configured: hide Connect and show **Disconnect Brain2**.
- Disconnect unregisters the dynamic Brain2 bridge, clears the authorized origin/handshake timestamp, and tells already-injected bridge instances to stop pushing.

## Capture engine
The old whole-conversation snapshot comparator was replaced with per-turn fingerprint tracking.

1. Existing visible turns are baselined once and are not queued.
2. The content script observes DOM mutations.
3. While generation/streaming is active, capture waits.
4. After the page is stable, each newly observed turn gets a deterministic fingerprint.
5. Only fingerprints not present in the baseline/seen set are queued.
6. Provider health reports selector mode, detected turn count, baseline count, last capture, and errors.

### Provider selector families
- ChatGPT: current `section[data-turn]`, `article[data-turn]`, `conversation-turn-*`, and role attributes.
- Claude: `data-testid=user-message/human-message`, `.font-user-message`, `.font-claude-response`, assistant fallbacks.
- Gemini: `user-query`, `model-response`, plus current `.query-text`, `.user-query`, `message-content`, `.model-response-text`, `.response-content`, and author fallbacks.

## Diagnostic button
**Capture latest turn (test)** manually queues the latest completed visible turn in the active ChatGPT/Claude/Gemini tab. This is for end-to-end diagnosis; automatic capture remains the production path.
