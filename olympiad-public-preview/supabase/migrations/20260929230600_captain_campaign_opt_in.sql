create table public.captain_campaign_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 requested_at timestamptz not null default now(),
 consent_text text not null check(length(consent_text) between 1 and 500)
);
alter table public.captain_campaign_preferences enable row level security;
revoke all on public.captain_campaign_preferences from public,anon,authenticated;
grant select,insert on public.captain_campaign_preferences to authenticated;
grant update(consent_text,requested_at) on public.captain_campaign_preferences to authenticated;
create policy captain_campaign_read on public.captain_campaign_preferences for select to authenticated using(user_id=(select auth.uid()));
create policy captain_campaign_insert on public.captain_campaign_preferences for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.pilot_captains where user_id=(select auth.uid())));
create policy captain_campaign_update on public.captain_campaign_preferences for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function olympiad_private.queue_campaign_preference() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.mailchimp_sync_queue(captain_user_id) select new.user_id where exists(select 1 from public.teams t join public.event_editions e on e.id=t.event_id where t.captain_user_id=new.user_id and e.year=2027)
 on conflict(captain_user_id) do update set revision=public.mailchimp_sync_queue.revision+1;
 return null;
end $$;
revoke all on function olympiad_private.queue_campaign_preference() from public,anon,authenticated;
create trigger campaign_preference_dirty after insert or update on public.captain_campaign_preferences for each row execute function olympiad_private.queue_campaign_preference();
