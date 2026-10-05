CREATE OR REPLACE FUNCTION olympiad_private.sync_team_directory()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 -- Roster-only updates do not change the public directory. RLS and the joining RPC still govern writes.
 if tg_op='UPDATE' and (to_jsonb(new)-'roster_version'-'updated_at') = (to_jsonb(old)-'roster_version'-'updated_at') then return new; end if;
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
end $function$
