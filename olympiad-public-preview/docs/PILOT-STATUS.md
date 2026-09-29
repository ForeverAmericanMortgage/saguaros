# Olympiad registration pilot status

## Implemented in this increment
- Independent Supabase client, HttpOnly SSR session cookies, verified Auth getUser on private routes, Origin checks on writes, bounded JSON bodies, no-store responses, canonical callback with PKCE.
- Runtime guard rejects the internal Saguaros Hub project URL. No internal service credentials copied.
- Database migration: event editions, industry categories, business ownership, teams, private captain details, private partial rosters, public opt-in directory, team invitation attribution, organizer identities and liaison assignments.
- Atomic team registration and roster save with optimistic roster versions. Multiple company teams supported; immutable captain ownership from ordinary client updates.
- Public directory/profile, newcomer invitation page, native share/copy, captain access/registration, editable private roster and directory visibility.
- Fictional standings replaced in public navigation by real-only participating businesses. Fundraising collection and credit synchronization remain disabled.

## Verified on 2026-09-28
- Public Next build/typecheck succeeds.
- Upgraded public app Next/eslint-config-next to16.3.6; npm audit reports zero known vulnerabilities after update. Supabase SDK/SSR pinned2.117.2/0.12.7.
- Embedded Postgres (PGlite0.5.8) migration/RLS audit:18 assertions passed; see supabase/README.md for exact tests and simulation limits.
- Local route checks: disabled status/directory/mine responses, private no-store headers, untrusted Origin403, disabled registration503, fixed canonical callback destination.
- Browser: directory empty state, closed captain access, newcomer invitation page, mobile menu, focus destination and browser Back observed. Width320px reported content width305px (no horizontal page overflow);390px directory visually inspected. Viewport reset afterward.

## Pending before opening real registration
- Isolated project created after chairman confirmation: Olympiad (`nwonwhyyvqgqxigrskqc`), Saguaros organization, us-west-1, quoted $0/month. Migration applied successfully; all 10 public tables have RLS, anonymous roster SELECT denied, anonymous directory SELECT granted, no teams, 2027 registration closed. Hosted security advisor returned no findings.
- Apply migration and verify hosted RLS, PostgREST grants, Auth settings, real cross-captain isolation, atomic saves and callbacks.
- Configure custom SMTP/auth email delivery, exact production redirect URL, rate controls. Verify sign-in delivery with authorized test recipient. No email has been sent by this implementation work.
- Production Vercel variables now point exclusively to the new project; pilot flag false. Deployment dpl_9GGdvvMAmizWGadp2nhPoJAHWa2Z reached READY and aliased scottsdaleolympiad.com. Auth Site URL saved as https://scottsdaleolympiad.com and exact redirect https://scottsdaleolympiad.com/olympiad/auth/callback saved in dashboard; success notification observed. Email delivery remains pending.
- Keep OLYMPIAD_REGISTRATION_ENABLED=false until hosted integration proven. Open new teams via event_editions.registration_open; closing new registrations must still allow returning captains.
- Provision chairman/liaisons through trusted organizer records and verify permissions.
- Real authenticated browser/mobile walkthrough of register, return, partial roster, multiple teams, save/reload, opt-in/out, share/referral and error/conflict handling remains pending database/email setup.

## Existing attribution research
The internal Squarespace parser already captures referring_member_raw and olympiad_team_raw. transaction_attributions retains the club member identity, and no credited team FK exists. Preserve both source values. Future bridge uses public project's stable team UUID plus event/year; it must resolve aliases explicitly, retain ambiguous/unmatched review and reconcile refund/duplicate payment identities. Public invitation origin is recruitment attribution, not authorization to grant financial credit. No existing ingestion, member notifications, historical backfills or fundraising rows changed.

## Deferred beyond this registration phase
Live fundraising ledger, transaction credit/leaderboard activation, checkout, automated Mailchimp/SMS, participant self-service invitation redemption and separately verified marketing consent. Roster saves do not imply consent and send no participant messages.

