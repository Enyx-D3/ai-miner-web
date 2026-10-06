# Staging Setup

Staging should use separate credentials from production.

1. Deploy the web app with `NEXT_PUBLIC_APP_URL` set to the staging HTTPS URL.
2. Set `BRAIN2_DEPLOY_ENV=staging`.
3. Use Stripe test mode keys and test price IDs.
4. Use a separate auth/OAuth project from production.
5. Use separate MCP bearer secrets and bridge token.
6. Use staging TURN/STUN credentials.
7. Run the full web gates, MCP verify, extension tests, and Android software tests before inviting beta users.

Staging may use test billing and test OAuth, but it must not silently use local demo auth on a public URL.
