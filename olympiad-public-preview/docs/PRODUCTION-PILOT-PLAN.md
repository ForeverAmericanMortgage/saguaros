# Olympiad 2027 production pilot outline

Updated: 2026-09-28. This is an execution and evidence plan, not a claim that the pilot has passed.

## Outcome

An invited captain can receive a sign-in email, register a business team, return later, maintain a private incomplete roster, choose whether the business appears publicly, and share an invitation with another business. Organizers can identify missing information. Participants' names, emails, phone numbers, shirt sizes and male/female shirt fit remain private. Teams need at least six participants including the captain; the $3,000 commitment remains event information only. No payments, live totals, financial credit, bulk email or SMS launch in this pilot.

## Chairman decisions

The first live sign-in email is authorized to `scaldwell@saguaros.com` only. Mailchimp email campaigns are the first communication channel; SMS is a later phase. Set `OLYMPIAD_PILOT_EMAIL_ALLOWLIST=scaldwell@saguaros.com` only after delivery setup is ready. No second real recipient or synthetic delivery is authorized.

A cohort migration now adds manually provisioned `pilot_captains` Auth IDs and restrictive new-team/business INSERT policies. After the first verified sign-in, a trusted operator must enroll that exact verified Auth ID before team registration. Applying that migration and checking its hosted enforcement remain required. Keep the email allowlist for returning captains when new registration closes. Direct Supabase Auth signup can still create an identity if provider signup is enabled, but an identity outside the database cohort cannot create business/team records; the route email allowlist alone is not a Supabase Auth hook.

## Current evidence and limits

The checked-in implementation uses isolated Supabase project `nwonwhyyvqgqxigrskqc`, an owner-filtered captain API, HttpOnly cookies, PKCE callbacks, database RLS, and a public metadata-only directory projection. `PILOT-STATUS.md` records the applied hosted migration, exact callback configuration and previous deployment. Re-read provider state before treating those records as current.

Local migration simulation passed 18 checks according to the validation record. Those checks do not prove live email delivery, hosted Auth, two real captain sessions or mobile authenticated behavior. Existing ordinary authenticated access to the internal Saguaros Hub is too broad for public captains; its project must stay separate.

## Workstreams and sequence

1. **Delivery and authentication:** connect Resend, verify sender/domain DNS, configure Supabase SMTP, inspect rate limits and abuse controls, then exercise a sign-in link with the chairman's authorized inbox. Set reply handling deliberately; a branded sender is not automatically a receiving mailbox.
2. **Controlled test access:** keep general registration closed while preparing authenticated test identities. The existing gates are global, not an invitation allowlist. Before opening them on the public domain, implement a server/database-enforced pilot cohort or obtain explicit authorization for a time-bounded public registration window. A hidden URL alone is insufficient.
3. **Fixtures and real flows:** create clearly labeled private test teams through the same captain flow real teams use. Exercise two separate captain sessions, incomplete and complete rosters, multiple teams, publication and referral links.
4. **Organizer readiness:** provision only verified, approved identities as organizers; verify how the chairman reviews incomplete rosters and exports contact information. The current schema has organizer membership and liaison assignments, but a tested organizer interface is not established by that fact.
5. **Communication hub foundation:** prepare contacts/consent, draft messages, audience previews and delivery history. Connect Mailchimp and an SMS provider only after inspecting their account state and documenting sender/consent requirements. Provider connections must not enroll historical rosters or send automatically.
6. **Decision and cleanup:** review evidence, remove synthetic records using their exact IDs, preserve real pilot records, close any temporary gate, and ask the chairman to approve the intended launch audience if it differs from the authorized pilot.

## Requirements and proof matrix

| Requirement | Authoritative proof required | Current evidence / next action |
| --- | --- | --- |
| Isolated backend | Project identifier, deployed environment target, hosted schema and grants | Recorded configuration; re-read before tests |
| Passwordless sign-in | Authorized message received; single-use callback; authenticated API identity | Delivery remains unproven |
| Correct redirects/session | Exact callback allowlist, secure cookie flags, refresh and sign-out behavior | Code and saved-settings record; exercise live |
| Private roster | Anonymous denial and two actual captain sessions unable to read/write each other's team | Local RLS simulation; hosted session test required |
| Public opt-in | Default private, public response allowlist, publish/unpublish reflected after reload | Implemented; live data proof required |
| Registration integrity | Owner assigned server-side, duplicate normalized name rejected, event gate enforced | Local checks; real RPC/API proof required |
| Incomplete roster | Save blank/partial fields, six-person readiness, refresh persists | UI implemented; authenticated walkthrough required |
| Required participant data | Name, email, phone, shirt size and fit persisted accurately and privately | Schema/UI present; real synthetic fixture round-trip required |
| Concurrent edits | Two sessions produce conflict without overwriting the newer roster | Local sequential revision checks; browser concurrency required |
| Multiple teams | Independent teams and unsaved drafts remain separate | UI implemented; real captain test required |
| Invitations | Public team share, newcomer context, same-event attribution, private team no public disclosure | UI/schema present; full flow required |
| Mobile/accessibility | 320/390px, keyboard focus, labels, errors, menu, Back, long names and zoom | Public states observed; signed-in forms still pending |
| Organizer operations | Approved organizer can review missing rosters; ordinary user cannot grant itself organizer | Schema checks; usable organizer workflow still needed |
| Campaign consent | Per-channel explicit consent with source/time/version and revocation; roster entry alone grants nothing | Do not assume implemented; inspect new communication work |
| Delivery controls | Draft preview, exact recipients, test-only mode, retry/idempotency, suppression and audit history | Future communication implementation must prove each |
| Fundraising remains off | No checkout, financial writes or transaction-credit activation | Preserve invariant in every deployment |

