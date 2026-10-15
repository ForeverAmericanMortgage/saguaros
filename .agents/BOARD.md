# Task board (shared memory for Claude + Codex)

Statuses: `todo` → `doing` → `review` → `done` (or `blocked`).
Each agent updates its own task's status and appends to its log. Claude owns creating, assigning and closing tasks.

---

## T-000 · Pilot the Claude + Codex workflow
- **Owner:** Codex · **Status:** done · **Branch:** `claude/project-thread-3bl08v`
- **Goal:** Prove the hand-off works end to end with a tiny, safe change.
- **Files:** `.agents/BOARD.md` only.
- **Do:** Under this task's log, add one line confirming you read `AGENTS.md` and this board, plus your Codex version (`codex --version`). Commit, push the branch, open a draft PR.
- **Done when:** Draft PR is open and Claude has reviewed it.
- **Log:**
  - Claude: task created.
  - Codex (codex-cli 0.160.1, ChatGPT sign-in): read AGENTS.md and this board. Its sandbox can't write `.agents/` or `.git`, so it could not edit this file or commit.
  - Claude: Sean chose to keep Codex sandboxed and split the work (2026-10-05). Claude recorded Codex's result here, committed, and opened the draft PR. Rules updated in AGENTS.md.

<!-- Template
## T-### · Title
- **Owner:** Claude | Codex · **Status:** todo · **Branch:** `codex/t-###-slug`
- **Goal:** one or two sentences, in plain English.
- **Files:** exact paths this task may touch.
- **Do:** concrete steps.
- **Done when:** checks that prove it.
- **Log:**
  - Claude: task created.
-->


## T-001 · Chairman roster sharing links
- **Owner:** Codex · **Status:** done · **Branch:** `codex/chairman-roster-links`
- **Goal:** Let chairman retrieve each active team's captain roster URL and copy a message for the captain to forward.
- **Files:** `olympiad-public-preview/src/app/olympiad/api/roster-link/route.ts`, `olympiad-public-preview/src/app/olympiad/organizer/{ChairmanRosterLink.tsx,OrganizerDashboard.tsx,organizer.module.css}`, mirrored `app/` paths, `supabase/migrations/20261005203642_chairman_roster_links.sql` in both app trees, `.agents/BOARD.md`.
- **Do:** Retrieve the existing link through strict chairman authorization; create its first link on request; never silently reset expired/disabled links. Copy URL, captain message and email draft. No outbound sends.
- **Done when:** Build/typecheck/lint and UI review complete, draft PR ready for Claude.
- **Log:**
  - Codex: Directly assigned by Sean in this chat; task recorded for Claude review after fetching newly merged shared workflow. Work isolated from Claude's connected checkout.
  - Codex: SQL migration already applied to production before discovering new workflow rules. No chairman UI deployed, no messages sent.
  - Codex: Fresh-main integration passes TypeScript and production build; Olympiad mirrors match. New component/API lint clean; dashboard retains exactly its baseline two errors and one warning. Anonymous RPC execution denied, and authenticated requests without chairman identity rejected in a rolled-back database check.
  - Codex: UI source reviewed for team disclosure placement, read-only URL, copy fallback, email draft and full-width mobile actions. Authenticated browser/UI smoke remains for Claude review: preview environment lacks production auth configuration; no live UI deployment performed.
  - Sean approved this feature on October 5. PR #5 is ready for review; Claude review/merge and authenticated chairman smoke remain before live publication under AGENTS.md.
  - Claude: merged as #5. Marked done; authenticated chairman smoke test still open.

