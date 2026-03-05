# Saguaros Hub Account & API Login Checklist

## Phase 1 (Required Now)

| System | Owner Role | Required Credentials | Where to Store |
|---|---|---|---|
| GitHub | Org Owner + Repo Admin | Repo admin access, branch protection access, optional PAT for automation | PAT in `.env.local` only if needed |
| Vercel | Team Owner/Admin | Project access, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Local CLI token + Vercel project settings |
| Supabase | Org Owner/Project Owner | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Public vars in Vercel + local env, service role in server env only |
| Google OAuth | Google Cloud + Workspace Admin | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, redirect URIs | Vercel server env + local env |

## Phase 2 (Communication & Integrations)

| System | Owner Role | Required Credentials | Where to Store |
|---|---|---|---|
| Stripe | Stripe Owner/Admin | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Vercel env + Supabase secrets for edge functions |
| Mailchimp | Mailchimp Owner/Admin | `MAILCHIMP_API_KEY`, server prefix, audience/list ID | Vercel env + Supabase secrets |
| QuickBooks | Intuit app owner + QB admin | `INTUIT_CLIENT_ID`, `INTUIT_CLIENT_SECRET`, realm ID, redirect URI | Vercel env + Supabase secrets |

## Phase 3 (Document Metadata Automation)

| System | Owner Role | Required Credentials | Where to Store |
|---|---|---|---|
| Google Drive API | Workspace Admin | Service account key, shared drive IDs, folder IDs | Supabase secrets preferred; avoid checked-in JSON keys |

## Rotation Guidance

- Sensitive secrets: rotate every 90 days.
- OAuth client secrets: rotate every 180 days or immediately after exposure.
- Revoke access immediately when board roles change.
- Never commit secrets to git.
- `DANGEROUSLY_SKIP_PERMISSIONS` must remain `false` in production.
