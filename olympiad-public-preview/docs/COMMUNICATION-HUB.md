# Olympiad communication hub

Planning outline · September 28, 2026 · No provider accounts, audiences, numbers, subscriptions, or messages were changed by this document.

## Recommended first version

Use one organizer screen to see registration readiness, publish event updates, and prepare targeted messages. Keep the website bulletin as the durable place to read an update; email and SMS point people to it. Participants should hear directly from the event instead of relying on the chairman → liaison → captain chain.

| Responsibility | System | First use |
| --- | --- | --- |
| Teams, private roster, preferences, event bulletin, organizer activity | Isolated Olympiad Supabase project | Source of current event membership and permission evidence |
| Passwordless access email | Resend through Supabase SMTP | Captain-requested sign-in link |
| Opted-in campaigns | Existing Mailchimp account | Event education, impact stories, deadlines, future fundraising education |
| Short event alerts | Twilio Messaging Service, after setup | Check-in, schedule/weather changes, roster deadline reminders for opted-in recipients |

Resend documents Supabase SMTP setup directly. Configure a verified sending domain and server-held credentials; provider setup does not itself prove inbox delivery. Test the whole sign-in link flow. [Resend setup](https://resend.com/docs/send-with-supabase-smtp)

The SMS experience can be announcement-focused, but it cannot discard replies indiscriminately. Enable STOP/START/HELP handling and give ordinary replies a useful support route. Do not present it as a number that cannot receive replies. Twilio's Advanced Opt-Out can report keyword handling to our webhook so the hub can reflect the resulting preference. [Twilio Advanced Opt-Out](https://www.twilio.com/docs/messaging/tutorials/advanced-opt-out)

## What exists and what is missing

Inspected current pilot source and migration: private captain/roster contact fields, public opt-in team projection, trusted organizer memberships, and industry liaison assignments exist. The roster explicitly says saving does not invite participants or subscribe them. No communication consent model, participant identity redemption, provider synchronization, delivery history, or live bulletin workflow exists yet. Registration/roster UI is not a communication subscription form.

Important implementation dependency: `save_roster` replaces participant rows. New consent records must not cascade-delete when a captain edits or replaces a roster. Preserve a separate, stable communication identity and append-only consent history. Removing a participant ends their event membership; it must not erase an earlier STOP or subscribe them again if re-added.

## Recipient journey

1. Captain registers using their verified email. Offer separate, unchecked email-update and SMS-update preferences for the captain's own address/number. Neither checkbox is required for registration.
2. Captain fills roster and can copy a private participant invitation link. Sharing that link is initially manual; bulk invitation delivery remains off until the invitation sender and recipient basis are reviewed.
3. Each participant opens their own invitation, verifies the destination they control, confirms their details, and chooses each channel. A captain cannot opt in on another adult's behalf.
4. Record permission for a specific destination, channel, event, and purpose with the exact text version and timestamp. A changed phone/email starts unverified with unknown consent for that destination. An email verification is not SMS consent.
5. A preferences page lets the individual withdraw without logging into a captain account. Use a signed, expiring, purpose-limited link; never expose the complete team roster there.
6. Revoke/expire single-use invitation tokens, store only their hash, enforce rate limits, and prevent a token from granting captain access. Do not reveal contact information in URL parameters or link-preview metadata.

Suggested purposes: `event_updates` and `fundraising_news` independently; fundraising news stays inactive during this phase. Authentication emails are requested account actions, not marketing enrollment. Future donation/license-plate/tax-credit promotion must not silently become an operational SMS message.

For SMS, publish the organization name, expected message frequency, message/data-rate notice, STOP/HELP instructions, and links to terms/privacy beside the checkbox. Store evidence of the participant's actual choice. Twilio's policy requires recipient consent and accessible opt-out handling; implement this as a provider launch requirement, not as a legal determination that a captain's roster upload suffices. [Twilio Messaging Policy](https://www.twilio.com/en-us/legal/messaging-policy)

## Proposed data model — design only

No migration is included in this increment. All private tables require explicit grants, RLS, and organizer/individual authorization; public users receive only published bulletin fields. Captains can see their own roster's completion/preference status when appropriate, but cannot set teammates' consent or read messages from other teams.

| Record | Minimal fields / purpose |
| --- | --- |
| `communication_people` | Stable person UUID; optional verified Auth user link; display name. Never merge people solely because they share a company name or phone. |
| `communication_destinations` | Person UUID, channel, normalized email/E.164 phone, verified_at, retired_at. Destination changes produce a new row. |
| `event_memberships` | Person, event, team, role captain/participant, optional current roster ID, active flag. Several team memberships supported. |
| `consent_events` | Append-only destination, channel/purpose/event scope, grant/revoke, source, timestamp, disclosure version, actor/evidence reference. Minimal evidence retention policy; no sign-in tokens. |
| `channel_preferences` | Current derived consent state and last consent-event pointer. Unknown by default. Revocation wins over stale sync events. |
| `communication_suppressions` | Destination/provider scope, reason STOP/unsubscribe/bounce/complaint/manual, first/last seen. Retained across roster replacement and re-import. |
| `provider_contacts` | Local destination ↔ Mailchimp audience/member ID mapping, status, last sync/error. Multiple roles remain local, not duplicate contact rows. |
| `bulletin_posts` | Event, title, body, audience, priority, draft/published/archived, publish/expiry time, author/revision. Public projection excludes organizer identity and private targeting. |
| `message_drafts` | Purpose/channel, content revision, segment rule/version, approver, scheduled time/timezone, state. Preview and approval bind to exact revision. |
| `message_recipients` | Draft/send instance, destination, eligibility snapshot, exclusion reason, idempotency key. Recheck live suppression immediately before sending. |
| `message_deliveries` | Provider/message ID, queued/accepted/sent/delivered/failed/suppressed, timestamps and safe error code. Accepted ≠ delivered; delivered ≠ read. |
| `provider_events` | Unique provider/event identity, signature verified, received/processed time, minimal payload for deduplication and audit. Retention-limited. |

Keep credentials in server secrets. Provider synchronization and webhook writes run in a narrow server worker boundary; never let the public browser update suppression, organizer permissions, or delivery status. Event notices must not expose shirt sizes, phone numbers, or personal email addresses.

## Segments and organizer screen

First filters: event year; captain/participant; industry; team; opted-in channel; missing roster; fewer than six participants; missing contact/shirt fields; invite not accepted. Derive roster readiness from current saved records, never from stale Mailchimp tags alone. The captain counts only when included on the roster.

Organizer tabs:

- **Overview:** registered teams, incomplete rosters, contact coverage, individually opted-in email/SMS count, provider failures.
- **Teams needing attention:** relevant captain, industry liaison, missing items; prepare a reminder draft.
- **Updates:** draft/publish/expire a bulletin, mobile preview, optional separate message draft.
- **Messages:** audience preview, excluded/suppressed counts, channel cost estimate, test-recipient mode, approval and history.
- **Preferences & delivery:** last known sync, unsubscribes, bounces, SMS failures; no mass re-subscribe action.

Liaisons should see only their assigned industry once an explicit scoped authorization model is added. Current `organizer_memberships` is broad; do not pretend existing liaison rows already restrict organizer visibility. Chairman/authorized staff can publish; roster access and send permission should be separate capabilities.

## Mailchimp integration

Inspect the user's existing audience, sender authentication, consent history, account plan, and active automations before choosing an audience. Prefer an existing appropriate Saguaros audience plus Olympiad segmentation, provided it will not trigger unrelated journeys. Do not blindly create duplicates or import every roster row as subscribed.

Use event/role/industry/readiness tags as routing hints. One email may represent several teams; the hub must retain the many-to-many memberships. Synchronize only necessary fields: name, relevant event/role tags, and permission state; shirt sizes and private roster lists stay local.

Use provider-supported subscription confirmation for eligible new subscribers and keep them pending until confirmed. Never overwrite an existing unsubscribe, cleaned address, or complaint with `subscribed` during an upsert. Re-subscription requires fresh individual action and provider-supported confirmation.

Process subscribe/unsubscribe/address-change/bounce events idempotently, with authenticated webhook delivery and periodic reconciliation. Current Mailchimp documentation describes HMAC signatures with the raw request body, a timestamp tolerance, and a one-time signing secret; verify the actual configured webhook supports that contract. If older unsigned delivery is encountered, use a secret endpoint and verify authoritative provider state before allowing an event to grant consent. [Mailchimp webhook guide](https://mailchimp.com/developer/marketing/guides/sync-audience-data-webhooks/)

Start with drafts and contact-sync dry runs. Contact changes can trigger existing Mailchimp automations, so inventory those before the first real sync.

## SMS setup and delivery

Use a dedicated event Messaging Service and a supported registered sender. For a US local number, prepare the actual Saguaros business identity, brand/campaign registration, consent flow, sample messages, and support contacts. Chairman supplies missing business details; agents should not invent them. Obtain current costs before buying a number or registering paid services. [Twilio A2P business information](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/collect-business-info)

Validate inbound and status-callback requests using Twilio's supported signature validation with the correct public URL and request fields. Deduplicate provider callbacks, resist out-of-order state regression, and reconcile uncertain sends instead of automatically retrying into duplicates. [Twilio webhook security](https://www.twilio.com/docs/usage/security)

STOP immediately suppresses subsequent messages in the applicable scope; HELP returns support information. Do not send a second confirmation if Twilio already handled the keyword. Ordinary replies receive a bounded response directing the person to a monitored support email/page, or go to an organizer inbox if staffing is confirmed. Apply conservative recipient-local send windows; unknown timezone is held for review. Emergency messaging is not a substitute for emergency services.

## Phases and concrete next implementation

1. **Finish pilot access:** Resend account/domain/SMTP, authorize a small test-recipient allowlist, confirm sign-in delivery/session, private cross-team isolation, register/save/reload. Keep public registration closed until passed.
2. **Build bulletin + preferences foundation:** first migration for stable identities, individual consent history/suppression, and draft/published event posts; roster replacement compatibility; organizer-only editor and public bulletin. Add preference UI, no provider sends.
3. **Connect existing Mailchimp:** account handoff if needed, inspect audience/automations, dry-run mapping, signed webhooks, one authorized recipient confirmation/unsubscribe test, then reviewed campaign draft.
4. **Add SMS:** sender registration/verification and costs, individual opt-in form, webhook/STOP/HELP tests, permitted test devices only; then enable reviewed event alerts.
5. **Automate:** roster reminders and event-day announcements only after dry-run recipient counts and suppression behavior pass. Fundraising collection/credit remain disabled; future fundraising campaigns need separate activation.

The smallest useful next communication increment is a real organizer bulletin plus individual preferences and an honest “not connected” provider status. It reduces reliance on forwarding immediately without pretending campaigns or SMS are live.

## Production test gates

- Synthetic test teams clearly marked and excluded from the public directory, real campaigns, metrics, and future financial credit; no borrowed business identities or invented real recipient addresses.
- Test only destinations controlled by the chairman/authorized testers; provider messages require explicit recipient authorization. Creating test records must not trigger welcome journeys.
- Own/cross-team/anonymous permissions; expired/tampered invitation and preference tokens; roster replacement preserves suppressions.
- Pending consent excluded; captain cannot opt in participant; changed address reverified; duplicate membership yields one message; event/industry boundaries correct.
- Mailchimp unsubscribe/bounce, SMS STOP/HELP, duplicate/replayed/forged/out-of-order callbacks, retry behavior, pause-all flag, recipient snapshot vs current suppression.
- Mobile bulletin/readability, signup and preferences, missing-provider/error states; inbox link actual delivery and return path.
- Publish a dated evidence report separating prepared, connected, tested, and live. No “production ready” claim based only on a successful build or provider API acceptance.

## Read-only organizer increment contract

Current `OlympiadHub.tsx` has a static/local-state bulletin and legacy `admin` preview branch; the public hash router redirects `admin` to home. Its local `setNotices` and fictional team metrics are not a reusable backed organizer workflow. Leave those inaccessible rather than relabeling them as live.

A useful first live organizer component needs no campaign backend: show actual registered teams, current roster completeness, and provider readiness, behind a server-verified organizer check. Suggested component contract:

```ts
type OrganizerCommunicationOverview = {
  as_of: string;
  event: { id: string; year: number; minimum_participants: number };
  teams: Array<{
    id: string; name: string; company: string; industry: string;
    roster_count: number; complete_participant_count: number;
    missing: { name: number; email: number; phone: number; shirt_fit: number; shirt_size: number };
  }>;
  providers: Array<{
    provider: 'resend' | 'mailchimp' | 'twilio';
    state: 'not_configured' | 'configured_unverified' | 'verified';
    checked_at: string | null;
  }>;
  consent_tracking: 'not_implemented' | 'available';
  delivery_history: 'not_implemented' | 'available';
};
```

Endpoint: authenticated `GET /olympiad/api/organizer/communications`, no-store, verified Auth + trusted `organizer_memberships` before any private query, 401 unauthenticated / 403 non-organizer. Return actual aggregates and safe provider readiness metadata; no keys, SMTP values, tokens, or recipient contact dump. Do not report zero subscriptions or zero deliveries when those models do not exist: render “Not connected yet” or “Not tracked yet.” Count incomplete roster fields only for saved nonblank participant entries; show six-person shortfall separately. Provider state must come from a verified integration record or explicit configured/unchecked state, never from assumption that env presence proves delivery.

UI contract: `CommunicationHub({ data, loading, error, onRefresh })`, readonly; no Send/Publish buttons until server actions exist. It can ship before participant consent tables and become the real starting point for phase 2. Keep fundraising metrics absent. Test actual zero-team empty state and non-organizer denial, not fabricated success data.
