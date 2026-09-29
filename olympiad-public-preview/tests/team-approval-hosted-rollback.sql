begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where email='scaldwell@saguaros.com'),true);
select set_config('olympiad.audit_team',(select id::text from public.teams where team_name='PRIVATE PILOT SMOKE 20260929'),true);
set local role authenticated;
do $audit$
declare tid uuid:=current_setting('olympiad.audit_team')::uuid; mid uuid; ev uuid; v integer; rejected boolean:=false; result jsonb;
begin
 select id into mid from public.club_member_references where source_label='Sean Caldwell';
 select event_id into ev from public.teams where id=tid;
 select coalesce((select version from public.team_reviews where team_id=tid),0) into v;
 update public.teams set is_public=true where id=tid;
 if exists(select 1 from public.team_directory where id=tid) then raise exception 'Pending team published'; end if;
 result:=public.review_team(tid,'approved','Rollback-only verification',v,mid);
 if not exists(select 1 from public.team_directory where id=tid) then raise exception 'Approved public team missing'; end if;
 begin perform public.review_team(tid,'declined','Stale',v,mid); exception when raise_exception then if sqlerrm like 'Review changed%' then rejected:=true; else raise; end if; end;
 if not rejected then raise exception 'Stale review accepted'; end if;
 insert into public.fundraising_ledger(event_id,team_id,source_namespace,source_transaction_id,amount_cents,status,attribution_status) values(ev,tid,'approval-rollback',gen_random_uuid()::text,12000,'posted','matched'),(ev,tid,'approval-rollback',gen_random_uuid()::text,-2000,'posted','matched');
 if not exists(select 1 from public.member_fundraising_credit where member_id=mid and total_cents=10000) then raise exception 'Member net total incorrect'; end if;
 perform public.review_team(tid,'needs_changes','Please confirm business details',(result->>'version')::int,mid);
 if exists(select 1 from public.team_directory where id=tid) then raise exception 'Unapproved team still published'; end if;
end $audit$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from auth.users where email='sean@foreveramericanmortgage.com'),true);
set local role authenticated;
do $audit$ declare rejected boolean:=false; own_team uuid; member uuid;
begin
 if exists(select 1 from public.team_member_attributions where team_id=current_setting('olympiad.audit_team')::uuid) or exists(select 1 from public.team_review_events) or exists(select 1 from public.member_fundraising_credit) then raise exception 'Captain can read internal credit'; end if;
 begin perform public.review_team(current_setting('olympiad.audit_team')::uuid,'approved','Bypass',0,null); exception when raise_exception then if sqlerrm='Organizer access required' then rejected:=true; else raise; end if; end;
 if not rejected then raise exception 'Captain approved team'; end if;
 select id into own_team from public.teams where team_name='FAM' and captain_user_id=auth.uid();
 select id into member from public.club_member_references where source_label='Sean Caldwell';
 perform public.set_team_referring_member(own_team,member);
 if not exists(select 1 from public.team_member_attributions where team_id=own_team and member_id=member) then raise exception 'Captain referral not saved'; end if;
 if not exists(select 1 from public.team_reviews where team_id=own_team and status='pending') or exists(select 1 from public.team_directory where id=own_team) then raise exception 'Changed referral bypassed approval'; end if;
 rejected:=false;
 begin perform public.set_team_referring_member(current_setting('olympiad.audit_team')::uuid,member); exception when raise_exception then if sqlerrm='Team access denied' then rejected:=true; else raise; end if; end;
 if not rejected then raise exception 'Captain changed another team referral'; end if;
end $audit$;
rollback;
