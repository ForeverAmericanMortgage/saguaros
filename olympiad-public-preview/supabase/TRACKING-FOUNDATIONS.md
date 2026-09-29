# Tracking foundations — migration ready, not applied remotely

Migration: `20260929160450_tracking_foundations.sql`. Depends on initial pilot schema and cohort gate. This migration is replayable: it adds/replaces definitions without resetting event activation or deleting application data. Local replay is covered by the test runner. Apply only to **Olympiad** `nwonwhyyvqgqxigrskqc`; never the internal Saguaros Hub.

## API contract

- `save_roster(uuid,jsonb,integer)` keeps the same signature/return count. Send saved participant IDs with edited rows. Existing rows are updated in place, retaining ID and creation timestamp; omitted IDs are deleted, new rows without IDs get generated IDs. Supplied unknown/cross-team IDs and duplicate IDs fail. Partial rows remain valid. Roster version conflict is atomic. Email clearing/reordering is transaction-local; a rejected duplicate email restores the original roster.
- `team_fundraising_goals`: `team_id uuid` PK, `stretch_goal_cents bigint >= 300000`, `updated_at timestamptz`. Organizer can insert/update/delete; captain can read their own team's goal. Public can read goals only for opted-in teams. No row means default **300000 cents ($3,000)**. Roster size never changes this minimum. Use integer cents in requests/storage and format dollars in UI.
- `event_editions.fundraising_active boolean` defaults false, organizer-only update. **Do not activate during current pilot.** Registration remains governed by the existing registration/cohort gates.
- `fundraising_leaderboard`: security-invoker, read-only view with `team_id,event_id,team_name,company_name,slug,industry_id,total_cents,stretch_goal_cents,posted_entries`. Returns opted-in teams only in active editions, with zero for no verified posted entries. While inactive it returns **no rows**, so the API should return an explicit inactive state, not imply an active zero-dollar competition. No ranking is preassigned; callers can order within industry after activation.
- `team_fundraising_totals`: sanitized physical projection, no client writes. Anonymous reads require active edition and public team; captains may read their own private total, organizers all totals. Public UI should consume the gated leaderboard view.

## Ledger foundation and future credit mapping

`fundraising_ledger` is organizer-only, with no captain/anonymous raw access and no delete grant. Fields: `id,event_id,team_id,source_namespace,source_transaction_id,source_entry_key,referring_club_member_raw,olympiad_team_raw,attribution_status,amount_cents,currency,status,verified_by,verified_at,created_at`.

Defaults are `status=pending`, `attribution_status=unmatched`, `currency=USD`, `source_entry_key=payment`. `team_id` may be null until resolved. `unmatched` and `ambiguous` source values must remain pending; posting requires an explicitly matched team. Team/event must agree. A posted entry is stamped with the authenticated organizer and current timestamp by a trigger. Source namespace + transaction ID + entry key is unique to prevent same-source retry duplication. Refund/adjustment entries can be negative amounts with distinct entry keys; only verified posted entries count. Voiding a posted record removes its amount from the projection. Projection writes serialize under an advisory transaction lock.

The existing internal app's “referring club member” must remain a raw source value, separate from resolved team UUID. `referring_club_member_raw` retains it alongside `olympiad_team_raw`; do not rename that source field to team name or infer a team automatically. A future reviewed integration must resolve aliases in the event context, preserve member attribution, reconcile cross-provider duplicate payments, and import refunds. Source uniqueness here does **not** deduplicate one payment represented by Stripe and Squarespace. No importer, webhook, payment processing, public fundraising activation, or financial backfill is included.

## Local evidence and remaining checks

Run from repo root:

```sh
PGLITE_MODULE=/tmp/olympiad-db-audit/node_modules/@electric-sql/pglite/dist/index.js node olympiad-public-preview/tests/tracking-foundations-audit.mjs
```

Passed locally: full migration chain, foundation reapplication, stable roster IDs/created-at under reorder, partial data, stale versions, two-captain isolation/foreign participant IDs, organizer-only ledger/goals, $3,000 floor, inactive amount suppression, pending exclusion, verified posted net amounts including reversal, private-team/opt-out visibility, and transaction rollback cleanup.

`tests/tracking-foundations-rollback.sql` is the same reusable fixture test for a writable hosted SQL runner; it returns PASS/FAIL and always ends ROLLBACK. It temporarily creates synthetic Auth IDs, enrolls the test cohort, opens/activates the event within the transaction, then rolls all of it back. It sends nothing and never creates real sessions. Parent must review before hosted use. This remains a role/claim SQL simulation, not proof of real JWT, GoTrue, PostgREST, or concurrent-session behavior.

Existing invoker RPCs require direct table grants; a captain can still mutate their own permitted roster columns directly without using optimistic version checks. Cross-team RLS still applies. All legitimate application writes should use the RPC. Future external consent references should handle intentionally removed participant rows, not depend on delete/reinsert behavior. The new implementation avoids unnecessary deletes for surviving IDs but does not implement participant consent or communications.
