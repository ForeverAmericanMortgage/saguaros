# Parallel early-access audit — September 29, 2026

## Scope
Three independent source reviewers: captain journey, organizer safety/workflow, and public/mobile accessibility. Parent performed live browser and isolated hosted database checks. No campaign sends, new invitees or real FAM record changes.

## Repaired
- Captain can correct business, industry, team name, captain name/phone, introduction and public visibility. Atomic database routine keeps business/team/contact fields consistent; login email remains the verified account identity. Roster details remain independently editable.
- First signup asks only for email; business/team details are entered after authentication, avoiding pre-auth data loss when opening email in a different tab.
- Session-expiry recovery retains drafts in the current tab and lets the captain reauthenticate separately with the same email.
- Saved-but-refresh-failed recovery retries saved data without discarding other drafts.
- Saved roster count includes all persisted partial entries, with completeness tracked separately.
- Mobile captain page simplified; redundant heading/navigation reduced.
- Invite landing explains invited-email access requirement.
- Organizer follow-up conflict offers explicit latest-version reload; unauthorized responses clear cached private data.
- Organizer search includes captain and assigned liaison; roster-only filter explicitly labeled.
- Leaderboard now exposes semantic list items and meaningful rank/amount/progress labels to assistive technology.

## Passed evidence
- Fresh live Chrome tab restored FAM account and two saved complete profiles before this release.
- Live mobile homepage at390px: document375px, no horizontal overflow.
- Live390px returning email field moved from y1092 to y667 after deployment; no horizontal overflow. Deployed leaderboard exposes24 labeled list items and fits375px document width within390px viewport.
- Local TypeScript checks passed for source and synchronized public app.
- Local18 schema assertions passed.
- Magic-link, tracking foundations and invitation enrollment suites passed (agents/parent).
- Hosted rollback profile audit passed: owner correction, all related rows consistent, invalid captain input rolls back all changes, FAM cannot edit another captain's team. No persisted test changes.
- Existing follow-up hosted rollback check: organizer write/read permitted; normal captain private-note read denied.

- Deployment dpl_2xBY6Yt4JLFFiMR9QTx9itUiktPh READY on scottsdaleolympiad.com. Live FAM hub reload restored both profiles; expanded profile showed new business, industry, captain name/phone fields. No FAM writes performed.

## Still pending / limits
- New organizer controls require authenticated chairman browser save/reload and two-session conflict walkthrough. Current Chrome session is normal FAM captain.
- Full signed-out fresh-email rehearsal needs user mailbox interaction. No new emails sent in this audit.
- Referral recruitment attribution uses tab-specific session storage; independent email tab may lose inviter. This does not affect team ownership or financial attribution. Address before broad referral rollout.
- Goal updates do not yet have conflict protection for simultaneous organizers.
- Mailchimp registration sync, verified participant preferences and welcome/reminder automation are not integrated.
- Organizer verified captain-email lookup remains pending.
- One private synthetic smoke team remains alongside the sole real FAM team.
- Security advisor: no new table findings; intentional deny-all pilot invitation table notice and existing leaked-password-protection warning remain.
