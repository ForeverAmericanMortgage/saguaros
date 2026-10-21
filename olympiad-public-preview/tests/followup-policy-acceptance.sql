begin;
do $test$
declare p public.organizer_prospects;g olympiad_private.outreach_gmail_drafts;aid uuid;r jsonb;k text:='synthetic-followup-acceptance-secret-2026';
begin
 select x.* into p from public.organizer_prospects x join olympiad_private.outreach_gmail_drafts z on z.prospect_id=x.id where z.step='followup' and z.export_state='ready' and x.status='sent' and x.last_reply_at is null and x.next_follow_up<=current_date and x.last_contact_at<now()-interval '7 days' and olympiad_private.approved_followup_copy(x.contact_name,z.body) and not exists(select 1 from olympiad_private.outreach_send_attempts a where a.prospect_id=x.id and a.step='followup') limit 1;
 if p.id is null then raise exception 'No bounded acceptance fixture';end if;
 select * into g from olympiad_private.outreach_gmail_drafts where prospect_id=p.id and step='followup';
 if olympiad_private.approved_followup_copy(p.contact_name,g.body||' altered') then raise exception 'Altered copy passed';end if;
 update olympiad_private.outreach_cloud_mailbox set worker_key_hash=encode(extensions.digest(k,'sha256'),'hex'),paused=false where id;
 update olympiad_private.outreach_daily_config set enabled=true,review_released=true,followups_enabled=true where id;
 update olympiad_private.outreach_gmail_drafts set approved_hash=content_hash where id=g.id;
 insert into olympiad_private.outreach_send_attempts(prospect_id,step,local_day,email,subject,body,rfc_message_id) values(p.id,'followup',current_date,p.contact_email,g.subject,g.body,g.rfc_message_id) returning id into aid;
 r:=olympiad_outreach_worker.daily(k,'before_send',jsonb_build_object('id',aid,'content_hash',g.content_hash));
 if r->>'allowed'<>'true' then raise exception 'Valid due followup rejected: %',r;end if;
 update olympiad_private.outreach_send_attempts set state='reserved' where id=aid;
 update public.organizer_prospects set last_reply_at=now() where id=p.id;
 r:=olympiad_outreach_worker.daily(k,'before_send',jsonb_build_object('id',aid,'content_hash',g.content_hash));
 if r->>'allowed'<>'false' then raise exception 'Reply did not block';end if;
 update public.organizer_prospects set last_reply_at=null,status='bounced' where id=p.id;
 update olympiad_private.outreach_send_attempts set state='reserved' where id=aid;
 r:=olympiad_outreach_worker.daily(k,'before_send',jsonb_build_object('id',aid,'content_hash',g.content_hash));
 if r->>'allowed'<>'false' then raise exception 'Bounce did not block';end if;
 update public.organizer_prospects set status='sent',last_contact_at=now()-interval '6 days' where id=p.id;
 update olympiad_private.outreach_send_attempts set state='reserved' where id=aid;
 r:=olympiad_outreach_worker.daily(k,'before_send',jsonb_build_object('id',aid,'content_hash',g.content_hash));
 if r->>'allowed'<>'false' then raise exception 'Early followup passed';end if;
end $test$;
rollback;
select 'PASS: approved due copy allowed; altered copy, reply, bounce, and early followup blocked; all test changes rolled back' result;
