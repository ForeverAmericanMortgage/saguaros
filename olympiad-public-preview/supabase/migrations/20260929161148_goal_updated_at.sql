-- Goal edit timestamp; isolated from previously applied foundations migration.
create or replace function olympiad_private.touch_goal_updated_at() returns trigger
language plpgsql security invoker set search_path='' as $$
begin new.updated_at:=now(); return new; end $$;
revoke all on function olympiad_private.touch_goal_updated_at() from public,anon,authenticated;
drop trigger if exists touch_goal_updated_at on public.team_fundraising_goals;
create trigger touch_goal_updated_at before update on public.team_fundraising_goals for each row execute function olympiad_private.touch_goal_updated_at();

