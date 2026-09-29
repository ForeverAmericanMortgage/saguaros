-- Isolated Olympiad: approval and internal member attribution only.
create table public.club_member_references (
 id uuid primary key default gen_random_uuid(), name text not null unique,
 source_label text not null unique, source_url text not null, active boolean not null default true
);
create table public.team_reviews (
 team_id uuid primary key references public.teams(id) on delete cascade,
 status text not null check(status in ('pending','approved','needs_changes','declined')),
 message text not null default '' check(length(message)<=2000),
 version integer not null default 1 check(version>0),
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz not null default now()
);
create table public.team_member_attributions (
 team_id uuid primary key references public.teams(id) on delete cascade,
 member_id uuid references public.club_member_references(id),
 updated_by uuid not null references auth.users(id), updated_at timestamptz not null default now()
);
create table public.team_review_events (
 id bigint generated always as identity primary key, team_id uuid not null references public.teams(id) on delete cascade,
 kind text not null, before_value jsonb, after_value jsonb, actor_id uuid references auth.users(id), created_at timestamptz not null default now()
);
alter table public.club_member_references enable row level security;
alter table public.team_reviews enable row level security;
alter table public.team_member_attributions enable row level security;
alter table public.team_review_events enable row level security;
revoke all on public.club_member_references,public.team_reviews,public.team_member_attributions,public.team_review_events from public,anon,authenticated;
grant select on public.club_member_references,public.team_review_events to authenticated;
grant select,insert,update on public.team_reviews,public.team_member_attributions to authenticated;
create policy member_reference_organizer on public.club_member_references for select to authenticated using(exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())));
create policy reviews_read on public.team_reviews for select to authenticated using(exists(select 1 from public.teams where id=team_id));
create policy reviews_write on public.team_reviews for all to authenticated using(exists(select 1 from public.organizer_memberships where user_id=(select auth.uid()))) with check(reviewed_by=(select auth.uid()) and exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())));
create policy member_assignment_organizer on public.team_member_attributions for all to authenticated using(exists(select 1 from public.organizer_memberships where user_id=(select auth.uid()))) with check(updated_by=(select auth.uid()) and exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())));
create policy review_events_organizer on public.team_review_events for select to authenticated using(exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())));
-- Preserve already-public real pilot teams. All new submissions default to pending (no review row).
insert into public.team_reviews(team_id,status,message) select id,'approved','Existing public pilot team retained during approval rollout.' from public.team_directory;

create or replace function olympiad_private.sync_team_directory() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not (new.captain_user_id=auth.uid() or exists(select 1 from public.organizer_memberships where user_id=auth.uid())) then raise exception 'Verified team ownership is required'; end if;
 if tg_op='UPDATE' and (new.team_name is distinct from old.team_name or new.company_name is distinct from old.company_name or new.industry_id is distinct from old.industry_id) then
  update public.team_reviews set status='pending',message='Team identity details changed. Awaiting chairman review.',version=version+1,reviewed_by=null,reviewed_at=now() where team_id=new.id and status in ('approved','needs_changes');
 end if;
 if new.is_public and new.status='registered' and exists(select 1 from public.team_reviews where team_id=new.id and status='approved') then
  insert into public.team_directory(id,event_id,team_name,company_name,slug,industry_id,description,created_at)
  values(new.id,new.event_id,new.team_name,new.company_name,new.slug,new.industry_id,new.description,new.created_at)
  on conflict(id) do update set team_name=excluded.team_name,company_name=excluded.company_name,industry_id=excluded.industry_id,description=excluded.description;
 else delete from public.team_directory where id=new.id;
 end if;
 return new;
end $$;

create function olympiad_private.sync_review_directory() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authenticated review required'; end if;
 if new.status='approved' then
  insert into public.team_directory(id,event_id,team_name,company_name,slug,industry_id,description,created_at)
  select id,event_id,team_name,company_name,slug,industry_id,description,created_at from public.teams where id=new.team_id and is_public and status='registered'
  on conflict(id) do update set team_name=excluded.team_name,company_name=excluded.company_name,industry_id=excluded.industry_id,description=excluded.description;
 else delete from public.team_directory where id=new.team_id;
 end if;
 return new;
end $$;
revoke all on function olympiad_private.sync_review_directory() from public,anon,authenticated;
create trigger review_publication after insert or update on public.team_reviews for each row execute function olympiad_private.sync_review_directory();

create function olympiad_private.audit_team_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.team_review_events(team_id,kind,before_value,after_value,actor_id) values(new.team_id,tg_table_name,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new),auth.uid());
 return new;
end $$;
revoke all on function olympiad_private.audit_team_review() from public,anon,authenticated;
create trigger review_audit after insert or update on public.team_reviews for each row execute function olympiad_private.audit_team_review();
create trigger attribution_audit after insert or update on public.team_member_attributions for each row execute function olympiad_private.audit_team_review();

create function public.review_team(p_team_id uuid,p_status text,p_message text,p_expected_version integer,p_member_id uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_version integer; v_review jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.organizer_memberships where user_id=auth.uid()) then raise exception 'Organizer access required'; end if;
 if p_status is null or p_status not in ('pending','approved','needs_changes','declined') or p_message is null or length(p_message)>2000 then raise exception 'Invalid review'; end if;
 perform 1 from public.teams t join public.event_editions e on e.id=t.event_id where t.id=p_team_id and e.year=2027 for update of t;
 if not found then raise exception 'Team not found'; end if;
 select version into v_version from public.team_reviews where team_id=p_team_id;
 if p_expected_version is null or p_expected_version<>coalesce(v_version,0) then raise exception 'Review changed. Load latest review.'; end if;
 if p_member_id is not null and not exists(select 1 from public.club_member_references where id=p_member_id and active) then raise exception 'Choose a listed referring member'; end if;
 insert into public.team_member_attributions(team_id,member_id,updated_by) values(p_team_id,p_member_id,auth.uid()) on conflict(team_id) do update set member_id=excluded.member_id,updated_by=excluded.updated_by,updated_at=now();
 insert into public.team_reviews(team_id,status,message,version,reviewed_by) values(p_team_id,p_status,trim(p_message),coalesce(v_version,0)+1,auth.uid())
 on conflict(team_id) do update set status=excluded.status,message=excluded.message,version=excluded.version,reviewed_by=excluded.reviewed_by,reviewed_at=now();
 select jsonb_build_object('status',status,'message',message,'version',version,'referring_club_member_id',p_member_id,'referring_club_member_name',(select name from public.club_member_references where id=p_member_id)) into v_review from public.team_reviews where team_id=p_team_id;
 return v_review;
