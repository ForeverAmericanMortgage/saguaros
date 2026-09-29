# Olympiad isolated pilot backend

## Deployment boundary

Apply this migration only to a NEW isolated Olympiad Supabase project. Do not apply it to the internal Saguaros Hub (`qbqnbwknywkfqnblagsa`). That project's authenticated-read policies expose internal club records to ordinary authenticated users. A new schema there does not isolate public Auth users.

Applied to isolated Olympiad project `nwonwhyyvqgqxigrskqc` on 2026-09-28. Hosted security advisor reports no findings; Auth and end-to-end pilot checks remain pending. Embedded PostgreSQL simulation passed 18 assertions (see validation record below). It seeds 2027 with `registration_open=false`; opening registration is a separate trusted operational action after security and delivery checks. No signup, invitations, test emails, or fundraising records have been created.

## Tables and public API contract

- `event_editions`: `id, year, name, registration_open, minimum_participants, created_at`. 2027 minimum6; all columns public event metadata.
- `industries`: `id, slug, name, sort_order`; public lookup.
- `businesses`: `id, owner_user_id, name, created_at`; private ownership record, one created per initial registration. No global company matching/merging is implied.
- `teams`: `id,event_id,business_id,captain_user_id,team_name,company_name,slug,industry_id,description,is_public,status,created_at,updated_at,roster_version`; owner/organizer SELECT only. Multiple teams per captain allowed; RPC caps10 per captain/edition under a per-captain event advisory lock. Normalized team name unique per edition. Status `registered` represents saved registration, not payment or organizer vetting. Directory requires opt-in, not moderation approval.
- `team_captain_details`: `team_id` PK/FK, `name,phone`; private. Verified captain email comes from Auth, never public directory.
- `roster_participants`: `id,team_id,name,email,phone,shirt_size,shirt_fit,position,created_at`; private. Blank fields allowed; position0..49 with unique(team_id,position) enforces50 maximum even outside RPC.
- `team_referrals`: `team_id,referring_team_id,created_at`; immutable after insertion. Team invitation origin, not transaction credit.
- `organizer_memberships`: `user_id,created_at`; manually provisioned trusted roles, no public insert/update grants. Organizer can read private pilot records and edit team public details/rosters; captain ownership and event rules immutable from clients.
- `liaison_assignments`: event/industry primary key, organizer_user_id FK, created_at; trusted organizers only read/write. Staff contacts never published. Organizer membership itself remains manually provisioned.
- `team_directory`: `id,event_id,team_name,company_name,slug,industry_id,description,created_at`; public physical projection containing no captain/member identity/contact columns. Read with explicit column list; industry IDs resolve against lookup. Private trigger mirrors registered opted-in teams. No writable public directory grants.

### register_team

```
register_team(
 p_team_name text,
 p_company_name text,
 p_industry_slug text,
 p_captain_name text,
 p_phone text,
 p_is_public boolean default false,
 p_referring_team_slug text default null,
 p_description text default ''
) => [{ team_id: uuid, team_slug: text }]
```

Authenticated user client only. Atomic inserts business, team, private captain details, optional referring team. Uses2027 database gate, validates industry, generates slug, defaults ownership to auth.uid. Caller-supplied user IDs/slug/event IDs are not RPC parameters. Underlying table INSERT policies also enforce open-event and business ownership. Description is limited500chars. Team name120, company160, captain name120, captain phone7..40. Phone validates length only; API should normalize/validate plausible phone input. Referrer must currently appear in public directory. Unknown referrer rejects registration rather than silently losing attribution; UI should allow user to clear stale invitation. Duplicate case-insensitive trimmed team name in the same edition produces unique violation; route should request a different name. Direct table INSERT does not impose the RPC10-team cap; treat it as workflow friction, not a security rate limit. Use Auth/API rate controls for abuse prevention.

### save_roster

```
save_roster(p_team_id uuid,p_roster jsonb,p_expected_version integer) => integer count
```

Array objects: `{id?: uuid,name?:string,email?:string,phone?:string,shirt_size?:string,shirt_fit?:string}`. Blank/missing fields allowed. Shirt sizes: empty,XS,S,M,L,XL,2XL,3XL. Fit: empty,male,female (case normalized). Max50 entries. Empty array clears roster. Serializes same-team saves with transaction advisory lock; deletes/reinserts within same transaction, so any invalid row rolls the whole operation back. Preserve IDs in client payload where possible. Participant timestamps currently reset on replacement; no participant audit history is represented. Supply teams.roster_version from the roster load. The RPC locks the team, rejects a mismatched version, and increments the version only after successful replacement. Reload on conflict; do not silently retry stale data. Read team again after save to get its current version. Duplicate nonblank normalized email per team is disallowed by a partial unique index, including direct table writes. Direct roster writes and captain version edits are permitted by RLS/grants because the RPC is SECURITY INVOKER; optimistic concurrency is guaranteed for callers using this RPC, not malicious clients editing their own rows.

