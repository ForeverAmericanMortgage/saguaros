-- Saguaros Hub Phase 1.5 operational modules
-- Adds sponsorship pipeline, Olympiad teams, messaging, campaigns, and sync run logs.

create extension if not exists pgcrypto;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'sponsorship_stage') then
    create type public.sponsorship_stage as enum (
      'prospect',
      'contacted',
      'proposal_sent',
      'committed',
      'paid',
      'declined'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'olympiad_division') then
    create type public.olympiad_division as enum ('abc', 'bfk', 'open');
  end if;

  if not exists (select 1 from pg_type where typname = 'channel_type') then
    create type public.channel_type as enum ('club_wide', 'committee', 'board', 'direct_message');
  end if;

  if not exists (select 1 from pg_type where typname = 'notification_pref') then
    create type public.notification_pref as enum ('all', 'mentions_only', 'none');
  end if;

  if not exists (select 1 from pg_type where typname = 'campaign_channel') then
    create type public.campaign_channel as enum ('email', 'sms', 'mailchimp_newsletter');
  end if;
end $$;

-- Sponsorship pipeline
create table if not exists public.sponsorships (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  stage public.sponsorship_stage not null default 'prospect',
  proposed_tier text,
  expected_amount numeric(12,2),
  assigned_to uuid references public.profiles(id),
  last_contact_date date,
  next_action text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sponsorships_stage on public.sponsorships(stage);
create index if not exists idx_sponsorships_event on public.sponsorships(event_id);
create index if not exists idx_sponsorships_assigned_to on public.sponsorships(assigned_to);

-- Olympiad teams
create table if not exists public.olympiad_teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  team_name text not null,
  captain_contact_id uuid references public.contacts(id) on delete set null,
  division public.olympiad_division not null,
  fundraising_goal numeric(12,2) not null default 0,
  total_raised numeric(12,2) not null default 0,
  game_results jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, team_name)
);

create index if not exists idx_olympiad_teams_event on public.olympiad_teams(event_id);
create index if not exists idx_olympiad_teams_division on public.olympiad_teams(division);