## Latest build and pilot preparation
- User selected Resend and Mailchimp campaigns first, SMS next; authorized one sign-in test to scaldwell@saguaros.com after connection. No email sent. Resend signup opened for user action.
- Added real organizer-only readiness API and /olympiad/organizer page with team counts, roster completion and follow-up filtering; no campaign sending. Build/typecheck passed; authenticated organizer walkthrough pending.
- Live anonymous PostgREST checks: team_directory returns 200 with zero rows; roster_participants and team_captain_details return 401 permission denied. This does not prove authenticated isolation.
- Hosted transaction-based fixture audit rejected with read-only SQLSTATE 25006 before inserting records. No synthetic Auth users created.
- Production pilot outline, reusable execution prompt, communication design, and pure private fixture generator prepared in docs/ and tests/.

- Pilot cohort migration 20260929021348 applied to isolated hosted project. Security advisor reports no findings. Public website sign-in allowlist contains only scaldwell@saguaros.com; global enabled remains false. Only allowlisted email can create an Auth identity through website before event opens; new team/business INSERT additionally requires trusted pilot_captains UID. No UID enrolled yet. Direct provider signup remains provider-controlled.

## Resend setup — 2026-09-29
- User approved existing free foreveramericanmortgage Resend workspace. Added scottsdaleolympiad.com domain (5147ecd7-34c7-484c-9dcc-bb0e65edb637), sending enabled, receiving disabled.
- Created exact Resend DKIM TXT, send MX priority10, and send SPF TXT in Vercel; live DNS lookup returns expected values. Resend verification still pending at last observation.
- No API key created, no SMTP credential configured, no test email sent.

## First production email — 2026-09-29
- User entered/saved SMTP secret directly; Supabase displays stored password and smtp.resend.com:465.
- Enabled website pilot access with only scaldwell@saguaros.com allowlisted. Hosted event registration_open remains false; pilot_captains count0.
- Deployment dpl_AoqPtDaE7TypjyaHdhzDhuUE8a4j ready on custom domain. Website sign-in request succeeded.
- Resend email 01a0edd3-46db-71ed-be71-965309d92693 to authorized chairman inbox shows Delivered, subject Confirm your email address. User receipt/callback/authenticated session still pending. No campaign messages sent.

## Email code recovery — 2026-09-29

Captain access now requests an email code and verifies it through the server's `verify-code` action using Supabase `verifyOtp` with `type: email`. The server keeps Origin, enabled and exact email-allowlist checks; accepts only 6–10 numeric digits; requires a confirmed user and session; returns no session tokens. Existing HttpOnly SSR cookie handling persists the session. Request/retry clears stale `auth_error` from the address. Resend is explicit; no automatic sends. A successful verification refreshes the private captain view.

Provider prerequisite: the appropriate Supabase email templates must contain `{{ .Token }}`. Successful build does not establish delivered code, successful session, cross-device behavior or roster access; those still require the authorized recipient's live walkthrough. Link callback remains available for earlier links but new UI does not rely on it.

## September 29 — guided onboarding and returning magic links

- Chairman reported OTP sign-in success; independently verified confirmed Auth identity and non-null last_sign_in_at. Exact verified identity enrolled in pilot_captains and organizer_memberships. One approved pilot identity; general registration remains cohort-restricted.
- Replaced code-entry UI with Start a team / Returning captain and emailed links. Scanner-safe confirm route holds token hash in fragment, clears URL immediately, consumes only on explicit Continue POST. Both hosted signup and magic-link templates saved with this route.
- Guided authenticated team creation includes business/team/industry/captain name/phone; email from verified identity. Optional short-lived, email-bound same-browser draft. Partial roster and captain prefill; event explanation and next steps.
- Hosted tracking migration and goal timestamp migration applied. Stable roster identity; organizer stretch goals; private ledger and public aggregate foundation. Fundraising_active remains false; no purchases, transactions, or campaigns activated.
- All four local regression suites PASS. Hosted rollback smoke PASS for two-captain role isolation, partial roster/stable IDs/version conflicts, organizer goals/ledger, net credited totals, inactive/private/opt-out protection. Fixtures in rollback test removed by transaction rollback. These are hosted RLS-role tests, not two real emailed captain sessions.
- Real production browser created private synthetic team PRIVATE PILOT SMOKE 20260929 under chairman account, id ec38efae-1ffa-4fd9-b162-7a255ee7f974; business22506100-5e9f-4fc0-974a-caf8cbb86b23. Saved captain and partial teammate, reloaded and observed persistence. No public directory row. Organizer saved $5,000 target and captain hub reflected it.
- Save-time editing race discovered during browser smoke and fixed: roster controls disabled while saving, dropdown Enter does not implicitly submit. Refresh failure now locks subsequent editing until successful reload instead of guessing saved participant IDs.
- Mobile390px organizer and captain layouts inspected; no page horizontal overflow. Shortened mobile hub navigation after observing clipped labels.
- Latest production deployment dpl_3wy8s7mRuk2feyAz5B8PSKKynWS9 READY and aliased to https://scottsdaleolympiad.com. Build/typecheck passed.
- Sent one returning magic-link test to authorized chairman inbox. Awaiting real click + Continue verification. Keep private smoke team until return-login test then remove exact synthetic team/business; no other user records should be removed.
- Security advisor: no database/RLS findings; password leaked-protection warning present. App exposes passwordless-only UX. Review Auth password policy before general launch.

