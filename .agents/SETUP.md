# Setting up Claude (chief of staff) + Codex (executor) on your Mac

**How it works:** you talk to Claude Code. Claude plans the work, writes tasks on `.agents/BOARD.md`, and sends them to Codex. Codex builds each one on its own branch in its own folder, and Claude checks the result before anything merges. Both agents share context through `AGENTS.md` (the rules) and `.agents/BOARD.md` (who is doing what).

## 1. Install both tools (one time)
Open **Terminal** and run:

```bash
# Node.js is required. If `node -v` fails, install it from nodejs.org first.
npm install -g @anthropic-ai/claude-code @openai/codex
claude --version && codex --version
```

## 2. Sign in (one time)
```bash
codex login     # opens a browser; sign in with your ChatGPT account
claude          # opens Claude Code; follow the sign-in prompt, then type /exit
```

## 3. Get the repo on your Mac (one time)
```bash
mkdir -p ~/Code && cd ~/Code
git clone https://github.com/ForeverAmericanMortgage/saguaros.git
cd saguaros
```

## 4. Connect Codex to Claude (option 3: recommended)
This makes Codex a tool Claude can call directly:

```bash
claude mcp add codex -- codex mcp-server
claude mcp list          # "codex" should show as connected
```

> If `codex mcp-server` is not recognized, run `codex --help` and use the MCP subcommand your version lists (older builds called it `codex mcp`).

## 5. Start working
```bash
cd ~/Code/saguaros
claude
```
Then tell Claude, for example:
> "Run task T-000 on the board with Codex."

Claude will make a separate folder for Codex (a git worktree on `codex/t-000-pilot`), hand Codex the task, wait for it, then review the result.

## Option 2 (fallback, no MCP)
If step 4 gives you trouble, skip it. Claude can still call Codex from the terminal for each task:

```bash
git worktree add ../saguaros-t000 -b codex/t-000-pilot origin/main
cd ../saguaros-t000 && codex exec --full-auto "Do task T-000 from .agents/BOARD.md, following AGENTS.md."
```
Claude runs these commands for you; you just approve them when asked.

## Running tasks in parallel
- Each Codex task gets its own worktree folder (`../saguaros-<task>`), so two tasks never edit the same files at once.
- Claude only runs tasks side by side when their **Files** lists on the board don't overlap.
- Clean up finished folders with `git worktree remove ../saguaros-<task>`.

## Safety defaults
- Codex works on `codex/*` branches only, never `main`.
- Nothing goes live or emails anyone without your OK.
- Approve commands one by one at first. Loosen permissions once you trust the flow.
