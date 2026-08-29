# Brain2 Extension v0.8.3 — Connection Model

## UI ownership

The extension has two UI surfaces with different jobs.

### Toolbar popup

Clicking the Brain2 extension icon opens `popup.html`.

The popup owns only:

- connection state;
- Connect active Brain2 tab;
- Disconnect Brain2;
- opening the persistent capture monitor.

### Chrome Side Panel

The side panel remains the persistent monitor for:

- ChatGPT / Claude / Gemini capture health;
- encrypted queue count;
- manual capture diagnostic;
- manual queue flush;
- queue clear;
- vault status.

## Connection states

`DISCONNECTED` means there is no authorized Brain2 origin.

`CONNECTING` means an origin is authorized and bridge injection was requested, but the Brain2 website has not completed the nonce handshake.

`CONNECTED` means both are true:

1. the exact Brain2 origin is authorized; and
2. the Brain2 website completed `BRAIN2_WEBSITE_CONNECT_REQUEST -> BRAIN2_CONNECT_WEBSITE` and the extension recorded `lastWebsiteSeenAt`.

A saved origin alone is not considered a connection.

## Exact connect flow

```text
User opens Brain2 website in active tab
  ↓
click extension icon
  ↓
popup opens
  ↓
Connect active Brain2 tab
  ↓
request permission for exact active origin
  ↓
register persistent bridge.js for exact origin
  ↓
clear previous handshake timestamp
  ↓
existing bridge?
  ├─ yes → BRAIN2_BRIDGE_RECONNECT
  └─ no  → inject bridge.js, then RECONNECT
  ↓
bridge posts BRAIN2_EXTENSION_PRESENT + fresh nonce
  ↓
Brain2 website responds BRAIN2_WEBSITE_CONNECT_REQUEST
  ↓
service worker verifies sender tab origin == authorized origin
  ↓
service worker records lastWebsiteSeenAt
  ↓
BRAIN2_EXTENSION_CONNECT_RESPONSE
  ↓
CONNECTED
```

If the handshake does not complete within the popup/side-panel timeout, the temporary origin authorization is removed again and the UI returns to `DISCONNECTED`.

## Why reconnect previously failed

Older versions left the already-injected `bridge.js` alive after Disconnect. On reconnect, reinjection hit the single-instance guard and returned before re-announcing the extension, so Brain2 never restarted the handshake.

v0.8.3 adds `BRAIN2_BRIDGE_RECONNECT`. An existing bridge now explicitly clears its old connection state and re-announces the nonce handshake.
