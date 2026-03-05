# Integration Intake Checklist

Last updated: 2026-03-05

Fill this before implementation to avoid blockers.

## QuickBooks (Current: Connected in sandbox)
- Intuit app environment: `sandbox` or `production`
- OAuth redirect URI approved in Intuit app
- Realm/company to sync from
- Sync direction:
- Contacts -> QBO customers
- Donations -> QBO invoices/estimates
- Update cadence: manual / hourly / daily

## Stripe
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- Stripe account mode: test/live
- Payment use case:
- One-time donations
- Sponsorship payments
- Tickets
- Required fields to map into `donations`
- Refund behavior policy

## Squarespace
- Site ID / API credentials or webhook auth secret
- Which data to ingest first:
- Orders
- Form submissions
- Event registrations
- Mapping target:
- `contacts`
- `donations`
- `events`
- Deduplication key (email, order_id, external_contact_id)

## Mailchimp
- `MAILCHIMP_API_KEY`
- Audience/List ID
- Required tags/segments
- Suppression sync required: yes/no
- Campaign ownership workflow

## Google (Drive/Workspace)
- Service account JSON key
- Shared Drive ID(s)
- Root folder IDs by module/event
- Domain-wide delegation needed: yes/no
- Permission model by role (`admin`, `board`, `member`, `viewer`)

## Operational Inputs Needed From You
- Preferred production domain (for OAuth/webhooks)
- Who owns each provider account (name + email)
- Rotation owner for secrets
- Alert destination for integration failures (email/Slack)

## Minimum Go-Live Package
- One primary owner per integration
- Test and live credentials confirmed
- Webhook endpoints reachable from internet
- Dry-run sync signed off in Settings
