-- Saguaros Hub Phase 1 foundation schema
-- Run in Supabase SQL Editor for project qbqnbwknywkfqnblagsa

create extension if not exists pgcrypto;

-- Enums
create type public.app_role as enum ('admin', 'board', 'member', 'viewer');
create type public.contact_type as enum ('sponsor', 'donor', 'participant', 'vendor', 'member', 'alumni', 'media');
create type public.event_type as enum ('niteflite_golf', 'niteflite_gala', 'olympiad', 'other');
create type public.donation_type as enum ('sponsorship', 'individual', 'corporate', 'ticket', 'tax_credit', 'in_kind');
create type public.payment_status as enum ('pending', 'paid', 'refunded');
create type public.member_status as enum ('active', 'past_active', 'senior_active', 'life_member');
create type public.document_category as enum ('sop', 'template', 'contract', 'financial', 'brand_asset', 'meeting_notes', 'event_doc', 'transition', 'other');

-- Profiles and roles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.app_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Core CRM/fundraising tables
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text unique,
  phone text,
  company text,
  contact_type public.contact_type not null,
  tags text[] not null default '{}',
  notes text,
  mailchimp_id text,
  stripe_customer_id text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_type public.event_type not null,
  date date not null,
  venue text,
  theme text,
  attendance integer,
  total_raised numeric(12,2) not null default 0,
  notes text,
  drive_folder_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  donation_type public.donation_type not null,
  sponsorship_tier text,
  payment_status public.payment_status not null default 'pending',
  stripe_payment_id text,
  date date not null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null unique references public.contacts(id) on delete cascade,
  status public.member_status not null default 'active',
  join_year integer,
  board_roles jsonb not null default '[]'::jsonb,
  class_year text,
  bio text,
  fun_fact text,
  photo_url text,
  phone_visibility text not null default 'all_members',
  email_visibility text not null default 'all_members',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category public.document_category not null,
  tags text[] not null default '{}',
  drive_url text not null,
  drive_file_id text,
  event_id uuid references public.events(id) on delete set null,
  is_pinned boolean not null default false,
  last_verified date,
  added_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Utility functions
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
as $$
  select coalesce((select ur.role from public.user_roles ur where ur.user_id = auth.uid()), 'viewer'::public.app_role);
$$;

create or replace function public.is_admin_or_board()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('admin'::public.app_role, 'board'::public.app_role);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
      updated_at = now();

  insert into public.user_roles (user_id, role)
  values (new.id, 'viewer'::public.app_role)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles before update on public.profiles for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_user_roles on public.user_roles;
create trigger set_updated_at_user_roles before update on public.user_roles for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_contacts on public.contacts;
create trigger set_updated_at_contacts before update on public.contacts for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_events on public.events;
create trigger set_updated_at_events before update on public.events for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_donations on public.donations;
create trigger set_updated_at_donations before update on public.donations for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_members on public.members;
create trigger set_updated_at_members before update on public.members for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_documents on public.documents;
create trigger set_updated_at_documents before update on public.documents for each row execute procedure public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.contacts enable row level security;
alter table public.events enable row level security;
alter table public.donations enable row level security;
alter table public.members enable row level security;
alter table public.documents enable row level security;
alter table public.activity_log enable row level security;

-- Profiles policies
create policy "Profiles readable by authenticated"
on public.profiles
for select
using (auth.role() = 'authenticated');

create policy "Users update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Admins manage profiles"
on public.profiles
for all
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- Role policies
create policy "Roles readable by authenticated"
on public.user_roles
for select
using (auth.role() = 'authenticated');

create policy "Admins manage roles"
on public.user_roles
for all
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- Contacts/events/donations/members/documents policies
create policy "Core tables readable by authenticated"
on public.contacts
for select
using (auth.role() = 'authenticated');

create policy "Core tables writable by board+"
on public.contacts
for all
using (public.is_admin_or_board())
with check (public.is_admin_or_board());

create policy "Events readable by authenticated"
on public.events
for select
using (auth.role() = 'authenticated');

create policy "Events writable by board+"
on public.events
for all
using (public.is_admin_or_board())
with check (public.is_admin_or_board());

create policy "Donations readable by authenticated"
on public.donations
for select
using (auth.role() = 'authenticated');

create policy "Donations writable by board+"
on public.donations
for all
using (public.is_admin_or_board())
with check (public.is_admin_or_board());

create policy "Members readable by authenticated"
on public.members
for select
using (auth.role() = 'authenticated');

create policy "Members writable by board+"
on public.members
for all
using (public.is_admin_or_board())
with check (public.is_admin_or_board());

create policy "Documents readable by authenticated"
on public.documents
for select
using (auth.role() = 'authenticated');

create policy "Documents writable by board+"
on public.documents
for all
using (public.is_admin_or_board())
with check (public.is_admin_or_board());

create policy "Activity log readable by board+"
on public.activity_log
for select
using (public.is_admin_or_board());

create policy "Activity log insert authenticated"
on public.activity_log
for insert
with check (auth.role() = 'authenticated');

-- Admin assignments are intentionally done in a separate post-setup step.
