@AGENTS.md

## Claude as orchestrator
- Read `.agents/BOARD.md` at the start of every session; it is the shared state with Codex.
- When handing work to Codex, write the task on the board first (goal, files, done-when), then send Codex the task ID and the board path, not a long re-explanation. Codex runs from a worktree on its own `codex/<task>` branch.
- Run independent tasks in parallel only when their *Files* do not overlap.
- Review each Codex result as a diff against the task's goal before merging; check the mirror and the build yourself.
- Setup instructions for the Claude + Codex workflow: `.agents/SETUP.md`.
