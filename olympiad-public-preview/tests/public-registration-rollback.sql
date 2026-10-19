begin;
insert into auth.users(id,email,email_confirmed_at) values ('a0191019-0000-4000-8000-000000000001','public-registration-a@example.test',now()),('a0191019-0000-4000-8000-000000000002','public-registration-b@example.test',now()),('a0191019-0000-4000-8000-000000000003','public-registration-unverified@example.test',null);
do $$ begin
 if (select count(*) from public.pilot_captains where user_id in ('a0191019-0000-4000-8000-000000000001','a0191019-0000-4000-8000-000000000002'))<>2 then raise exception 'Verified public captains not enrolled'; end if;
 if exists(select 1 from public.pilot_captains where user_id='a0191019-0000-4000-8000-000000000003') then raise exception 'Unverified identity enrolled'; end if;
end $$;
select set_config('request.jwt.claim.sub','a0191019-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ declare tid uuid; denied boolean:=false; begin
 select team_id into tid from public.register_team_with_referral('TEST public registration rollback','TEST public business rollback','technology','TEST Captain','2025550100',true,null,'Rollback verification',null);
 perform set_config('olympiad.test_team',tid::text,true);
 if exists(select 1 from public.team_directory where id=tid) then raise exception 'Pending team is publicly listed'; end if;
 if exists(select 1 from public.team_reviews where team_id=tid and status<>'pending') then raise exception 'Team did not start pending'; end if;
 begin perform public.review_team(tid,'approved','Unauthorized',0,null); exception when others then if sqlerrm like '%Organizer access required%' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'Captain could approve team'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','a0191019-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.teams where id=current_setting('olympiad.test_team')::uuid) then raise exception 'Other captain can access private team'; end if;
end $$;
reset role;
rollback;
