# Saguaros Transaction Automation Resource Map

Last updated: 2026-06-24

## Goal

Create a transaction control plane that connects payment acceptance, donation/purchase attribution, member/team credit, SMS notifications, accounting sync, and reporting across currently siloed systems.

## Current Build Status

- Supabase project: `Saguaros Hub`
- Transaction attribution schema: installed
- Stripe webhook route: implemented in app code
- Squarespace order ingest: implemented and imported
- Google Workspace email alert path: implemented and live-tested with Gmail API
- Production Squarespace polling: implemented as an hourly secured Vercel cron route for new paid orders with a referral field
- Twilio support: dormant fallback, not active
- Core operational tables checked on 2026-06-24:
  - imported Squarespace orders: 4,391
  - transaction attributions: 4,391 Squarespace rows
  - transaction attributions with referring member raw value: 3,066
  - transaction attributions linked to current roster member: 1,861
  - unresolved referring member rows: 1,205
  - member contacts imported from active roster: 52
  - member contacts without email: 3
  - active referral aliases seeded: 153
  - `events`: 0
  - `olympiad_teams`: 0
  - `donations`: 0

## Systems To Connect

- Squarespace: website forms, commerce orders, custom checkout fields, product pages.
- Stripe: payment intents, charges, checkout sessions, products, prices, payment links, webhooks.
- Supabase: normalized source of truth for contacts, members, events, teams, attribution, audit logs, exceptions, reporting.
- QuickBooks Online: customers/donors, sales receipts, deposits, items, classes, funds, payment clearing, refunds.
- Google Workspace Gmail API: no-reply internal email notifications to club members or captains.
- Twilio: dormant SMS fallback, not active until sender registration and opt-out workflow are approved.
- Reporting surface: Saguaros Hub dashboards, exports, and reconciliation reports.

## Required Source Data

- Club member roster:
  - full name
  - preferred display name
   - phone in E.164 format
  - email
  - active/past member status
  - email alert opt-out flag
  - SMS opt-out flag if SMS is later reintroduced
  - known referral aliases or website dropdown labels
- Event/team model:
  - event names and dates
  - Olympiad divisions
  - teams
  - captains
  - team aliases
  - fundraising targets
- Product/payment catalog:
  - Squarespace product names/SKUs
  - Stripe product/price/payment-link ids
  - donation vs purchase classification
  - tax credit designation
  - event association
  - QBO item/account/class mapping
- Accounting mapping:
  - QBO chart of accounts
  - revenue accounts
  - clearing account for Stripe deposits
  - QBO items/services
  - classes, locations, funds, or projects if used
  - sales receipt vs deposit workflow
  - refund and chargeback policy

## Automation Sequence

1. Member and team imports
   - Import `contacts`, `members`, `olympiad_teams`, and referral aliases.
   - Normalize phone numbers and opt-out state before SMS sends.

2. Stripe payment ingest
   - Receive `checkout.session.completed`, `payment_intent.succeeded`, and `charge.succeeded`.
   - Extract `referring clubmember` from Stripe metadata or custom fields.
   - Store raw Stripe payload, normalized transaction, donation record, attribution, and exception status.

3. Squarespace enrichment
   - If Stripe does not receive the custom website field, look up the Squarespace order/form by Stripe payment id.
   - Backfill `referring_member_raw`, product context, and order details.

4. Member/captain notification
   - Match referral to a member alias.
   - Send through Google Workspace email from the delegated mailbox after Gmail API domain-wide delegation is approved.
   - In production, only alert on newly imported paid Squarespace orders with a populated referral field and `createdOn >= SQUARESPACE_ALERTS_START_AT`.
   - Log every notification in `transaction_email_notifications`.

5. QuickBooks sync
   - Create or match QBO customer/donor.
   - Create sales receipt or donation receipt based on accounting decision.
   - Map Stripe fees, deposits, refunds, and chargebacks through the agreed clearing workflow.
   - Store QBO ids back on the normalized transaction or donation record.

6. Exception queue
   - Surface unmatched member, missing product mapping, missing customer email, QBO sync failure, refund mismatch, and duplicate transaction cases.
   - Give operators a small review screen instead of burying exceptions in logs.

7. Reporting
   - Daily reconciliation: Stripe gross/net/fees/deposits vs QBO posted records.
   - Attribution: revenue by member, team, event, product, and campaign.
   - Tax credit tracking: donor, amount, receipt status, and QBO posting status.
   - Olympiad tracking: team totals, captain totals, division standings, unmatched payments.

## Decisions Needed

- Is Supabase the operating source of truth for member/team attribution, with QBO as accounting ledger?
- Should Stripe test-mode records be allowed in the production Supabase project, or should we create a staging project?
- Should member email alerts be transaction-only, or should members be able to opt into broader fundraising alerts?
- Should historical unresolved referral values be mapped to alumni/past members, or only to the current active roster?
- What is the official QBO posting model: sales receipt per payment, batch deposit reconciliation, or hybrid?
- Should teams and members both receive credit on one transaction, or should team credit derive from member/team membership?
- What should happen when the website referral field is blank, misspelled, or ambiguous?

## Immediate Next Resources Needed

- Current Olympiad/team/captain roster CSV.
- QBO admin access and accounting mapping decisions.
- Vercel production environment variables for Supabase, Squarespace, Google Workspace, cron secret, and go-live timestamp.
