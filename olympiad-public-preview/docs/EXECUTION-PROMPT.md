# Execution prompt: Olympiad 2027 real-team pilot

Use this prompt to continue this project with agents. It preserves the requested outcome and is not approval to send campaigns or create paid services.

---

Act as implementation lead for Scottsdale Olympiad 2027 in `/Users/seancaldwell/Documents/saguaros`. Finish an initial real-team registration pilot on `https://scottsdaleolympiad.com` using isolated Supabase project `nwonwhyyvqgqxigrskqc` in the Saguaros organization. Inspect current files, provider configuration and deployment state first. Use `docs/PRODUCTION-PILOT-PLAN.md`, `docs/PILOT-STATUS.md` and `supabase/README.md` under `olympiad-public-preview` as starting context, not proof that work is complete.

## Confirmed decisions

The chairman authorized the first live sign-in email to `scaldwell@saguaros.com` only and selected Mailchimp campaigns first, SMS later. The new cohort migration must be applied and verified before testing registrations. Manually enroll the verified captain Auth ID in `pilot_captains`; server email allowlist and database UID membership serve different purposes. Do not authorize a second recipient implicitly.

## Required outcome

Deliver secure captain email sign-in, business/team registration, private participant rosters with name/email/phone/shirt size/male-or-female fit, partial-roster saving, multiple teams, public opt-in team directory/pages, and shareable newcomer invitations. Verify mobile and real production Auth/API/database behavior. The chairman needs a practical way to see missing rosters/contact details. Keep fundraising collection and financial transaction-credit activation disabled. Six participants including captain is the minimum; $3,000 remains the stated per-team commitment without taking payments.

## Delegation

Use subagents as useful, with explicit file ownership and narrow output contracts:

- Provider/auth lead: inspect Resend/Supabase delivery configuration and prepare authorized sign-in test; never request passwords or fabricate access.
- Backend/security lead: inspect hosted grants/RLS, captain separation, roster integrity and organizer permissions; retain evidence of actual results.
- Pilot/browser lead: run two-captain fixtures and mobile journeys; record exact fixture IDs and cleanup.
- Communications lead: inspect existing Mailchimp capability and design a hub for drafts, audience previews, consent/suppression and delivery history; investigate SMS sender requirements using current official documentation.

The parent integrates changes and checks that copied public-preview files match their source. Agents must not concurrently edit the same files, send messages or create external accounts without the appropriate user authorization. Use existing agents where suitable.

## Guardrails

- Never place public captain Auth in internal Saguaros Hub `qbqnbwknywkfqnblagsa`, reuse its internal cookie authorization, or weaken its existing policies. Preserve source integrations and their raw referring-member/team fields.
- Use current skill instructions for Supabase and deployment. Public app has no service-role key. Never expose secrets or roster details in logs, screenshots, public endpoints or source.
- Registration remains controlled until delivery/security tests pass. Current global flags are not an invite-only cohort. Build an enforced cohort gate or secure explicit approval for any temporary public registration window.
- Synthetic teams must be unmistakably labeled, private by default, and recorded by exact IDs. Do not create deliverable accounts for invented people or import/send fixtures to Mailchimp/SMS. Use only explicitly authorized real recipients for delivery tests.
- Roster contact capture does not imply marketing or SMS consent. Do not silently enroll participants, enable welcome campaigns or send invitations. Outbound production campaigns require approval of content and audience.
- Do not assume an SMS channel can literally disable replies. Preserve opt-out handling and verify sender/provider requirements before implementation.
- Account signup, paid service changes, domain/DNS modifications and provider connection steps must use actual authorized accounts. Hand login/2FA back to the user when required. Stop only the dependent work and continue useful independent tasks.

## Execution and acceptance

Follow the production pilot plan's matrix. Prove email delivery and single-use login with the authorized chairman inbox; prove two-captain and anonymous isolation against the hosted service; verify round-trip roster fields, missing fields, conflicts, multiple teams, opt-in/out, share/referral, error states and mobile navigation. Test closing new registration while returning captains retain access. Run existing relevant tests when instructed by the parent/user and report their scope accurately.

For communications, first deliver a safe draft/preview workflow and explicit consent/suppression model. Provider connection is not proof of deliverability, and a draft hub is not a live sending system. Keep test sends and campaign launches separate. If provider setup is blocked, produce concrete configuration steps and a precise user handoff while completing other authorized implementation.

Clean only recorded synthetic fixtures, verify cleanup, deploy authorized changes, and retain the deployment status. Report what is implemented, locally tested, hosted tested, still blocked and requiring the chairman. Do not mark the overall goal complete until the complete pilot outcome is proven; preserve unresolved requirements instead of redefining success around partial work.