-- Messaging
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  channel_type public.channel_type not null,
  description text,
  is_archived boolean not null default false,
  allowed_roles public.app_role[] not null default array['admin', 'board', 'member', 'viewer']::public.app_role[],
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.channel_members (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  is_muted boolean not null default false,
  notification_pref public.notification_pref not null default 'all',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  reply_to uuid references public.messages(id) on delete set null,
  attachments jsonb not null default '[]'::jsonb,
  is_pinned boolean not null default false,
  reactions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_messages_channel_created on public.messages(channel_id, created_at desc);
create index if not exists idx_messages_sender on public.messages(sender_id);

-- Campaign tracking and integration runs
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel public.campaign_channel not null,
  status text not null default 'draft',
  audience_filter jsonb not null default '{}'::jsonb,
  provider text,
  provider_campaign_id text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_sync_log (
  id uuid primary key default gen_random_uuid(),
  integration_type text not null,
  entity_type text not null,
  entity_id uuid,
  status text not null,
  error_text text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_integration_sync_log_type on public.integration_sync_log(integration_type, created_at desc);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  integration_type text not null,
  run_type text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_processed integer,
  error_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sync_runs_type on public.sync_runs(integration_type, started_at desc);

-- Reuse shared updated_at trigger function from migration 1
drop trigger if exists set_updated_at_sponsorships on public.sponsorships;
create trigger set_updated_at_sponsorships before update on public.sponsorships for each row execute procedure public.set_updated_at();
drop trigger if exists set_updated_at_olympiad_teams on public.olympiad_teams;
create trigger set_updated_at_olympiad_teams before update on public.olympiad_teams for each row execute procedure public.set_updated_at();
drop trigger if exists set_updated_at_channels on public.channels;
create trigger set_updated_at_channels before update on public.channels for each row execute procedure public.set_updated_at();
drop trigger if exists set_updated_at_channel_members on public.channel_members;
create trigger set_updated_at_channel_members before update on public.channel_members for each row execute procedure public.set_updated_at();
drop trigger if exists set_updated_at_messages on public.messages;
create trigger set_updated_at_messages before update on public.messages for each row execute procedure public.set_updated_at();
drop trigger if exists set_updated_at_campaigns on public.campaigns;
create trigger set_updated_at_campaigns before update on public.campaigns for each row execute procedure public.set_updated_at();
drop trigger if exists set_updated_at_sync_runs on public.sync_runs;
create trigger set_updated_at_sync_runs before update on public.sync_runs for each row execute procedure public.set_updated_at();

-- RLS enable
alter table public.sponsorships enable row level security;
alter table public.olympiad_teams enable row level security;
alter table public.channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.messages enable row level security;
alter table public.campaigns enable row level security;
alter table public.integration_sync_log enable row level security;
alter table public.sync_runs enable row level security;

-- Helper for membership checks
create or replace function public.is_channel_member(p_channel_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.channel_members cm
    where cm.channel_id = p_channel_id
      and cm.user_id = auth.uid()
  );
$$;

-- Policies: sponsorship + teams
create policy "Sponsorships readable by authenticated"
on public.sponsorships
for select
using (auth.role() = 'authenticated');

create policy "Sponsorships writable by board+"
on public.sponsorships
for all
using (public.is_admin_or_board())
with check (public.is_admin_or_board());

create policy "Olympiad teams readable by authenticated"
on public.olympiad_teams
for select
using (auth.role() = 'authenticated');

create policy "Olympiad teams writable by board+"
on public.olympiad_teams
for all
using (public.is_admin_or_board())
with check (public.is_admin_or_board());

-- Policies: channels + memberships + messages
create policy "Channels readable by authenticated"
on public.channels
for select
using (auth.role() = 'authenticated');

create policy "Channels writable by board+"
on public.channels
for all
using (public.is_admin_or_board())
with check (public.is_admin_or_board());

create policy "Channel members readable by authenticated"
on public.channel_members
for select
using (auth.role() = 'authenticated');

create policy "Channel members writable by board+"
on public.channel_members
for all
using (public.is_admin_or_board())
with check (public.is_admin_or_board());

create policy "Messages readable by channel membership"
on public.messages
for select
using (public.is_channel_member(channel_id) or public.is_admin_or_board());

create policy "Messages insert by members"
on public.messages
for insert
with check (
  auth.uid() = sender_id
  and (public.is_channel_member(channel_id) or public.is_admin_or_board())
);

create policy "Messages update by sender or board+"
on public.messages
for update
using (auth.uid() = sender_id or public.is_admin_or_board())
with check (auth.uid() = sender_id or public.is_admin_or_board());

create policy "Messages delete by board+"
on public.messages
for delete
using (public.is_admin_or_board());

-- Policies: campaigns + integration logs
create policy "Campaigns readable by authenticated"
on public.campaigns
for select
using (auth.role() = 'authenticated');

create policy "Campaigns writable by board+"
on public.campaigns
for all
using (public.is_admin_or_board())
with check (public.is_admin_or_board());

create policy "Integration logs readable by board+"
on public.integration_sync_log
for select
using (public.is_admin_or_board());

create policy "Integration logs writable by admin"
on public.integration_sync_log
for all
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "Sync runs readable by board+"
on public.sync_runs
for select
using (public.is_admin_or_board());

create policy "Sync runs writable by admin"
on public.sync_runs
for all
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- Seed default channels
insert into public.channels (name, slug, channel_type, description, allowed_roles)
values
  ('General', 'general', 'club_wide', 'Club-wide announcements and daily chatter', array['admin', 'board', 'member', 'viewer']::public.app_role[]),
  ('Board', 'board', 'board', 'Board-only strategy and decisions', array['admin', 'board']::public.app_role[]),
  ('Fundraising', 'fundraising', 'committee', 'Sponsor pipeline and donation milestones', array['admin', 'board', 'member']::public.app_role[]),
  ('Social', 'social', 'club_wide', 'Social planning and member community', array['admin', 'board', 'member', 'viewer']::public.app_role[]),
  ('Alumni Lounge', 'alumni-lounge', 'club_wide', 'Past active and alumni conversation', array['admin', 'board', 'member', 'viewer']::public.app_role[])
on conflict (slug) do nothing;
