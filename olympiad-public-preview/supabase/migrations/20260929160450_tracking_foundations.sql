-- Isolated Olympiad only. No integrations, collection, or fundraising activation.
alter table public.event_editions add column if not exists fundraising_active boolean not null default false;
grant update(fundraising_active) on public.event_editions to authenticated;
drop policy if exists edition_fundraising_organizer on public.event_editions;
create policy edition_fundraising_organizer on public.event_editions for update to authenticated
 using(exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())))
 with check(exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())));

create table if not exists public.team_fundraising_goals (
 team_id uuid primary key references public.teams(id) on delete cascade,
 stretch_goal_cents bigint not null default 300000 check(stretch_goal_cents>=300000 and stretch_goal_cents<=100000000000),
 updated_at timestamptz not null default now()
);
alter table public.team_fundraising_goals enable row level security;
revoke all on public.team_fundraising_goals from public,anon,authenticated;
grant select on public.team_fundraising_goals to anon,authenticated;
grant insert,update,delete on public.team_fundraising_goals to authenticated;
drop policy if exists goal_public_read on public.team_fundraising_goals;
create policy goal_public_read on public.team_fundraising_goals for select to anon,authenticated
 using(exists(select 1 from public.team_directory d where d.id=team_id));
drop policy if exists goal_private_read on public.team_fundraising_goals;
create policy goal_private_read on public.team_fundraising_goals for select to authenticated
 using(exists(select 1 from public.teams t where t.id=team_id));
drop policy if exists goal_organizer_write on public.team_fundraising_goals;
create policy goal_organizer_write on public.team_fundraising_goals for all to authenticated
 using(exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())))
 with check(exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())));

create table if not exists public.fundraising_ledger (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.event_editions(id),
 team_id uuid references public.teams(id),
 source_namespace text not null check(length(trim(source_namespace)) between 1 and 80),
 source_transaction_id text not null check(length(trim(source_transaction_id)) between 1 and 200),
 source_entry_key text not null default 'payment' check(length(trim(source_entry_key)) between 1 and 200),
 referring_club_member_raw text not null default '' check(length(referring_club_member_raw)<=500),
 olympiad_team_raw text not null default '' check(length(olympiad_team_raw)<=500),
 attribution_status text not null default 'unmatched' check(attribution_status in ('unmatched','ambiguous','matched')),
 amount_cents bigint not null check(amount_cents<>0 and abs(amount_cents::numeric)<=100000000000),
 currency text not null default 'USD' check(currency='USD'),
 status text not null default 'pending' check(status in ('pending','posted','void')),
 verified_by uuid references public.organizer_memberships(user_id), verified_at timestamptz,
 created_at timestamptz not null default now(),
 unique(source_namespace,source_transaction_id,source_entry_key),
 check(status<>'posted' or (team_id is not null and attribution_status='matched' and verified_by is not null and verified_at is not null))
);
alter table public.fundraising_ledger enable row level security;
revoke all on public.fundraising_ledger from public,anon,authenticated;
grant select,insert,update on public.fundraising_ledger to authenticated;
drop policy if exists ledger_organizer on public.fundraising_ledger;
create policy ledger_organizer on public.fundraising_ledger for all to authenticated
 using(exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())))
 with check(exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())));
create index if not exists ledger_team_event on public.fundraising_ledger(team_id,event_id);

-- Sanitized projection contains only totals, never raw source/customer values.
create table if not exists public.team_fundraising_totals (
 team_id uuid primary key references public.teams(id) on delete cascade,
 event_id uuid not null references public.event_editions(id),
 total_cents bigint not null default 0, posted_entries integer not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.team_fundraising_totals enable row level security;
revoke all on public.team_fundraising_totals from public,anon,authenticated;
grant select on public.team_fundraising_totals to anon,authenticated;
drop policy if exists totals_public_read on public.team_fundraising_totals;
create policy totals_public_read on public.team_fundraising_totals for select to anon,authenticated using(
 exists(select 1 from public.team_directory d where d.id=team_id and d.event_id=event_id)
 and exists(select 1 from public.event_editions e where e.id=event_id and e.fundraising_active)
);
drop policy if exists totals_owner_read on public.team_fundraising_totals;
create policy totals_owner_read on public.team_fundraising_totals for select to authenticated
 using(exists(select 1 from public.teams t where t.id=team_id));

create or replace function olympiad_private.check_ledger_entry() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.organizer_memberships where user_id=auth.uid()) then raise exception 'Organizer access required'; end if;
 if new.team_id is not null and not exists(select 1 from public.teams t where t.id=new.team_id and t.event_id=new.event_id) then raise exception 'Team and event must match'; end if;
 if new.status='posted' then
  new.verified_by:=auth.uid(); new.verified_at:=now();
 end if;
 return new;
end $$;
revoke all on function olympiad_private.check_ledger_entry() from public,anon,authenticated;
drop trigger if exists check_ledger_entry on public.fundraising_ledger;
create trigger check_ledger_entry before insert or update on public.fundraising_ledger for each row execute function olympiad_private.check_ledger_entry();

create or replace function olympiad_private.sync_fundraising_totals() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_team uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.organizer_memberships where user_id=auth.uid()) then raise exception 'Organizer access required'; end if;
 -- Serialize all ledger projection writers before reading totals; order is fixed.
 -- A single event-scale ledger lock prevents lost aggregates when separate rows change concurrently.
 perform pg_advisory_xact_lock(hashtextextended('olympiad:fundraising-ledger',0));
 for v_team in select distinct x from unnest(array[new.team_id,case when tg_op='UPDATE' then old.team_id else null end]) x where x is not null order by x loop
  insert into public.team_fundraising_totals(team_id,event_id,total_cents,posted_entries,updated_at)
  select t.id,t.event_id,coalesce(sum(l.amount_cents) filter(where l.status='posted' and l.attribution_status='matched' and l.verified_by is not null and l.verified_at is not null),0),
   count(l.id) filter(where l.status='posted' and l.attribution_status='matched' and l.verified_by is not null and l.verified_at is not null),now()
  from public.teams t left join public.fundraising_ledger l on l.team_id=t.id and l.event_id=t.event_id where t.id=v_team group by t.id,t.event_id
  on conflict(team_id) do update set total_cents=excluded.total_cents,posted_entries=excluded.posted_entries,updated_at=excluded.updated_at;
 end loop;
 return new;