Captain is not silently inserted as a roster participant. UI should offer adding captain and count captain toward minimum6 only once their participant record exists. Roster minimum is a readiness/completeness indicator, not a save constraint.

### Queries / edits

- Public directory: SELECT explicit fields above from `team_directory`; no team owner IDs available.
- Mine: authenticated `teams` filtered `.eq('captain_user_id', user.id)`; RLS also enforces owner/organizer. Join `team_captain_details(name,phone)` and `roster_participants(...)` via `team_id` FKs, or fetch separately.
- Update own team: `team_name,company_name,industry_id,description,is_public` are granted; no owner/id/event/business/slug/status mutation grants.
- Update captain: `name,phone` only, captain-owned record.
- `updated_at` refreshes via a trigger. Use `roster_version`, not timestamp, for roster concurrency. Captains may technically change their own roster_version directly; it conveys no authorization and the application never exposes this edit.

## Security/configuration requirements

Both RPCs SECURITY INVOKER with fixed empty search_path, authenticated-only EXECUTE. A private revoked-execute SECURITY DEFINER trigger is deliberately used solely for directory synchronization. It validates auth.uid against team ownership/trusted organizer membership; all identifiers fully qualified. Service-role/manual team writes without user context are intentionally rejected by this trigger; maintenance requires controlled migration/identity context, never disabling it casually.

Use user-authenticated Supabase client, no service role in public app routes. Verify Auth via getUser/getClaims, never cookie role strings. Exact production callback allowlist, custom SMTP/sender authentication, Auth rate controls and CAPTCHA needed. Configure verified captain email through Auth. Public registration event gate defaults closed until authorized pilot. No marketing/SMS consent is inferred from captain-provided roster details, and no outreach is triggered.

Before enabling: execute schema on isolated staging/project; verify anon has no private data, captainA cannot read/write captainB, forged ownership insert denied, closed registration RPC/table INSERT denied, publication opt-out removes directory row, invalid roster replacement rolls back, and missing-auth requests fail. Inspect Supabase security advisors and known dependency versions. The embedded simulation below covers the database checks; hosted Supabase advisors and integration checks remain pending.

## Deferred models

Participant invite redemption/own-record editing, separately recorded channel consent, co-captains/ownership transfers, participant audit history, and friendly business invite links with club-member origin need later tables/flows. Current referral only tracks publicly visible inviting team.

No fundraising tables or active totals integration. Existing internal source uses `transaction_attributions.referring_member_raw` and `referring_member_contact_id`; preserve them unchanged. Future server-owned bridge maps this project's stable team UUID + event year to internal team/reference alias records, preserving raw source value and club-member referral independently. Never treat company/name substring matches as confirmed credit, and never reuse public sharing codes as financial authorization.


## Validation record — 2026-09-28

Applied the complete migration without edits to an ephemeral PGlite0.5.8 database. Installed the exact package only under `/tmp/olympiad-db-audit`; no app package/lockfile changes. Reusable script: `tests/pilot-schema-audit.mjs`. Run with `PGLITE_MODULE=/tmp/olympiad-db-audit/node_modules/@electric-sql/pglite/dist/index.js node tests/pilot-schema-audit.mjs`.

18 assertions passed: closed-event registration rejects; owner registers; anon reads only public directory; captainB cannot read/updateA; owner roster save increments revision; B cannot read/saveA roster; stale and null revisions reject; same-event invitation attribution succeeds; cross-event referral rejected through RPC and direct INSERT; duplicate-email replacement rolls back preserving old row/version;51 records reject; captain reassignment rejects; public opt-out removes directory; normalized duplicate team name rejects; self organizer assignment rejects; organizer-only liaison management; multiple captain teams allowed with RPC10-team cap.

Simulation limits: minimal auth.users table and auth.uid() backed by request.jwt.claim.sub, with synthetic authenticated/anon roles. JWT issuance/signature/email verification, GoTrue, PostgREST role/schema exposure, hosted default grants, SMTP, CAPTCHA, HTTP route validation, browser/session cookies, migrations applied on hosted infrastructure, advisor findings, and genuine parallel-session lock scheduling are not tested. No actual users, emails, live project records, or production configuration changed. The test uses sequential transactions and verifies RLS under SET LOCAL ROLE; it does not represent a complete hosted integration test.
