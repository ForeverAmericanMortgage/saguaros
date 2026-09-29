# Captain onboarding and pilot acceptance

Requested September 29, 2026. Continues the existing registration-pilot goal; the goal service currently retains its old blocked status and does not permit a replacement unfinished goal.

## Goal
Deliver a short first-time captain journey and reliable returning magic-link access, with persisted business/team/captain records, a private editable roster, organizer readiness tracking, and truthful fundraising leaderboard foundations. Complete smoke tests before opening general registration.

## Journey
1. Start a team: concise event purpose, minimum six including captain, $3,000 minimum team fundraising, industry cups and game medals, event date pending.
2. Capture business, team, industry, captain name/email/phone. Confirm email with a magic link; no typed code. Same-browser draft restored with short expiry; cross-device users can complete details after verification.
3. Explicitly create the team after confirmation. Optional roster completion starts with the captain; save partial teammates or return later.
4. Returning email link opens a scanner-safe confirmation page, then the captain hub. No team or roster mutation from a GET/email scanner.
5. Hub shows saved roster, missing fields, next actions and public-team sharing controls. Organizer tracks real teams, readiness and stretch goals.
6. Fundraising ledger and attribution support future activation; no collection, live purchase synchronization or fabricated totals during pilot.

## Acceptance
- New signup, link delivery, explicit confirmation, authenticated session, team creation, saved roster, reload persistence.
- Returning magic link, used/expired/malformed link recovery, scanner GET does not consume token.
- Captain A cannot read/write B; anonymous cannot read contact details; organizer-only stretch goals.
- Missing optional roster data saves; duplicate emails and stale versions reject safely.
- Mobile narrow viewport and keyboard labels; no horizontal overflow.
- Directory public opt-in only; fundraising claims reflect actual activation state.
- Pilot cohort limited to trusted identities. General registration launch is a separate reviewed decision.

## Execution prompt
Continue the existing Olympiad project in /Users/seancaldwell/Documents/saguaros. Coordinate authorized subagents across authentication, onboarding UX and database tests. Preserve unrelated work. Source UI/API lives in app/src/app/olympiad and synchronizes to olympiad-public-preview before builds. Use the isolated Supabase project nwonwhyyvqgqxigrskqc only. Never place public identities in the internal Saguaros project. Verify hosted changes and report observed versus pending tests. Use synthetic private fixtures for automated checks, and scaldwell@saguaros.com only for explicitly authorized real email tests. Do not send campaigns, collect money or open general registration. Do not request codes or credentials in chat; hand off real inbox authentication to the chairman. Record remaining launch gates with evidence.
