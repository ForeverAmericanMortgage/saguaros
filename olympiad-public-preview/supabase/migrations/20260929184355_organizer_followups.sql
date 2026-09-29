create table public.team_followups (
 team_id uuid primary key references public.teams(id) on delete cascade,
 status text not null default 'not_contacted' check (status in ('not_contacted','contacted','waiting','complete')),
 assigned_to text not null default '' check (char_length(assigned_to)<=120),
 notes text not null default '' check (char_length(notes)<=2000),
 next_follow_up date,
 updated_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table public.team_followups enable row level security;
revoke all on public.team_followups from public,anon,authenticated;
grant select,insert,update on public.team_followups to authenticated;
create policy followups_organizer_only on public.team_followups for all to authenticated
 using(exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())))
 with check(updated_by=(select auth.uid()) and exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())));
create trigger touch_followup_updated_at before update on public.team_followups for each row execute function olympiad_private.touch_team_updated_at();
