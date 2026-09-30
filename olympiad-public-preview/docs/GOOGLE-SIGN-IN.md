# Google captain sign-in

Status: implementation prepared, not enabled or deployed. Google project consent and OAuth credentials are still pending. No end-to-end Google login has been completed.

## Implementation

- Continue with Google appears only when server setting OLYMPIAD_GOOGLE_SIGN_IN_ENABLED=true.
- Same-origin POST starts Supabase Google OAuth with a server-managed PKCE verifier in the existing HTTP-only Olympiad cookie.
- Callback exchanges the code, requires a verified email and the existing exact pilot allowlist, and signs out accounts outside that list.
- Existing pilot registration RLS and organizer membership checks remain authoritative. Google login does not grant chairman access.
- Only basic identity scopes are needed; no Gmail, Drive or contacts access.
- Email magic links remain available.

## Provider setup pending

Existing Google Cloud project: Saguaros / gen-lang-client-0908092386.
Consent app name: Scottsdale Olympiad. Google permits only the currently selected project user's support address in the dropdown (sean.caldwell4@gmail.com); developer notification address is scaldwell@saguaros.com. Review the support address before public launch.
Google requires the operator to accept the API Services User Data Policy and create the consent configuration. That acceptance was not performed by the agent.

After consent configuration, create a Web application OAuth client:
- Origin: https://scottsdaleolympiad.com
- Authorized redirect: https://nwonwhyyvqgqxigrskqc.supabase.co/auth/v1/callback
- Supabase project: Olympiad / nwonwhyyvqgqxigrskqc
- Keep nonce checks enabled and reject identities without email.
- Existing app callback: https://scottsdaleolympiad.com/olympiad/auth/callback
- Use only the invited Google accounts during the pilot; confirm Google testing-mode restrictions before testing Clayton.
- Credentials belong in the Supabase provider settings, never source control or NEXT_PUBLIC environment values.

## Checks

TypeScript check passed. Production build passed with webpack in an isolated checkout. The initial Turbopack build rejected the temporary checkout's node_modules symlink; this was a local build layout issue, not an authentication result.

Before enabling: test Google account selection, cancellation, wrong-account rejection, same-email identity linking and user-ID preservation (including unconfirmed Clayton account), saved team/roster persistence, returning sign-in, and captain denial of chairman access. An existing unconfirmed email identity must not be assumed linked without a live check. No test captain or new invitation was created.

References:
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/auth-identity-linking
