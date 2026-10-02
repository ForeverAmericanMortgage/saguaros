-- Google is the sole enabled external OAuth provider in Olympiad (verified 2026-10-02).
-- Review this guard before enabling any additional external OAuth provider.
-- No captain owner policies or public projections are changed.
create or replace function olympiad_private.chairman_access_allowed()
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(
  auth.uid() is not null
  and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false
  and auth.jwt()->>'role'='authenticated'
  and auth.jwt()->>'client_id' is null
  and auth.jwt()->'amr' @> '[{"method":"oauth"}]'::jsonb
  and exists (
   select 1 from auth.users u
   join public.organizer_memberships m on m.user_id=u.id
   join auth.sessions s on s.user_id=u.id and s.id::text=auth.jwt()->>'session_id'
   where u.id=auth.uid() and u.email_confirmed_at is not null
    and lower(btrim(u.email)) in ('scaldwell@saguaros.com','cwolfe@saguaros.com')
    and lower(btrim(u.email))=lower(btrim(auth.jwt()->>'email'))
    and s.oauth_client_id is null and (s.not_after is null or s.not_after>now())
    and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google'
      and lower(btrim(i.identity_data->>'email'))=lower(btrim(u.email)))
    and exists(select 1 from auth.mfa_amr_claims c where c.session_id=s.id and c.authentication_method='oauth')
    and not exists(select 1 from auth.mfa_amr_claims c where c.session_id=s.id
      and c.authentication_method not in ('oauth','token_refresh','totp'))
  ),false);
$$;
revoke all on function olympiad_private.chairman_access_allowed() from public,anon;
grant execute on function olympiad_private.chairman_access_allowed() to authenticated;
alter policy organizer_self_read on public.organizer_memberships
 using(user_id=(select auth.uid()) and (select olympiad_private.chairman_access_allowed()));

CREATE OR REPLACE FUNCTION olympiad_private.sync_team_directory()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not (new.captain_user_id=auth.uid() or olympiad_private.chairman_access_allowed()) then raise exception 'Verified team ownership is required'; end if;
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
end $function$;
CREATE OR REPLACE FUNCTION olympiad_private.sync_fundraising_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_team uuid;
begin
 if auth.uid() is null or not olympiad_private.chairman_access_allowed() then raise exception 'Organizer access required'; end if;
 -- Serialize all ledger projection writers before reading totals; order is fixed.
 -- A single event-scale ledger lock prevents lost aggregates when separate rows change concurrently.
 perform pg_advisory_xact_lock(hashtextextended('olympiad:fundraising-ledger',0));
 for v_team in select distinct x from unnest(array[new.team_id,case when tg_op='UPDATE' then old.team_id else null end]) x where x is not null order by x loop
  insert into public.team_fundraising_totals(team_id,event_id,total_cents,posted_entries,updated_at)
  select t.id,t.event_id,coalesce(sum(l.amount_cents) filter(where l.status='posted' and l.attribution_status='matched' and l.verified_by is not null and l.verified_at is not null),0),
   count(l.id) filter(where l.status='posted' and l.attribution_status='matched' and l.verified_by is not null and l.verified_at is not null),now()
  from public.teams t left join public.fundraising_ledger l on l.team_id=t.id and l.event_id=t.event_id where t.id=v_team group by t.id,t.event_id
  on conflict(team_id) do update set total_cents=excluded.total_cents,posted_entries=excluded.posted_entries,updated_at=excluded.updated_at;
 end loop;
 return new;
end $function$;
CREATE OR REPLACE FUNCTION olympiad_private.review_changed_referral()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if (tg_op='INSERT' or new.member_id is distinct from old.member_id) and not olympiad_private.chairman_access_allowed() then
  update public.team_reviews set status='pending',message='Referral details changed. Awaiting chairman review.',version=version+1,reviewed_by=null,reviewed_at=now() where team_id=new.team_id and status in ('approved','needs_changes');
 end if;
 return new;
end $function$;
CREATE OR REPLACE FUNCTION public.organizer_invitation_progress()
 RETURNS TABLE(email text, invited_at timestamp with time zone, email_verified boolean, last_sign_in_at timestamp with time zone, team_count bigint, participant_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not olympiad_private.chairman_access_allowed() then
  raise exception 'Organizer access required' using errcode='42501';
 end if;
 return query
 select i.email,i.created_at,u.email_confirmed_at is not null,u.last_sign_in_at,
 (select count(*) from public.teams t join public.event_editions e on e.id=t.event_id where t.captain_user_id=u.id and e.year=2027),
 (select count(*) from public.roster_participants r join public.teams t on t.id=r.team_id join public.event_editions e on e.id=t.event_id where t.captain_user_id=u.id and e.year=2027)
 from public.pilot_invitations i left join auth.users u on lower(btrim(u.email))=i.email
 where i.event_year=2027 order by i.created_at desc,i.email;
end; $function$;
CREATE OR REPLACE FUNCTION olympiad_private.organizer_campaign_contacts()
 RETURNS TABLE(captain_user_id uuid, email text, revision bigint, synced_revision bigint, last_synced_at timestamp with time zone, last_result text, last_error text, teams jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not olympiad_private.chairman_access_allowed() then raise exception 'Organizer access required' using errcode='42501'; end if;
 return query select q.captain_user_id,lower(btrim(u.email)),q.revision,q.synced_revision,q.last_synced_at,q.last_result,q.last_error,
 (select jsonb_agg(jsonb_build_object('id',t.id,'status',coalesce(r.status,'pending'),'history',coalesce(a.participation_history,'unclassified'),'needs_roster',
 (select count(*) from public.roster_participants p where p.team_id=t.id)<6 or exists(select 1 from public.roster_participants p where p.team_id=t.id and (coalesce(p.name,'')='' or coalesce(p.email,'')='' or coalesce(p.phone,'')='' or coalesce(p.shirt_size,'')='' or coalesce(p.shirt_fit,'')=''))))
 from public.teams t join public.event_editions e on e.id=t.event_id left join public.team_reviews r on r.team_id=t.id left join public.team_audience_profiles a on a.team_id=t.id where t.captain_user_id=q.captain_user_id and e.year=2027)
 from public.mailchimp_sync_queue q join auth.users u on u.id=q.captain_user_id where u.email_confirmed_at is not null order by q.captain_user_id;
end $function$;
