# Brain2 Extension v0.8.1 — Connection + Queue Fix

## Connection method

1. Open the deployed Brain2 AI Miner website.
2. Open the extension side panel.
3. With the Brain2 tab active, click **Connect active Brain2 tab**.
4. Chrome asks for one-time permission for that exact Brain2 origin.
5. The extension registers/injects `bridge.js` only on that origin.
6. The website exposes `document.body.dataset.brain2AiMiner = "true"` and posts `BRAIN2_WEBSITE_READY`.
7. Bridge announces `BRAIN2_EXTENSION_PRESENT`.
8. Website sends `BRAIN2_WEBSITE_CONNECT_REQUEST` with the bridge nonce and memory root.
9. Extension validates the configured origin and replies with install ID.
10. Website ACKs the handshake. Only then are encrypted batches delivered.
11. Queue rows are deleted only after `BRAIN2_EXTENSION_ACK` includes their accepted IDs.

## Why you saw 72 waiting

The previous capture script treated every already-visible turn on the page as new on first injection, so opening an existing long conversation could enqueue dozens of historical user/assistant messages immediately. v0.8.1 changes first scan to a baseline: existing visible turns are remembered but not queued. Only new completed turns after the baseline are automatically captured.

The panel now explains the count and includes **Clear queued captures** to remove stale unsent entries from previous versions.
