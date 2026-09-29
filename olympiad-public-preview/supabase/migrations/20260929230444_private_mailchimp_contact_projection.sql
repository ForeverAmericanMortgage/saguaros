alter function public.organizer_campaign_contacts() set schema olympiad_private;
grant usage on schema olympiad_private to authenticated;
grant execute on function olympiad_private.organizer_campaign_contacts() to authenticated;
create function public.organizer_campaign_contacts()
returns table(captain_user_id uuid,email text,revision bigint,synced_revision bigint,last_synced_at timestamptz,last_result text,last_error text,teams jsonb)
language sql stable security invoker set search_path='' as $$ select * from olympiad_private.organizer_campaign_contacts(); $$;
revoke all on function public.organizer_campaign_contacts() from public,anon;
grant execute on function public.organizer_campaign_contacts() to authenticated;
