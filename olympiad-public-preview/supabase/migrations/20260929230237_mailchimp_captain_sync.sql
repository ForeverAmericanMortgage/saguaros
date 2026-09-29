create table public.mailchimp_sync_queue (
 captain_user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 1,
 synced_revision bigint not null default 0,
 last_synced_at timestamptz,
 last_result text,
 last_error text
);
alter table public.mailchimp_sync_queue enable row level security;
revoke all on public.mailchimp_sync_queue from public,anon,authenticated;
grant select,update on public.mailchimp_sync_queue to authenticated;
create policy organizer_sync_read on public.mailchimp_sync_queue for select to authenticated using(exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())));
create policy organizer_sync_update on public.mailchimp_sync_queue for update to authenticated using(exists(select 1 from public.organizer_memberships where user_id=(select auth.uid()))) with check(exists(select 1 from public.organizer_memberships where user_id=(select auth.uid())));
create function olympiad_private.queue_mailchimp_sync() returns trigger language plpgsql security definer set search_path='' as $$
declare v_captain uuid; v_team uuid;
begin
 if tg_table_name='teams' then v_captain:=new.captain_user_id; v_team:=new.id;
 else v_team:=case when tg_op='DELETE' then old.team_id else new.team_id end;
 select captain_user_id into v_captain from public.teams where id=v_team; end if;
 if v_captain is not null and exists(select 1 from public.teams t join public.event_editions e on e.id=t.event_id where t.id=v_team and e.year=2027) then
 insert into public.mailchimp_sync_queue(captain_user_id) values(v_captain)
 on conflict(captain_user_id) do update set revision=public.mailchimp_sync_queue.revision+1;
 end if;
 return null;
end $$;
revoke all on function olympiad_private.queue_mailchimp_sync() from public,anon,authenticated;
create trigger team_mailchimp_dirty after insert or update on public.teams for each row execute function olympiad_private.queue_mailchimp_sync();
create trigger review_mailchimp_dirty after insert or update on public.team_reviews for each row execute function olympiad_private.queue_mailchimp_sync();
create trigger history_mailchimp_dirty after insert or update on public.team_audience_profiles for each row execute function olympiad_private.queue_mailchimp_sync();
create trigger roster_mailchimp_dirty after insert or update or delete on public.roster_participants for each row execute function olympiad_private.queue_mailchimp_sync();
insert into public.mailchimp_sync_queue(captain_user_id) select distinct t.captain_user_id from public.teams t join public.event_editions e on e.id=t.event_id where e.year=2027;
-- auth.users email is deliberately accessible only through this guarded organizer projection.
create function public.organizer_campaign_contacts()
returns table(captain_user_id uuid,email text,revision bigint,synced_revision bigint,last_synced_at timestamptz,last_result text,last_error text,teams jsonb)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.organizer_memberships where user_id=auth.uid()) then raise exception 'Organizer access required' using errcode='42501'; end if;
 return query select q.captain_user_id,lower(btrim(u.email)),q.revision,q.synced_revision,q.last_synced_at,q.last_result,q.last_error,
 (select jsonb_agg(jsonb_build_object('id',t.id,'status',coalesce(r.status,'pending'),'history',coalesce(a.participation_history,'unclassified'),'needs_roster',
 (select count(*) from public.roster_participants p where p.team_id=t.id)<6 or exists(select 1 from public.roster_participants p where p.team_id=t.id and (coalesce(p.name,'')='' or coalesce(p.email,'')='' or coalesce(p.phone,'')='' or coalesce(p.shirt_size,'')='' or coalesce(p.shirt_fit,'')=''))))
 from public.teams t join public.event_editions e on e.id=t.event_id left join public.team_reviews r on r.team_id=t.id left join public.team_audience_profiles a on a.team_id=t.id where t.captain_user_id=q.captain_user_id and e.year=2027)
 from public.mailchimp_sync_queue q join auth.users u on u.id=q.captain_user_id where u.email_confirmed_at is not null order by q.captain_user_id;
end $$;
revoke all on function public.organizer_campaign_contacts() from public,anon;
grant execute on function public.organizer_campaign_contacts() to authenticated;
