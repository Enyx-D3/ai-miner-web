# Production Environment Checklist

No real secrets belong in source. Use separate staging and production values.

## Required for production

- `NEXT_PUBLIC_APP_URL`: canonical HTTPS app URL.
- `BRAIN2_DEPLOY_ENV=production`: enables fail-closed production validation.
- `AUTH_PROVIDER`, `AUTH_SESSION_SECRET`: production auth selection and session signing secret.
- One production auth backend: Supabase keys or Google OAuth client/secret, depending on selected provider.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`: paid plan billing.
- `INCONTEXT_MCP_BASE_URL`, `INCONTEXT_MCP_SIGNING_SECRET`: provider/MCP gateway binding.
- `BRAIN2_ICE_SERVERS_JSON`: server-authoritative STUN/TURN config for sync.

## Must be disabled in production

- `LOCAL_DEMO_MODE=1`
- `BILLING_DEMO_MODE=1`
- localhost-only MCP bridges
- test Stripe keys unless this is staging

Run:

```bash
BRAIN2_DEPLOY_ENV=production npm run validate:production-config
```
