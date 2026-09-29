create table public.team_audience_profiles (
 team_id uuid primary key references public.teams(id) on delete cascade,
 participation_history text not null default 'unclassified' check (participation_history in ('unclassified','new','returning')),
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table public.team_audience_profiles enable row level security;
revoke all on public.team_audience_profiles from public, anon, authenticated;
grant select, insert, update on public.team_audience_profiles to authenticated;
create policy organizer_audience_read on public.team_audience_profiles for select to authenticated using (exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())));
create policy organizer_audience_insert on public.team_audience_profiles for insert to authenticated with check (exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())) and updated_by=(select auth.uid()));
create policy organizer_audience_update on public.team_audience_profiles for update to authenticated using (exists(select 1 from public.organizer_memberships where user_id=(select auth.uid()))) with check (exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())) and updated_by=(select auth.uid()));
create trigger audience_review_audit after insert or update on public.team_audience_profiles for each row execute function olympiad_private.audit_team_review();
create function public.review_team_with_history(p_team_id uuid,p_status text,p_message text,p_expected_version integer,p_member_id uuid,p_participation_history text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_review jsonb;
begin
 if p_participation_history is null or p_participation_history not in ('unclassified','new','returning') then raise exception 'Choose a team history'; end if;
 v_review := public.review_team(p_team_id,p_status,p_message,p_expected_version,p_member_id);
 insert into public.team_audience_profiles(team_id,participation_history,updated_by) values(p_team_id,p_participation_history,auth.uid())
 on conflict(team_id) do update set participation_history=excluded.participation_history,updated_by=excluded.updated_by,updated_at=now();
 return v_review || jsonb_build_object('participation_history',p_participation_history);
end $$;
revoke all on function public.review_team_with_history(uuid,text,text,integer,uuid,text) from public,anon,authenticated;
grant execute on function public.review_team_with_history(uuid,text,text,integer,uuid,text) to authenticated;
