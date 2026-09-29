# Olympiad early-access readiness — September 29, 2026

## Decision
Continue the private pilot. Not ready for unrestricted registration or automated participant campaigns.

## Completed in this audit
- Returning captain: fresh Chrome tab recognized existing chairman session and restored saved private team, two participants, and $5,000 stretch goal. This is session persistence, not a new email-login test.
- Roster: live duplicate email rejected; corrected partial roster saved. Blank added row omitted from persisted roster.
- Fixed unsaved row additions/removals losing navigation protection when a different form saves. Live test added a row, saved profile, attempted navigation: warning still appeared. Cancel retained the draft.
- Added visible unsaved roster status.
- Organizer: missing name/email/phone/shirt counts, number needed to reach six, and private captain phone link. Live authenticated page showed one incomplete team, four additional people required, and missing email/phone/shirt details.
- Directory: industry dropdown, refresh, result count, clear filters. Signed-out public page excluded the private test team.
- Mobile: found clipped hub navigation at390px; changed to wrapping buttons with contrasting active state.
- Added email-quarantine guidance to the sign-in confirmation screen.
- Local18-check schema suite, tracking foundation suite and magic-link checks pass. Tracking test Auth stub updated to include email confirmation fields required by the latest migration.
- Hosted rollback audit passed: stable roster IDs, partial saves, stale versions, cross-captain isolation, organizer-only goals/ledger, inactive fundraising, refunds/net totals, opt-out/private protection. Fixtures rolled back.

## Superseding update — September 29, resumed build
- FAM login succeeded per chairman; live browser verified FAM with two saved profiles, fresh-tab session restoration, public business-only profile, and normal-captain organizer denial.
- Database contains one real team (FAM) and one private synthetic smoke-test team. Do not count the synthetic team as another real registration.
- Leaderboard is publicly reachable as labeled illustrative data; fundraising remains inactive.
- Added organizer-only follow-up status, named assignment, next date and notes, with optimistic conflict protection. Named assignment does not grant account access.
- Hosted rollback check: organizer insert/read passed, normal FAM captain read denied; no test notes persisted. Type check passed. Browser save/reload walkthrough still pending.
- The goal tool still reports the legacy blocked state and offers no resume operation. Work has resumed; do not mark the overall goal complete while acceptance gates remain.

## Remaining acceptance before next 2–3 members
1. Completed: FAM received access, created its team and saved roster. Earlier campaign was found in quarantine and released; chairman subsequently reported successful login.
2. Complete first-time signup, save roster, sign out, request fresh link, return; verify same records with a non-organizer identity.
3. Completed: fresh browser organizer page denied FAM captain access. SQL-role isolation checks also passed.
4. Public opt-in/profile/share click-through in real browser and opt-out afterward. Database visibility rules pass; private directory exclusion observed.
5. Remove exact synthetic test team after final returning-session rehearsal; retain production user accounts and real teams.

## Remaining build work
- Organizer email contact lookup: captain phone is available; verified captain email is held in Auth and is not yet exposed by a narrowly authorized organizer endpoint.
- Follow-up controls now built with private notes, status, next date and named assignment. Industry-wide liaison account assignment remains separate; only its underlying schema pre-existed.
- Captain profile corrections now deployed: business/industry/captain name/phone plus original fields. Hosted rollback isolation/atomicity checks passed; live form verified without changing FAM.
- Mailchimp registration synchronization, preferences, suppression/unsubscribe handling, idempotency, welcome/reminder triggers, and delivery history. Sending one campaign does not establish integration.
- Participant invitations/self-service and verified consent. Captains supplying contact information does not subscribe participants.
- Session expiry and refresh-error recovery controls now built; induced browser failure exercises remain pending. See PARALLEL-PILOT-AUDIT-2026-09-29.md.
- General registration abuse controls/rate-limit review, account access/revocation workflow.
- Production monitoring and recovery/backup procedure.

## Later activation
- Fundraising transaction matching/reconciliation and verified public leaderboard activation. Fundraising remains inactive.
- Event date, schedule, final packages and deposit decision.
- SMS sender/consent/unsubscribe setup after Mailchimp.

## Security advisor
- pilot_invitations: RLS enabled with no client policies is intentional deny-all; no anon/authenticated grants.
- Leaked-password protection warning remains. Public app uses magic links; review provider password policy before general launch.

## Email incident notes
Campaign7250178, exact recipient sean@foreveramericanmortgage.com. From scaldwell@saguaros.com, subject “You’re first on the field: Olympiad2027 early access.” Mailchimp delivery is mail-server acceptance, not proof of inbox placement. No security bypass, automatic resend, SMS, or further campaign sent during this audit.
