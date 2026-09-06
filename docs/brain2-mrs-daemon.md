# Brain2 Local MRS Daemon

This project now supports a user-end local MRS daemon that listens on `127.0.0.1:4317` by default.

## Product flow

- End users should not start this manually.
- The intended product is the packaged AI Miner desktop app.
- The desktop app starts or reconnects to the local MRS daemon automatically.

## Internal testing flow

These commands are for local development and debugging only:

```bash
npm run mrs:daemon:start
```

Check health:

```bash
npm run mrs:daemon:check
```

Run in the foreground:

```bash
npm run mrs:daemon
```

## Current behavior

- The web app silently probes the local daemon on load.
- If the daemon is reachable, Brain2 uses it automatically for MRS work.
- If the daemon is not reachable, Brain2 falls back to browser MRS.
- The browser never needs a Next.js proxy route for MRS.

## Notes

- Cross-platform product intent is one installed app that manages the helper automatically.
- Manual daemon start is a developer/testing path, not the intended user workflow.
- A plain browser app cannot silently install a native helper by itself.
