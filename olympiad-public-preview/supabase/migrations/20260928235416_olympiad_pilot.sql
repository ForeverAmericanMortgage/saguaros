-- Apply ONLY to the isolated Olympiad project, never the internal Saguaros Hub.
create table public.event_editions (
 id uuid primary key default gen_random_uuid(), year integer not null unique,
 name text not null, registration_open boolean not null default false,
 minimum_participants integer not null default 6 check (minimum_participants >= 1),
 created_at timestamptz not null default now()
);
create table public.industries (
 id uuid primary key default gen_random_uuid(), slug text not null unique,
 name text not null, sort_order integer not null default 0
);
create table public.organizer_memberships (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table public.businesses (
 id uuid primary key default gen_random_uuid(), owner_user_id uuid not null default auth.uid() references auth.users(id),
 name text not null check (length(trim(name)) between 1 and 160), created_at timestamptz not null default now()
);
create table public.teams (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.event_editions(id),
 business_id uuid not null references public.businesses(id), captain_user_id uuid not null default auth.uid() references auth.users(id),
 team_name text not null check(length(trim(team_name)) between 1 and 120),
 company_name text not null check(length(trim(company_name)) between 1 and 160),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=160),
 industry_id uuid not null references public.industries(id), description text not null default '' check(length(description)<=500),
 is_public boolean not null default false, status text not null default 'registered' check(status in ('draft','registered')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 roster_version integer not null default 0 check(roster_version>=0)
);
create table public.team_captain_details (
 team_id uuid primary key references public.teams(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 120),
 phone text not null check(length(trim(phone)) between 7 and 40)
);
create table public.roster_participants (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
 name text not null default '' check(length(name)<=120), email text not null default '' check(length(email)<=254 and (email='' or email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')),
 phone text not null default '' check(length(phone)<=40),
 shirt_size text not null default '' check(shirt_size in ('','XS','S','M','L','XL','2XL','3XL')),
 shirt_fit text not null default '' check(shirt_fit in ('','male','female')),
 position integer not null check(position between 0 and 49), unique(team_id,position),
 created_at timestamptz not null default now()
);
create table public.team_referrals (
 team_id uuid primary key references public.teams(id) on delete cascade,
 referring_team_id uuid not null references public.teams(id),
 created_at timestamptz not null default now(), check(team_id<>referring_team_id)
);

alter table public.event_editions enable row level security;
alter table public.industries enable row level security;
alter table public.organizer_memberships enable row level security;
alter table public.businesses enable row level security;
alter table public.teams enable row level security;
alter table public.team_captain_details enable row level security;
alter table public.roster_participants enable row level security;
alter table public.team_referrals enable row level security;

-- Explicit grants: default Supabase grants vary by project age.
revoke all on public.event_editions,public.industries,public.organizer_memberships,public.businesses,public.teams,public.team_captain_details,public.roster_participants,public.team_referrals from anon,authenticated;
grant select on public.event_editions,public.industries to anon,authenticated;
grant select on public.organizer_memberships to authenticated;
grant select,insert on public.businesses to authenticated;
grant select on public.teams to authenticated;

grant insert(event_id,business_id,team_name,company_name,slug,industry_id,is_public,description) on public.teams to authenticated;
grant update(team_name,company_name,industry_id,description,is_public,roster_version) on public.teams to authenticated;
grant select,insert on public.team_captain_details to authenticated;
grant update(name,phone) on public.team_captain_details to authenticated;
grant select,insert,delete on public.roster_participants to authenticated;
grant select,insert on public.team_referrals to authenticated;

create policy edition_read on public.event_editions for select to anon,authenticated using(true);
create policy industry_read on public.industries for select to anon,authenticated using(true);
create policy organizer_self_read on public.organizer_memberships for select to authenticated using(user_id=(select auth.uid()));
create policy business_read on public.businesses for select to authenticated using(owner_user_id=(select auth.uid()) or exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())));
create policy business_insert on public.businesses for insert to authenticated with check(owner_user_id=(select auth.uid()));
-- Published metadata is physically separate from private ownership records.
create table public.team_directory (
 id uuid primary key references public.teams(id) on delete cascade,
 event_id uuid not null references public.event_editions(id),
 team_name text not null,company_name text not null,slug text not null unique,
 industry_id uuid not null references public.industries(id),description text not null,
 created_at timestamptz not null
);
alter table public.team_directory enable row level security;
revoke all on public.team_directory from anon,authenticated;
grant select on public.team_directory to anon,authenticated;
create policy directory_read on public.team_directory for select to anon,authenticated using(true);
create schema if not exists olympiad_private;
revoke all on schema olympiad_private from public,anon,authenticated;
create function olympiad_private.sync_team_directory() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not (new.captain_user_id=auth.uid() or exists(select 1 from public.organizer_memberships where user_id=auth.uid())) then
  raise exception 'Verified team ownership is required';
 end if;
 if new.is_public and new.status='registered' then
  insert into public.team_directory(id,event_id,team_name,company_name,slug,industry_id,description,created_at)
  values(new.id,new.event_id,new.team_name,new.company_name,new.slug,new.industry_id,new.description,new.created_at)
  on conflict(id) do update set team_name=excluded.team_name,company_name=excluded.company_name,industry_id=excluded.industry_id,description=excluded.description;
 else
  delete from public.team_directory where id=new.id;
 end if;
 return new;
end $$;
revoke all on function olympiad_private.sync_team_directory() from public,anon,authenticated;
create trigger sync_team_directory after insert or update on public.teams for each row execute function olympiad_private.sync_team_directory();
create policy team_private_read on public.teams for select to authenticated using(captain_user_id=(select auth.uid()) or exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())));
create policy team_insert on public.teams for insert to authenticated with check(
 captain_user_id=(select auth.uid()) and exists(select 1 from public.businesses b where b.id=business_id and b.owner_user_id=(select auth.uid()))
 and exists(select 1 from public.event_editions e where e.id=event_id and e.registration_open)
);
create policy team_update on public.teams for update to authenticated using(captain_user_id=(select auth.uid()) or exists(select 1 from public.organizer_memberships where user_id=(select auth.uid()))) with check(captain_user_id=(select auth.uid()) or exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())));

