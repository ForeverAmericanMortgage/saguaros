# Team audience and campaign recommendations

September 29, 2026

Chairman review now saves a private team history: unclassified, new, or returning. Existing teams remain unclassified until the chairman chooses. Public pages and captain responses do not include this field.

The review and classification save together with the existing review version. A stale review fails without changing either. Changes are recorded in the private review audit log. Only organizers can read or change classifications.

## Recommended messaging

- Pending, changes requested or declined: resolve the review first.
- Approved, unclassified: choose history before tailoring the welcome.
- Approved, new: new-team orientation, games, community impact and next steps.
- Approved, returning: welcome back and introduce the simpler hub.
- Approved, incomplete roster: a friendly reminder for missing participant details.
- Registered teams should be excluded from prospect recruitment campaigns.

These are recommendations, not automatic campaign assignments. Saving a review queues captain group updates but does not send email or activate a campaign. Captain consent and subscription suppression are implemented below; participant sync and unattended processing remain pending. Fundraising outreach remains gated until verified transaction integration is activated.

## Checks

Production build passed. Hosted transaction tests verified chairman save, version-conflict protection, captain read denial and captain review denial; test changes were rolled back.

Ben's requested business email was added to the pilot invitation list and the one-recipient early-access campaign 68e307821c was confirmed sent by Mailchimp. Inbox receipt has not been verified.

## Mailchimp connection added

The live app now has native chairman audience sync. All 2027 captain teams are grouped per verified captain email, avoiding duplicate sends for captains with multiple teams. Names, phone numbers, shirt sizes and individual roster contacts are not uploaded by this integration.

Managed tags use the prefix `Olympiad 2027 | `. Groups: Registered, Approved, New team, Returning team, Unclassified, Mixed history, Roster reminder, Roster ready, Review needed. Only approved teams drive welcome and roster groups. Mixed histories receive their own group for manual selection. Existing unrelated Mailchimp tags remain intact.

Database triggers persist queued updates for registration, team edits, reviews, classifications and roster edits. The chairman dashboard drains the queue on load, on review saves, and every minute while open. It checks all registered captain contacts every five minutes while open, and offers a full manual check. This is not an unattended background worker: queued changes wait until the dashboard opens. Failed syncs remain pending and show a retry message. Version changes during an external request leave the contact pending for reconciliation.

Existing subscribed Mailchimp contacts receive groups. Other statuses have managed send groups removed; contact subscription status is never changed by sync. Missing contacts are reported, not subscribed automatically. Campaign selection must exclude Registered from recruitment sends; existing campaign drafts remain zero-recipient drafts. No campaign send or scheduling endpoint was added.

Captains now have an optional Get Olympiad updates panel separate from sign-in. A verified invited captain can request a subscription for their own login email only. New Mailchimp contacts are created as pending and must confirm via Mailchimp. Requested consent text and timestamp are saved privately. Prior unsubscribes and cleaned contacts are preserved. Subscription confirmation remains untested. Participant opt-in and sync remain a separate next step.

Live browser verification on September 29, 2026: scaldwell signed into the chairman dashboard and the manual Check and sync Mailchimp groups action completed with the success message. FAM showed Campaign groups synced with Registered, Approved, Unclassified and Roster reminder. The chairman email showed subscription needed. A fresh signed-in hub tab retained team and roster information and displayed the optional consent checkbox unchecked, with Get email updates disabled. No subscription was requested and no campaign email was sent during this check.

Checks: hosted SQL rollback tests verified organizer-only export, captain queue denial, review-driven queue updates, per-user consent ownership, and preference-triggered refresh. The actual integration code updated Sean's existing subscribed FAM contact and read back the exact four current tags: Registered, Approved, Unclassified, Roster reminder. scaldwell@saguaros.com was missing and remained uncreated. A live unauthenticated request to the audience API returned 401. No email was sent by this connection test.

Advisors: no new public privileged-function warning after moving the guarded auth-email projection to a private schema with an invoker wrapper. Prior invitation-progress function and password-protection warnings remain unchanged; pilot invitations intentionally have no client policies.

References: https://mailchimp.com/developer/marketing/guides/organize-contacts-with-tags/ and https://mailchimp.com/developer/marketing/guides/create-your-first-audience/
