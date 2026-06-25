-- Store parsed Squarespace tax-credit contribution notification emails.

create extension if not exists pgcrypto;

create table if not exists public.squarespace_tax_credit_email_imports (
  id uuid primary key default gen_random_uuid(),
  gmail_message_id text not null unique,
  gmail_thread_id text,
  gmail_label_ids text[] not null default '{}'::text[],
  message_date timestamptz,
  from_email text,
  subject text,
  snippet text,
  parse_status text not null default 'pending',
  error_text text,
  contribution_number text,
  customer_name text,
  customer_email text,
  amount numeric(12,2) check (amount is null or amount >= 0),
  currency text not null default 'USD',
  item_summary text,
  referring_member_raw text,
  olympiad_team_raw text,
  transaction_attribution_id uuid references public.transaction_attributions(id) on delete set null,
  squarespace_order_id uuid references public.squarespace_orders(id) on delete set null,
  parsed_payload jsonb not null default '{}'::jsonb,
  body_text_sample text,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint squarespace_tax_credit_email_imports_parse_status_not_empty check (length(btrim(parse_status)) > 0)
);

create index if not exists idx_squarespace_tax_credit_email_imports_message_date
  on public.squarespace_tax_credit_email_imports(message_date desc);

create index if not exists idx_squarespace_tax_credit_email_imports_customer
  on public.squarespace_tax_credit_email_imports(lower(customer_email), amount)
  where customer_email is not null and amount is not null;

create index if not exists idx_squarespace_tax_credit_email_imports_referring_member
  on public.squarespace_tax_credit_email_imports(referring_member_raw)
  where referring_member_raw is not null;

create index if not exists idx_squarespace_tax_credit_email_imports_status
  on public.squarespace_tax_credit_email_imports(parse_status, imported_at desc);

drop trigger if exists set_updated_at_squarespace_tax_credit_email_imports
  on public.squarespace_tax_credit_email_imports;
create trigger set_updated_at_squarespace_tax_credit_email_imports
before update on public.squarespace_tax_credit_email_imports
for each row execute procedure public.set_updated_at();

alter table public.squarespace_tax_credit_email_imports enable row level security;

drop policy if exists "Tax credit email imports readable by board+"
  on public.squarespace_tax_credit_email_imports;
create policy "Tax credit email imports readable by board+"
on public.squarespace_tax_credit_email_imports
for select
using (public.is_admin_or_board());

drop policy if exists "Tax credit email imports writable by board+"
  on public.squarespace_tax_credit_email_imports;
create policy "Tax credit email imports writable by board+"
on public.squarespace_tax_credit_email_imports
for all
using (public.is_admin_or_board())
with check (public.is_admin_or_board());
