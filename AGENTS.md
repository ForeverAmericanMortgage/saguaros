# Saguaros repo: shared rules for Claude and Codex

Both agents read this file (Codex reads `AGENTS.md`; Claude reads it through `CLAUDE.md`).
Keep it short and current. If you learn something the other agent needs, add it here or to `.agents/BOARD.md`.

## What this is
- **Scottsdale Olympiad** (scottsdaleolympiad.com): The Saguaros' corporate field day fundraiser for Arizona children's charities.
- **Deployed app: `olympiad-public-preview/`.** Public site, captain hub (`src/app/olympiad/pilot/`), chairman portal (`src/app/olympiad/organizer/`, served at chairman.scottsdaleolympiad.com).
- `app/src/app/olympiad/` is a mirror copy. Until it is retired, copy every Olympiad change into it so `diff -rq app/src/app/olympiad olympiad-public-preview/src/app/olympiad` stays clean.
- Other folders: `saguaros-license-plate/` and `blackplate-portal/` (Black Plate project), `app/` (internal hub).

## Roles
- **Claude: chief of staff.** Plans, splits work into tasks on `.agents/BOARD.md`, hands tasks to Codex, reviews every diff, verifies (build + screenshots), and merges.
- **Codex: executor.** Takes one task at a time from the board, works only inside that task's files, reports back in the task's log.
- **Sean (owner)** approves anything that goes live or changes data, outreach or permissions.

## Working rules
1. **One task = one branch = one PR.** Claude uses `claude/<task>`, Codex uses `codex/<task>`. Never push to `main`.
2. **Start from fresh `main`** (`git fetch origin main`), in your own git worktree, so parallel work never shares a folder.
3. **Stay in your lane.** Only edit files listed under the task's *Files*. Need another file? Note it in the task log and stop.
4. **Definition of done:** `npx tsc --noEmit -p .` and `npx next build` pass in `olympiad-public-preview/`; the mirror is in sync; no new ESLint issues (lint runs from `app/`); UI changes include a screenshot or note on what was checked.
5. **No outreach automation** (emails, nudges, SMS) unless Sean asks. Keep captain communication tasteful.
6. **Never commit secrets.** Tokens live in env vars (see `.mcp.json` for the pattern).
7. **Hand off in writing.** When you finish or get blocked, update the task on `.agents/BOARD.md` (status + 1–3 line log entry with branch/commit). That file is the shared memory between agents.

## Next.js note
`olympiad-public-preview/` runs a newer Next.js than most training data. Check `node_modules/next/dist/docs/` before using unfamiliar APIs.
