# Brain2 Companion Product Architecture

Date: 2026-08-31

## User workflow

1. User installs AI Miner.
2. The installer includes the desktop app plus the local MRS companion.
3. User opens AI Miner.
4. The app probes the local companion on loopback.
5. If needed, the desktop app starts or restarts the companion automatically.
6. Deterministic lanes run first.
7. MRS work is sent to the local companion only when needed.
8. If the companion stays unavailable, the app shows one reduced-mode message and falls back to browser MRS if enabled.

## Companion contract

The UI expects a desktop bridge with:

```ts
window.aiMinerDesktop?.ensureMRSCompanion({
  host: "127.0.0.1",
  port: 4317,
  modelId: "onnx-community/granite-4.0-350m-ONNX-web",
})
```

The companion exposes:

- `GET /health`
- `POST /self-test`
- `POST /review`
- `POST /hard-residual`
- `POST /residual`

## Startup sequence

1. Probe loopback health.
2. If healthy, use companion immediately.
3. If unhealthy and desktop bridge exists, request companion start.
4. Retry health probe with bounded backoff.
5. If still unhealthy, publish reduced mode in UI.

## Cache and model ownership

- The companion owns model download, warm state, and cache reuse.
- The UI does not need to know the exact cache path.
- Browser MRS cache remains a fallback path, not the preferred path.

## Failure UX

Use one clear message:

`Local AI helper is unavailable. Retry or continue with reduced mode.`

## Current repo status

- UI runtime selection is implemented.
- Loopback daemon contract is implemented.
- Desktop bridge contract is implemented.
- Desktop packaging scaffolding is implemented in this repo.
- The intended product is one installed app, not a separate desktop install plus a separate web app install.
