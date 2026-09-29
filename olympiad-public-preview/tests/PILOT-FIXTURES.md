# Production pilot test fixtures and acceptance plan

Prepared 2026-09-28. This is a test plan, not evidence that hosted authentication or email delivery passed.

## Scope and isolation

Use only the isolated **Olympiad** project `nwonwhyyvqgqxigrskqc` and the public Olympiad application. Never seed the internal Saguaros Hub or touch its transaction ingestion. No fundraising rows, marketing subscriptions, SMS sends, or paid orders are part of these fixtures.

`pilot-fixtures.mjs` is a pure data generator. Import `createPilotFixtures('yyyymmdd-run1')` to obtain three private synthetic teams: Captain A has a six-person Technology team and an empty Commercial real estate team; Captain B has an incomplete Healthcare roster. Every team/person is labeled TEST; phone numbers use the fictional 202-555-01xx range and email addresses use `example.test`. They are not messaging destinations or actual sign-in mailboxes.

No seeding runner is supplied because the hosted Auth delivery and pilot access controls must be configured first. Do not bypass the registration gate or mint production sessions merely to make a test pass. Prefer exercising registration and saving through the application with verified test captains.

## Before a hosted run

1. Record a unique run ID and confirm the project ref in provider state and application configuration.
2. Use two separate, explicitly authorized, operator-controlled inboxes and two isolated browser sessions for captain A/B. Do not assume plus-address support, create email accounts, or request sign-in links for the synthetic addresses. Keep actual inbox addresses out of committed fixtures.
3. Verify custom SMTP/domain, exact callback, and correct magic-link template for the implemented code-exchange callback. Preserve PKCE cookies by opening the link in the initiating browser. Do not change the template to a token-hash URL unless the corresponding handler is implemented.
4. Keep general registration closed until a controlled pilot path or approved supervised opening exists. Current API flag enables captain writes globally; current `registration_open` gate permits all eligible new registrants, not an allowlisted pilot. A test-only allowlist is not currently implemented.
5. Record the existing flags, public directory count, and Auth settings before changing anything. Use only the two authorized inboxes for delivery checks. Roster capture is not communication consent.

## Fixture creation ledger

For each registered team, capture run ID, captain Auth UUID, returned team UUID/slug, business UUID (trusted operator read), creation time and latest roster version. Keep the ledger locally out of Git and exclude tokens/cookies. Match repeat runs by the recorded IDs, not by broad TEST-name searches. If a registration response is uncertain, read the captain's existing teams before retrying.

- Register every fixture with `is_public:false` and no invitation source.
- Save the specified roster against the current `roster_version`; re-read after saving.
- Captain A must explicitly include themself in the six-person roster for the human walkthrough; fixtures count six total and do not auto-add a seventh person.
- Public visibility tests temporarily opt in only an unmistakably labeled TEST team; opt out immediately after checks. No bulk sample directory or made-up participation claim.

## Hosted acceptance matrix

| Check | Required evidence |
| --- | --- |
| SMTP and sign-in | Actual authorized inbox receives the branded link; link returns to canonical site; authenticated `mine` shows only that captain. No tokens in logs/screenshots. |
| Fresh/returning sessions | New account, return visit, refresh, expiry, reused link, another-browser failure message, sign-out and back-navigation behavior observed. |
| Private directory default | All three private fixtures absent from anonymous directory and direct public team lookup; roster/contact properties absent from every public response. |
| Cross-captain access | B cannot read/update A team, captain details or roster through API **and** direct Data API using B's real JWT. Test forged team ID, captain reassignment and organizer self-assignment. |
| Roster persistence | Six complete entries and two partial entries survive save/reload with stable order; blank template rows do not persist; shirt size and fit retained. |
| Concurrent editing | Two A sessions edit same roster version; first commits, second gets conflict; second does not silently overwrite first. Reload preserves expected UX. |
| Atomic failure | Duplicate email/invalid size/51 entries rejected and previous roster/version unchanged. |
| Multiple teams | A can switch Technology/Property with correct private data, without saving one roster into the other; dirty draft warning works. |
| Opt-in/out | TEST team appears only after explicit opt-in; public response contains allowlisted metadata; opt-out removes directory and direct public lookup. |
| Invitation attribution | Public TEST team link leads to newcomer explanation; accepted new team stores same-event referrer; unavailable/private/past-event referrer handled safely. Recruitment attribution never grants money credit. |
| Mobile | Two authenticated journeys at 320/390px: sign-in, registration, roster editing, select menus, save/conflict, team switching and share; no clipped controls or horizontal scrolling. |
| Closed-new-team behavior | Returning captain can still edit when new registrations close; new captain/team creation fails with understandable copy. |
| HTTP and abuse | Wrong Origin/missing auth/oversized body denied; private responses no-store; send throttling and expired-link errors usable; no contact information logged. |
| No outbound campaigns | Mailchimp/Twilio connectors inactive during fixture run; no roster-derived contacts automatically subscribed or sent messages. |

Existing 18 PGlite assertions cover SQL/RLS simulation; they do not prove hosted JWT authorization, PostgREST grants/embedding, email delivery, PKCE cookies, real concurrency, browser interaction, or production rate controls. Hosted advisor output alone also does not prove these journeys.

## Cleanup and sign-off

First opt out every exact fixture team and verify no TEST record remains public. Revoke/sign out fixture sessions before removing Auth users (deleting an Auth user alone does not immediately invalidate every existing access token). Using a trusted operator, remove referral rows involving the exact recorded fixture team IDs before team deletion, because `referring_team_id` is not cascading. Delete fixture teams, then their now-unused businesses, then Auth test users only if they were created exclusively for this run. Never delete a chairman's preexisting account. Verify row counts for each exact ID and restore captured launch flags. Do not use a broad `LIKE 'TEST%'` delete.

Log PASS/FAIL/PENDING with timestamp and observed evidence per matrix row. Sign off the pilot only when all required journeys pass; external email/SMS procurement and wider campaign launch remain separate decisions.

References: [Supabase passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client). Current changelog reviewed; no fixture-relevant implementation change identified.

## Execution evidence — 2026-09-28

- Pure fixture-module shape check passed: two owners, three private teams, 6/2/0 roster entries; no network operations in module.
- Read-only hosted query confirmed 2027 registration remains closed.
- Attempted an explicitly authorized rollback-only SQL transaction on `nwonwhyyvqgqxigrskqc`, with temporary result table before any Auth/team insertion. Connector rejected the first write: SQLSTATE `25006`, `cannot execute CREATE TABLE in a read-only transaction`. No fixture insertion statements ran. Sent a follow-up `ROLLBACK` and read-only recheck.
- Hosted captain isolation test is **BLOCKED, not passed**, through this connector. Requires a writable authorized database route or real authenticated API sessions. Do not change connector permissions or route around them implicitly.
