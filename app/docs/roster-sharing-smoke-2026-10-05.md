# Roster sharing release and smoke checks

Production deployment: `dpl_6QE8jyK1qcCv9v6V6djPaq4nMMrR`, scottsdaleolympiad.com.

## Verified

- Browser submission at 390 × 844 saved a synthetic participant without requiring a sign-in.
- A separate database read confirmed name, shirt fit, shirt size and communication preferences persisted.
- Chairman browser refreshed and displayed the saved participant and complete-profile count.
- Captain opened a new tab and saw the saved participant, then generated the production roster link and copied the invitation.
- Production duplicate submission returned a useful error, preserved form entries, and did not overwrite the original participant.
- Transactional database checks verified required last name, duplicate rejection, stale captain version rejection, captain and verified chairman read access, unrelated-user exclusion, and revoked-link rejection. All transactional fixtures rolled back.
- Local and Vercel builds passed. No campaign email or SMS was sent by the test workflow.

## Fixes found during testing

- Directory synchronization required signed-in ownership even for the joining RPC's roster-version increment. The trigger now skips directory work only when all fields except roster_version and updated_at are unchanged. Team profile changes retain the existing ownership checks.
- Preview lacked production-only registration environment settings. A separate preview was deployed with only the public Supabase connection and registration enablement for guest-form testing.
- Chairman directory showed stale permission copy. It now displays recorded participant preferences and distinguishes these from verified Mailchimp subscription.

## Remaining work

- Explicit sign-out followed by a fresh Google authentication was not exercised; persistence was verified by a new captain tab using the existing signed-in session.
- Participant Mailchimp subscription verification/sync is not implemented. Existing captain tag sync remains in place. SMS sending is not active.
- Run a real captain/teammate beta round, then prepare new-team and returning-team December recruitment campaigns. Do not send campaigns solely because roster contact information exists.
- npm audit reports five high-severity findings in the existing ESLint development dependency chain. It proposes an incompatible eslint-config-next downgrade; no forced dependency changes were made in this release.
- Supabase's anonymous SECURITY DEFINER advisories for the two bearer-link RPCs are intentional; write operations require an unguessable, active token and expose no private roster reads. The private roster_links table deliberately has no direct-access RLS policies.

Temporary browser test team: `0cf8d634-e639-44e2-9dff-ed2a1e72e8b5`. Removed after browser checks; zero test teams, participants and links remain. Older pilot records were preserved.
