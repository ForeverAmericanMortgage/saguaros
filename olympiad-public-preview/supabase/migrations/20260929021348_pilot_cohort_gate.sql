-- Trusted operators enroll verified Auth IDs; captains cannot enroll themselves.
-- This cohort controls NEW registrations, not existing roster access.
create table public.pilot_captains (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.pilot_captains enable row level security;
revoke all on public.pilot_captains from public, anon, authenticated;
grant select on public.pilot_captains to authenticated;
create policy pilot_captain_self_read on public.pilot_captains
 for select to authenticated using(user_id=(select auth.uid()));

-- Restrictive policies AND with existing ownership/open-event policies.
-- register_team is SECURITY INVOKER, so its atomic inserts enforce these too.
create policy pilot_team_cohort on public.teams as restrictive
 for insert to authenticated with check(
 exists(select 1 from public.pilot_captains where user_id=(select auth.uid()))
);
create policy pilot_business_cohort on public.businesses as restrictive
 for insert to authenticated with check(
 exists(select 1 from public.pilot_captains where user_id=(select auth.uid()))
);
