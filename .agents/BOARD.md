# Task board (shared memory for Claude + Codex)

Statuses: `todo` → `doing` → `review` → `done` (or `blocked`).
Each agent updates its own task's status and appends to its log. Claude owns creating, assigning and closing tasks.

---

## T-000 · Pilot the Claude + Codex workflow
- **Owner:** Codex · **Status:** review · **Branch:** `claude/project-thread-3bl08v`
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
- **Owner:** Codex · **Status:** review · **Branch:** `codex/chairman-roster-links`
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

## T-002 · Simplify chairman navigation and team details
- **Owner:** Codex · **Status:** review · **Branch:** `codex/chairman-simpler-teams`
- **Goal:** Clear workspaces, compact team rows, one expanded team, and collapsible details without losing form drafts.
- **Files:** `olympiad-public-preview/src/app/olympiad/organizer/OrganizerDashboard.tsx`, `olympiad-public-preview/src/app/olympiad/organizer/organizer.module.css`, their mirrored `app/` files, `.agents/BOARD.md`.
- **Do:** Overview, Teams, Outreach, People and Planning navigation; concise readiness counts; team/captain, roster, communication and administration sections. Preserve current permissions and actions.
- **Done when:** TypeScript/build, baseline lint comparison and mirror checks pass; review PR includes UI verification notes.
- **Log:**
  - Codex: Sean directly requested this iteration. Starting from fresh main in isolated worktree; no schema changes or outbound messages.
  - Codex: Implemented five isolated workspaces, overview action queues, compact rows with captain/status/roster/next action, one expanded team, four detail sections and optional filters/help. Forms stay mounted so drafts survive navigation.
  - Codex: TypeScript and Next build pass, mirrors match, whitespace check clean. Lint matches existing baseline (2 errors, 1 warning). Playwright with synthetic/local data verified workspace isolation, queue counts, reset/search, single-team expansion, draft preservation and no horizontal overflow at 320/390px. Screenshot evidence: `/tmp/olympiad-chairman-ui-review/output/playwright/{desktop-overview,desktop-teams,mobile-roster}.png`.
  - Codex: Local interactive preview opened at http://127.0.0.1:3048/#overview (sample data, writes blocked). No production UI deployment, permissions/data changes or messages sent. Authenticated live save checks remain for release review; this iteration changes presentation only.
