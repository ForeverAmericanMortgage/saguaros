# Olympiad product and impact refresh

Research and implementation: September 28, 2026.

## Product framing

Businesses are the sponsor teams competing against other businesses. Removed the “Find a sponsor” resource and replaced it with company package selection, network giving and team-hosted fundraising. Team minimum remains $3,000, minimum roster six, stretch goals remain editable by administration.

## Sources reviewed

- Official catalog: https://www.saguaros.com/olympiad-sponsorships-tickets
- Team-hosted fundraiser catalog: https://www.saguaros.com/2026-olympiad-team-sponsorships-tickets
- Official package detail pages under the catalog: jumbo-screen-sponsor ($500), gold-banner-sponsor ($1,000), pop-a-shot-game ($3,500), t-shirt-sponsor ($15,000). All historical 2026 examples, not 2027 offers.
- Drive sales brochure: https://drive.google.com/file/d/1GRxKTVPxm9sBFQghQzrnNs2lt11hlHm_/view
- Drive team playbook: https://drive.google.com/file/d/1qifwovDFboUXjgjpZln_w3fDTisXIiiJ/view
- Club history: https://www.saguaros.com/about
- Event industry expansion: https://www.saguaros.com/olympiad
- Reported 2026 result: https://frontdoorsmedia.com/community/the-saguaros-olympiad-sets-new-fundraising-record/
- Banner grant: https://www.bannerhealthfoundation.org/news-information/articles/scottsdale-saguaros-gives-to-banner-childrens-community-clinics
- Care Fund grant: https://www.thecarefund.org/post/saguaros-award-49-791-to-care-fund
- Event coverage: https://www.fox10phoenix.com/news/scottsdale-saguaros-host-26th-annual-saguaro-olympiad-event

## Content boundaries

Reported 2026 Olympiad fundraising was over $720,000. Broader club fiscal-year fundraising must not be represented as Olympiad-only results. The $250,000 Banner grant (2025) and $49,791 Care Fund grant (2023) illustrate wider club giving; they are not allocations of 2027 event proceeds. Historical results are separate from fictional preview standings.

The 2026 store shows historical sold-out items and sale prices. No current availability or 2027 checkout is implied. Banner dimensions differ between brochure and store and are omitted. Vendor pricing differs ($3,000 brochure vs $4,000 store) and is omitted. The license-plate store placeholder is not a free-plate offer; visitors use the program website and 2027 team-credit instructions remain pending.

## Assets

Four official product illustrations were obtained from the corresponding official product pages' Squarespace image URLs and stored in public/olympiad. They remain historical package illustrations. Existing official group photo and Saguaros logo retained.

## Implemented

- Company sponsor wording and direct package anchor on the hero.
- Filterable official package examples with source links and historical price labels.
- Network giving, team event and license plate resources.
- Sourced impact, dated grant stories, 1987/1999/2026/2027 timeline.
- First-time-team FAQs.
- Captain dashboard shortcut to packages.
- Admin backlog for package inventory, logo collection and purchase attribution.

## Still pending

2027 pricing, inventory, benefits, logo/artwork deadlines and fulfillment; actual event date; purchase integration and attribution (including external license plates); authenticated accounts; persistent data; contact permissions; Mailchimp/SMS; historical team financial analysis. This remains an in-memory preview. No production sales or communications were enabled. No new tests were run for this content refresh.

## Recipient recognition follow-up

The user clarified that the requested recognition was for grant recipients, not sponsor businesses. Added eight supported-charity names and official logo assets from https://www.saguaros.com/ (reviewed September 28, 2026), next to the impact stories. Explicitly distinguished the club's supported charities from unconfirmed 2027 allocations. Removed the newly drafted historical business recognition section. Replaced the fictional $24,150 landing-page headline with a clearly labeled preview-standings link; sample totals remain in the demo leaderboard.

## Expanded catalog and motion — September 28, 2026

Re-read the Drive 2026 sales brochure and the official Squarespace product collection. Imported 45 historical priced items and official 500px product illustrations into catalog.json and public/olympiad/catalog. Excluded the misleading $0 license-plate placeholder and separate March Madness campaign. License plates remain a separate resource. Prices use the store's then-current historical sale/list amounts; the UI explicitly explains differences from the brochure. This is a historical catalog, not approved 2027 inventory. Brochure-only stress-ball artwork and the old vehicle raffle are not new 2027 offers.

Added seven categories, search, budget filters, ordering, benefit disclosures, progressive loading and an in-memory shortlist with a reference total. The shortlist is not an order, reservation or credited contribution. Added a CSS dimensional field illustration with pointer tilt, interactive theme buttons, card depth, finite intro/progress animation and reduced-motion support. The field is explicitly conceptual, not a venue map. No heavyweight 3D runtime or generated images added.

Public preview receives only presentation assets/components via app/scripts/sync-olympiad-preview.mjs. Internal APIs and credentials remain excluded. Remaining production blockers are unchanged; see olympiad-production-readiness-audit.md.
