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
