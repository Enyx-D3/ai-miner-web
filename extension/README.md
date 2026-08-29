# Brain2 AI Miner Extension v0.8.3

**Primary change:** the toolbar popup is restored for Connect/Disconnect, while the Chrome Side Panel remains the persistent capture monitor. Connection status is now based on the completed Brain2 nonce handshake, not merely a saved origin.

See `CONNECTION_MODEL_V0_8_3.md`.

# Brain2 AI Miner Extension v0.8.0

## Locked purpose

The extension is the browser capture/connector layer for exactly three providers in this release:

- ChatGPT — `https://chatgpt.com/*`
- Claude — `https://claude.ai/*`
- Gemini — `https://gemini.google.com/*`

It owns:

```text
provider detection
→ completed-turn capture
→ source/provenance metadata
→ stable capture IDs
→ encrypted durable queue
→ Brain2 website handshake
→ bounded batch delivery
→ ACK/retry
→ dedupe
→ capture/connector health
```

It does **not** own atomization, Current Truth, RapidRetrieve, MRS, LifeWiki, Pattern Lab, or the Reasoning Compiler. Those belong to Brain2 AI Miner after canonical ingestion.

## What changed from v0.7

1. **Persistent right-side panel** using Chrome Side Panel. Clicking on the webpage no longer closes the extension UI like a popup.
2. **Automatic encrypted device vault on new installs.** Capture starts without requiring a passphrase unlock.
3. **Passphrase-vault compatibility.** Existing passphrase installations remain supported. The derived key is kept in `chrome.storage.session`, so service-worker suspension does not silently re-lock capture during the browser session.
4. **Provider-specific adapters** for ChatGPT, Claude and Gemini with current + fallback selectors.
5. **Provider health telemetry** showing whether each supported site is being watched, last successful capture, and capture errors.
6. **Send queued now** button and one-minute retry pulse.
7. Stable SHA-256 capture IDs + IndexedDB unique index continue to provide dedupe.
8. Website bridge protocol remains compatible with the current Brain2 AI Miner web receiver.

## Install

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this extension folder.
5. Pin Brain2 AI Miner if desired.
6. Click the Brain2 icon. Chrome opens the persistent right-side panel.

## Connect Brain2

1. Open the Brain2 AI Miner website.
2. Open the extension side panel.
3. Click **Connect active Brain2 tab**.
4. Approve permission for that Brain2 website origin.
5. Leave Brain2 open in any tab when you want queued captures delivered immediately.

The connection persists across reloads. The extension dynamically registers `bridge.js` only for the authorized Brain2 origin.

## Test capture

### ChatGPT
1. Open a conversation on `chatgpt.com`.
2. Send a prompt and allow the assistant response to finish.
3. Open/observe the Brain2 side panel.
4. `ChatGPT` should show `WATCHING`.
5. Queue count should increase if Brain2 is closed, or briefly increase then return to zero when Brain2 ACKs ingestion.

### Claude
Repeat on `claude.ai`.

### Gemini
Repeat on `gemini.google.com`.

## Expected end-to-end flow

```text
completed provider turn
  ↓
capture.js provider adapter
  ↓
stable SHA-256 capture ID
  ↓
AES-GCM encrypted queue
  ↓
bridge pulse
  ↓
Brain2 web bridge
  ↓
BRAIN2_EXTENSION_BATCH
  ↓
Brain2 ingestExtensionBatch(...)
  ↓
BRAIN2_EXTENSION_ACK
  ↓
queue item deletion
```

## Troubleshooting

### Provider says IDLE
Open the provider conversation tab and wait a few seconds. If it remains idle, reload that tab once after updating the unpacked extension.

### Provider says WATCHING but no captures
Make sure the assistant response has finished. The extension intentionally waits until streaming/generation stops and the DOM is stable.

### Queue grows but Brain2 does not receive records
Open Brain2, click **Connect active Brain2 tab** once, then click **Send queued now**. The side panel shows the last time the website bridge was seen and the last delivery ACK.

### Capture locked
This should only occur on an upgraded legacy installation that previously used a passphrase vault. Enter the existing passphrase once. The key remains available through service-worker restarts for the browser session.

## Security boundary

- Provider content scripts can only run on ChatGPT, Claude and Gemini.
- Brain2 host access is requested explicitly and dynamically.
- Queue contents are AES-GCM encrypted before durable storage.
- ACK deletion happens only after the Brain2 website accepts the capture IDs.
- The extension never writes Current Truth or runs MRS itself.

## v0.8.2 connection state
The side panel is stateful:
- Not connected: **Connect active Brain2 tab** is shown.
- Connected/configured: Connect is hidden and **Disconnect Brain2** is shown.
- Disconnect unregisters the bridge and removes the granted Brain2-site permission.

## v0.8.2 capture diagnostics
Provider Health now reports detected turn count, baseline count, selector mode, last capture, and any capture error. Use **Capture latest turn (test)** while a ChatGPT/Claude/Gemini tab is active to test DOM detection → encryption → queue directly.


## v0.8.4 UI + connection model

The extension toolbar icon now opens one persistent **right Side Panel**. There is no popup.

The panel has exactly two tabs:

- **Connection** — connect/disconnect, exact Brain2 origin, CONNECTING/CONNECTED state, handshake diagnostics, retry only after a real handshake failure.
- **Capture** — ChatGPT/Claude/Gemini capture health, encrypted queue, manual capture test, send queue, clear queue.

Connection is one-click: press Connect once, approve Chrome site permission, and the same Side Panel continues automatically through bridge registration and the Brain2 nonce handshake. No second Connect click is required.

Capture logic is unchanged from the working per-turn fingerprint/baseline engine.