Remaining launch gates: actual new magic-link return confirmed from inbox; fresh invited-captain end-to-end registration; final fixture cleanup; session refresh/expiry exercise; organizer operational signup acceptance; general registration policy and abuse/rate limiting; Mailchimp consent integration separate. Event schedule/date and fundraising transaction mapping activation remain future decisions. Do not claim general launch ready.
- Production malformed-link browser smoke also passed: GET removed fragment and waited for explicit Continue; rejected synthetic invalid token offered request-new-link recovery. Production sign-out succeeded. Latest shortened hub-nav labels observed after final deployment. Temporary phone-sized test tabs closed and normal captain tab retained.

## September 29 — returning captain and invitation rehearsal
- Deployed `dpl_zkSrruL8h3pmu7CaUptxgsdtdPse` to scottsdaleolympiad.com; production build passed.
- Live browser verified `/#signin` email-only returning form and `/#captain` first-time form, including switching between them.
- Applied trusted invitation enrollment migration `20260929164837`; verified invited emails automatically become pilot captains upon email verification, without organizer access. Authorized test addresses are scaldwell@saguaros.com and sean@foreveramericanmortgage.com; production allowlist retains both.
- Mailchimp campaign 7250178 submitted for immediate delivery to exactly one subscribed contact, sean@foreveramericanmortgage.com (exact Email Address filter; final confirmation 1 subscriber). Success screen says email on its way, status Sending. No automatic resend or SMS scheduled. Inbox delivery remains user verification.
- Pending: user opens invitation and authenticates FAM identity, creates team/roster; verify live saved data, normal captain access isolation, public directory opt-in, fresh-tab return, sign-out and new magic-link return. Do not describe full rehearsal as complete yet.

## September 29 — readiness audit while delivery is pending
- Latest production deployment: dpl_CnrtX9cbHXWCR6NjmymBC1oJcf5f, READY and aliased scottsdaleolympiad.com; build/typecheck passed.
- Fixed roster add/remove dirty tracking across profile saves; live navigation warning verified, Cancel retained draft. Live duplicate email rejected, corrected partial roster saved; blank third row not persisted.
- Organizer now displays missing-detail counts, remaining participants and private captain phone; live chairman session verified.
- Public directory now has industry filter, refresh, count and clear controls. Signed-out view excludes private test team. New390px mobile navigation wraps with readable active state; nav scrollWidth/clientWidth335/335, document375 within390viewport.
- Fresh Chrome tab restored existing chairman session and saved roster/goal. Fresh emailed sign-in still pending.
- Hosted rollback privacy/ledger tests PASS; local18 schema checks, tracking foundation and magic-link checks PASS. Corrected tracking-test Auth stub after latest email enrollment migration introduced columns absent from stub.
- Detailed remaining build/launch gates: EARLY-ACCESS-READINESS.md. Mailchimp integration, liaison operational UI, captain contact corrections and general-launch controls remain unfinished.
- GoDaddy quarantine remains unconfirmed. No further emails or SMS sent during this audit.

## September 29 — resumed after FAM success
FAM is the only real team; a private synthetic smoke team remains. Follow-up tracking storage and organizer controls added with row-level organizer restrictions and optimistic conflict protection. Rollback organizer-write/captain-read-denial check passed; no persisted notes. Type check passed after correcting status validation narrowing. Goal service still shows blocked and cannot be resumed through its exposed status API; implementation work continues. Remaining priorities: captain business/contact corrections, organizer verified email, Mailchimp preferences/sync, real-session follow-up save/reload and full sign-out/fresh-email return rehearsal. No additional invitations sent.
