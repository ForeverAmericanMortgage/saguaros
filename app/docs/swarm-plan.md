# Saguaros Build Swarm Plan

Last updated: 2026-03-05

## Objective
Run parallel delivery tracks so the Hub keeps shipping while integrations are onboarded.

## Swarm Tracks

### Swarm A: Messaging MVP (Product)
- Scope: channel list, thread view, post message, unread state.
- Primary files:
- `src/app/messages/page.tsx`
- `src/components/hub/MessageFeed.tsx`
- `src/components/hub/ChannelList.tsx`
- `src/lib/messaging.ts`
- Exit criteria:
- Can post/read in `general` channel.
- Realtime updates work for new messages.
- Unread counters clear on open.

### Swarm B: Stripe Ingest (Integrations)
- Scope: connection status, webhook ingestion, donation reconciliation.
- Primary files:
- `src/app/api/stripe/status/route.ts`
- `src/app/api/stripe/webhook/route.ts`
- `src/lib/integrations/stripe.ts`
- `src/components/hub/StripeConnectionCard.tsx`
- Exit criteria:
- Webhook event creates/updates donation record.
- Sync logs written to `sync_runs` and `integration_sync_log`.

### Swarm C: Squarespace Ingest (Integrations)
- Scope: import contacts/orders/event registrations from Squarespace.
- Primary files:
- `src/app/api/squarespace/status/route.ts`
- `src/app/api/squarespace/ingest/route.ts`
- `src/lib/integrations/squarespace.ts`
- `src/components/hub/SquarespaceConnectionCard.tsx`
- Exit criteria:
- Test ingest writes normalized records and sync log entries.
- Duplicate handling based on external IDs.

### Swarm D: Brand System (Frontend)
- Scope: codify design tokens from Saguaros visual language and apply to key pages.
- Primary files:
- `src/app/globals.css`
- `src/components/hub/HubShell.tsx`
- `src/components/hub/ModulePlaceholder.tsx`
- `docs/brand-guidelines.md`
- Exit criteria:
- Shared token usage for spacing, typography, and color.
- Core pages look consistent desktop/mobile.

## Weekly Sequence

### Week 1
- Messaging MVP live in one channel.
- Stripe + Squarespace status endpoints and settings cards.
- Brand token pass on dashboard/settings/messages.

### Week 2
- Stripe webhook to donation reconciliation.
- Squarespace ingest job with mapping.
- Messaging unread + mention polish.

## Risk Controls
- All integration writes go through `integration_sync_log` and `sync_runs`.
- No provider secrets in client code.
- Each swarm ships behind safe, incremental routes/endpoints.
