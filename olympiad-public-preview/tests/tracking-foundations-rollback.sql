-- Run ONLY in isolated Olympiad, after tracking_foundations migration.
-- No outbound email or actual Auth sessions. Every fixture/change rolls back.
begin;
create temp table tracking_audit_result(status text, detail text) on commit drop;
do $audit$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); ta uuid; tb uuid; ev uuid; rid uuid; rcreated timestamptz; n bigint; rejected boolean; rows_json jsonb;
begin
 begin
  insert into auth.users(id) values(a),(b),(o);
  insert into public.pilot_captains(user_id) values(a),(b);
  insert into public.organizer_memberships(user_id) values(o);
  update public.event_editions set registration_open=true where year=2027 returning id into ev;
  perform set_config('request.jwt.claim.sub',a::text,true); set local role authenticated;
  select team_id into ta from public.register_team('TEST tracking A '||a,'TEST technology','technology','TEST A','2025550100',true,null,'Synthetic rollback test');
  perform public.save_roster(ta,'[{"name":"TEST Complete","email":"a@example.test","phone":"2025550101","shirt_size":"M","shirt_fit":"female"},{"name":"TEST Partial"}]',0);
  select id,created_at into rid,rcreated from public.roster_participants where team_id=ta and position=0;
  select jsonb_agg(jsonb_build_object('id',id,'name',name,'email',email,'phone',phone,'shirt_size',shirt_size,'shirt_fit',shirt_fit) order by position desc) into rows_json from public.roster_participants where team_id=ta;
  perform public.save_roster(ta,rows_json,1);
  if not exists(select 1 from public.roster_participants where id=rid and created_at=rcreated and position=1 and email='a@example.test') then raise exception 'Stable participant identity/reorder failed'; end if;
  if not exists(select 1 from public.roster_participants where team_id=ta and name='TEST Partial' and email='' and phone='') then raise exception 'Partial roster persistence failed'; end if;
  rejected:=false; begin perform public.save_roster(ta,'[]',1); exception when others then if sqlerrm like 'Roster changed%' then rejected:=true; else raise; end if; end;
  if not rejected then raise exception 'Version conflict not rejected'; end if;
  rejected:=false; begin insert into public.team_fundraising_goals(team_id,stretch_goal_cents) values(ta,500000); exception when insufficient_privilege then rejected:=true; end;
  if not rejected then raise exception 'Captain goal write allowed'; end if;
  rejected:=false; begin insert into public.fundraising_ledger(event_id,team_id,source_namespace,source_transaction_id,amount_cents) values(ev,ta,'test','bad',100); exception when others then if sqlstate='42501' or sqlerrm='Organizer access required' then rejected:=true; else raise; end if; end;
  if not rejected then raise exception 'Captain ledger write allowed'; end if;
  perform set_config('request.jwt.claim.sub',b::text,true);
  select team_id into tb from public.register_team('TEST tracking B '||b,'TEST healthcare','healthcare','TEST B','2025550102',false,null,'Synthetic rollback test');
  if exists(select 1 from public.roster_participants where team_id=ta) or exists(select 1 from public.teams where id=ta) then raise exception 'B read A private data'; end if;
  rejected:=false; begin perform public.save_roster(tb,jsonb_build_array(jsonb_build_object('id',rid,'name','stolen')),0); exception when others then if sqlerrm='Participant does not belong to this team' then rejected:=true; else raise; end if; end;
  if not rejected then raise exception 'Foreign participant identity allowed'; end if;
  perform set_config('request.jwt.claim.sub',o::text,true);
  perform public.review_team(ta,'approved','Rollback audit',0,null);
  insert into public.team_fundraising_goals(team_id,stretch_goal_cents) values(ta,500000);
  rejected:=false; begin update public.team_fundraising_goals set stretch_goal_cents=299999 where team_id=ta; exception when check_violation then rejected:=true; end;
  if not rejected then raise exception 'Below minimum goal allowed'; end if;
  insert into public.fundraising_ledger(event_id,team_id,source_namespace,source_transaction_id,amount_cents,referring_club_member_raw,olympiad_team_raw) values(ev,ta,'rollback-test',a||'-pending',999999,'PRIVATE raw member','PRIVATE raw team');
  insert into public.fundraising_ledger(event_id,team_id,source_namespace,source_transaction_id,amount_cents,status,attribution_status) values(ev,ta,'rollback-test',a||'-posted',120000,'posted','matched');
  insert into public.fundraising_ledger(event_id,team_id,source_namespace,source_transaction_id,amount_cents,status,attribution_status) values(ev,ta,'rollback-test',a||'-refund',-20000,'posted','matched');
  insert into public.fundraising_ledger(event_id,team_id,source_namespace,source_transaction_id,amount_cents,status,attribution_status) values(ev,tb,'rollback-test',b||'-private',700000,'posted','matched');
  set local role anon; perform set_config('request.jwt.claim.sub','',true);
  if exists(select 1 from public.fundraising_leaderboard where event_id=ev) then raise exception 'Inactive leaderboard leaked amounts'; end if;
  if exists(select 1 from public.team_fundraising_totals where team_id in(ta,tb)) then raise exception 'Inactive totals exposed to anon'; end if;
  rejected:=false; begin perform count(*) from public.fundraising_ledger; exception when insufficient_privilege then rejected:=true; end;
  if not rejected then raise exception 'Raw ledger exposed to anonymous'; end if;
  set local role authenticated; perform set_config('request.jwt.claim.sub',o::text,true);
  update public.event_editions set fundraising_active=true where id=ev;
  set local role anon; perform set_config('request.jwt.claim.sub','',true);
  select total_cents into n from public.fundraising_leaderboard where team_id=ta;
  if n is distinct from 100000 then raise exception 'Verified net amount incorrect: %',n; end if;
  if exists(select 1 from public.fundraising_leaderboard where team_id=tb) or exists(select 1 from public.team_fundraising_totals where team_id=tb) then raise exception 'Private team amounts exposed'; end if;
  if not exists(select 1 from public.fundraising_leaderboard where team_id=ta and stretch_goal_cents=500000 and posted_entries=2) then raise exception 'Goal or posted entry count incorrect'; end if;
  set local role authenticated; perform set_config('request.jwt.claim.sub',a::text,true);
  update public.teams set is_public=false where id=ta;
  set local role anon; perform set_config('request.jwt.claim.sub','',true);
  if exists(select 1 from public.fundraising_leaderboard where team_id=ta) or exists(select 1 from public.team_fundraising_totals where team_id=ta) then raise exception 'Opt-out did not hide amounts'; end if;
  reset role;
  insert into tracking_audit_result values('PASS','Stable roster identity/reordering; partial persistence; version conflict; captain isolation/foreign IDs; organizer-only goals/ledger; minimum goal; inactive visibility; verified net posted totals; pending exclusion; private/opt-out aggregate safety. All fixtures rolled back.');
 exception when others then
  reset role;
  insert into tracking_audit_result values('FAIL',sqlstate||': '||sqlerrm);
 end;
end $audit$;
select * from tracking_audit_result;
rollback;
