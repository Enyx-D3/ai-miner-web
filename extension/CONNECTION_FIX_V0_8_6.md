# Brain2 Extension v0.8.6 — Connection State Fix

- One persistent two-tab sidebar remains: Connection / Capture.
- There is now exactly one connection action button.
- DISCONNECTED => `Connect to active Brain2 tab`.
- CONNECTING or CONNECTED => `Disconnect Brain2`.
- The two labels can never be visible as separate buttons at the same time.
- The website bridge sends a heartbeat every 2 seconds while connected.
- CONNECTED is considered live only while that heartbeat remains fresh.
- Explicit disconnect immediately sends `BRAIN2_EXTENSION_DISCONNECTED` to the Brain2 website.
