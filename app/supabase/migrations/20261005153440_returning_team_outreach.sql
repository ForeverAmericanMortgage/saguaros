-- Historical recruitment is private and independent of actual event registration.
create table public.returning_team_accounts (
 id uuid primary key default gen_random_uuid(),
 import_key text not null unique,
 business_name text not null check(length(business_name) between 1 and 250),
 industry text not null default '',
 aliases jsonb not null default '[]',
 history jsonb not null default '[]',
 source_contacts jsonb not null default '[]',
 contact_name text not null default '' check(length(contact_name)<=250),
 contact_email text not null default '' check(length(contact_email)<=320),
 contact_phone text not null default '' check(length(contact_phone)<=60),
 outreach_status text not null default 'not_contacted' check(outreach_status in ('not_contacted','attempted','follow_up','interested','committed','not_returning','do_not_contact')),
 assigned_to text not null default '' check(length(assigned_to)<=250),
 notes text not null default '' check(length(notes)<=10000),
 next_follow_up date,
 linked_team_id uuid references public.teams(id) on delete set null,
 version integer not null default 1,
 updated_at timestamptz not null default now()
);
create table public.returning_team_activities (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references public.returning_team_accounts(id) on delete cascade,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 kind text not null check(kind in ('call','email','text','meeting','note')),
 outcome text not null check(length(outcome)<=2000),
 outreach_status text not null
);
create index returning_team_activities_account on public.returning_team_activities(account_id,created_at desc);
create index returning_team_follow_up on public.returning_team_accounts(next_follow_up);
create index returning_team_linked_team on public.returning_team_accounts(linked_team_id);
alter table public.returning_team_accounts enable row level security;
alter table public.returning_team_activities enable row level security;
revoke all on public.returning_team_accounts,public.returning_team_activities from public,anon,authenticated;
grant select on public.returning_team_accounts,public.returning_team_activities to authenticated;
grant update(contact_name,contact_email,contact_phone,outreach_status,assigned_to,notes,next_follow_up,linked_team_id,version,updated_at) on public.returning_team_accounts to authenticated;
grant insert on public.returning_team_activities to authenticated;
create policy chairman_read_returning on public.returning_team_accounts for select to authenticated using ((select olympiad_private.chairman_access_allowed()));
create policy chairman_update_returning on public.returning_team_accounts for update to authenticated using ((select olympiad_private.chairman_access_allowed())) with check ((select olympiad_private.chairman_access_allowed()));
create policy chairman_read_returning_activity on public.returning_team_activities for select to authenticated using ((select olympiad_private.chairman_access_allowed()));
create policy chairman_insert_returning_activity on public.returning_team_activities for insert to authenticated with check ((select olympiad_private.chairman_access_allowed()) and created_by=(select auth.uid()));
create function public.save_returning_team(p_id uuid,p_version integer,p_contact_name text,p_contact_email text,p_contact_phone text,p_status text,p_assigned_to text,p_notes text,p_next_follow_up date,p_linked_team_id uuid,p_activity_kind text default null,p_activity_outcome text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved public.returning_team_accounts;
begin
 if not olympiad_private.chairman_access_allowed() then raise exception 'Chairman access required' using errcode='42501'; end if;
 if p_linked_team_id is not null and not exists(select 1 from public.teams t join public.event_editions e on e.id=t.event_id left join public.team_reviews r on r.team_id=t.id where t.id=p_linked_team_id and e.year=2027 and coalesce(r.status,'pending')<>'declined') then raise exception 'Select an active 2027 team'; end if;
 update public.returning_team_accounts set contact_name=trim(p_contact_name),contact_email=lower(trim(p_contact_email)),contact_phone=trim(p_contact_phone),outreach_status=p_status,assigned_to=trim(p_assigned_to),notes=p_notes,next_follow_up=p_next_follow_up,linked_team_id=p_linked_team_id,version=version+1,updated_at=now() where id=p_id and version=p_version returning * into saved;
 if not found then raise exception 'This record changed. Reload before saving.' using errcode='40001'; end if;
 if p_activity_kind is not null then
  if length(trim(coalesce(p_activity_outcome,'')))=0 then raise exception 'Add an outcome for this activity'; end if;
  insert into public.returning_team_activities(account_id,created_by,kind,outcome,outreach_status) values(p_id,auth.uid(),p_activity_kind,trim(p_activity_outcome),p_status);
 end if;
 return to_jsonb(saved);
end;
$$;
revoke all on function public.save_returning_team(uuid,integer,text,text,text,text,text,text,date,uuid,text,text) from public,anon;
grant execute on function public.save_returning_team(uuid,integer,text,text,text,text,text,text,date,uuid,text,text) to authenticated;