## T-002 · Simplify chairman navigation and team details
- **Owner:** Codex · **Status:** done · **Branch:** `codex/chairman-simpler-teams`
- **Goal:** Clear workspaces, compact team rows, one expanded team, and collapsible details without losing form drafts.
- **Files:** `olympiad-public-preview/src/app/olympiad/organizer/OrganizerDashboard.tsx`, `olympiad-public-preview/src/app/olympiad/organizer/organizer.module.css`, their mirrored `app/` files, `.agents/BOARD.md`.
- **Do:** Overview, Teams, Outreach, People and Planning navigation; concise readiness counts; team/captain, roster, communication and administration sections. Preserve current permissions and actions.
- **Done when:** TypeScript/build, baseline lint comparison and mirror checks pass; review PR includes UI verification notes.
- **Log:**
  - Codex: Sean directly requested this iteration. Starting from fresh main in isolated worktree; no schema changes or outbound messages.
  - Codex: Implemented five isolated workspaces, overview action queues, compact rows with captain/status/roster/next action, one expanded team, four detail sections and optional filters/help. Forms stay mounted so drafts survive navigation.
  - Codex: TypeScript and Next build pass, mirrors match, whitespace check clean. Lint matches existing baseline (2 errors, 1 warning). Playwright with synthetic/local data verified workspace isolation, queue counts, reset/search, single-team expansion, draft preservation and no horizontal overflow at 320/390px. Screenshot evidence: `/tmp/olympiad-chairman-ui-review/output/playwright/{desktop-overview,desktop-teams,mobile-roster}.png`.
  - Codex: Local interactive preview opened at http://127.0.0.1:3048/#overview (sample data, writes blocked). No production UI deployment, permissions/data changes or messages sent. Authenticated live save checks remain for release review; this iteration changes presentation only.
  - Claude: merged as #6 (2026-10-07). Marked done.

## T-003 · Public site UI and readability pass
- **Owner:** Claude · **Status:** review · **Branch:** `claude/busy-ritchie-6xzxsv`
- **Goal:** Clearer calls to action, less clutter above the fold, readable text on phones, and a public site that never looks empty.
- **Files:** `olympiad-public-preview/src/app/olympiad/{OlympiadHub.tsx,PackageCatalog.tsx,olympiad.module.css,pilot/PilotExperience.tsx,pilot/pilot.module.css}` and their `app/` mirrors, `.agents/BOARD.md`.
- **Do:** One CTA name ("Register your team"); fold the feedback bar into the top bar and drop the duplicate returning-captain banner; 2026 total shown as "Nearly $700K" (Sean, 2026-10-07); remove "Refresh teams"; raise minimum text sizes and darken helper grey; full-width mobile package cards, chip fade, "2026 price" wording, drop the overlapping "2026 COLLECTION" badge; day-flow descriptions; directory empty state with 2026 count and leaderboard link; footer with location, contact and social links.
- **Done when:** Typecheck and build pass, mirror in sync, lint unchanged, desktop and mobile screenshots reviewed.
- **Log:**
  - Claude: task created and executed (Sean approved all 11 items, 2026-10-07). Codex not available in the cloud session, so Claude built it.
  - Claude: tsc and next build pass; mirror in sync; app lint 19 → 19 (no new issues). Verified desktop 1440 and mobile 390 screenshots of home, fundraising, guide and teams. Chairman portal untouched.

