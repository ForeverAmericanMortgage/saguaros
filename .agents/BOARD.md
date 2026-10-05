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
