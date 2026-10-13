-- Append-only provider receipts; chairman can read exact outreach without editing its history.
create table public.organizer_prospect_messages (
 id uuid primary key default gen_random_uuid(),
 prospect_id uuid not null references public.organizer_prospects(id) on delete restrict,
 direction text not null check(direction in ('outbound','inbound')),
 step text not null check(step in ('initial','followup','reply','interested','declined','opted_out','bounced','out_of_office')),
 provider_message_id text not null unique check(length(provider_message_id) between 1 and 200),
 gmail_thread_id text not null check(gmail_thread_id ~ '^[a-zA-Z0-9_-]{1,200}$'),
 subject text not null default '' check(length(subject)<=500),
 body text not null default '' check(length(body)<=20000),
 occurred_at timestamptz not null,
 recorded_at timestamptz not null default now()
);
create index organizer_prospect_messages_history on public.organizer_prospect_messages(prospect_id,occurred_at);
alter table public.organizer_prospect_messages enable row level security;
revoke all on public.organizer_prospect_messages from public,anon,authenticated;
grant select on public.organizer_prospect_messages to authenticated;
create policy chairman_read_prospect_history on public.organizer_prospect_messages for select to authenticated using((select olympiad_private.chairman_access_allowed()));
