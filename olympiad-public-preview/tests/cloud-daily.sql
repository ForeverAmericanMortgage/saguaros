-- Execute after the migration inside a rollback transaction; no provider sends.
do $$declare k text=repeat('x',48);j jsonb;a uuid;p uuid;i integer;
begin
 update olympiad_private.outreach_cloud_mailbox set worker_key_hash=encode(extensions.digest(k,'sha256'),'hex'),credential='fixture.sealed.value',paused=false,last_polled_at=now(),last_error='' where id;
 update olympiad_private.outreach_daily_config set enabled=true,start_on=(now() at time zone 'America/Phoenix')::date,last_attempt_at=null where id;
 begin perform olympiad_outreach_worker.daily('wrong','claim');raise exception 'Invalid worker key accepted';exception when insufficient_privilege then null;end;
 j=olympiad_outreach_worker.daily(k,'intake',jsonb_build_object('company','ZZ rollback daily fixture','domain','rollback.invalid','email','jane@rollback.invalid','name','Jane','role','Owner','source_url','https://rollback.invalid/about','fact','Local office','local_fit','Phoenix','role_fit','Owner','checked_at',now(),'clay_task_id','test','subject','Fixture subject','body','Fixture body','followup_subject','Re: Fixture','followup_body','Fixture followup'));
 if j->>'queued'<>'true' then raise exception 'Candidate not queued';end if;
 j=olympiad_outreach_worker.daily(k,'claim');a=(j#>>'{attempt,id}')::uuid;if a is null then raise exception 'Qualified candidate not claimed';end if;
 if (olympiad_outreach_worker.daily(k,'claim')->>'skip')<>'true' then raise exception 'Concurrent claim duplicated';end if;
 if (olympiad_outreach_worker.daily(k,'before_send',jsonb_build_object('id',a))->>'allowed')<>'true' then raise exception 'Reservation could not transition';end if;
 j=olympiad_outreach_worker.daily(k,'receipt',jsonb_build_object('id',a,'message_id','abc123ffff','thread_id','abc123ffff'));p=(j->>'prospect_id')::uuid;
 if not exists(select 1 from public.organizer_prospects where id=p and next_follow_up=(now() at time zone 'America/Phoenix')::date+7) then raise exception 'Receipt did not project follow-up';end if;
 if (olympiad_outreach_worker.daily(k,'intake',jsonb_build_object('company','ZZ rollback daily fixture','domain','rollback.invalid','email','jane@rollback.invalid'))->>'excluded')<>'true' then raise exception 'Sent company not excluded';end if;
 for i in 1..19 loop insert into olympiad_private.outreach_send_attempts(step,local_day,state,email,subject,body,rfc_message_id) values('initial',(now() at time zone 'America/Phoenix')::date,'sent','fixture@rollback.invalid','fixture','fixture','<'||gen_random_uuid()||'@rollback.invalid>');end loop;
 update olympiad_private.outreach_daily_config set last_attempt_at=null where id;
 if (olympiad_outreach_worker.daily(k,'claim')->>'skip')<>'true' then raise exception 'Daily new cap exceeded';end if;
 -- A reply or chairman hold between claim and dispatch suppresses the follow-up.
 update public.organizer_prospects set last_contact_at=now()-interval '8 days',next_follow_up=(now() at time zone 'America/Phoenix')::date where id=p;
 j=olympiad_outreach_worker.daily(k,'claim');a=(j#>>'{attempt,id}')::uuid;if a is null or j#>>'{attempt,step}'<>'followup' then raise exception 'Follow-up cap incorrectly counts new sends';end if;
 update public.organizer_prospects set status='held' where id=p;
 if (olympiad_outreach_worker.daily(k,'before_send',jsonb_build_object('id',a))->>'allowed')<>'false' then raise exception 'Chairman hold ignored';end if;
 if not exists(select 1 from olympiad_private.outreach_send_attempts where id=a and state='cancelled') then raise exception 'Suppression not persisted';end if;
end $$;
set local role anon;
do $$begin begin perform public.organizer_daily_manage('enable');raise exception 'Anonymous enable accepted';exception when insufficient_privilege then null;end;begin perform 1 from olympiad_private.outreach_candidates;raise exception 'Anonymous queue disclosure';exception when insufficient_privilege then null;end;end $$;
reset role;
