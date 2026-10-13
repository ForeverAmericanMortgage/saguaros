-- Pre-registration prospects are private; never a public team-directory source.
create table public.organizer_prospects (
 id uuid primary key default gen_random_uuid(),
 event_year integer not null default 2027 check(event_year between 2027 and 2100),
 company_name text not null check(length(btrim(company_name)) between 1 and 250),
 company_domain text not null check(company_domain ~ '^[a-z0-9][a-z0-9.-]*[.][a-z]{2,}$'),
 contact_name text not null default '' check(length(contact_name)<=250),
 contact_email text not null check(contact_email=lower(btrim(contact_email)) and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
 contact_title text not null default '' check(length(contact_title)<=250),
 status text not null default 'researching' check(status in ('researching','ready','held','sent','replied','interested','conversation','registered','declined','opted_out','bounced')),
 assigned_to text not null default '' check(length(assigned_to)<=250),
 next_follow_up date,
 notes text not null default '' check(length(notes)<=5000),
 fit_reason text not null default '' check(length(fit_reason)<=1500),
 evidence_url text not null default '' check(evidence_url='' or evidence_url ~ '^https?://'),
 draft_subject text not null default '' check(length(draft_subject)<=200),
 draft_body text not null default '' check(length(draft_body)<=5000),
 source text not null default 'Manual',
 channel text not null default 'Gmail',
 last_contact_at timestamptz,
 outreach_subject text not null default '',
 outreach_body text not null default '',
 gmail_thread_id text check(gmail_thread_id ~ '^[a-zA-Z0-9_-]{1,200}$'),
 last_reply_at timestamptz,
 last_reply_message_id text,
 last_reply_summary text not null default '' check(length(last_reply_summary)<=2000),
 opted_out boolean not null default false,
 linked_team_id uuid references public.teams(id),
 version integer not null default 1,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(event_year,company_domain),
 check(status<>'registered' or linked_team_id is not null),
 check(not opted_out or status='opted_out')
);
create index organizer_prospect_followup on public.organizer_prospects(event_year,next_follow_up) where next_follow_up is not null;
create index organizer_prospect_team on public.organizer_prospects(linked_team_id) where linked_team_id is not null;
alter table public.organizer_prospects enable row level security;
revoke all on public.organizer_prospects from public,anon,authenticated;
grant select,insert on public.organizer_prospects to authenticated;
grant update(status,assigned_to,next_follow_up,notes,fit_reason,evidence_url,draft_subject,draft_body,linked_team_id,opted_out) on public.organizer_prospects to authenticated;
create policy chairman_read_prospects on public.organizer_prospects for select to authenticated using((select olympiad_private.chairman_access_allowed()));
create policy chairman_insert_prospects on public.organizer_prospects for insert to authenticated with check((select olympiad_private.chairman_access_allowed()) and created_by=(select auth.uid()));
create policy chairman_update_prospects on public.organizer_prospects for update to authenticated using((select olympiad_private.chairman_access_allowed())) with check((select olympiad_private.chairman_access_allowed()));
create function olympiad_private.prospect_change_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if old.opted_out and (not new.opted_out or new.status<>'opted_out') then raise exception 'This contact opted out. Outreach remains suppressed.' using errcode='23514'; end if;
  new.version=old.version+1;
  new.updated_at=clock_timestamp();
 end if;
 if new.status='opted_out' then new.opted_out=true;new.next_follow_up=null;end if;
 if new.linked_team_id is not null and not exists(select 1 from public.teams t join public.event_editions e on e.id=t.event_id where t.id=new.linked_team_id and e.year=new.event_year and t.status='registered') then raise exception 'Choose a registered team from the same event year.' using errcode='23514';end if;
 return new;
end $$;
revoke all on function olympiad_private.prospect_change_guard() from public,anon,authenticated;
create trigger prospect_change_guard before insert or update on public.organizer_prospects for each row execute function olympiad_private.prospect_change_guard();
