# Google Workspace Email Alerts

Last updated: 2026-06-24

## Purpose

Send internal transaction attribution alerts to Saguaros members through the Saguaros Google Workspace, without Twilio.

The app sends through Gmail API with a Google Cloud service account and Workspace domain-wide delegation. The service account authenticates the backend, then impersonates a real Workspace mailbox through `GOOGLE_WORKSPACE_DELEGATED_USER`.

Member alert recipients are always Saguaros-domain addresses. The app derives the recipient as `first initial + last name@saguaros.com` from the matched member contact, instead of using the personal or business email stored on the roster contact.

## Current State

- `alerts@saguaros.com` exists as a Google Group.
- The group is suitable for Reply-To, distribution, and audit visibility.
- A Google Group is not itself a Gmail mailbox for service-account impersonation.
- Use a real Workspace user mailbox for `GOOGLE_WORKSPACE_DELEGATED_USER`.
- Use `alerts@saguaros.com` as `GOOGLE_WORKSPACE_REPLY_TO_EMAIL`.

If the desired visible sender is `alerts@saguaros.com`, configure it as a Gmail "Send mail as" alias for the delegated mailbox, then set `GOOGLE_WORKSPACE_SENDER_EMAIL=alerts@saguaros.com`.

## Google Cloud Setup

Use the Saguaros Workspace account, not the FAM Studio Google Cloud project.

1. Open Google Cloud Console.
2. Create or select a Saguaros-owned project, for example `Saguaros Automation`.
3. Enable Gmail API for that project.
4. Create a service account, for example `saguaros-transaction-alerts`.
5. Enable domain-wide delegation on the service account.
6. Copy the service account OAuth client ID.
7. Create a JSON key and store it only in the deployment secret manager or local `.env.local`.

Official setup references:

- Google Workspace credentials guide: https://developers.google.com/workspace/guides/create-credentials
- Google Admin domain-wide delegation guide: https://knowledge.workspace.google.com/admin/apps/control-api-access-with-domain-wide-delegation

## Google Admin Setup

In Google Admin Console as a Super Admin:

1. Go to `Security > Access and data control > API controls`.
2. Open `Domain-wide delegation`.
3. Add a new API client.
4. Paste the service account OAuth client ID.
5. Add this OAuth scope:

```text
https://www.googleapis.com/auth/gmail.send
```

6. Authorize the client.

## App Environment

```bash
GOOGLE_WORKSPACE_SENDER_EMAIL=automation-user@saguaros.com
GOOGLE_WORKSPACE_DELEGATED_USER=automation-user@saguaros.com
GOOGLE_WORKSPACE_REPLY_TO_EMAIL=alerts@saguaros.com
GOOGLE_WORKSPACE_SERVICE_ACCOUNT_FILE=.secrets/google-workspace-service-account.json
GOOGLE_WORKSPACE_CLIENT_EMAIL=<service-account-email>
GOOGLE_WORKSPACE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_WORKSPACE_EMAIL_DRY_RUN=true
```

Use `GOOGLE_WORKSPACE_SERVICE_ACCOUNT_FILE` for local development when you have the downloaded JSON key on disk. In hosted environments, use `GOOGLE_WORKSPACE_CLIENT_EMAIL` and `GOOGLE_WORKSPACE_PRIVATE_KEY` instead of committing or uploading the JSON file.

Keep `GOOGLE_WORKSPACE_EMAIL_DRY_RUN=true` until a test transaction creates the expected `transaction_email_notifications` row.

## Local Tests

Check loaded configuration:

```bash
curl http://localhost:3000/api/google-workspace/email/status
```

Send a dry-run or live test, depending on `GOOGLE_WORKSPACE_EMAIL_DRY_RUN`:

```bash
curl -X POST http://localhost:3000/api/google-workspace/email/test \
  -H 'Content-Type: application/json' \
  --data '{"to":"alerts@saguaros.com"}'
```

Run Squarespace ingest without sending historical alerts:

```bash
curl -X POST 'http://localhost:3000/api/squarespace/ingest?maxPages=1&sendEmailAlerts=true'
```

Existing orders should return `emailAlerts.attempted = 0`. Only newly imported paid orders are eligible for email alerts.

## Production Go-Live

1. Confirm the delegated user can send from the configured sender address.
2. Confirm `/api/google-workspace/email/status` shows credentials present.
3. Run one dry-run transaction alert and verify the notification audit row.
4. Set `GOOGLE_WORKSPACE_EMAIL_DRY_RUN=false`.
5. Send one live test email to an internal address.
6. Set `SQUARESPACE_ALERTS_START_AT` to the go-live ISO timestamp.
7. Enable the hourly Vercel cron route at `/api/cron/squarespace-orders`.

The production cron only alerts on orders that meet all of these conditions:

- The order is newly discovered by the app, not already in `squarespace_orders`.
- `paymentState` is `PAID`.
- The order was created at or after `SQUARESPACE_ALERTS_START_AT`.
- A referring member/team custom field is present and non-blank.
- The matched member has enough name data to derive a Saguaros-domain recipient.

If the referral value does not resolve to a member contact, the app records a skipped notification row instead of sending an email.

Vercel Cron calls the route with `Authorization: Bearer ${CRON_SECRET}`. Keep `CRON_SECRET` set only in local `.env.local` and Vercel environment variables.

## Audit Tables

- `transaction_attributions`: normalized payment/order attribution.
- `transaction_email_notifications`: every sent, skipped, dry-run, or failed email alert.
- `member_contact_import_runs`: roster import audit summary.
- `member_contact_source_records`: hashed source-row provenance.
