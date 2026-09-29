# Olympiad 2027 readiness audit

September 28, 2026. Scope: current local prototype, application authorization code, live Saguaros Hub database metadata and Supabase security advisor. No real registration, outreach, charge or database mutation was performed. Vercel deployment was previously READY; this audit did not exercise the deployed application.

## Decision

Ready for design review; not ready for real participant registration or public account creation.

## Smoke evidence

- TypeScript check and Olympiad ESLint both passed.
- Local browser landing and registration rendered without initial console errors.
- Created fictional Smoke Test Team through company and captain steps. Phone carried into roster; team opened at $0, $3,000 minimum, $6,000 stretch.
- Roster editor exposes name, email, phone, fit and size; blank additional rows can remain unsaved.
- Automated browser assertions exercised saving Female/M on captain, completion changing to one, refresh removing the test team, and unauthenticated access to the chairman demo.
- These demonstrate prototype behavior, not persistent registration, authentication or real transaction reconciliation.

## Launch blockers

1. **Verified authentication and authorization.** `src/lib/permissions.ts` trusts the `saguaros_role` cookie in production; `src/proxy.ts` checks cookie presence and bypasses protected-page checks for matching BlackPlate host prefixes. Do not reuse this mechanism for public team access. Server APIs using requireRole need verified sessions and database permissions. This is a code-confirmed weakness, not a live exploit test.
2. **Public-account isolation.** Live database has RLS on all 36 public tables, but contacts, profiles and olympiad_teams have authenticated-wide SELECT policies. Opening signup for external participants without narrowing access would let signed-in accounts read beyond their team. Audit every policy and privileged server endpoint before enabling signup.
3. **Persistence and roster schema.** UI is React state only. Existing olympiad_teams has event_id, captain_contact_id, division, goal and total_raised, but no separate participant/team-membership/invitation tables appeared in public schema. Need event-year membership, industry, liaison assignment, participant fit/size/contact fields, minimum versus stretch targets, lifecycle and audit history. Reuse existing IDs where suitable.
4. **Fundraising reconciliation.** Squarespace importer already captures olympiad_team_raw and upserts orders. Live transaction_attributions has member attribution, but no dedicated team foreign key. Need stable team mapping, unmatched review, paid/refunded/partially refunded treatment, duplicate-event/source handling, event-year attribution, public aggregate endpoint and last-sync indicator. No live total reconciliation was performed.
5. **Participant communications.** Existing audience and Mailchimp sync tables are useful, but not wired to this hub. Need invitation delivery, transactional sender setup, preference/consent evidence, unsubscribe suppression, retries and delivery status. Phone collection does not mean SMS consent. Legacy accepts_email defaults true and needs explicit source/consent handling.

## Recommended sign-in experience

- Public: event information, packages, beneficiary stories and safe team totals; no account required.
- Captain: enter email, receive a short-lived single-use email link, verify email, then create or resume the team. Save a draft during onboarding. Never claim a team just by typing its name or company domain.
- Participant: receive team invitation, verify the invited email, accept membership and confirm personal details. Captain can enter a provisional roster; consent belongs to the participant.
- Returning user: Sign in -> email -> link -> permitted team dashboard. Add expired/used link states, resend throttling, sign-out and safe return URLs.
- Chairman/liaisons: assigned roles, least privilege and MFA for administrators. No self-selected role or shared credentials.
- Edge cases: existing account, duplicate invite, changed email, multiple teams/event years, captain transfer, removed member, forwarded invitation, access recovery and expired session.

## Other audit findings

- Supabase advisor: four mutable function search paths; two SECURITY DEFINER trigger functions reported executable by public/authenticated roles; leaked-password protection disabled; one RLS table with no policies; GraphQL schema visibility warnings across tables. Schema visibility is not proof that rows are exposed. Trigger execute warnings require contextual review, not an assumption of exploitable RPCs.
- Historical package links and 2027 details remain provisional. Need inventory/fulfillment, logo uploads, shirt deadline/change handling, deposit decision, participation terms and waiver workflow.
- Need server validation, phone normalization, duplicate participant detection, rate limits, accessible error/loading states, stable URLs for views and recovery from network errors.
- Need staging separated from production data/sends, monitoring, backup/restore verification, secret/access inventory and deployment ownership.

## Delivery order and acceptance gates

1. Secure sessions and role model, narrow RLS; prove anonymous rejection and cross-team read/write denial with two test captains.
2. Persist event/team/roster and invitation flows; prove refresh, second device, expired invitation and captain transfer behavior.
3. Connect purchases; prove one credited purchase, replay without double count, refund reversal and unmatched correction audit trail.
4. Enable direct communications; prove opt-in/out suppression, retry safety and delivery visibility using designated test recipients.
5. Pilot with a few businesses; confirm event content, operations ownership and recovery before public launch.

Not verified in this pass: deployed-route security behavior, auth provider settings/SMTP, actual email/SMS delivery, live purchase totals, webhook replay/refunds, backups/restore, full mobile/accessibility matrix or load testing. No remediation has been applied by this audit.

## Follow-up: three-agent review and new-team content

Reviewed public experience, media/history sources and implementation separately. Added four real archive photos with context/source credit, manual next/previous, pause, 7-second rotation, offscreen/hidden-tab suspension and reduced-motion opt-out. Added a first-time captain checklist and dated event recap/video/history cards. Fixed roster follow-up to include any incomplete listed participant even after six records are complete.

Remaining prioritized gaps:
1. Verified email sign-in, durable registration, invitations, returning-user access and restricted team permissions (existing security blockers remain unresolved).
2. Confirmed 2027 operations: date, arrival/parking, game format, guests, accessibility contact, roster/artwork deadlines, shortfall policy and deposit decision.
3. Purchase attribution/refunds and sync freshness; distinguish fundraising standings from athletic results.
4. Approved help/contact path and liaison handoff; avoid the stale chairman contact on the legacy event page.
5. Share/export/save shortlist; registration/teams need real URLs and browser-back behavior.
6. Duplicate participant detection and normalized phone validation; homepage main landmark, skip navigation and screen-change focus management.
7. Brief descriptions and links for all grant recipients; existing grant examples do not establish 2027 allocations.

Source notes: official /olympiad photo IMG_1150, existing IMG_1109; two 2026 Frontdoors images explicitly credited courtesy of The Saguaros. The old /olympiad-2025 page currently returns 404. Archived game-day rules are historical, not 2027 rules. Three subagents performed read-only reviews; parent implemented the changes above.