create policy captain_details_read on public.team_captain_details for select to authenticated using(exists(select 1 from public.teams t where t.id=team_id and (t.captain_user_id=(select auth.uid()) or exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())))));
create policy captain_details_insert on public.team_captain_details for insert to authenticated with check(exists(select 1 from public.teams t where t.id=team_id and t.captain_user_id=(select auth.uid())));
create policy captain_details_update on public.team_captain_details for update to authenticated using(exists(select 1 from public.teams t where t.id=team_id and t.captain_user_id=(select auth.uid()))) with check(exists(select 1 from public.teams t where t.id=team_id and t.captain_user_id=(select auth.uid())));
create policy roster_read on public.roster_participants for select to authenticated using(exists(select 1 from public.teams t where t.id=team_id and (t.captain_user_id=(select auth.uid()) or exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())))));
create policy roster_insert on public.roster_participants for insert to authenticated with check(exists(select 1 from public.teams t where t.id=team_id and (t.captain_user_id=(select auth.uid()) or exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())))));
create policy roster_delete on public.roster_participants for delete to authenticated using(exists(select 1 from public.teams t where t.id=team_id and (t.captain_user_id=(select auth.uid()) or exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())))));
create policy referral_read on public.team_referrals for select to authenticated using(exists(select 1 from public.teams t where t.id=team_id and (t.captain_user_id=(select auth.uid()) or exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())))));
create policy referral_insert on public.team_referrals for insert to authenticated with check(exists(select 1 from public.teams t where t.id=team_id and t.captain_user_id=(select auth.uid())) and exists(select 1 from public.team_directory r join public.teams own_team on own_team.id=team_id where r.id=referring_team_id and r.event_id=own_team.event_id));

create unique index teams_event_name_unique on public.teams(event_id,lower(trim(team_name)));
create unique index roster_team_email_unique on public.roster_participants(team_id,lower(trim(email))) where trim(email)<>'';
create table public.liaison_assignments (
 event_id uuid not null references public.event_editions(id),
 industry_id uuid not null references public.industries(id),
 organizer_user_id uuid not null references public.organizer_memberships(user_id),
 created_at timestamptz not null default now(),
 primary key(event_id,industry_id)
);
alter table public.liaison_assignments enable row level security;
revoke all on public.liaison_assignments from anon,authenticated;
grant select,insert,update,delete on public.liaison_assignments to authenticated;
create policy liaison_organizer_only on public.liaison_assignments for all to authenticated
 using(exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())))
 with check(exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())));
create function olympiad_private.touch_team_updated_at() returns trigger language plpgsql security invoker set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
revoke all on function olympiad_private.touch_team_updated_at() from public,anon,authenticated;
create trigger touch_team_updated_at before update on public.teams for each row execute function olympiad_private.touch_team_updated_at();

create index teams_industry on public.teams(industry_id);
create index teams_public_directory on public.teams(event_id,industry_id) where is_public and status='registered';

