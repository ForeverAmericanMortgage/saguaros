# Stripe Referral Email Automation

Last updated: 2026-06-24

## Flow

1. Squarespace completes a website transaction through Stripe.
2. Stripe sends a webhook to `POST /api/stripe/webhook`.
3. The Hub verifies the `stripe-signature` header with `STRIPE_WEBHOOK_SECRET`.
4. Supported Stripe events are normalized into `transaction_attributions`:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `charge.succeeded`
5. The automation extracts the website field named `referring clubmember` from Stripe metadata or Checkout custom fields.
6. The submitted value is resolved to a club member through `member_referral_aliases`, then by exact member name or email in `contacts`.
7. If the member has an email address and has not opted out, Google Workspace sends an internal no-reply email.
8. Outcomes are written to `transaction_email_notifications` and `integration_sync_log`.

## Required Env

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=

GOOGLE_WORKSPACE_SENDER_EMAIL=
GOOGLE_WORKSPACE_DELEGATED_USER=
GOOGLE_WORKSPACE_REPLY_TO_EMAIL=alerts@saguaros.com
GOOGLE_WORKSPACE_SERVICE_ACCOUNT_FILE=
GOOGLE_WORKSPACE_CLIENT_EMAIL=
GOOGLE_WORKSPACE_PRIVATE_KEY=
GOOGLE_WORKSPACE_EMAIL_DRY_RUN=true
```

Use `GOOGLE_WORKSPACE_EMAIL_DRY_RUN=true` in local development or first production tests. The webhook still records the transaction and notification audit row, but it does not send a real email.

## Stripe Dashboard Setup

Create a webhook endpoint:

```text
https://<production-domain>/api/stripe/webhook
```

Subscribe to:

```text
checkout.session.completed
payment_intent.succeeded
charge.succeeded
```

If Squarespace sends the referral field into Stripe as metadata, the field can be named any of:

```text
referring clubmember
referring club member
referring member
clubmember
member referral
referrer
```

If Stripe does not receive that field from Squarespace, add a Squarespace order/form ingestion step that looks up the Squarespace order by the Stripe payment id and writes the same raw value into `transaction_attributions.referring_member_raw`.

## Member Setup

Members must exist in `contacts` with:

```text
contact_type = member
email = member@saguaros.com
transaction_email_opt_out = false
```

Seed known spelling variants in `member_referral_aliases`:

```sql
insert into public.member_referral_aliases (member_contact_id, alias, normalized_alias)
values (
  '<contact-id>',
  'Sean Caldwell',
  'seancaldwell'
);
```

The webhook will automatically remember a submitted alias after it exactly matches an existing member full name, reversed name, or email.

## Go-Live Checks

- Run migration `20260624_000007_stripe_referral_sms.sql`.
- Run migration `20260624_000009_google_workspace_email_alerts.sql`.
- Confirm the Stripe webhook secret in production matches the endpoint.
- Confirm Gmail API is enabled in the Saguaros Google Cloud project.
- Confirm the service account client ID is authorized in Google Admin domain-wide delegation with `https://www.googleapis.com/auth/gmail.send`.
- Send one Stripe test-mode transaction with `GOOGLE_WORKSPACE_EMAIL_DRY_RUN=true`.
- Check `transaction_attributions`, `transaction_email_notifications`, and `integration_sync_log`.
- Set `GOOGLE_WORKSPACE_EMAIL_DRY_RUN=false` only after the dry-run record matches the expected member.
