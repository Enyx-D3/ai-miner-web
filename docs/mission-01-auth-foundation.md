# Mission 01 Auth Foundation

Status: implemented in code, blocked on real Supabase/Google production credentials.

## Runtime Contract

- Users sign in through `/api/v1/auth/google`.
- Supabase returns to `/auth/callback`.
- The server exchanges the PKCE code, validates the Supabase user, upserts `brain2_user_profiles`, then stores Supabase access/refresh tokens in HttpOnly cookies.
- Protected web routes use `requirePaidEntitlement`/`proxy.ts`; a valid user with no active entitlement is sent to `/subscribe`.
- Protected API routes use `requirePaidApi`; Brain2 sync and MCP bridge endpoints now require a valid paid web account in addition to their existing device/bridge credentials.
- Mission 01 does not create Stripe checkout. `brain2_entitlements.status = NONE` is the default, and only `ACTIVE` is accepted as paid access.
- Cookie-authenticated mutations enforce same-origin `Origin`/`Referer` checks.

## Required Supabase Setup

1. Run `supabase/migrations/20261006000000_auth_foundation.sql`.
2. Enable Google in Supabase Auth providers.
3. Add callback URLs:
   - `http://localhost:3000/auth/callback`
   - `https://<staging-domain>/auth/callback`
   - `https://<production-domain>/auth/callback`
4. Set server env vars from `.env.example`; keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

## Remaining Migration Work

The existing local/Netlify Brain2 sync store still keys devices by memory space and device credential. Mission 01 places a paid-account gate in front of those endpoints so device-token-only access fails closed. Mission 03 should migrate persisted device records to include Supabase `user_id` for durable account-linked replica management.

## Required Google Setup

Create OAuth credentials in Google Cloud and add the Supabase callback URL from the Supabase Google provider panel. Store `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in deployment env for validation and ops traceability.