end $$;
revoke all on function public.review_team(uuid,text,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.review_team(uuid,text,text,integer,uuid) to authenticated;

-- Attribution is a second dimension of the same money, never additional revenue.
-- Private teams still count for their member; public opt-in is unrelated to internal credit.
create view public.member_fundraising_credit with(security_invoker=true) as
 select m.id as member_id,m.name as member_name,t.event_id,count(t.id)::integer as team_count,coalesce(sum(f.total_cents),0)::bigint as total_cents
 from public.club_member_references m join public.team_member_attributions a on a.member_id=m.id
 join public.teams t on t.id=a.team_id join public.team_reviews r on r.team_id=t.id and r.status='approved'
 left join public.team_fundraising_totals f on f.team_id=t.id and f.event_id=t.event_id
 group by m.id,m.name,t.event_id;
revoke all on public.member_fundraising_credit from public,anon,authenticated;
grant select on public.member_fundraising_credit to authenticated;

-- Exact public checkout labels observed September 29, 2026; no private contacts imported.
insert into public.club_member_references(name,source_label,source_url) values
('In Memory of Isaac Kahn','In Memory of Isaac Kahn','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Aaron Fox','Aaron Fox','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Alex Lehman','Alex Lehman','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Andrew Goodwin','Andrew Goodwin','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Anthony Eulano','Anthony Eulano','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Austin Burns (P)','Austin Burns (P)','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Austin Gottsacker','Austin Gottsacker','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Austin Meyer','Austin Meyer','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Austin Schwartz (P)','Austin Schwartz (P)','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Austin Singer','Austin Singer','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Ben Frelka','Ben Frelka','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Ben Tobias','Ben Tobias','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('BJ Denker','BJ Denker','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Blake Peters','Blake Peters','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Bobby McKnight','Bobby McKnight','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Brad Losee','Brad Losee','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Brandon Alley','Brandon Alley','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Braydon Dennis','Braydon Dennis','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Brian Ess','Brian Ess','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Brian Kirk','Brian Kirk','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Chris Maderazzo','Chris Maderazzo','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Chris Nace','Chris Nace','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Chris Tommarello','Chris Tommarello','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Chris Yakscoe','Chris Yakscoe','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Clayton Wolfe','Clayton Wolfe','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Cody Yount','Cody Yount','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Colin Crowley','Colin Crowley','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Connor Lyon','Connor Lyon','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Corey Shano','Corey Shano','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Dan Fischer','Dan Fischer','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('David Stull','David Stull','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('DJ Brown','DJ Brown','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Drew Butler','Drew Butler','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Drew Keil','Drew Keil','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Elliot Stratton','Elliot Stratton','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Evan Dahn','Evan Dahn','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Evan Weishar','Evan Weishar','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Hunter Fadynich','Hunter Fadynich','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Ian Sachs','Ian Sachs','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Jack Hansen','Jack Hansen','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Jack Stickney','Jack Stickney','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Jack York','Jack York','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Jacob Rush','Jacob Rush','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Jared Mount','Jared Mount','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Jaxx Davies','Jaxx Davies','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Jeff Knoll','Jeff Knoll','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Jeff Nelson','Jeff Nelson','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Joe Pierson (P)','Joe Pierson (P)','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('John McGhee','John McGhee','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('John Theis','John Theis','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Jonah Joffe','Jonah Joffe','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Justin Cowden','Justin Cowden','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Kael Cheatham','Kael Cheatham','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Kevin Orr','Kevin Orr','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Kody Koebensky','Kody Koebensky','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Kyle McMillian','Kyle McMillian','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Matt Baniszewski','Matt Baniszewski','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Matt Wolach','Matt Wolach','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Matthew Miller','Matthew Miller','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Max Schumacher','Max Schumacher','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Max Smith','Max Smith','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Mike Bosco','Mike Bosco','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Mike Ratzken','Mike Ratzken','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Nick Hamati','Nick Hamati','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Paul Mittelstadt','Paul Mittelstadt','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Richie Reyes','Richie Reyes','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Rory Curran','Rory Curran','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Ryan Riedy','Ryan Riedy','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Sean Caldwell','Sean Caldwell','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Sean Doyle','Sean Doyle','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Sean Pourian','Sean Pourian','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Simon Assaf','Simon Assaf','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Steven Cohen','Steven Cohen','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Steven Snider','Steven Snider','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Streator Bates','Streator Bates','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Tad Crother','Tad Crother','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Tanner Lannan','Tanner Lannan','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Taylor Berens','Taylor Berens','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Trent Hancock','Trent Hancock','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Tommy Bullington (P)','Tommy Bullington (P)','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Tyler Carlisle','Tyler Carlisle','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Tyler Spain (P)','Tyler Spain (P)','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets'),
('Vicente Teran','Vicente Teran','https://www.saguaros.com/gala-sponsorships-tables-tickets/p/10-pack-tickets');
