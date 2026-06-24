-- Google Workspace transaction email alerts and member roster import provenance.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'transaction_email_status') then
    create type public.transaction_email_status as enum (
      'pending',
      'sent',
      'failed',
      'skipped_no_referrer',
      'skipped_member_not_found',
      'skipped_no_email',
      'skipped_member_opted_out',
      'dry_run'
    );
  end if;
end $$;

alter table public.contacts
  add column if not exists transaction_email_opt_out boolean not null default false;

alter table public.contacts
  add column if not exists transaction_email_opt_out_reason text;

create table if not exists public.transaction_email_notifications (
  id uuid primary key default gen_random_uuid(),
  transaction_attribution_id uuid not null unique references public.transaction_attributions(id) on delete cascade,
  member_contact_id uuid references public.contacts(id) on delete set null,
  to_email text,
  from_email text,
  subject text not null,
  message_body text not null,
  status public.transaction_email_status not null default 'pending',
  provider text not null default 'google_workspace',
  provider_message_id text,
  error_text text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transaction_email_notifications_member
  on public.transaction_email_notifications(member_contact_id, created_at desc)
  where member_contact_id is not null;

create index if not exists idx_transaction_email_notifications_status
  on public.transaction_email_notifications(status, created_at desc);

create table if not exists public.member_contact_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_system text not null default 'google_sheets_csv',
  source_detail text,
  source_file_name text not null,
  source_file_sha256 text,
  row_count integer not null default 0,
  inserted_contacts integer not null default 0,
  updated_contacts integer not null default 0,
  inserted_members integer not null default 0,
  updated_members integer not null default 0,
  inserted_aliases integer not null default 0,
  skipped_rows integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_contact_source_records (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid references public.member_contact_import_runs(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  member_id uuid references public.members(id) on delete set null,
  source_system text not null default 'google_sheets_csv',
  source_detail text,
  source_file_name text,
  source_file_sha256 text,
  record_hash text not null,
  raw_record jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_contact_source_records_unique_source unique (source_system, record_hash)
);

create index if not exists idx_member_contact_import_runs_source
  on public.member_contact_import_runs(source_system, created_at desc);

create index if not exists idx_member_contact_source_records_contact
  on public.member_contact_source_records(contact_id)
  where contact_id is not null;

create index if not exists idx_member_contact_source_records_import
  on public.member_contact_source_records(import_run_id);

drop trigger if exists set_updated_at_transaction_email_notifications on public.transaction_email_notifications;
create trigger set_updated_at_transaction_email_notifications
before update on public.transaction_email_notifications
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_member_contact_import_runs on public.member_contact_import_runs;
create trigger set_updated_at_member_contact_import_runs
before update on public.member_contact_import_runs
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_member_contact_source_records on public.member_contact_source_records;
create trigger set_updated_at_member_contact_source_records
before update on public.member_contact_source_records
for each row execute procedure public.set_updated_at();

alter table public.transaction_email_notifications enable row level security;
alter table public.member_contact_import_runs enable row level security;
alter table public.member_contact_source_records enable row level security;

drop policy if exists "Transaction email notifications readable by board+" on public.transaction_email_notifications;
create policy "Transaction email notifications readable by board+"
on public.transaction_email_notifications
for select
using (public.is_admin_or_board());

drop policy if exists "Transaction email notifications writable by board+" on public.transaction_email_notifications;
create policy "Transaction email notifications writable by board+"
on public.transaction_email_notifications
for all
using (public.is_admin_or_board())
with check (public.is_admin_or_board());

drop policy if exists "Member contact import runs readable by board+" on public.member_contact_import_runs;
create policy "Member contact import runs readable by board+"
on public.member_contact_import_runs
for select
using (public.is_admin_or_board());

drop policy if exists "Member contact import runs writable by board+" on public.member_contact_import_runs;
create policy "Member contact import runs writable by board+"
on public.member_contact_import_runs
for all
using (public.is_admin_or_board())
with check (public.is_admin_or_board());

drop policy if exists "Member contact source records readable by board+" on public.member_contact_source_records;
create policy "Member contact source records readable by board+"
on public.member_contact_source_records
for select
using (public.is_admin_or_board());

drop policy if exists "Member contact source records writable by board+" on public.member_contact_source_records;
create policy "Member contact source records writable by board+"
on public.member_contact_source_records
for all
using (public.is_admin_or_board())
with check (public.is_admin_or_board());