## T-004 · Captain feedback: reliable saving, larger logos, simpler setup
- **Owner:** Codex · **Status:** review · **Branch:** `codex/olympiad-captain-experience`
- **Goal:** Implement Sean's October 10 assignment from Hamati's pilot feedback and identify related follow-ups.
- **Files:** `olympiad-public-preview/src/app/olympiad/pilot/{PilotExperience.tsx,CaptainProgress.tsx,TeamLogo.tsx,RosterLink.tsx,pilot.module.css,logo-upload.ts}`, `olympiad-public-preview/src/app/olympiad/api/logo/route.ts`, matching `app/src/app/olympiad/` mirrors, new logo-limit migration in both app trees, focused captain/logo tests and implementation notes under `olympiad-public-preview/{tests,docs}/`, `.agents/BOARD.md`.
- **Done when:** Typecheck/build pass, lint has no new issues, mirrors match, autosave failure/conflict and desktop/mobile flows checked; migration and live verification gaps recorded for release review.
- **Log:**
  - Codex: Direct assignment from Sean. Fresh main f1262c0 in isolated worktree; existing dirty primary checkout preserved. No production changes or outbound messages. Desk enrollment is manual; no connected consumer claimed.
  - Codex: Implemented 1.2-second roster autosave with validation, failure/retry status, version-conflict protection and retained navigation guards. Simplified checklist, logo, account and public-sharing disclosures; removed mobile sticky save overlay. Vector originals use signed direct uploads/downloads up to 20 MiB; PNG/JPG remain 4 MiB. Existing originals remain private and retained; vector replacements preserve web images.
  - Codex: TypeScript, production build, five focused API tests, mirror diff and whitespace checks pass. Changed-file ESLint has no new issues versus main (two existing link errors, one existing hook warning). Synthetic Playwright checks passed save/navigation round trip, failure/no retry loop/retry, conflict draft retention/navigation protection, invalid email prevention, 7 MiB AI upload UI, and 320/390px overflow. Screenshots: `output/playwright/captain-{desktop,mobile}.png`. Live read-only SQL confirms private bucket and matching 4 MiB DB constraint; migration is prepared, not applied. No production UI deployed; no commit/push under the Claude-owned release workflow.
  - Release follow-ups: Sean approval and Claude review/packaging; apply only the new logo-limit migration, verify bucket/global limits, then authenticated hosted 7 MiB upload/download/replacement and captain/chairman persistence. Reconcile three existing live October 2 logo migrations missing from the deployable tree before broad migration pushes. Agree a retention/cleanup policy for superseded or abandoned uploads; do not delete old originals blindly because a current public image may reference them. Ask Hamati to retest his actual logo and roster on mobile after release. Existing security-advisor warnings concern intentionally callable invitation/roster RPCs and password protection; audit separately without disabling link access in this change.
  - Codex continuation: Reproduced and fixed an autosave retry edge case: after a failed save, changing a field and immediately reverting it no longer leaves Waiting to save indefinitely. New user edits clear the attempted-snapshot marker; unchanged failed drafts still do not loop. Browser proof: save request count stayed 10 during the retry wait, then became 11 after the reverted edit and displayed All roster changes saved. Release approval remains pending.
  - Sean explicitly approved proceeding on October 10 and waived the Claude/AGENTS approval requirement for this release. Codex owns packaging, merge and verification for this task. Applied only larger_team_logo_originals via Supabase migration API (version 20261010172604); verified private bucket remains private with 20971520-byte limit and PNG/JPG metadata remains capped at 4194304 bytes. Historical migration timestamp drift is unchanged.

## T-005 · One-click teammate signup link
- **Owner:** Codex · **Status:** done · **Branch:** `codex/teammate-copy-link`
- **Files:** both `pilot/RosterLink.tsx` mirrors and `.agents/BOARD.md`.
- **Request:** Sean asked for an easy copy link captains can paste into a team chat for participant self-entry. Existing Claude approval waiver continues for this captain UX work.
- **Change:** Prominent Copy teammate signup link gets the existing authorized link and copies it in one action; a selectable fallback and separate invitation-message copy remain available. No change to link permissions or participant consent.
- Validation: TypeScript/build, changed-file ESLint, mirror and whitespace checks passed. Synthetic browser checks passed first-click link copy, invitation text and blocked-clipboard fallback. PR #10 merged as f242e84; Vercel production deployment dpl_5vGiVz7gT5bgEaRm2trhkhznr494 is Ready and aliased to scottsdaleolympiad.com. Browser behavior was verified with synthetic data; live participant submission was not repeated.

## T-006 · Captain autosave, approval clarity and automatic roster refresh
- **Owner:** Codex · **Status:** ready for release · **Branch:** `codex/captain-autosave-refresh`
- **Files:** both mirrors of `pilot/PilotExperience.tsx`, `pilot/RosterLink.tsx`, and `.agents/BOARD.md`.
- **Request:** Sean explicitly requested autosave, pending-approval clarity, and automatic roster refresh; continuing the authorized captain UX release workflow.
- **Implementation:** Profile/introduction changes save after 1.2 seconds with validation, status and manual retry. Roster polling every 15 seconds and on tab return skips dirty/focused forms and invalidates stale responses. Pending approval explicitly confirms registration submission and invites continued teammate signup.
- **Validation:** TypeScript and production build pass. ESLint matches the existing two link errors and one hook warning. Synthetic browser tests verified profile autosave/reload, failure draft retention, no retry loop, manual retry and automatic teammate refresh on focus.
- Additional browser checks passed dirty-roster protection across focus and polling, save retry, and 15-second periodic refresh. No schema, permission or outreach changes.


