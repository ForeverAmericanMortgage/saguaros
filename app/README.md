# The Saguaros Hub

Internal operations platform for The Saguaros. Built with Next.js + Supabase.

## Scope (PRD v2.1)

Phase 1 scaffolds the foundational app shell and module routes:

- Dashboard
- Contacts
- Events
- Fundraising
- Messages
- People
- Campaigns
- Documents
- Settings

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template and fill values:

```bash
cp .env.example .env.local
```

Required values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Optional development bypass:

- `DANGEROUSLY_SKIP_PERMISSIONS=true` (must be `false` in production)

3. Run dev server:

```bash
npm run dev
```

## Permission model scaffold

- Roles: `admin`, `board`, `member`, `viewer`
- Route guards live in `src/middleware.ts`
- Server-side role helpers live in `src/lib/permissions.ts`
- Env safety checks live in `src/lib/env.ts`

## Deployment

- Frontend: Vercel
- Backend/auth/data: Supabase

For account/API credential checklist, see `docs/runbooks/account-logins.md`.
