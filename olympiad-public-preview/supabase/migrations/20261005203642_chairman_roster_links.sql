-- Chairman can retrieve the captain's existing roster link, or create its first link.
-- Existing expired/disabled links are never silently reset by this function.
create function public.chairman_roster_link(p_team_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_link olympiad_private.roster_links;v_name text;
begin
 if not olympiad_private.chairman_access_allowed() then raise exception 'Chairman access required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_team_id::text,0));
 select t.team_name into v_name from public.teams t join public.event_editions e on e.id=t.event_id
 where t.id=p_team_id and t.status='registered' and e.year=2027
 and not exists(select 1 from public.team_reviews r where r.team_id=t.id and r.status='declined') for update of t;
 if not found then raise exception 'Active 2027 team required';end if;
 select * into v_link from olympiad_private.roster_links where team_id=p_team_id;
 if not found then
  insert into olympiad_private.roster_links(team_id,token,expires_at,created_by)
  values(p_team_id,encode(extensions.gen_random_bytes(32),'hex'),now()+interval '90 days',auth.uid()) returning * into v_link;
 elsif v_link.revoked_at is not null or v_link.expires_at<=now() then
  return jsonb_build_object('unavailable',true,'reason',case when v_link.revoked_at is not null then 'disabled' else 'expired' end);
 end if;
 return jsonb_build_object('token',v_link.token,'expires_at',v_link.expires_at,'team_name',v_name);
end $$;
revoke all on function public.chairman_roster_link(uuid) from public,anon;
grant execute on function public.chairman_roster_link(uuid) to authenticated;
