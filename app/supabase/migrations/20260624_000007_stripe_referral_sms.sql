-- Stripe referral attribution and member SMS notifications.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'transaction_sms_status') then
    create type public.transaction_sms_status as enum (
      'pending',
      'sent',
      'failed',
      'skipped_no_referrer',
      'skipped_member_not_found',
      'skipped_no_phone',
      'skipped_member_opted_out',
      'dry_run'
    );
  end if;
end $$;

alter table public.contacts
  add column if not exists sms_opt_out boolean not null default false;

alter table public.contacts
  add column if not exists sms_opt_out_reason text;

create table if not exists public.member_referral_aliases (
  id uuid primary key default gen_random_uuid(),
  member_contact_id uuid not null references public.contacts(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_referral_aliases_alias_not_empty check (length(trim(alias)) > 0),
  constraint member_referral_aliases_normalized_not_empty check (length(trim(normalized_alias)) > 0)
);

create unique index if not exists idx_member_referral_aliases_normalized
  on public.member_referral_aliases(normalized_alias);

create index if not exists idx_member_referral_aliases_active
  on public.member_referral_aliases(is_active);

create index if not exists idx_member_referral_aliases_member
  on public.member_referral_aliases(member_contact_id);

create table if not exists public.transaction_attributions (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  provider_event_id text,
  provider_transaction_id text not null,
  provider_payment_intent_id text,
  provider_charge_id text,
  provider_customer_id text,
  customer_name text,
  customer_email text,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'usd',
  item_summary text,
  transaction_status text not null default 'completed',
  referring_member_raw text,
  referring_member_contact_id uuid references public.contacts(id) on delete set null,
  donation_id uuid references public.donations(id) on delete set null,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_transaction_id),
  unique(provider_event_id)
);

create index if not exists idx_transaction_attributions_referring_member
  on public.transaction_attributions(referring_member_contact_id);

create index if not exists idx_transaction_attributions_payment_intent
  on public.transaction_attributions(provider_payment_intent_id)
  where provider_payment_intent_id is not null;

create index if not exists idx_transaction_attributions_charge
  on public.transaction_attributions(provider_charge_id)
  where provider_charge_id is not null;

create table if not exists public.transaction_sms_notifications (
  id uuid primary key default gen_random_uuid(),
  transaction_attribution_id uuid not null unique references public.transaction_attributions(id) on delete cascade,
  member_contact_id uuid not null references public.contacts(id) on delete cascade,
  to_phone text not null,
  message_body text not null,
  status public.transaction_sms_status not null default 'pending',
  provider text not null default 'twilio',
  provider_message_id text,
  error_text text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transaction_sms_notifications_member
  on public.transaction_sms_notifications(member_contact_id, created_at desc);

create unique index if not exists idx_donations_stripe_payment_id_unique
  on public.donations(stripe_payment_id)
  where stripe_payment_id is not null;

drop trigger if exists set_updated_at_member_referral_aliases on public.member_referral_aliases;
create trigger set_updated_at_member_referral_aliases
before update on public.member_referral_aliases
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_transaction_attributions on public.transaction_attributions;
create trigger set_updated_at_transaction_attributions
before update on public.transaction_attributions
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_transaction_sms_notifications on public.transaction_sms_notifications;
create trigger set_updated_at_transaction_sms_notifications
before update on public.transaction_sms_notifications
for each row execute procedure public.set_updated_at();

alter table public.member_referral_aliases enable row level security;
alter table public.transaction_attributions enable row level security;
alter table public.transaction_sms_notifications enable row level security;

drop policy if exists "Member referral aliases readable by board+" on public.member_referral_aliases;
create policy "Member referral aliases readable by board+"
on public.member_referral_aliases
for select
using (public.is_admin_or_board());

drop policy if exists "Member referral aliases writable by board+" on public.member_referral_aliases;
create policy "Member referral aliases writable by board+"
on public.member_referral_aliases
for all
using (public.is_admin_or_board())
with check (public.is_admin_or_board());

drop policy if exists "Transaction attributions readable by board+" on public.transaction_attributions;
create policy "Transaction attributions readable by board+"
on public.transaction_attributions
for select
using (public.is_admin_or_board());

drop policy if exists "Transaction attributions writable by board+" on public.transaction_attributions;
create policy "Transaction attributions writable by board+"
on public.transaction_attributions
for all
using (public.is_admin_or_board())
with check (public.is_admin_or_board());

drop policy if exists "Transaction SMS notifications readable by board+" on public.transaction_sms_notifications;
create policy "Transaction SMS notifications readable by board+"
on public.transaction_sms_notifications
for select
using (public.is_admin_or_board());

drop policy if exists "Transaction SMS notifications writable by board+" on public.transaction_sms_notifications;
create policy "Transaction SMS notifications writable by board+"
on public.transaction_sms_notifications
for all
using (public.is_admin_or_board())
with check (public.is_admin_or_board());