## Synthetic account and record policy

- Names: `PILOT TEST — <run ID> — Team A/B`; company: `Olympiad Test Business <run ID>`; clearly mark descriptions as test-only.
- Use fictional participant names, `example.invalid` email addresses, and reserved example phone numbers. Never submit synthetic phone numbers to a messaging provider. Use partial rows when no valid fictional value is needed.
- Only the chairman's explicitly authorized real inbox may receive the first sign-in test. A second real test recipient requires explicit authorization. Do not invent a deliverable mailbox or use somebody else's identity.
- A trusted non-delivering test-user mechanism can test database isolation, but does not count as proof of email delivery. Keep credentials outside source, logs, screenshots and final reports.
- Keep `is_public=false`. To test public pages, use one unmistakably labeled synthetic business only during an authorized test window; record it and remove public visibility immediately afterward. No fake competitive or fundraising figures.
- Record run ID, exact Auth user IDs, business/team/roster IDs, creation time, purpose and cleanup result in a private test manifest. No blanket deletion by name prefix, email domain or date.
- Do not set real consent on fixtures. No Mailchimp audience import, welcome automation, SMS or invitations may be triggered by seeding.

## Test script

1. Confirm project, domain, deployment, gates, email sender and test recipient. Capture configuration without secrets.
2. Request the chairman's approved sign-in email; check inbox and spam, sender identity, wording and timing. Follow in the originating browser. Repeat invalid, expired, reused and different-browser links; failures must explain how to request a fresh link.
3. Sign in as captain A; create a private labeled team. Save two partial roster entries, reload, finish six entries including captain, and verify every field. Create a second team and confirm drafts do not cross teams.
4. Sign in separately as captain B. Attempt A's IDs via API/RPC as well as UI. Verify no private row is returned and no mutation occurs. Repeat anonymously and after sign-out.
5. Edit one roster in two sessions. Save first, then save stale second; verify explicit conflict and preserved newer data. Verify invalid/duplicate inputs do not clear existing records.
6. Publish the authorized synthetic test business briefly. Inspect exact public JSON and page; no captain/participant identity or contact data. Share/copy; follow invitation; verify attribution. Opt out and confirm direct link is unavailable. Test removed/stale invitation recovery.
7. Repeat signed-in critical path at 320px and 390px, keyboard only, browser Back, slow connection, reload and expired session. Ensure failed saves keep entered data and controls remain reachable.
8. Close new registrations while leaving pilot access available; returning captain can still edit. Then exercise the global off switch separately, document its effect, and restore the intended safe state.
9. Complete organizer checks, cleanup and authoritative re-read. Attach evidence pointers and failed cases to the run record. Do not mark unexecuted checks as passed.

## Communication hub scope

Recommended separation: Resend/Supabase for sign-in; Mailchimp for approved email campaigns; an SMS provider for consented text reminders. Present one organizer-facing hub with channel, audience, draft, approval/send status and results. Treat provider integration as pending until credentials, permissions, sending identity, test mode and webhook authenticity are verified.

Useful first segments: captains without rosters, incomplete participant details, industry, and event edition. A participant's roster email/phone is contact information, not channel permission. Track suppression and opt-out independently, and restrict private audience previews to authorized organizers. Do not promise literally unreplyable SMS: verify supported sender type and provider requirements, including opt-out handling, before choosing wording or implementation. No legal or carrier compliance conclusion is asserted by this plan.

## Launch evidence packet

Store deployment ID, tested project/event, date, exact test cases and outcomes, screenshots with private details redacted, cleanup counts/IDs, unresolved defects, sender verification and delivered-message evidence. Separate **implemented**, **locally verified**, **hosted verified**, and **pending**. The pilot is ready only when all required rows above have appropriate hosted evidence and external account/launch decisions are resolved.
