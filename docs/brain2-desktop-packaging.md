# Brain2 Desktop Packaging

Date: 2026-08-31

## Goal

Ship one installed product that:

1. opens as a desktop app
2. starts the local Brain2 MRS companion automatically
3. keeps MRS off the visible page path
4. hides all localhost and command-line details from the user

## What is now in the repo

- standalone Next output is enabled in `next.config.ts`
- desktop host starts packaged web output through `desktop/electron/appServer.cjs`
- installer metadata lives in `desktop/electron/electron-builder.yml`
- packaging prep script lives in `scripts/prepare-desktop-package.mjs`
- the target product flow is one installed app, not a separate desktop install and separate browser install

## Packaging flow

1. `npm run desktop:build`
2. Next builds `.next/standalone`
3. desktop assets are prepared for Electron packaging
4. `npm run desktop:dist`
5. Electron Builder produces installable desktop artifacts

## Product runtime flow

1. User launches AI Miner.
2. Electron starts the packaged Next standalone server.
3. Electron starts or reconnects to the local Brain2 MRS companion.
4. UI runs deterministic-first.
5. MRS requests go to the local helper automatically.
6. If helper startup fails, UI shows reduced-mode messaging.

## Remaining product work

- add app icons and branding assets under `desktop/resources`
- verify packaged model cache path behavior on Windows, macOS, and Linux
- decide whether companion/model cache should live under user-data paths
- run full end-to-end packaging tests for each target OS artifact
