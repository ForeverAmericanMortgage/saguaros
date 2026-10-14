-- Run inside a transaction after the review migration; this test rolls back all fixtures.
begin;
do $$
declare k text=repeat('test-only-',5);v jsonb;cid uuid;did uuid;aid uuid;uid uuid;sid uuid;oldhash text=repeat('a',64);newhash text=repeat('b',64);
begin
 begin perform olympiad_outreach_worker.drafts('bad','list');raise exception 'bad worker accepted';exception when insufficient_privilege then null;end;
 begin perform olympiad_private.outreach_review('status');raise exception 'anonymous accepted';exception when insufficient_privilege then null;end;
 update olympiad_private.outreach_cloud_mailbox set worker_key_hash=encode(extensions.digest(k,'sha256'),'hex'),paused=false,last_polled_at=now(),last_error='';
 insert into olympiad_private.outreach_candidates(company,company_key,domain,email,name,role,research,subject,body,followup_subject,followup_body) values('Review fixture','reviewfixture','review-fixture.example','person@review-fixture.example','Person Test','Owner',jsonb_build_object('checked_at',now(),'clay_task_id','fixture'),'Invite','Hello','Re: Invite','Followup') returning id into cid;
 perform olympiad_outreach_worker.drafts(k,'list');
 select id into did from olympiad_private.outreach_gmail_drafts where candidate_id=cid;
 if did is null then raise exception 'draft not seeded';end if;
 perform olympiad_outreach_worker.drafts(k,'sync',jsonb_build_object('id',did,'subject','Invite','body','Hello','content_hash',oldhash,'gmail_thread_id','abcdef','rfc_message_id','<fixture@saguaros.com>'));
 select u.id,s.id into uid,sid from auth.users u join auth.sessions s on s.user_id=u.id where u.email='scaldwell@saguaros.com' and exists(select 1 from auth.mfa_amr_claims c where c.session_id=s.id and c.authentication_method='oauth') order by s.created_at desc limit 1;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'session_id',sid,'role','authenticated','email','scaldwell@saguaros.com','amr',jsonb_build_array(jsonb_build_object('method','oauth')))::text,true);
 if not olympiad_private.chairman_access_allowed() then raise exception 'fixture requires actual chairman session';end if;
 begin perform olympiad_private.outreach_review('approve',jsonb_build_array(jsonb_build_object('id',did,'content_hash',newhash)));raise exception 'stale approval accepted';exception when check_violation then null;end;
 perform olympiad_private.outreach_review('approve',jsonb_build_array(jsonb_build_object('id',did,'content_hash',oldhash)));
 if not exists(select 1 from olympiad_private.outreach_gmail_drafts where id=did and approved_hash=oldhash) then raise exception 'approval not stored';end if;
 perform olympiad_outreach_worker.drafts(k,'sync',jsonb_build_object('id',did,'subject','Edited invite','body','Hello','content_hash',newhash,'gmail_thread_id','abcdef','rfc_message_id','<fixture@saguaros.com>'));
 if exists(select 1 from olympiad_private.outreach_gmail_drafts where id=did and approved_hash is not null) then raise exception 'edit retained approval';end if;
 update olympiad_private.outreach_daily_config set review_on=(now() at time zone 'America/Phoenix')::date-1,review_released=true,enabled=true,last_attempt_at=null;
 v=olympiad_outreach_worker.daily(k,'claim');if coalesce((v->>'skip')::boolean,false) is not true then raise exception 'unapproved next-day copy claimed';end if;
 perform olympiad_private.outreach_review('approve',jsonb_build_array(jsonb_build_object('id',did,'content_hash',newhash)));
 v=olympiad_outreach_worker.daily(k,'claim');aid=(v->'attempt'->>'id')::uuid;
 if aid is null then raise exception 'approved copy not claimed: %',v-'credential';end if;
 if v->'attempt'->>'subject'<>'Edited invite' then raise exception 'stale copy claimed';end if;
 v=olympiad_outreach_worker.daily(k,'before_send',jsonb_build_object('id',aid,'content_hash',oldhash));if (v->>'allowed')::boolean then raise exception 'wrong hash permitted';end if;
 perform olympiad_outreach_worker.drafts(k,'error',jsonb_build_object('id',did,'error','Missing draft'));
 v=olympiad_outreach_worker.daily(k,'before_send',jsonb_build_object('id',aid,'content_hash',newhash));if (v->>'allowed')::boolean then raise exception 'missing draft permitted';end if;
 perform olympiad_outreach_worker.daily(k,'cancel_review',jsonb_build_object('id',aid));
 begin perform olympiad_private.outreach_daily_manage('release_review');raise exception 'old bypass accepted';exception when check_violation then null;end;
end $$;
select 'approval, stale hash, edit invalidation, missing draft, next-day hold, auth and legacy-bypass tests passed; all fixtures rolled back' as result;
rollback;
