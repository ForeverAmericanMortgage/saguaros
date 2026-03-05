# Saguaros Hub Architecture (Phase 1 Scaffold)

## Stack

- Frontend: Next.js App Router + Tailwind
- Data/Auth: Supabase (Postgres, Auth, Realtime, Storage)
- Hosting: Vercel

## Route Map

- `/` home/entry
- `/dashboard`
- `/contacts`
- `/events`
- `/fundraising`
- `/messages`
- `/people`
- `/campaigns`
- `/documents`
- `/settings`
- `/privacy`
- `/terms`
- `/api/health`

## Permissions

- Roles: `admin`, `board`, `member`, `viewer`
- Route guards: `src/middleware.ts`
- Role resolver: `src/lib/permissions.ts`
- Dev bypass: `DANGEROUSLY_SKIP_PERMISSIONS`
- Safety rule: bypass must be false in production.

## Next Build Targets

1. Supabase schema + migrations for contacts/events/donations/members/channels/messages/documents/activity_log.
2. Google OAuth with `@saguaros.com` domain restrictions.
3. Dashboard cards and contact/event CRUD with role-aware writes.
4. Settings integration panel and transition checklist.
