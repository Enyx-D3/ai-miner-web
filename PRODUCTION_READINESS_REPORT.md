# Production Readiness Report

Date: 2026-10-06

## 1. Executive Summary

brain2:inContext is not production-ready for public paid launch yet. Core local memory, import, Current Truth, project reconstruction, Search/Recall, B2JOB/B2RESULT verification, extension capture, MCP read/compile gateway, and sync software gates are implemented or partially implemented. Production auth, billing, per-user tenancy, entitlements, provider publication, legal review, observability vendor setup, and physical sync certification remain blockers.

Closed beta is also `NO_GO` for a public self-serve beta, but a controlled engineering beta can proceed only if users understand auth/billing are not final and physical sync remains a manual gate.

## 2. Branches and Commit SHAs

- Web: `production-readiness-v1` from `26e21f8`
- MCP: `production-readiness-v1` from `7b468de`
- Extension: `production-readiness-v1` from `8125fd0`
- Android: `production-readiness-v1` from `1bf2a4c`

## 3. Architecture Changes

- Added fail-closed production config validators for Web and MCP.
- Added public trust/legal route drafts: `/privacy`, `/terms`, `/security`, `/support`.
- Added `robots.txt`, `sitemap.xml`, and environment-driven metadata.
- Expanded Web and MCP env examples.
- Rebranded visible extension and Android strings to `brain2:inContext`.

## 4. Files Changed

Primary files changed include `.env.example`, `package.json`, `scripts/validate-production-config.mjs`, public trust route files, `Brain2TrustPage.tsx`, `src/app/layout.tsx`, `robots.ts`, `sitemap.ts`, extension manifest/panel/tests, MCP env/package/validator, and Android visible branding/lint cleanup files.

## 5. Auth Implementation

Status: `PARTIAL`. Mission 01 adds Supabase Google OAuth, server-side session validation, HttpOnly access/refresh cookies, logout cookie clearing, CSRF same-origin checks for cookie-authenticated mutations, `/api/v1/auth/session`, `/api/v1/users/me`, `/auth/callback`, and default-deny protected dashboard routes. Hardcoded demo email/password auth and client-readable token persistence are retired.

Blocked for production: real Supabase project credentials, Google OAuth provider configuration, and account deletion/export flows.

## 6. Billing Implementation

Status: `BLOCKED`. Pricing currently redirects to the landing page. Stripe env placeholders and validation are prepared, but checkout, webhook verification, subscription mapping, portal, idempotency, and entitlements are not implemented.

## 7. Entitlement Model

Status: `PARTIAL`. Mission 01 adds `brain2_entitlements` with RLS and default `NONE`. Paid access is limited to unexpired `ACTIVE` rows only; `TRIALING`, expired, canceled, and missing rows are denied. Stripe creation and webhook updates are still Mission 02.

## 8. MCP Production Gateway

Status: `PARTIAL`. MCP has a live browser bridge, read/compile/search/context tools, bounded mission execution, bearer mode, and the Web bridge proxy now requires a paid authenticated account. Production config validation was added. Missing: direct MCP user binding, revocation, scoped provider tokens, server audit records, rate limits, and public `incontext_*` tool aliases.

## 9. AutoContext Status

Status: `PARTIAL`. Bounded context packaging exists. Provider-native automatic context injection is not implemented and was not advertised as complete.

## 10. Result Return Status

Status: `PARTIAL`. Web and Android have B2RESULT/B2VERIFY/B2REPAIR-style verification paths. Full provider-native Result Return and memory proposal flow are not production complete.

## 11. Provider Integration Status

- ChatGPT: extension capture implemented; MCP publication pending.
- Claude: extension capture implemented; MCP publication pending.
- Gemini: extension capture implemented; MCP publication pending.

## 12. Sync Certification

Software sync gates passed on Web and Android. Mission 01 now gates Web sync endpoints behind paid account auth before existing device-token checks; durable account-linked device storage remains Mission 03. Physical Web to Android certification remains pending: pair, bootstrap, mutate both ways, disconnect/reconnect, restart, replay/duplicate/stale/conflict/revoked-device tests.

## 13. Import Stress Results

Existing tests cover multi-provider Android normalization and web deterministic import gates. Full stress matrix for huge archives, corrupted ZIPs, interrupted imports, Unicode/Bangla, attachments metadata, and branch conversations remains incomplete.

## 14. Current Truth Benchmark

Existing deterministic tests cover supersession/conflict behavior. A launch benchmark with >95% verified Current Truth accuracy has not been created in this pass.

## 15. Security Results

Passed existing Web G12 security/sync-related checks and extension vault tests. Not complete: production auth, billing webhook forgery tests, per-user IDOR tests, stored XSS/malicious Markdown/ZIP bomb testing, MCP privilege escalation tests.

