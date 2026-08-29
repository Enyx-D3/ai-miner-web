# v0.8.0 — Three-provider capture reliability release

- Scope locked to ChatGPT, Claude, Gemini.
- Replaced closing popup UI with Chrome Side Panel.
- Added automatic device-local AES-GCM vault for new installs.
- Added passphrase-key session restoration for legacy vaults.
- Rebuilt provider adapters with current/fallback selectors.
- Added provider health status, last capture and errors.
- Added manual queue flush.
- Preserved ACK-gated deletion and deterministic dedupe.
- Preserved current Brain2 web bridge protocol compatibility.
