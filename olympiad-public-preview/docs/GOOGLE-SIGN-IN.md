# Google captain sign-in

Status: enabled and deployed to scottsdaleolympiad.com on September 30, 2026. Live first and returning Google sign-in passed for scaldwell@saguaros.com. The same user ID, saved team, roster and organizer membership were preserved. Clayton’s first Google login remains pending.

## Implementation

- Continue with Google appears only when server setting OLYMPIAD_GOOGLE_SIGN_IN_ENABLED=true.
- Same-origin POST starts Supabase Google OAuth with a server-managed PKCE verifier in the existing HTTP-only Olympiad cookie.
- Callback exchanges the code, requires a verified email and the existing exact pilot allowlist, and signs out accounts outside that list.
- Existing pilot registration RLS and organizer membership checks remain authoritative. Google login does not grant chairman access.
- Only basic identity scopes are needed; no Gmail, Drive or contacts access.
- Email magic links remain available.

## Provider setup

Existing Google Cloud project: Saguaros / gen-lang-client-0908092386.
Consent app name: Scottsdale Olympiad. Google permits only the currently selected project user's support address in the dropdown (sean.caldwell4@gmail.com); developer notification address is scaldwell@saguaros.com. Review the support address before public launch.
The operator accepted the Google API Services User Data Policy, created the OAuth client and saved its credentials directly in Supabase. Google provider is enabled. Google publishing status is Testing; test users are scaldwell@saguaros.com, clayton.wolfe@theagencyre.com and megan@thebrokery.com (added and verified September 30). Megan is also in the 2027 invitation table and production pilot allowlist; her actual login remains pending.

Configured Web application OAuth client:
- Origin: https://scottsdaleolympiad.com
- Authorized redirect: https://nwonwhyyvqgqxigrskqc.supabase.co/auth/v1/callback
- Supabase project: Olympiad / nwonwhyyvqgqxigrskqc
- Keep nonce checks enabled and reject identities without email.
- Existing app callback: https://scottsdaleolympiad.com/olympiad/auth/callback
- Use only the invited Google accounts during the pilot; confirm Google testing-mode restrictions before testing Clayton.
- Credentials belong in the Supabase provider settings, never source control or NEXT_PUBLIC environment values.

## Checks

TypeScript check passed. Production build passed with webpack in an isolated checkout. The initial Turbopack build rejected the temporary checkout's node_modules symlink; this was a local build layout issue, not an authentication result.

Live checks passed: account selection, basic name/profile/email permissions, same-email identity linking, user-ID preservation, saved team/roster persistence and returning sign-in without another consent prompt. Backend verified email and google identities on the same existing scaldwell account, with captain and organizer memberships intact. Vercel production deployment dpl_6Rys6cd8CLJyuXuthfshbYxWrJRM is Ready; its build and TypeScript checks passed.

Remaining pilot checks: Clayton’s first Google login and existing unconfirmed-email identity handling, cancellation, wrong-account rejection and captain denial of chairman access. Before broad launch, complete Google branding and production audience setup and review the support email. No new captain, team or invitation was created by this Google smoke test.

References:
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/auth-identity-linking