## 16. Privacy/Legal Status

Draft pages exist. Legal review required before public paid launch.

## 17. SEO Status

Basic SEO implemented: metadata base, Open Graph/Twitter metadata, `robots.txt`, and `sitemap.xml`. Production domain must set `NEXT_PUBLIC_APP_URL`.

## 18. Observability Status

Env placeholders prepared for Sentry/PostHog. No vendor integration was added; missing keys safely mean no external telemetry.

## 19. E2E Results

No browser E2E suite was added in this pass. Build/routes verify the pages render statically.

## 20. Build/Test Results

- Web: `npm run typecheck` PASS
- Web: `npm run build` PASS
- Web: `npm run validate:production-config` PASS outside production, fail-closed validator added
- Web gates: `check:global-context`, `check:global-context-v2`, `test:gc-cp001`, `check:v8-sync`, `test:v8-sync`, `test:g12-sync-adversarial`, `test:g12-recovery`, `check:v9` PASS
- MCP: `npm run verify`, `check:global-context`, `check:global-context-v2`, `check:release-hygiene`, `validate:production-config` PASS
- Extension: static, provider, vault, release hygiene, and web parity tests PASS
- Android: `flutter test` PASS, `flutter analyze` PASS, `flutter build apk --debug` PASS

## 21. Performance Findings

No new performance benchmark was run. Existing build succeeded with 52 generated static routes.

## 22. Accessibility Findings

No full accessibility audit was run. New trust pages use semantic headings and links but require keyboard/contrast audit before public launch.

## 23. External Credential Blockers

NEEDS USER SECRET:

- `AUTH_SESSION_SECRET`: generate a production random secret; place in Web production env.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google Cloud OAuth console; separate staging/production values.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: Supabase project settings if Supabase is selected; service role server-only.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`: Stripe Dashboard; separate test/live values.
- `INCONTEXT_MCP_SIGNING_SECRET`, `MCP_SHARED_SECRET`, `BRAIN2_BRIDGE_TOKEN`: generated secrets; staging/production separate.
- `BRAIN2_ICE_SERVERS_JSON`: STUN/TURN provider; production TURN required for reliable cross-NAT sync.
- `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `NEXT_PUBLIC_POSTHOG_KEY`: optional observability vendors.
- SMTP credentials: required if password reset/email auth remains supported.

## 24. External Provider-Review Blockers

ChatGPT/Claude/Gemini provider publication is pending tool schema finalization, privacy links, production auth, and external review.

## 25. Physical Test Blockers

Physical Android/Web sync certification remains pending on real hardware/network.

## 26. Known Remaining Risks

- Account tenancy foundation depends on applying the Supabase migration and configuring real Supabase Auth.
- No Stripe checkout/webhook-driven subscription creation yet.
- MCP can be deployed safely only with bearer/bridge secrets configured.
- Full import stress and Current Truth benchmarks are not launch-complete.
- Legal copy is draft only.

## 27. Closed-Beta Launch Checklist

Use `BETA_ACCEPTANCE_CHECKLIST.md`. Minimum before closed beta: production auth, export/delete path, support channel, and physical sync gate decision.

## 28. Public-Production Launch Checklist

Use `PRODUCTION_SETUP.md`, `PRODUCTION_ENV_CHECKLIST.md`, `SECURITY_CHECKLIST.md`, and `PROVIDER_PUBLISHING_CHECKLIST.md`. Public paid launch is blocked until auth, billing, entitlements, legal, and physical sync certification are complete.

## Final Status

CORE_PRODUCT: NOT_READY

AUTH: PARTIAL

BILLING: BLOCKED

SECURITY: NOT_READY

SYNC: SOFTWARE_VERIFIED_PHYSICAL_PENDING

MCP_GATEWAY: NOT_READY

AUTOCONTEXT: PARTIAL

RESULT_RETURN: PARTIAL

CHATGPT: NOT_READY

CLAUDE: NOT_READY

GEMINI: NOT_READY

CLOSED_BETA: NO_GO

PUBLIC_PRODUCTION: NO_GO

## USER_ACTION_REQUIRED

- Provide production/staging auth credentials and choose auth provider.
- Configure Stripe account, products, prices, portal, and webhook endpoint.
- Provide DNS/domain ownership and production HTTPS domain.
- Provide MCP/provider gateway deployment URL and secrets.
- Provide STUN/TURN credentials.
- Complete provider app submission/review for ChatGPT, Claude, and Gemini.
- Run physical Web to Android sync certification.
- Obtain legal professional review for privacy, terms, security, and deletion wording.
