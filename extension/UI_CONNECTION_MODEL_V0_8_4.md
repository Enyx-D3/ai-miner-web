# Brain2 Extension v0.8.4 — Two-Tab Sidebar Connection Model

## UI
The toolbar icon opens one persistent Chrome Side Panel. There is no popup.

The sidebar has exactly two tabs:

1. **Connection** — Brain2 connection status, Connect, Disconnect, Retry handshake, origin and handshake diagnostics.
2. **Capture** — ChatGPT/Claude/Gemini health, encrypted queue, manual capture test, send and clear controls.

## One-click connection

```text
Open Brain2 tab
  ↓
Open Brain2 extension sidebar
  ↓
Connection → Connect
  ↓
Chrome asks site permission
  ↓
User accepts
  ↓
THE SAME SIDE-PANEL JS CONTINUES AUTOMATICALLY
  ↓
register/inject bridge
  ↓
BRAIN2_EXTENSION_PRESENT
  ↓
BRAIN2_WEBSITE_CONNECT_REQUEST (nonce)
  ↓
extension verifies exact authorized origin
  ↓
BRAIN2_EXTENSION_CONNECT_RESPONSE
  ↓
Brain2 ACK
  ↓
CONNECTED
```

No second Connect click is required after the Chrome permission prompt.

The previous popup implementation could be destroyed when Chrome displayed the permission prompt. Using the persistent Side Panel keeps the connection function alive while permission is granted, allowing configuration and handshake to continue automatically.

## Connection truth
- `DISCONNECTED`: no authorized Brain2 origin.
- `CONNECTING`: origin is authorized/configured but nonce handshake is not complete.
- `CONNECTED`: authorized origin + recent completed Brain2 handshake.

`Connect` is hidden as soon as an origin is configured. `Disconnect` is shown instead. A separate `Retry handshake` button appears only if the configured origin has not completed the handshake.
