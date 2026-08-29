# Brain2 AI Miner — V4 Web + Chrome Implementation

This repository preserves the working Next.js 16 / React 19 / App Router / Tailwind 4 / shadcn baseline and upgrades it into one public **Brain2 AI Miner** product surface.

## Implemented in the web application

- Local IndexedDB Brain2 memory with canonical object tables.
- Stable SHA-256 based canonical IDs for sources, conversations, messages, projects, atoms, truth records, mutations and durable work objects.
- Existing source-aware ChatGPT / Claude / Gemini ZIP parsing reused for full-history import.
- Deterministic message de-duplication and baseline semantic atomization into decision, constraint, task, question, idea, fact and statement atoms.
- Current Truth lineage with CURRENT and SUPERSEDED history preserved.
- Decision registry with evidence atom lineage.
- Project identity resolution using title/tag overlap instead of one-folder-per-page copies.
- Functional dynamic project routes at `/projects/[slug]`.
- Functional dynamic source-conversation routes at `/conversations/[id]`.
- Live Notebooks with NOW / Findings / Patterns / Evidence / Wiki / Ticks / Experiments views.
- LifeWiki / Project Wiki as a compiled projection over canonical memory.
- Ticks (“Things That Need You”) with durable open/resolved state and owner resolution.
- Search modes: Find, Current, History, Evidence and Discover.
- Forgotten Gold resurfacing based on old-vs-recent keyword reconnection with explicit resurfacing reason.
- Pattern view with evidence count, multi-project recurrence and conservative OBSERVED/CANDIDATE states.
- Experiment registry and lifecycle.
- Brain2Mission registry with hash-linked checkpoints and persisted mission state.
- Local device ledger, mutation ledger, verification contracts and B2 transaction contracts.
- Operations Floor that shows real local state and `—` for runtime telemetry not actually connected.
- Plain `.B2M` export/restore and optional encrypted `.B2M` using PBKDF2-SHA256 (200,000 iterations) + AES-256-GCM.
- Memory-root mismatch protection during restore and local reset.
- Public Brain2 AI Miner landing, feature, workflow and documentation surfaces. The legacy one-time Refinery storefront is no longer exposed as the product surface.
- Local-first boot no longer requires `NEXT_PUBLIC_BASE_URL`; when no external control-plane API is configured, legacy auth requests fall back to same-origin `/api/` instead of crashing module initialization.

## Chrome extension included in this ZIP

- Manifest V3 under `/extension`.
- ChatGPT, Claude and Gemini host permissions and completed/stable rendered-turn capture via MutationObserver debounce.
- No keystroke listener.
- Capture is disabled while the extension vault is locked.
- Per-session vault key: PBKDF2-SHA256 (200,000 iterations) → AES-256-GCM.
- Captured records in `chrome.storage.local` are persisted only as ciphertext envelopes; the passphrase and derived key are never persisted.
- Service-worker restart returns to LOCKED because the derived key exists only in worker memory.
- Offline encrypted queue capped at 2,000 records.
- User-configurable AI Miner web origin with optional origin permission.
- Direct extension → open AI Miner tab bridge with per-batch acknowledgement before encrypted queue deletion.
- One-minute retry pulse while unlocked when a configured AI Miner tab is open.

## Deliberately not faked

These require a real model/runtime/network service rather than frontend code alone and therefore remain unavailable (`—`) until connected:

- Qwen/MRS inference runtime.
- Deterministic verification judge backed by external executable/model policies.
- WAN rendezvous / cross-NAT P2P transport.
- Mobile runtime sync.
- Production vector/RapidRetrieve service.

The data contracts, durable stores and screens remain present so those runtimes can be wired without redesigning the web product.

## Local run

```bash
npm ci
npm run dev
```

Then open `http://127.0.0.1:3000/dashboard`.

## Acceptance checks

```bash
npm run check:brain2
npm run check:extension
npm run typecheck
npm run lint
npm run build
```

`check:brain2` and `check:extension` require no network. `typecheck`, `lint`, and `build` require dependencies to be fully installed.
