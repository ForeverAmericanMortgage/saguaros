-- Rollback-only acceptance for 20261027200000_outreach_sender_safeguards.sql.
-- Synthetic rows only; every change is rolled back. Sends no email.
begin;
do $test$
declare k text:='synthetic-sender-safety-secret-2026-27';a uuid;b uuid;c uuid;r jsonb;m olympiad_private.outreach_cloud_mailbox;i integer;blocked boolean;
begin
 -- Isolate the rolling window from real activity inside this transaction.
 update olympiad_private.outreach_send_attempts set sent_at=sent_at-interval '3 days' where sent_at>now()-interval '24 hours';
 update public.organizer_prospect_messages set occurred_at=occurred_at-interval '3 days' where occurred_at>now()-interval '24 hours';
 delete from olympiad_private.outreach_sender_alerts;
 update olympiad_private.outreach_cloud_mailbox set worker_key_hash=encode(extensions.digest(k,'sha256'),'hex'),paused=false,credential=coalesce(credential,'synthetic.sealed.value'),safety_paused_at=null,safety_pause_reason='',last_error='',last_polled_at=now() where id;
 update olympiad_private.outreach_daily_config set last_error='' where id;
 insert into public.organizer_prospects(company_name,company_domain,contact_email,status,last_contact_at) values('Synthetic Safety A','safety-a.example','a@safety-a.example','sent',now()) returning id into a;
 insert into public.organizer_prospects(company_name,company_domain,contact_email,status,last_contact_at) values('Synthetic Safety B','safety-b.example','b@safety-b.example','sent',now()) returning id into b;
 insert into public.organizer_prospects(company_name,company_domain,contact_email,status,last_contact_at) values('Synthetic Safety C','safety-c.example','c@safety-c.example','sent',now()) returning id into c;

 -- 19 sends: one bounce (5.3%) stays below the 20-send minimum.
 for i in 1..19 loop insert into olympiad_private.outreach_send_attempts(step,local_day,email,subject,body,rfc_message_id,state,sent_at) values('initial',current_date,'s'||i||'@safety.example','s','b','<synthetic-safety-'||i||'@saguaros.com>','sent',now());end loop;
 insert into public.organizer_prospect_messages(prospect_id,direction,step,provider_message_id,gmail_thread_id,occurred_at) values(a,'inbound','bounced','synthetic-bounce-1','t1',now());
 if (select safety_paused_at from olympiad_private.outreach_cloud_mailbox where id) is not null then raise exception 'Paused below 20 sends';end if;
 -- 40 sends: a second bounce from the same prospect still counts once (2.5%).
 for i in 20..40 loop insert into olympiad_private.outreach_send_attempts(step,local_day,email,subject,body,rfc_message_id,state,sent_at) values('initial',current_date,'s'||i||'@safety.example','s','b','<synthetic-safety-'||i||'@saguaros.com>','sent',now());end loop;
 insert into public.organizer_prospect_messages(prospect_id,direction,step,provider_message_id,gmail_thread_id,occurred_at) values(a,'inbound','bounced','synthetic-bounce-2','t1',now());
 if (select safety_paused_at from olympiad_private.outreach_cloud_mailbox where id) is not null then raise exception 'Paused at 2.5 percent';end if;
 insert into olympiad_private.outreach_send_attempts(step,local_day,email,subject,body,rfc_message_id) values('initial',current_date,'r@safety.example','s','b','<synthetic-safety-r@saguaros.com>');
 -- Second distinct bounce: 2/40 = 5% > 3%.
 insert into public.organizer_prospect_messages(prospect_id,direction,step,provider_message_id,gmail_thread_id,occurred_at) values(b,'inbound','bounced','synthetic-bounce-3','t2',now());
 select * into m from olympiad_private.outreach_cloud_mailbox where id;
 if m.safety_paused_at is null or m.last_error not like 'Sending paused: Bounce rate 5.0%' || '%' then raise exception 'Bounce rate did not pause: %',m.last_error;end if;
 if not exists(select 1 from olympiad_private.outreach_safety_events where kind='bounce_rate') then raise exception 'Bounce pause not audited';end if;

 -- Paused: no new reservation and no reserved send can reach SMTP.
 blocked=false;begin insert into olympiad_private.outreach_send_attempts(step,local_day,email,subject,body,rfc_message_id) values('initial',current_date,'x@safety.example','s','b','<synthetic-safety-x@saguaros.com>');exception when check_violation then blocked=true;end;
 if not blocked then raise exception 'Reservation allowed while paused';end if;
 blocked=false;begin update olympiad_private.outreach_send_attempts set state='sending' where rfc_message_id='<synthetic-safety-r@saguaros.com>';exception when check_violation then blocked=true;end;
 if not blocked then raise exception 'Reserved send reached SMTP state while paused';end if;
 update olympiad_private.outreach_send_attempts set state='cancelled',detail='Synthetic cancel' where rfc_message_id='<synthetic-safety-r@saguaros.com>';
 -- A clean monitor poll keeps the pause reason in last_error, and polling itself continues.
 perform olympiad_outreach_worker.outreach_cloud_worker(k,'complete',jsonb_build_object('checked_at',now()));
 if (select last_error from olympiad_private.outreach_cloud_mailbox where id) not like 'Sending paused:%' then raise exception 'Clean poll cleared the pause reason';end if;
 r=olympiad_outreach_worker.daily(k,'claim');
 if r->>'skip' is distinct from 'true' then raise exception 'Daily claim not skipped while paused';end if;

 -- Sender-stopped alert: once per hour, only 08:00-18:30 Arizona.
 r=olympiad_outreach_worker.outreach_safety_worker(k,'alert_claim');
 if (now() at time zone 'America/Phoenix')::time between time '08:00' and time '18:29:59' then
  if r->>'reason' not like 'Bounce rate%' then raise exception 'Alert not claimed: %',r;end if;
  perform olympiad_outreach_worker.outreach_safety_worker(k,'alert_complete',jsonb_build_object('id',r->>'id','state','sent'));
  r=olympiad_outreach_worker.outreach_safety_worker(k,'alert_claim');
  if r->>'skip' is distinct from 'true' then raise exception 'Second alert within the hour';end if;
 elsif r->>'skip' is distinct from 'true' then raise exception 'Alert outside window';end if;

 -- Manual resume (simulated; the chairman RPC requires a signed-in chairman) clears it and stays cleared.
 update olympiad_private.outreach_cloud_mailbox set safety_paused_at=null,safety_pause_reason='',last_error='' where id;
 perform olympiad_outreach_worker.outreach_cloud_worker(k,'complete',jsonb_build_object('checked_at',now()));
 if (select last_error from olympiad_private.outreach_cloud_mailbox where id)<>'' then raise exception 'Resume did not clear';end if;
 insert into olympiad_private.outreach_send_attempts(step,local_day,email,subject,body,rfc_message_id) values('initial',current_date,'y@safety.example','s','b','<synthetic-safety-y@saguaros.com>');

 -- Complaint notices pause immediately and are recorded once.
 r=olympiad_outreach_worker.outreach_safety_worker(k,'notice',jsonb_build_object('kind','complaint','message_id','abc123','detail','Synthetic'));
 if r->>'paused' is distinct from 'true' or (select safety_pause_reason from olympiad_private.outreach_cloud_mailbox where id)<>'Spam complaint received' then raise exception 'Complaint did not pause';end if;
 update olympiad_private.outreach_cloud_mailbox set safety_paused_at=null,safety_pause_reason='',last_error='' where id;
 r=olympiad_outreach_worker.outreach_safety_worker(k,'notice',jsonb_build_object('kind','complaint','message_id','abc123'));
 if r->>'recorded' is distinct from 'false' or (select safety_paused_at from olympiad_private.outreach_cloud_mailbox where id) is not null then raise exception 'Seen complaint re-paused after resume';end if;
 r=olympiad_outreach_worker.outreach_safety_worker(k,'notice',jsonb_build_object('kind','abuse_notice','message_id','def456'));
 if (select safety_pause_reason from olympiad_private.outreach_cloud_mailbox where id)<>'Abuse notice received' then raise exception 'Abuse notice did not pause';end if;

 blocked=false;begin perform olympiad_outreach_worker.outreach_safety_worker('wrong-key-wrong-key-wrong-key-wrong','alert_claim');exception when insufficient_privilege then blocked=true;end;
 if not blocked then raise exception 'Wrong worker key accepted';end if;
 blocked=false;begin perform olympiad_private.outreach_safety_manage('resume');exception when insufficient_privilege then blocked=true;end;
 if not blocked then raise exception 'Resume allowed without chairman';end if;
end $test$;
rollback;
select 'PASS: 24h bounce threshold with 20-send minimum, complaint and abuse pauses, blocked sends, preserved last_error, hourly alert window, manual-only resume; all changes rolled back' result;
