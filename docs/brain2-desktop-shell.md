# Brain2 Desktop Shell

Date: 2026-08-31

## What this adds

The repo now contains a desktop-host implementation for the Brain2 local helper flow:

- `desktop/electron/main.cjs`
- `desktop/electron/preload.cjs`
- `desktop/electron/companionManager.cjs`

This host:

1. opens the AI Miner UI in a desktop window
2. starts the local Brain2 MRS companion before the UI needs it
3. exposes `window.aiMinerDesktop.ensureMRSCompanion(...)` to the renderer
4. retries health checks before the UI falls back to reduced mode

## Runtime behavior

1. Desktop app starts.
2. `main.cjs` calls `ensureCompanion()`.
3. `companionManager.cjs` probes `http://127.0.0.1:4317/health`.
4. If the helper is not running, it spawns `scripts/brain2-mrs-daemon.mjs`.
5. The preload bridge exposes the startup call to the UI.
6. The UI keeps deterministic-first behavior and only uses MRS when needed.

## Current limitation

This is the desktop-host code layer that the packaged AI Miner app uses.

For end users, the intended flow is still:

1. install AI Miner once
2. open AI Miner
3. let the app start the local helper automatically

Internal work that still needs validation:

- model/cache persistence rules finalized for packaged environments
- end-to-end installer verification on Windows, macOS, and Linux

## Dev entrypoint

For internal development and testing, the repo also includes:

- `scripts/start-ai-miner-desktop-dev.mjs`

Intended script name:

- `npm run desktop:dev`