end $$;
revoke all on function olympiad_private.sync_fundraising_totals() from public,anon,authenticated;
drop trigger if exists sync_fundraising_totals on public.fundraising_ledger;
create trigger sync_fundraising_totals after insert or update on public.fundraising_ledger for each row execute function olympiad_private.sync_fundraising_totals();

create or replace view public.fundraising_leaderboard with(security_invoker=true) as
select d.id as team_id,d.event_id,d.team_name,d.company_name,d.slug,d.industry_id,
 coalesce(t.total_cents,0)::bigint as total_cents,
 coalesce(g.stretch_goal_cents,300000)::bigint as stretch_goal_cents,
 coalesce(t.posted_entries,0)::integer as posted_entries
from public.team_directory d join public.event_editions e on e.id=d.event_id and e.fundraising_active
left join public.team_fundraising_totals t on t.team_id=d.id and t.event_id=d.event_id
left join public.team_fundraising_goals g on g.team_id=d.id;
revoke all on public.fundraising_leaderboard from public,anon,authenticated;
grant select on public.fundraising_leaderboard to anon,authenticated;

-- Reordering participants keeps their IDs/created_at for future consent links.
-- Only the position uniqueness must be deferred until all rows have moved.
alter table public.roster_participants drop constraint if exists roster_participants_team_id_position_key;
alter table public.roster_participants add constraint roster_participants_team_id_position_key unique(team_id,position) deferrable initially immediate;
grant update(name,email,phone,shirt_size,shirt_fit,position) on public.roster_participants to authenticated;
drop policy if exists roster_update on public.roster_participants;
create policy roster_update on public.roster_participants for update to authenticated
 using(exists(select 1 from public.teams t where t.id=team_id)) with check(exists(select 1 from public.teams t where t.id=team_id));
create or replace function public.save_roster(p_team_id uuid,p_roster jsonb,p_expected_version integer) returns integer
language plpgsql security invoker set search_path='' as $$
declare v_count integer; v_version integer; v_item jsonb; v_id uuid; v_ids uuid[]:='{}'; v_position integer:=0;
begin
 if auth.uid() is null then raise exception 'Sign in to save your roster'; end if;
 if not exists(select 1 from public.teams where id=p_team_id and (captain_user_id=auth.uid() or exists(select 1 from public.organizer_memberships where user_id=auth.uid()))) then raise exception 'Team access denied'; end if;
 if p_roster is null or jsonb_typeof(p_roster)<>'array' then raise exception 'Roster must be an array'; end if;
 v_count:=jsonb_array_length(p_roster);
 if v_count>50 then raise exception 'Roster is limited to 50 participants'; end if;
 if exists(select 1 from jsonb_array_elements(p_roster) item where jsonb_typeof(item)<>'object') then raise exception 'Each participant must be an object'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_team_id::text,0));
 select roster_version into v_version from public.teams where id=p_team_id for update;
 if p_expected_version is null or p_expected_version<>v_version then raise exception 'Roster changed. Reload before saving.'; end if;
 for v_item in select value from jsonb_array_elements(p_roster) loop
  v_id:=nullif(v_item->>'id','')::uuid;
  if v_id is not null then
   if not exists(select 1 from public.roster_participants where id=v_id and team_id=p_team_id) then raise exception 'Participant does not belong to this team'; end if;
   if v_id=any(v_ids) then raise exception 'Duplicate participant ID'; end if;
   v_ids:=array_append(v_ids,v_id);
  end if;
 end loop;
 set constraints public.roster_participants_team_id_position_key deferred;
 delete from public.roster_participants where team_id=p_team_id and not(id=any(v_ids));
 -- Clear emails atomically so a legitimate swap does not trip the immediate unique index.
 update public.roster_participants set email='' where team_id=p_team_id;
 for v_item in select value from jsonb_array_elements(p_roster) loop
  v_id:=nullif(v_item->>'id','')::uuid;
  if v_id is null then
   insert into public.roster_participants(team_id,name,email,phone,shirt_size,shirt_fit,position)
   values(p_team_id,trim(coalesce(v_item->>'name','')),lower(trim(coalesce(v_item->>'email',''))),trim(coalesce(v_item->>'phone','')),trim(coalesce(v_item->>'shirt_size','')),lower(trim(coalesce(v_item->>'shirt_fit',''))),v_position);
  else
   update public.roster_participants set name=trim(coalesce(v_item->>'name','')),email=lower(trim(coalesce(v_item->>'email',''))),phone=trim(coalesce(v_item->>'phone','')),shirt_size=trim(coalesce(v_item->>'shirt_size','')),shirt_fit=lower(trim(coalesce(v_item->>'shirt_fit',''))),position=v_position where id=v_id and team_id=p_team_id;
  end if;
  v_position:=v_position+1;
 end loop;
 set constraints public.roster_participants_team_id_position_key immediate;
 update public.teams set roster_version=roster_version+1 where id=p_team_id;
 return v_count;
end $$;
revoke all on function public.save_roster(uuid,jsonb,integer) from public,anon;
grant execute on function public.save_roster(uuid,jsonb,integer) to authenticated;
