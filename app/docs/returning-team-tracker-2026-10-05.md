# Chairman returning-team recruitment tracker

## Imported snapshot

Imported 2026-10-05 into private `returning_team_accounts`, never into registered teams or a marketing audience. 135 curated business records; 127 primary email addresses; 2 primary phone numbers from Drive, expanded to 6 using the 4 linked current captain profiles; 11 businesses have a phone in either the primary or preserved historical contacts; 4 exact business-name links to approved 2027 registrations. Multiple historical team rows roll up to one business while original team names remain in history.

| Season | Businesses represented | Source rows | Evidence |
| --- | ---: | ---: | --- |
| 2026 | 85 | 92 | Final Teams List for App; captain detail enrichment |
| 2025 | 41 | 41 | Video Scoreboard rows explicitly labeled Team; incomplete, especially residential |
| 2024 | 89 | 94 | Confirmed tracking sheet, dated by 2024 liaison headers; uncertain and dropped-out sections marked for review |

These counts overlap across seasons. Sources establish tracking/registration history, not verified attendance. The 2024–2025 workbook filename does not independently establish a 2025 participation year. 2023 outreach references enrich historical contacts only; no 2023 participation claim was imported.

## Drive sources

- [Olympiad Master Tracker 2026](https://docs.google.com/spreadsheets/d/1Z4ijyLaear_L0RHTqecZe-CIfLCe6oPClcxdtyZukaM/edit): Final Teams List for App (gid 1086389070), Team Captain Emails (gid 2046151246), TEAM SUMMARY (gid 242321782).
- [OLYMPIAD 2024-2025(2).xlsx](https://docs.google.com/spreadsheets/d/1lGIFEfrlnHCcdNCcHCM0r8imevH3K0Rf/edit): CONFIRMED TEAMS, ABC Contacts and historical OutReach contact enrichment. Original workbook unchanged.
- [2025 Olympiad Orders/Banners/Deliveries](https://docs.google.com/spreadsheets/d/1PODslfAwdinAztdQ1UMZuy_ABplSs1ITdC6Ix8Acwxs/edit): Video Scoreboard (gid 621535343), team rows only. Sponsor rows excluded from team history.
- [2026 captain email list](https://docs.google.com/spreadsheets/d/1tiljLCO7LfIQJBMOnsWjbj7SHxZp0CzUEeBdD98hA_A/edit) inspected but not imported as business participation evidence: combined mailing group includes club/operational contacts and has no business mapping.

Each imported history/contact preserves source URL, sheet and row. XLSX sources link to the workbook with sheet/row text rather than a fabricated gid. Aliases normalize obvious spelling/format variants; ambiguous businesses remain separate. Phone enrichment only uses the same email identity as the primary contact. Contacts are historical and need confirmation.

## Features

- Chairman navigation: Returning teams; collapsed panel, 15 business rows per page.
- Search and filter year/category/status, follow-ups due, missing email/phone, participation review, linked registration.
- Editable primary contact, outreach owner, status, working notes, Arizona follow-up date and actual 2027 registration link.
- Separate interested/committed status from verified registration; linking does not approve or create a team.
- Append-only call/email/text/meeting/note activity log. Logging does not send messages.
- Saved phone dial links and manual email links; do-not-contact disables those quick actions.
- Filtered CSV for private call-list use; protects formula-looking cell values.
- Save/discard draft protection before filtering/paging/reloading, and unload warning.

## Access and persistence

Existing verified chairman Google session + proof-cookie check at API level; database `chairman_access_allowed()` policies protect reads and writes. No anonymous grants. Captains cannot read this recruitment data. Source history/contact provenance is not writable by authenticated users; operational fields are editable. Activity log and contact update save in one transaction with an optimistic version check. Data is not shipped in client bundles or repository fixtures.

This is a one-time Drive snapshot, not automatic Drive synchronization. Imports must retain source provenance and must not overwrite chairman-entered contact corrections or notes. Imported email addresses are not marketing consent. Mailchimp subscription/campaign sending remains a separate explicit workflow.

## Verification

- Next production build and TypeScript passed.
- Database count verified: 135 records / 127 email / 6 primary phone / 4 linked registrations.
- Verified chairman-session database transaction saved an edit and activity, advanced version, and rejected a stale update; entire verification rolled back with no synthetic outreach activity retained.
- Both tables have RLS enabled. Anonymous SELECT grants absent. Authenticated source-history update privilege absent.
- Security advisor found no findings on new tracker tables/function; existing roster/invitation/auth findings remain outside this feature.

## Useful next source improvements

- Find complete 2025 residential/final roster; the scoreboard source is incomplete.
- Confirm year and participation of flagged 2024 workbook entries.
- Add current captain phone numbers before call outreach and confirm historical contact changes.
- Resolve uncertain aliases or jointly fielded teams manually before merging.

- Signed-in live chairman view loaded all records. Saved a genuine FAM import/contact-refresh note through the form; contact update and activity appeared in the portal. Current captain contact enrichment preserves original Drive contacts.
