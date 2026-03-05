# Saguaros Hub Beta Launch Runbook

Last updated: 2026-03-05

## Goal
Deploy Saguaros Hub to production (Vercel + Supabase) with Google sign-in restricted to `@saguaros.com` users.

## 1. Pre-Launch Safety

1. Rotate exposed secrets first.
- Regenerate Intuit client secret in Intuit Developer portal.
- Replace local and hosted env vars.

2. Disable development bypass in production.
- Set `DANGEROUSLY_SKIP_PERMISSIONS=false` in production env.
- Keep it `true` only in local dev.

3. Keep privileged keys server-side only.
- `SUPABASE_SERVICE_ROLE_KEY`
- `INTUIT_CLIENT_SECRET`
- `STRIPE_SECRET_KEY`
- `MAILCHIMP_API_KEY`
- `SQUARESPACE_API_KEY`

## 2. Supabase Auth Setup (Google)

In Supabase Dashboard:

1. Go to `Authentication -> URL Configuration`.
- Site URL: `https://<your-beta-domain>`
- Add redirect URL(s):
- `https://<your-beta-domain>`
- `https://<your-beta-domain>/dashboard`
- `http://localhost:3000` (dev)

2. Go to `Authentication -> Providers -> Google`.
- Enable Google provider.
- Add Google OAuth Client ID and Secret.

3. Domain restriction for Saguaros users.
- App already requests Google hosted domain hint (`hd=saguaros.com`) and signs out non-domain users.
- Also enforce on Google OAuth consent/app settings by limiting users to your Workspace where possible.

## 3. Google Cloud OAuth Setup

In Google Cloud Console (OAuth Client used by Supabase):

1. Authorized redirect URI must include Supabase callback:
- `https://<supabase-project-ref>.supabase.co/auth/v1/callback`

2. Authorized JavaScript origins:
- `https://<your-beta-domain>`
- `http://localhost:3000`

3. OAuth consent screen:
- Configure app name/logo/support email.
- Add allowed/test users if app is not yet verified.

## 4. Database Migrations (Required)

Run these migrations in Supabase SQL Editor in order:

1. `20260305_000001_phase1_foundation.sql`
2. `20260305_000002_operational_modules.sql`
3. `20260305_000003_integration_credentials.sql`
4. `20260305_000004_channel_members_self_service.sql`

After running, verify:
- `channels` table exists and default channels are seeded.
- `integration_credentials` exists.
- `channel_members` has self-manage RLS policy.

## 5. Vercel Deployment

1. Import repo to Vercel and set project root to `app/`.
2. Set environment variables in Vercel (Production + Preview):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `INTUIT_CLIENT_ID`
- `INTUIT_CLIENT_SECRET`
- `INTUIT_REDIRECT_URI=https://<your-beta-domain>/api/qbo/callback`
- `INTUIT_ENV=production` (or `sandbox` during beta)
- `DANGEROUSLY_SKIP_PERMISSIONS=false`

3. Trigger deploy from main branch.

## 6. Post-Deploy Verification

Smoke test these URLs:

1. `https://<your-beta-domain>/api/health`
- Expect `ok: true`.

2. `https://<your-beta-domain>/settings`
- Sign in with `@saguaros.com` account.
- Confirm QuickBooks card loads.

3. `https://<your-beta-domain>/messages`
- Send message in `General` and confirm immediate display.

4. Integration status endpoints:
- `/api/qbo/status`
- `/api/stripe/status`
- `/api/squarespace/status`

## 7. Beta User Onboarding

1. Create a short pilot list (5-10 users).
2. Require `@saguaros.com` Google sign-in only.
3. Confirm each tester can:
- Access dashboard and contacts.
- Send/read messages.
- See settings/integration status (admins).

## 8. Admin Role Assignment (Current Beta Pattern)

Current app role model is scaffolded. For beta:
- Keep most users as member/viewer.
- Assign a small admin group for Settings/Integrations verification.

If needed, maintain an admin email allowlist and map those users to `admin` in `user_roles`.

## 9. What You Need To Provide For Full Beta

1. Final beta domain (or Vercel URL) for OAuth + callbacks.
2. Google Workspace admin confirmation for `@saguaros.com` access policy.
3. Vercel project access to set env vars.
4. Rotated Intuit secret.
5. Optional next: Stripe and Squarespace credentials for live integration tests.
