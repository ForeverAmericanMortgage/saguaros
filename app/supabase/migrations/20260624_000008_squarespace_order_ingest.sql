-- Squarespace order ingest storage for referral and team attribution.

create extension if not exists pgcrypto;

create table if not exists public.squarespace_orders (
  id uuid primary key default gen_random_uuid(),
  squarespace_order_id text not null unique,
  order_number text,
  created_on timestamptz,
  modified_on timestamptz,
  payment_state text,
  fulfillment_status text,
  channel text,
  customer_name text,
  customer_email text,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  currency text not null default 'USD',
  product_summary text,
  form_fields jsonb not null default '[]'::jsonb,
  referring_member_raw text,
  olympiad_team_raw text,
  raw_payload jsonb not null,
  transaction_attribution_id uuid references public.transaction_attributions(id) on delete set null,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_squarespace_orders_created_on
  on public.squarespace_orders(created_on desc);

create index if not exists idx_squarespace_orders_payment_state
  on public.squarespace_orders(payment_state);

create index if not exists idx_squarespace_orders_referring_member
  on public.squarespace_orders(referring_member_raw)
  where referring_member_raw is not null;

create index if not exists idx_squarespace_orders_olympiad_team
  on public.squarespace_orders(olympiad_team_raw)
  where olympiad_team_raw is not null;

drop trigger if exists set_updated_at_squarespace_orders on public.squarespace_orders;
create trigger set_updated_at_squarespace_orders
before update on public.squarespace_orders
for each row execute procedure public.set_updated_at();

alter table public.squarespace_orders enable row level security;

drop policy if exists "Squarespace orders readable by board+" on public.squarespace_orders;
create policy "Squarespace orders readable by board+"
on public.squarespace_orders
for select
using (public.is_admin_or_board());

drop policy if exists "Squarespace orders writable by board+" on public.squarespace_orders;
create policy "Squarespace orders writable by board+"
on public.squarespace_orders
for all
using (public.is_admin_or_board())
with check (public.is_admin_or_board());
