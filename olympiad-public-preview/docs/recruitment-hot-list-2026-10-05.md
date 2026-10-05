# Olympiad 2027 recruitment hot list — October 5, 2026

The chairman recruitment panel uses the private curated 2024–2026 business history to recruit for 2027.

## Workflow
1. Choose a business and confirm the current captain contact.
2. Set Hot, Warm or Later, outreach owner, notes and follow-up date.
3. Prepare invitation: this enables early-access eligibility for the saved email; it does not send a message or create a team.
4. Share the personal invitation link or open an email draft. Record personally sent invitations separately.
5. Mailchimp sends only to an existing subscribed audience contact, with an exact one-email segment and a one-recipient preflight. Imported historic contacts are never automatically subscribed.
6. Review sign-in activity, then link the actual 2027 registration after checking the business. Approval remains the existing chairman team action.

## Release evidence
- Production build and TypeScript passed.
- Database migrations applied: 20261005155604 and 20261005160059.
- Invitation table is private with chairman-only row policies; prepare RPC checks chairman OAuth access, business status and record version.
- Anonymous invitation lookup is intentionally bearer protected and returns only invited business/email. Public email eligibility returns a boolean only; team access still requires verified authentication and existing ownership policies.
- No prospect invitations prepared or sent during this release. No new marketing subscriptions created.
- Mailchimp send execution and a fresh invited-user login still need a real selected-recipient end-to-end check. A provider send result is not inbox delivery proof.

## Known limits
- Histories are an imported snapshot, not live Drive synchronization.
- Registration linking is manual to prevent associating an unrelated business on email alone.
- Changing an email after preparing its invitation, or renewing an expired invitation, currently requires administrator reconciliation.
- Unknown/unfinished Mailchimp sends are locked against duplicate retries and require campaign review.
- Security advisor flags the intentionally public definer functions; existing password-protection advisory is unchanged.
