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

## T-004 · 30-second "What is the Olympiad?" explainer video
- **Owner:** Claude · **Status:** review · **Branch:** `claude/busy-ritchie-6xzxsv`
- **Goal:** A polished 30-second explainer with voiceover and music that tells a first-timer what the Olympiad is and how to get involved, in the Olympiad's own look.
- **Files:** `olympiad-media/**` (new), `.agents/BOARD.md`.
- **Do:** Remotion project with 16:9 and 9:16 cuts; neural voiceover; original music bed; bundled fonts; render script; README with change and upgrade steps.
- **Done when:** Both MP4s render at -16 LUFS with on-screen cues matched to the voice; Sean reviews.
- **Log:**
  - Claude: task created and built (Sean, 2026-10-07). Voice: Kokoro af_heart (transcribes word-for-word, incl. "Saguaros"). Music: original, code-composed. Rendered 33s MP4s; -15.9 LUFS, -1.4 dBFS peak. Not yet placed on the website.
  - Claude: Sean asked for "over $700K" (2026-10-07). Supported by the Frontdoors 2026 recap (over $720,000); the treasurer's team-sales report alone is $699,773. Re-recorded the impact line ("Over seven hundred thousand"), re-timed the counter, re-rendered.

## T-005 · Privacy Policy and Terms of Use
- **Owner:** Claude · **Status:** review · **Branch:** `claude/busy-ritchie-6xzxsv`
- **Goal:** Plain-English privacy policy and terms that match what the site actually collects, linked wherever people give us information.
- **Files:** `olympiad-public-preview/src/app/olympiad/{legal/**,privacy/page.tsx,terms/page.tsx,OlympiadHub.tsx,olympiad.module.css,pilot/PilotExperience.tsx,join/JoinRoster.tsx}` and `app/` mirrors; `olympiad-public-preview/src/app/{privacy,terms}/page.tsx`; `.agents/BOARD.md`.
- **Do:** /privacy and /terms pages; footer links; agreement line on team registration; Privacy Policy link on the teammate join consent. Home total → "Over $700K".
- **Done when:** Build and typecheck pass, mirror in sync, lint unchanged; Sean and the Saguaros' attorney review the wording before it goes live.
- **Log:**
  - Claude: drafted from the site's real data flows (Supabase, Vercel, Google sign-in, Mailchimp opt-in, SMS opt-in, roster links, logos, organizer notes). Includes SMS no-sharing language. Participant waiver and photo release not drafted: needs the Saguaros' attorney and insurer.

