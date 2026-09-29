grant update(name) on public.businesses to authenticated;
create policy business_owner_update on public.businesses for update to authenticated
 using(owner_user_id=(select auth.uid())) with check(owner_user_id=(select auth.uid()));
create function public.update_team_profile(p_team_id uuid,p_team_name text,p_company_name text,p_industry_slug text,p_captain_name text,p_phone text,p_description text,p_is_public boolean)
returns void language plpgsql security invoker set search_path='' as $$
declare v_business uuid; v_industry uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select t.business_id into v_business from public.teams t join public.event_editions e on e.id=t.event_id
 where t.id=p_team_id and t.captain_user_id=auth.uid() and e.year=2027 for update of t;
 if v_business is null then raise exception 'Team access denied'; end if;
 if p_team_name is null or p_company_name is null or p_captain_name is null or p_phone is null or p_is_public is null then raise exception 'Required profile details missing'; end if;
 select id into v_industry from public.industries where slug=p_industry_slug;
 if v_industry is null then raise exception 'Choose an industry'; end if;
 update public.businesses set name=trim(p_company_name) where id=v_business and owner_user_id=auth.uid();
 if not found then raise exception 'Business access denied'; end if;
 update public.teams set team_name=trim(p_team_name),company_name=trim(p_company_name),industry_id=v_industry,description=coalesce(p_description,''),is_public=p_is_public where id=p_team_id;
 update public.team_captain_details set name=trim(p_captain_name),phone=trim(p_phone) where team_id=p_team_id;
 if not found then raise exception 'Captain details not found'; end if;
end $$;
revoke all on function public.update_team_profile(uuid,text,text,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.update_team_profile(uuid,text,text,text,text,text,text,boolean) to authenticated;
