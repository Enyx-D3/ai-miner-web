# Mission 02 Stripe Billing

Status: implemented in code, blocked on live Stripe/Supabase credentials and webhook configuration.

## Netlify Environment

Required billing variables:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_YEARLY`
- `STRIPE_PRICE_FOUNDER_LIFETIME`

Mission 01 auth variables are still required: `AUTH_PROVIDER=supabase`, `AUTH_SESSION_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`.

## Stripe Setup

Create three Stripe Prices and place their IDs in the matching environment variables:

- Pro Monthly: recurring monthly
- Pro Yearly: recurring yearly
- Founder Lifetime: one-time payment

Configure the webhook endpoint:

`https://<netlify-domain>/api/v1/billing/webhook`

Subscribe at minimum to checkout session, subscription, charge refund, and dispute events. Store the signing secret in `STRIPE_WEBHOOK_SECRET`.

Webhook handling verifies Stripe signatures against the raw body with a 5-minute timestamp tolerance and supports multiple `v1` signatures for key rotation. Signed webhook events do not grant access by themselves; the server retrieves the authoritative Checkout Session or Subscription from Stripe before writing entitlements.

## Supabase Migration

Apply:

- `supabase/migrations/20261006000000_auth_foundation.sql`
- `supabase/migrations/20261006010000_billing_entitlements.sql`

Ordinary users can read their own customer linkage but cannot self-issue entitlements. Server writes use the Supabase service role.

## Verification

Staging checklist:

1. Sign in with Google.
2. Start checkout for each plan in Stripe test mode.
3. Verify success page does not unlock access before webhook processing.
4. Confirm `/api/v1/billing/status` reports the active entitlement after webhook delivery.
5. Open `/dashboard`.
6. Cancel subscription and verify access lasts only through the paid period.
7. Refund lifetime payment and verify entitlement is revoked.

Security notes:

- Founder lifetime access requires a verified Checkout Session with the configured lifetime Price ID.
- Subscription access requires an approved monthly/yearly Price ID and a non-expired paid period.
- Refunds revoke only the matching lifetime payment intent; unrelated refunds are audited and do not revoke lifetime access.
- Failed webhook transitions are marked failed and remain retryable.

Rollback: redeploy the previous build and disable the Stripe webhook endpoint. Preserve account export/delete/support access.
