-- Captains may choose an optional referral, but it is never published.
create policy member_reference_captain_read on public.club_member_references for select to authenticated using(true);
create policy attribution_owner_read on public.team_member_attributions for select to authenticated using(exists(select 1 from public.teams where id=team_id and captain_user_id=(select auth.uid())));
create policy attribution_owner_insert on public.team_member_attributions for insert to authenticated with check(updated_by=(select auth.uid()) and exists(select 1 from public.teams where id=team_id and captain_user_id=(select auth.uid())));
create policy attribution_owner_update on public.team_member_attributions for update to authenticated using(exists(select 1 from public.teams where id=team_id and captain_user_id=(select auth.uid()))) with check(updated_by=(select auth.uid()) and exists(select 1 from public.teams where id=team_id and captain_user_id=(select auth.uid())));
revoke update on public.team_member_attributions from authenticated;
grant update(member_id,updated_by,updated_at) on public.team_member_attributions to authenticated;
create function olympiad_private.review_changed_referral() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (tg_op='INSERT' or new.member_id is distinct from old.member_id) and not exists(select 1 from public.organizer_memberships where user_id=auth.uid()) then
  update public.team_reviews set status='pending',message='Referral details changed. Awaiting chairman review.',version=version+1,reviewed_by=null,reviewed_at=now() where team_id=new.team_id and status in ('approved','needs_changes');
 end if;
 return new;
end $$;
revoke all on function olympiad_private.review_changed_referral() from public,anon,authenticated;
create trigger referral_requires_review after insert or update on public.team_member_attributions for each row execute function olympiad_private.review_changed_referral();

create function public.set_team_referring_member(p_team_id uuid,p_member_id uuid default null)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 perform 1 from public.teams t join public.event_editions e on e.id=t.event_id where t.id=p_team_id and t.captain_user_id=auth.uid() and e.year=2027 for update of t;
 if not found then raise exception 'Team access denied'; end if;
 if p_member_id is not null and not exists(select 1 from public.club_member_references where id=p_member_id and active) then raise exception 'Choose a listed referring member'; end if;
 -- Do not add a null assignment to an existing unassigned team just to save unrelated profile fields.
 if p_member_id is null and not exists(select 1 from public.team_member_attributions where team_id=p_team_id) then return; end if;
 insert into public.team_member_attributions(team_id,member_id,updated_by) values(p_team_id,p_member_id,auth.uid())
 on conflict(team_id) do update set member_id=excluded.member_id,updated_by=excluded.updated_by,updated_at=now();
end $$;
revoke all on function public.set_team_referring_member(uuid,uuid) from public,anon,authenticated;
grant execute on function public.set_team_referring_member(uuid,uuid) to authenticated;

create function public.register_team_with_referral(p_team_name text,p_company_name text,p_industry_slug text,p_captain_name text,p_phone text,p_is_public boolean,p_referring_team_slug text,p_description text,p_member_id uuid default null)
returns table(team_id uuid,team_slug text) language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_slug text;
begin
 select r.team_id,r.team_slug into v_id,v_slug from public.register_team(p_team_name,p_company_name,p_industry_slug,p_captain_name,p_phone,p_is_public,p_referring_team_slug,p_description) r;
 perform public.set_team_referring_member(v_id,p_member_id);
 return query select v_id,v_slug;
end $$;
revoke all on function public.register_team_with_referral(text,text,text,text,text,boolean,text,text,uuid) from public,anon,authenticated;
grant execute on function public.register_team_with_referral(text,text,text,text,text,boolean,text,text,uuid) to authenticated;
create function public.update_team_profile_with_referral(p_team_id uuid,p_team_name text,p_company_name text,p_industry_slug text,p_captain_name text,p_phone text,p_description text,p_is_public boolean,p_member_id uuid default null)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform public.update_team_profile(p_team_id,p_team_name,p_company_name,p_industry_slug,p_captain_name,p_phone,p_description,p_is_public);
 perform public.set_team_referring_member(p_team_id,p_member_id);
end $$;
revoke all on function public.update_team_profile_with_referral(uuid,text,text,text,text,text,text,boolean,uuid) from public,anon,authenticated;
grant execute on function public.update_team_profile_with_referral(uuid,text,text,text,text,text,text,boolean,uuid) to authenticated;

create or replace view public.member_fundraising_credit with(security_invoker=true) as
 select m.id as member_id,m.name as member_name,t.event_id,count(t.id)::integer as team_count,coalesce(sum(f.total_cents),0)::bigint as total_cents
 from public.club_member_references m join public.team_member_attributions a on a.member_id=m.id
 join public.teams t on t.id=a.team_id join public.team_reviews r on r.team_id=t.id and r.status='approved'
 left join public.team_fundraising_totals f on f.team_id=t.id and f.event_id=t.event_id
 where exists(select 1 from public.organizer_memberships where user_id=(select auth.uid()))
 group by m.id,m.name,t.event_id;
