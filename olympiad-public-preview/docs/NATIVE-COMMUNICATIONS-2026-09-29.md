# Native communications — September 29, 2026

## Live campaign
- Authorized four: Clayton Wolfe (clayton.wolfe@theagencyre.com), Nick Hamati (nicholas@schmoozescottsdale.com), Ben Frelka (bfrelka@saguaros.com), Tyler Carlisle (tcarlisle@saguaros.com).
- Existing API connection verified against Olympiad Teams audience a3dd20cfec. No classic automations or configured journeys observed before contact additions.
- Tyler already subscribed; three exact addresses absent and added for this explicitly authorized campaign. No suppressed contact reactivated, no other addresses targeted.
- Segment 3417342 exact recipient list verified before sending.
- Campaign 7d419e5e3e / web ID 7250185, sent September 29, 2026 14:08 Arizona time. Mailchimp status sent, emails_sent 4; per-recipient sent status and zero bounces at first check. Not proof of inbox delivery.
- Subject: You’re first on the field: Olympiad 2027 early access. From Sean Caldwell | The Saguaros <scaldwell@saguaros.com>.
- Content copied from previously tested campaign459e8244fe; verified actual HTML, primary site CTA, footer, preview, recipient match, send checklist.
- UI-replicated draft0718880302 reverted to template placeholder. Never sent. Renamed DO NOT SEND - superseded UI draft - Olympiad early access. Fresh API-created campaign fixed the issue.

## Native panel
Organizer dashboard now reads Mailchimp campaign/recipient send status and live website invitation, verified-email, last-sign-in, team count and participant-count progress. Manual refresh, no side-effecting GET, no automatic sends or contact sync. Two existing test accounts are displayed separately by “Not in this campaign”. No opens counted as actual activation.

Credentials are server-only Vercel secrets; existing API key reused without output. Read-only endpoint checks verified login and organizer membership before any Mailchimp calls. RPC projection denies anon and non-organizers. Security advisor flags the deliberately authenticated-callable SECURITY DEFINER function; explicit organizer guard and fixed empty search_path are required because auth.users cannot be exposed directly. Hosted role check confirmed ordinary captain denied and chairman permitted. No auth table privileges granted.

## Next increment
- Store campaign and recipient snapshots in local messaging tables instead of one configured campaign ID.
- Native draft/preview/send with exact recipient review, current suppression checks and idempotency; do not allow double sends.
- Opt-in preferences separate from roster entry; do not auto-subscribe participants.
- Sync consent and unsubscribe changes; authenticated webhooks and periodic reconciliation before automatic reminders.
- Welcome/approval/roster operational emails through Resend; marketing campaigns through Mailchimp. Website remains source of team/roster truth.
- Invite management should update trusted invitation access automatically; current email allowlist deployment remains manual.

## Live verification
Production dpl_7dhoCnsjyQrytHSiNHiZLjpFisYY READY. Build/TypeScript passed. Chairman browser loaded communications successfully: campaign sent4, zero bounces, four recipients awaiting first sign-in, two prior accounts labeled not in campaign. Confirmed no recipient emails/identities exposed on public endpoint; organizer guard precedes all reads. No automatic reminders enabled.