## T-007 · New-company prospect outreach tracker
- **Owner:** Codex · **Status:** done (merged #12) · **Branch:** `codex/olympiad-prospect-tracker`
- **Files:** both mirrors of `organizer/{ProspectTracker.tsx,prospect-model.ts,prospects.module.css,OrganizerDashboard.tsx,SeasonOverview.tsx}`, `api/prospects/route.ts`; both `supabase/migrations/20261013164825_organizer_prospect_tracker.sql`; `olympiad-public-preview/tests/{prospect-model.test.cjs,prospect-tracker.sql}`; `.agents/BOARD.md`.
- **Request:** Sean directly requested the exact sent email, 25-company recipient list, better company-specific outreach, and a simple chairman prospect tracker. This is separate from the earlier captain UX approval waiver.
- **Implementation:** Outreach workspace gains company/status/last contact/owner/next follow-up, search and due/interested filters, notes, original-email/Gmail links and source-backed draft fields. Unsaved forms survive filtering/navigation; saves use version checks. Prospects never create a registration or Mailchimp subscription. Strict existing chairman authorization, sticky opt-outs and actual registered-team linking are enforced in the database.
- **Validation:** TypeScript/build passed; new-file lint clean and dashboard matches its existing two errors/one warning. Four model tests passed. Rollback-only live database checks passed chairman insert/update, stale-write suppression, opt-out protection, registration guard, non-Google/other-email/anonymous denial. All 25 private import records satisfied the schema and contained original email, sent timestamp and Gmail thread. Both mirrors match.
- **UI review:** Local browser fixture with 25 actual sent records verified company search, expansion, notes/status save and 390px layout without horizontal overflow. Fixture used browser-memory saves only and was removed before handoff. Screenshots/private import/drafts are under `/Users/seancaldwell/Documents/Agent Desk/Outreach/Olympiad/2026-10-13/`; no prospect PII is included in repository files.
- **Release remaining:** Claude review/commit/PR/merge and Sean approval of schema/import/publication under AGENTS.md; then authenticated chairman save/reload smoke. No permanent production schema/data changes or portal deployment performed. Existing hourly Gmail reply monitor remains active, but automatic tracker reply synchronization has not been implemented. No additional outreach sent.

- T-007 release continuation, October 13: Sean explicitly authorized getting the tracker live, importing all 50 contacted companies, exact sent history, replies and follow-up dates. Scope adds both 20261013171852 message-history migrations. TypeScript/build and four model tests pass; new-file lint clean. Rollback import verifies 51 outbound receipts and 3 inbound summaries. Claude owns review, commit, PR and merge under AGENTS; Codex owns authorized database import, production deployment and live verification. Private queue and recipient data stay outside repo.

- T-007: Sean explicitly waived Claude packaging/review hold and authorized Codex direct release on October 13 after Claude OAuth failed. Both migrations applied with targeted history entries; private import verified 50 contacted companies, 51 outbound messages and 3 response summaries. Self-CC removed. Daily outreach remains 20 new companies plus one seven-day follow-up; portal decisions reconcile into private queue. Live authenticated browser verification pending production build.

## T-008 · Cloud outreach and mailbox reply synchronization
- Owner: Codex. Status: done (merged #13). Branch: codex/olympiad-cloud-outreach.
- Request: Sean authorized cloud outreach and reply tracking while his computer is off. Clay SMTP/IMAP sender connected, warmup off, owner-only. No cloud campaign launched yet.
- Files: both mirrors of organizer/{OutreachCloudSetup.tsx,ProspectTracker.tsx}, api/outreach-cloud/** and cloud-outreach/**; targeted cloud mailbox migration in both app trees; deployed package.json/package-lock.json; tests/cloud-outreach.test.cjs; .agents/BOARD.md.
- Scope: Secure cloud mailbox monitor covering prior Gmail threads, strict chairman setup UI, provider history and suppression. No paid upgrades/topups, no credentials exposed, no automatic interested-reply sends. Existing daily sender remains owner until cloud cutover is verified.

- T-008 scope adds app/package.json and app/package-lock.json so the required source mirror also resolves the new server mailbox libraries. Build, TypeScript, four cloud model/security tests and rollback privilege checks pass. No cloud credential collected or cloud mail sent.

- T-008 verification: TypeScript/build, four cloud tests, changed-file lint and mirror checks pass. Rollback SQL verifies denied worker credentials, private secret denial, chairman-only management, reply dedup and sticky opt-outs. Applied targeted cloud migration; provisioned encrypted worker secret and a five-minute cloud cron, currently paused pending deployment. Cloud mailbox credential remains absent. Existing local sender is not disabled before verified cloud cutover.

## T-009 · Daily cloud prospect sender
- **Owner:** Codex · **Status:** done (merged #14) · **Branch:** `codex/olympiad-cloud-daily`
- **Files:** both mirrors of `cloud-outreach/copy.ts`, `api/outreach-cloud/{send,daily,intake}/route.ts`, `organizer/{DailyCloudOutreach.tsx,ProspectTracker.tsx}`, both `supabase/migrations/20261013191538_outreach_cloud_daily.sql`, focused tests, `.agents/BOARD.md`.
- **Request:** Sean authorized finishing cloud sending after connecting the reply monitor. Existing direct-release approval continues.
- **Log:** Monitor completed live read-only Gmail poll with no errors at 12:12 Arizona time. Local reply automation paused after verified cloud cutover. Building atomic 20-new plus 20-followup daily limits, ten-minute pacing, exact Gmail preflight, sender receipt reconciliation, private candidate intake and contacted-only tracker projection. No new prospects sent today; existing 50 excluded. Clay feed remains draft pending actual qualified input and integration verification.

- T-009 validation: TypeScript/build and seven focused tests pass; new files lint clean, mirrors match. Rollback SQL checked invalid key denial, anonymous privilege denial, independent initial/followup caps, idempotent sender receipts and chairman hold suppression between reservation and sending. Production schema applied with sending disabled; 202 historical exclusions and all 50 exact Gmail/RFC sender receipts imported privately. Clay scheduled research/export remains draft and needs its scoped intake connection and real-run verification.

## T-010 · Atomic cloud research reservations
- Owner: Codex. Status: done (merged #15). Branch: codex/olympiad-research-reservations.
- Files: both mirrors of api/outreach-cloud/intake/route.ts and cloud-outreach/research.ts; both targeted 20261013221015 migrations; deployed tests/research-reservations.*; .agents/BOARD.md.
- Request: Sean authorized weekday cloud outreach. Clay duplicate and 21st-company reservation tests exposed missing atomic research controls. Add scoped company/domain reservation before enrichment, persistent exclusions and 20 reservations per Arizona weekday. Existing sender and reply authorization unchanged; direct review/release waiver applies. No extra prospect sends today.

- T-010 validation: nine focused copy/mail/research tests, TypeScript, production build and changed-file ESLint pass. Rollback-only live SQL denies missing/wrong worker keys and private table access, rejects duplicate snapshot and mismatched reservation, caps twenty-one requests at twenty, and verifies persistent exclusions. Private migration applied; advisors report only existing unrelated warnings. Mirrors match. Preparing authorized direct release; no SMTP sends or paid upgrades.


## T011: Cloud daily progress recap and first-batch review
Status: done (merged #16)
Owner: Codex, Sean approved direct review/release
Files: cloud-outreach/notifications.ts, api/outreach-cloud/run and daily routes, organizer/DailyCloudOutreach.tsx (both mirrors), migration 20261013231055, focused notification tests.
Log: Daily self-only recap, tomorrow morning queued-copy preview, persistent notification deduplication and a chairman release gate for the first smoke batch. Existing cloud polling drives notifications while the computer is off. No prospect sends today.

T011 validation: TypeScript and production build passed; 8 focused tests passed; rollback-only live SQL verified invalid-key denial, snapshot draft identities, notification deduplication, private permissions and sender review hold. Mirror and changed-file ESLint clean. No new advisor findings.


## T012: Atomic company-refill cursor
Status: done (merged #17)
Owner: Codex, direct release authorized by Sean
Files: cloud-outreach/refill.ts and api/outreach-cloud/intake/route.ts in both mirrors; migration20261014040021_outreach_company_refill.sql; focused refill tests.
Log: Put metadata-only refill claims/cursor in the existing private cloud feed. Fifty-company active buffer, below40 threshold, one weekday claim, preserve known companies and uncertain writes. No new Gmail access or prospect sends. Apollo Company Search-only key requires owner confirmation.

T012 validation: TypeScript, production build, 12 focused tests, changed-file ESLint and mirror checks pass. Rollback SQL validates exclusive daily claims, capacity limits, cursor receipts, duplicate completion and private access denial. Private controller remains disabled until Apollo scope approval and real Clay source/save verification.


## T013: Personal invitation copy and daily research audit
Owner: Codex. Status: done (merged #18). Branch: codex/olympiad-personal-invitations.
Request: Sean authorized tighter personal outreach, reason/fit before identity, last-year $1m grants, and researching today toward20 reviewable drafts. Sending stays held. Prior direct-release waiver applies.
Files: cloud-outreach/copy.ts in both mirrors; tests/cloud-daily.test.cjs; .agents/BOARD.md.
Scope: improve future intake copy, update private unsent drafts separately, audit Clay supply and evidence mapping. No sent-history changes or release of review gate.

T013 validation: TypeScript, production build, focused copy/qualification tests, changed-file ESLint and mirror checks passed. Existing two private ready drafts updated and read back under the unreleased review gate; no sent records modified.


## T014: Qualified draft target and five-minute invitation
Owner: Codex. Status: done (merged #19). Branch: codex/olympiad-qualified-review.
Sean approved fixing the supplier before expanding to40 weekday research attempts, stop at20 qualified ready drafts, existingcredits only; all sends held for review. Prior direct release waiver persists.
Files: both mirrors cloud-outreach/copy.ts, api/outreach-cloud/intake/route.ts; migration20261014162629; focused copy and qualified-review SQL tests; this board.
Scope: real social proof and five-minute call CTA; authoritative40research and20ready guards, no change to20send cap or review release. Private unsent drafts updated separately.

T014 validation: build, TypeScript, copy/qualification tests, changed-file ESLint and mirrors pass. Rollback-only SQL verifies40research ceiling,20ready carryover stop for reservation and intake, persistent review hold and private access. Migration activation waits for a corrected supplier acceptance.


## T015: Preserve sourced evidence punctuation
Owner: Codex. Status: done (merged #20). Branch: codex/olympiad-research-evidence.
Files: bothmirrors cloud-outreach/copy.ts; tests/cloud-daily.test.cjs; thisboard.
The live360SOC recovery proved email-style punctuation checks incorrectly rejected an emdash inside a research quote. Permit source punctuation in evidence/role fields only, retain HTML/newline bounds and all outgoingcopy checks. No send/review release. Existing directrelease waiver applies.

T015 validation: actual held360SOCpayload nowpasses with sourcepunctuation preserved and outgoingcopy dash-free. Fourfocusedtests,TypeScript,build,ESLint andmirrorchecks pass. No privatepayloads committed.

## T016: Gmail drafts with explicit chairman batch approval
Owner: Codex. Status: done (merged #21). Branch: codex/olympiad-gmail-review.
Sean requests automatic Gmail Drafts for qualified outreach, edits in Gmail, then batch approval in chairman portal before cloud sending. Existing direct release waiver applies. No new prospect sends or paid research during implementation.
Files: both mirrors cloud-outreach/{drafts.ts,draft-model.ts}, api/outreach-cloud/{run,send,daily}/route.ts, organizer/DailyCloudOutreach.tsx; targeted gmail_draft_review migration in both trees, focused tests, this board.
Controls: exact draft content approval, edits invalidate approval, new drafts never inherit prior batch approval, preserve suppression/receipts/caps. Private mail stays outside repo.

T016 scope extension authorized by Sean: cloud-outreach/copy.ts and focused draft/copy tests, simplified Clay qualification, and cached-only unsent Gmail examples. No paid research today; all sending held.

## T017: Cloud draft readiness email
Owner: Codex. Status: done (merged #22). Branch: codex/cloud-draft-recap.
Sean authorizes a cloud email to his Saguaros inbox when October 15 drafts reach20 or a17:00 partial recap. Keep all exact-copy approvals held; no research/credits/prospect sends. Existing direct-release waiver applies.
Files: both mirrors cloud-outreach/notifications.ts; targeted cloud_draft_ready_recap migration; focused notification tests; this board. Reuse existing five-minute cloud monitor and idempotent notification ledger. Actual provider charges unavailable must be labeled, never inferred from reservations.

T017 validation: three notification-copy tests, no-send rollback SQL checks (timing,20target,partial cutoff,dedup,authentication,actual counts,approval preservation),TypeScript,Nextbuild,changed-fileESLint andmirrorchecks pass. No research or prospect sends. Production release pending.

## T018: Cloud confirmation for two approved sends
Owner: Codex. Status: done (merged #23). Branch: codex/cloud-send-confirmation.
Sean authorizes one confirmation email to his Saguaros inbox after both remaining approved introductions have exact Gmail Sent and tracker receipts. Reuse cloud monitor; preserve tomorrow approval gates. Existing direct-release waiver applies.
Files: both mirrors cloud-outreach/notifications.ts, cloud_send_confirmation migration, focused notification tests, this board. Candidate identities configured privately after deployment, never committed.

T018 validation: five notification tests, rollback SQL checks for two-receipt gating/dedup/preflight retry/unchanged approvals,TypeScript,Nextbuild,ESLint andmirrorchecks passed. No paid research or prospect send triggered. Cloud activation follows production deployment.

## Cloud research usage recap (Codex, implemented; reporting credentials pending)
- Status: done (merged #24).
- Branch: codex/outreach-usage-recap. Sean authorized actual credit reporting; all new copy remains held. No paid research today.
- Files: mirrored cloud-outreach/usage*.ts, notifications.ts, api/outreach-cloud/run/route.ts, api/outreach-cloud/usage/route.ts, organizer/OutreachUsageSetup.tsx, organizer/OutreachCloudSetup.tsx; mirrored outreach_provider_usage migration; usage tests.
- Implemented in PR #24. Build, types, lint, offline ratios/provider mocks and transactional access checks pass; private production schema applied. Cloud provider verification awaits owner-entered reporting credentials. No paid research or approval changes.


## Reporting connection diagnostics (Codex)
- Status: done (merged #25).
- Branch codex/usage-connection-diagnostics. User attempted key entry but neither saved.
- Files: mirrored cloud-outreach/usage.ts and api/outreach-cloud/usage/route.ts.
- Return only provider, documented endpoint path and HTTP status for rejected reporting reads; never key, response body or arbitrary exception. Preserve all holds and zero paid research.

- Scope includes mirrored organizer/OutreachUsageSetup.tsx: retain encrypted submitted keys on reporting failure; distinguish saved from verified; independently check both providers.

## Apollo reporting cycle parser (Codex)
- Status: done (merged #26).
- Branch codex/apollo-reporting-cycle. Files: mirrored cloud-outreach/usage.ts and private reporting regression test.
- Saved Apollo key returns HTTP200; actual cycle field is start_date. Match verified response and reject invalid dates. No paid research, sends, or approval changes.

## Interested reply preparation
- Status: done (merged #27).
- Codex, branch codex/interested-reply-drafts. Sean authorizes automatic company briefs, manual next steps and unsent personal Gmail replies; no automatic reply sending or paid research.
- Files: mirrored cloud-outreach/interest.ts, api/outreach-cloud/run/route.ts, interested_reply_drafts migration. Preserve notes and existing draft edits, one preparation per prospect, private authenticated worker ledger.

## Interested reply review alerts
- Status: done (merged #28).
- Codex, codex/interest-draft-alerts. Files: mirrored api/outreach-cloud/run/route.ts. Email Sean draft/conversation link and portal next step after draft preparation. Sending approvals unchanged.


## T019: Outreach footer, domain fix and weekend skip
- Owner: Codex. Status: done (merged #29). Branch: codex/outreach-footer-fix.
- Fixed thescasolympiad.com typo; opt-out line + postal address footer from OUTREACH_POSTAL_ADDRESS (intake 503 / send skip when unset); "no thanks" = opted_out; sender skips Arizona weekends. Claude reviewed twice (approved).
- Open: Sean sets OUTREACH_POSTAL_ADDRESS in Vercel Production. Follow-up: decode HTML entities on HTML-only reply fallback; sent-mail record stores pre-footer body.
