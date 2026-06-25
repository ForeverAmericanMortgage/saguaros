# Squarespace Tax Credit Reporting

Purpose: import paid `saguaros.tax` Squarespace orders into the Saguaros Hub without changing the existing `saguaros.com` order monitor.

## Current Finding

The tax-credit checkout must stay on Squarespace Donations/Contributions for compliance. The public
Transactions API exposes the paid transaction ledger, but it does not expose the donation checkout
form fields for `Referring Club Member` or `Olympiad Team`.

Those fields are visible in Squarespace Admin under:

`Donations -> Contributions -> Contribution detail -> Summary -> Referral Credit`

The production automation therefore uses two sources:

- Squarespace Transactions API: payment truth for `saguaros.tax`
- Squarespace contribution notification email: attribution truth for referral/team fields

## Required Squarespace Access

Add the monitored Google Workspace mailbox as a contributor on
`pelican-wrasse-d2jk.squarespace.com` with a role that receives store/donation notifications
(`Store Manager` or `Administrator`). Then sign into that mailbox's Squarespace account and confirm
Store notifications are enabled for `www.saguaros.tax`.

## Required Environment Variables

Set these only after confirming the API key belongs to the tax-credit site:

```bash
SQUARESPACE_TAX_CREDIT_API_KEY=
SQUARESPACE_TAX_CREDIT_SITE_ID=
SQUARESPACE_TAX_CREDIT_ALERTS_START_AT=
SQUARESPACE_TAX_CREDIT_CRON_PAYMENT_STATES=PAID
SQUARESPACE_TAX_CREDIT_CRON_MAX_PAGES=2
SQUARESPACE_TAX_CREDIT_EMAIL_ALERTS_ENABLED=false
SQUARESPACE_TAX_CREDIT_EMAIL_INGEST_ENABLED=false
GOOGLE_WORKSPACE_TAX_CREDIT_INBOX_USER=taxcredit-alerts@saguaros.com
SQUARESPACE_TAX_CREDIT_EMAIL_QUERY=newer_than:30d "Arizona Tax Credit"
SQUARESPACE_TAX_CREDIT_EMAIL_PROCESSED_LABEL=SaguarosTaxCreditProcessed
SQUARESPACE_TAX_CREDIT_EMAIL_MAX_MESSAGES=10
SQUARESPACE_TAX_CREDIT_EMAIL_MATCH_WINDOW_HOURS=48
SQUARESPACE_TAX_CREDIT_EMAIL_ALERTS_START_AT=
```

Keep `SQUARESPACE_TAX_CREDIT_EMAIL_INGEST_ENABLED=false` until the monitored mailbox exists,
Squarespace is sending notices there, and Google Workspace domain-wide delegation has Gmail
modify scope authorized. Keep `SQUARESPACE_TAX_CREDIT_EMAIL_ALERTS_ENABLED=false` for the first
parser dry run so parsed rows can be validated before sending member alerts.

## Google Workspace Setup

Create or confirm a dedicated mailbox:

`taxcredit-alerts@saguaros.com`

The service account that already sends Saguaros alert emails needs domain-wide delegation with:

```text
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.modify
```

The `gmail.modify` scope allows the cron to read the dedicated inbox and add the
`SaguarosTaxCreditProcessed` label after processing. Do not use a Google Group as the parser inbox;
Groups are fine for human visibility, but Gmail API mailbox parsing should use a real user mailbox.

## Live Paths

- Manual dry run: `/api/squarespace/ingest?sourceKey=tax_credit&dryRun=true&paymentStates=PAID&maxPages=2`
- Manual import: `/api/squarespace/ingest?sourceKey=tax_credit&dryRun=false&paymentStates=PAID&maxPages=2`
- Transaction cron route: `/api/cron/squarespace-tax-credit-orders`
- Email parser cron route: `/api/cron/squarespace-tax-credit-email-alerts`
- Report page: `/fundraising/tax-credit`

The existing main-site monitor remains on `/api/cron/squarespace-orders` and uses the original `SQUARESPACE_API_KEY` settings.

## Go-Live Order

1. Confirm the monitored mailbox receives one real Squarespace tax-credit contribution notification.
2. Run the email parser with `dryRun=true` and `enabled=true`.
3. Confirm parsed buyer/referrer/team fields and matched transaction row.
4. Set `SQUARESPACE_TAX_CREDIT_EMAIL_INGEST_ENABLED=true`.
5. Set `SQUARESPACE_TAX_CREDIT_EMAIL_ALERTS_START_AT` to the go-live timestamp.
6. Set `SQUARESPACE_TAX_CREDIT_EMAIL_ALERTS_ENABLED=true`.
