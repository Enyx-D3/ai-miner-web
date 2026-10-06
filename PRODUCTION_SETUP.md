# Production Setup

Production is not ready until external credentials and manual gates are complete.

1. Configure DNS and HTTPS for the canonical domain.
2. Set all variables in `PRODUCTION_ENV_CHECKLIST.md`.
3. Run `BRAIN2_DEPLOY_ENV=production npm run validate:production-config`.
4. Configure Supabase Google Auth, run `supabase/migrations/20261006000000_auth_foundation.sql`, and add `/auth/callback` URLs for local, staging, and production.
5. Configure Stripe live products, prices, checkout, portal, verified webhooks, and apply `supabase/migrations/20261006010000_billing_entitlements.sql`.
6. Configure MCP gateway with bearer auth and bridge origin allowlist.
7. Configure STUN/TURN and run Web to Android physical sync certification.
8. Publish privacy, terms, security, and support pages after legal review.
9. Tag the release commit and deploy from that tag.

Rollback: redeploy the last known-good tagged build and preserve user export/delete access.
