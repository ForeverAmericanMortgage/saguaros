# Team approval and private member referrals

## Final user decision
Captains optionally select a referring Saguaros club member during authenticated registration or profile editing. The selection is private; never shown on public business/team pages or public standings. Chairman reviews and may correct it internally. Team fundraising can also be attributed to that member as a separate reporting dimension, not additional revenue.

## Source
Exact labels from the live Saguaros NiteFlite 10-Pack Tickets checkout, observed September29,2026:
https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets
83 referral choices retained (including the memorial choice); No Member Referral maps to null. This is the checkout reference list, not a claim that all options are active club members. No private membership contacts imported. No purchase completed; inspection cart item removed.

## Workflow
- New team: pending. Private roster editing works while pending.
- Chairman: approve, request changes, decline, or return to pending; private member selection; optional captain-facing message (required for request changes/decline).
- Public directory: requires approved status AND captain opt-in. The same gate controls actual public fundraising visibility.
- Existing public FAM pilot team retained as approved. Private synthetic team remains pending.
- Business/team identity changes or normal-captain referral changes invalidate existing approval. Contact/roster edits do not.
- Exact team-name duplicate protection remains; normalized company/team-name matches are advisory review flags. No automatic merge or rejection.
- Review and member association save atomically with a version check; audit rows retain changes and actor. Captains cannot approve teams, view other teams' referrals or access private member credit summaries.

## Reporting
Private member_fundraising_credit groups approved assigned teams and their verified net team ledger totals. Refunds reduce credit. Pending/unmatched/void transactions do not count. Private opted-out teams still count internally. A team has at most one member assignment; a repeated review does not duplicate funds. Changing association applies the team's current total to the newly selected member; history is retained.

Fundraising remains inactive. No Squarespace/Stripe importer, existing internal club-member ledger, historical transactions or messaging integrations were altered. Source checkout labels are preserved for later explicit mapping to internal member identities. Future reconciliation must avoid adding this dimension again to event revenue or double-counting transactions already directly attributed to the same member.

## Evidence
- 46 local role/approval/privacy/atomicity/net-credit assertions passed, all migrations replayed.
- Hosted rollback passed: pending exclusion; approval publication; stale review rejection; net member amount; review revocation; captain catalogue/own selection permitted; other-team attribution/audit/member-summary private; self approval denied; changed captain referral resets approval. All writes rolled back.
- TypeScript check passed.
- Advisor: no new table findings. Existing intentional deny-all pilot invitations notice and leaked-password warning remain.

## Remaining verification
Authenticated chairman browser walkthrough still requires the chairman session. SQL-role tests are not equivalent to a real browser JWT test. Live captain/public read checks are recorded in the turn handoff. No invitation or campaign email sent for these features.

## Chairman dashboard update — September 29, 2026
- Organizer-only dashboard link added to authenticated team hub.
- Default Active teams view excludes declined teams; Declined and All teams preserve access to review and restore. No records deleted.
- Clickable queues: pending approval, incomplete rosters, follow-ups due in Arizona, and changes requested.
- Active-team/approved-team/roster/participant metrics and industry distribution. Synthetic private pilot team is explicitly included in counts.
- Fundraising targets are labeled planning targets, not money raised. Transaction activity feed and purchase integration remain pending.
- Production deployment dpl_CDzygmM2gyBoUH4tCdSL8JZuNGms READY; production build and TypeScript passed.
