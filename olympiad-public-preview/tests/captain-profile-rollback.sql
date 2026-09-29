begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where email='scaldwell@saguaros.com'),true);
select set_config('olympiad.test_team',(select id::text from public.teams where team_name='PRIVATE PILOT SMOKE 20260929'),true);
set local role authenticated;
select public.update_team_profile(current_setting('olympiad.test_team')::uuid,'PRIVATE PILOT SMOKE 20260929','Rollback profile business','technology','Rollback Captain','2025550100','Private rollback audit',false);
do $$ begin
 if not exists(select 1 from public.teams t join public.businesses b on b.id=t.business_id join public.team_captain_details d on d.team_id=t.id where t.id=current_setting('olympiad.test_team')::uuid and t.company_name=b.name and b.name='Rollback profile business' and d.name='Rollback Captain') then raise exception 'Atomic profile correction failed'; end if;
 begin
 perform public.update_team_profile(current_setting('olympiad.test_team')::uuid,'PRIVATE PILOT SMOKE 20260929','Should roll back','technology','','2025550100','',false);
 raise exception 'Expected invalid captain failure';
 exception when check_violation then null;
 end;
 if not exists(select 1 from public.teams where id=current_setting('olympiad.test_team')::uuid and company_name='Rollback profile business') then raise exception 'Partial update leaked'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where email='sean@foreveramericanmortgage.com'),true);
set local role authenticated;
do $$ begin
 begin
 perform public.update_team_profile(current_setting('olympiad.test_team')::uuid,'PRIVATE PILOT SMOKE 20260929','Forbidden','technology','Captain','2025550100','',false);
 raise exception 'Cross-captain profile update allowed';
 exception when raise_exception then if sqlerrm <> 'Team access denied' then raise; end if;
 end;
end $$;
rollback;
