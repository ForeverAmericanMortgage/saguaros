# Microsoft captain sign-in

## Provider setup

Create a dedicated Scottsdale Olympiad application in Microsoft Entra. Support accounts in any organizational directory and personal Microsoft accounts (`AzureADandPersonalMicrosoftAccount`). Web redirect URI: `https://nwonwhyyvqgqxigrskqc.supabase.co/auth/v1/callback`.

Request only `openid email profile`. Remove default Graph API permissions such as `User.Read` if the app registration adds them; no mail, contacts, calendar, files, directory or offline-access permissions are needed. Inspect the actual consent screen before release. Use Saguaros-owned branding and publisher verification where available. A company may still block user consent under its own policies.

Configure optional ID-token claims `email` and `xms_edov`, plus access-token `xms_edov`, as recommended by Supabase. Do not enable unverified email domains. Store the client secret only in the Supabase Azure provider configuration. Configure the tenant URL as `https://login.microsoftonline.com/common`. Record the secret expiration with the responsible administrator.

Enable `OLYMPIAD_MICROSOFT_SIGN_IN_ENABLED=true` in the production Vercel environment only after the provider configuration is complete. The feature is otherwise hidden and the start endpoint rejects requests.

## Existing captains

Supabase automatically links OAuth identities with matching verified email addresses to the existing Auth user. Team ownership remains attached to that user ID; this change does not reassign teams or match identities by name/domain. Microsoft aliases or a different email may produce a separate account. The page instructs returning captains to use the same email, with email-link fallback.

## Required live acceptance

- Verify the outgoing Microsoft scopes contain only openid, email and profile.
- Exercise a regular Microsoft 365 company account and a personal Microsoft account.
- Confirm name/email-only consent; record any publisher warning or administrator approval requirement.
- With a captain who already used an email link, confirm the same Auth user ID and team ID after Microsoft sign-in, and no duplicate user/team.
- Cancel sign-in and exercise the fallback. Company-hosted approval pages may never redirect back; the user must return to the Olympiad page to choose the fallback.
- Confirm Google sign-in still works, email fallback remains available, and chairman access is unchanged.

## Validation so far

Six route tests cover minimal requested scopes, disabled-provider gating, cross-origin protection, Google regression, existing user/team routing, provider error recovery and rejection of unverified identity. These are mocked route tests, not proof of Microsoft's hosted consent or automatic linking. Live provider tests await Microsoft administrator sign-in and app registration.
