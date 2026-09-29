# Olympiad 2027 — first interactive preview

## Run and review

Run `npm run dev -- --port 3027` from `app`, then open http://localhost:3027/olympiad.

This is an isolated preview route in the existing application. All team/contact/transaction examples are fictional and held only in component memory. Refreshing resets all changes. No emails, SMS messages, payments, registrations or database writes occur. The chairman view is a public demonstration, not an authenticated admin interface. Search indexing is disabled in route metadata.

## Included

- Responsive landing page, authentic website photo and Saguaros logo, Poppins/Cormorant typography.
- Two-step captain registration, industry selection and immediate sample team creation with incomplete roster allowed.
- Team dashboard with editable participant names, emails and shirt sizes; six complete participant minimum tracking.
- Overall fundraising standings with industry and name filters and empty results feedback.
- Chairman overview, missing-roster/below-minimum filters, sample liaison assignments, stretch-goal editing.
- Goal edits propagate to the dashboard and leaderboard; $3,000 minimum remains fixed.
- Bulletin composer updates the home page, chairman view and latest team update.
- Existing fundraising-resource links, explicitly labeled historical materials and an illustrative event-day flow.
- Modal keyboard focus containment, Escape dismissal, labeled fields and native email/number validation.

## Verified September 28, 2026

- TypeScript check passed (`npx tsc --noEmit`).
- Scoped ESLint check passed (`npx eslint src/app/olympiad`).
- Browser walkthrough: created a sample team, confirmed roster initially incomplete, selected a shirt size and confirmed completion count updated in admin.
- Changed Desert Collective's goal from $10,000 to $12,000 and confirmed the public leaderboard reflected it.
- Added an announcement and confirmed its presence on the home bulletin board.
- Industry filtering returned one Technology team; a nonmatching search displayed the empty state.
- Inspected narrow and wide responsive layouts; DOM measurements showed no page-level horizontal overflow at the inspected widths. Browser scaling affected requested viewport sizes.
- Refreshed to restore initial demo data for user review.

## Confirmed operating decisions

Event is Olympiad 2027. Sean Caldwell is chairman. Minimum six participants per team and $3,000 fundraising target regardless of roster size. Captains may finish rosters after signup. Administrators set team stretch goals. All transactions attributed to a team count toward its fundraising. Industry liaisons support follow-up. A possible $100 deposit remains undecided and is not collected.

## Next iterations

1. Review these screens and confirm event dates, signup commitment, roster maximum/substitutions and communication preferences.
2. Persistent company/team/participant records, captain sign-in, invitation flow, authenticated admin/liaison permissions.
3. Team IDs and shareable attribution links; connect the existing transaction app, define credited amounts/refunds/offline contributions, show sync freshness and reconciliation queue.
4. Mailchimp and SMS integration with participant preferences, missing-information reminders and delivery history.
5. Editable event dates/deadlines, bulletin editing/archival, support contacts and goal-change history.
6. Historical fundraising review and recommendations for individual stretch goals; source link is still pending and does not block the preview.
7. Decide deposit policy and whether any deposit counts toward fundraising. Confirm stretch incentives independently of historic 2026 prizes.
8. Prepare approved 2027 event artwork, sponsorship offerings and current-year fundraising materials. The dated 2026 badge has deliberately not been presented as approved 2027 artwork.

## Asset sources

- Photo: `IMG_1109.jpg` from the live saguaros.com Olympiad page, downloaded to `public/olympiad/stadium.jpg`.
- Parent mark: `Saguaros - Website Mockup-02.png` from the live site, downloaded to `public/olympiad/saguaros.png`.
- Full research and Drive references: `../../OLYMPIAD-DISCOVERY-2026-09-28.md`.

No deployment has been performed. Navigation between preview screens is in-memory; deep links and browser-history navigation are not yet implemented.

## Required participant fields

Confirmed by chairman: name, email, phone number, shirt size, and male/female shirt fit. Captain registration captures phone and carries it into the roster. Rosters can be saved partially; completeness requires all five fields. Collecting a phone number does not itself record SMS marketing consent.
