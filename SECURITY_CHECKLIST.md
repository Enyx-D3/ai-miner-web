# Security Checklist

## Implemented or verified in this pass

- Production config validators for web and MCP.
- Public trust pages: privacy, terms, security, support.
- SEO routes: `robots.txt`, `sitemap.xml`, canonical metadata via `NEXT_PUBLIC_APP_URL`.
- Extension visible branding cleanup while preserving bridge protocol names.
- Android visible branding cleanup while preserving package/protocol compatibility.
- Web security headers already present in `next.config.ts`.
- Sync gates passed: bounded body parsing, hash-checked mutation/bootstrap, ACK/replay checks.

## Not production-complete

- Real production auth, revoked sessions, account deletion, per-user cloud tenancy.
- Stripe checkout/webhooks/subscription records/entitlements.
- Server-authoritative per-user MCP scopes and rate limits.
- Physical Web to Android sync certification on real network/hardware.
- Legal review of privacy/terms/security copy.
- Formal stored-XSS/malicious-import/ZIP-bomb penetration pass.