create function public.register_team(p_team_name text,p_company_name text,p_industry_slug text,p_captain_name text,p_phone text,p_is_public boolean default false,p_referring_team_slug text default null,p_description text default '')
returns table(team_id uuid,team_slug text) language plpgsql security invoker set search_path='' as $$
declare v_event uuid; v_industry uuid; v_business uuid; v_team uuid; v_slug text; v_referrer uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to register'; end if;
 select id into v_event from public.event_editions where year=2027 and registration_open;
 if v_event is null then raise exception 'Registration is not open'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || v_event::text,0));
 if (select count(*) from public.teams where captain_user_id=auth.uid() and event_id=v_event)>=10 then
  raise exception 'A captain may register up to 10 teams per event';
 end if;
 select id into v_industry from public.industries where slug=p_industry_slug;
 if v_industry is null then raise exception 'Choose a valid industry'; end if;
 if p_referring_team_slug is not null and trim(p_referring_team_slug)<>'' then
  select id into v_referrer from public.team_directory where slug=p_referring_team_slug and event_id=v_event;
  if v_referrer is null then raise exception 'Invitation team is unavailable'; end if;
 end if;
 v_slug := coalesce(nullif(trim(both '-' from regexp_replace(lower(trim(p_team_name)), '[^a-z0-9]+','-','g')),''),'team') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,12);
 insert into public.businesses(name) values(trim(p_company_name)) returning id into v_business;
 insert into public.teams(event_id,business_id,team_name,company_name,slug,industry_id,is_public,description)
 values(v_event,v_business,trim(p_team_name),trim(p_company_name),v_slug,v_industry,coalesce(p_is_public,false),coalesce(trim(p_description),'')) returning id into v_team;
 insert into public.team_captain_details(team_id,name,phone) values(v_team,trim(p_captain_name),trim(p_phone));
 if v_referrer is not null then insert into public.team_referrals(team_id,referring_team_id) values(v_team,v_referrer); end if;
 return query select v_team,v_slug;
end $$;

create function public.save_roster(p_team_id uuid,p_roster jsonb,p_expected_version integer) returns integer language plpgsql security invoker set search_path='' as $$
declare v_count integer; v_version integer;
begin
 if auth.uid() is null then raise exception 'Sign in to save your roster'; end if;
 if not exists(select 1 from public.teams where id=p_team_id and (captain_user_id=auth.uid() or exists(select 1 from public.organizer_memberships where user_id=auth.uid()))) then raise exception 'Team access denied'; end if;
 if p_roster is null or jsonb_typeof(p_roster)<>'array' then raise exception 'Roster must be an array'; end if;
 v_count := jsonb_array_length(p_roster);
 if v_count>50 then raise exception 'Roster is limited to 50 participants'; end if;
 if exists(select 1 from jsonb_array_elements(p_roster) item where jsonb_typeof(item)<>'object') then raise exception 'Each participant must be an object'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_team_id::text,0));
 select roster_version into v_version from public.teams where id=p_team_id for update;
 if p_expected_version is null or p_expected_version<>v_version then
  raise exception 'Roster changed. Reload before saving.';
 end if;
 delete from public.roster_participants where team_id=p_team_id;
 insert into public.roster_participants(id,team_id,name,email,phone,shirt_size,shirt_fit,position)
 select coalesce(nullif(item->>'id','')::uuid,gen_random_uuid()),p_team_id,
 trim(coalesce(item->>'name','')),lower(trim(coalesce(item->>'email',''))),trim(coalesce(item->>'phone','')),
 trim(coalesce(item->>'shirt_size','')),lower(trim(coalesce(item->>'shirt_fit',''))),ordinality::integer-1
 from jsonb_array_elements(p_roster) with ordinality as r(item,ordinality);
 update public.teams set roster_version=roster_version+1 where id=p_team_id;
 return v_count;
end $$;
revoke all on function public.register_team(text,text,text,text,text,boolean,text,text) from public,anon;
revoke all on function public.save_roster(uuid,jsonb,integer) from public,anon;
grant execute on function public.register_team(text,text,text,text,text,boolean,text,text) to authenticated;
grant execute on function public.save_roster(uuid,jsonb,integer) to authenticated;

insert into public.event_editions(year,name,registration_open) values(2027,'Scottsdale Olympiad 2027',false);
insert into public.industries(slug,name,sort_order) values
 ('commercial-real-estate','Commercial real estate',1),('residential-real-estate','Residential real estate',2),
 ('finance','Finance',3),('healthcare','Healthcare',4),('technology','Technology',5),
 ('other-businesses','Other businesses',6),('construction-trades','Construction & trades',7),('hospitality','Hospitality',8);
