# Olympiad pilot audit — September 30, 2026

## Delivered

Chairman overview now has company-first collapsed team rows, search, industry/review filters, priority sorting, roster readiness, next actions and draft indicators. Existing review, follow-up, goals and campaign tools remain available by expanding a row or section. Declined teams are excluded from the default active list.

Production deployment: dpl_6gKTCXBnL92HGkmgcwZHZ7WiXhuX, Ready, aliased to https://scottsdaleolympiad.com. Source commit adcd5dc. Vercel build and TypeScript checks passed.

## Observed live checks

- Public navigation: overview, directory, guide, fundraising, impact, leaderboard and registration loaded (read-only subagent audit).
- Public directory search no-match and reset worked; FAM public team page exposed business information rather than participant contacts.
- Package search no-match, one-result search, shortlist add/remove and category filter worked.
- Chairman default active filter showed only FAM; declined private fixture excluded. Industry no-match and Declined filters worked.
- Expand/collapse worked; unsaved liaison draft remained after collapsing and reopening. Refresh discarded the test draft. No real team data was saved during this check.
- Private declined synthetic team goal changed from $5,000 to $5,100, saved, persisted after Refresh, and was restored to $5,000 with saved confirmation.
- A CSS hidden-row override was caught on the first compact deployment and fixed in adcd5dc; verified on the live deployment.

## Invitation: Megan Smith

Exact invited address: megan@thebrokery.com. Existing Mailchimp contact was Subscribed; no duplicate contact or resubscription created. Website invitation, production allowlist and Google test audience configured. Production deployment above includes the updated allowlist.

Mailchimp campaign 7250215 / 350fb6acb1: Olympiad 2027 | Early Access | Megan Smith | Google sign-in. Sole recipient verified in recipient preview. Personalized content includes Continue with Google using the invited address, email-link fallback, team/roster basics and feedback request. Send now completed; Mailchimp report verified Sent, one recipient, one delivery (100%), zero bounces and tracked open/click activity. These are provider records, not proof of a human inbox read. Megan login remains a separate check. Automatic resend was not scheduled.

## Remaining checks and planned gaps

1. Megan/Clayton first Google login, cancellation, wrong-account rejection and captain denial of organizer access need real browser checks. Google remains in Testing and only listed test accounts can use it; broader launch needs branding/audience configuration.
2. Mobile chairman check is not established by this run: requested viewport override did not change the observed desktop width. Responsive CSS is implemented, but a real narrow viewport/device pass remains necessary.
3. Live fundraising and transaction reconciliation remain disabled as requested. Leaderboard uses clearly labeled demo values; goals are planning targets.
4. Confirm 2027 date, event-day logistics, package pricing/availability and allocation details before wider campaigns.
5. Captain audience/tag sync exists while the organizer view is open. Unattended processing, participant consent/enrollment and SMS delivery are still future work. Tags do not themselves send campaigns.
6. A season timeline exists as a planning view; task ownership/completion and communication history need additional implementation.
7. Before broad launch, finish monitoring/recovery and production abuse-control review. This source audit is not a completed penetration test.

## Video direction

Use real event clips/photos with a short chairman welcome, captions, branded titles and hub screens. Higgsfield was discovered as available but not connected; useful for short image-to-video/camera-motion treatments after connection. No video generation, subscription or spend was initiated.
