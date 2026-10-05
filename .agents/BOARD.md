# Task board (shared memory for Claude + Codex)

Statuses: `todo` → `doing` → `review` → `done` (or `blocked`).
Each agent updates its own task's status and appends to its log. Claude owns creating, assigning and closing tasks.

---

## T-000 · Pilot the Claude + Codex workflow
- **Owner:** Codex · **Status:** todo · **Branch:** `codex/t-000-pilot`
- **Goal:** Prove the hand-off works end to end with a tiny, safe change.
- **Files:** `.agents/BOARD.md` only.
- **Do:** Under this task's log, add one line confirming you read `AGENTS.md` and this board, plus your Codex version (`codex --version`). Commit, push the branch, open a draft PR.
- **Done when:** Draft PR is open and Claude has reviewed it.
- **Log:**
  - Claude: task created.

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
