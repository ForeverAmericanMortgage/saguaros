CREATE OR REPLACE FUNCTION olympiad_outreach_worker.drafts(p_key text, p_action text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare m olympiad_private.outreach_cloud_mailbox;r olympiad_private.outreach_gmail_drafts;
begin
 select * into m from olympiad_private.outreach_cloud_mailbox where id;
 if p_key is null or length(p_key)<32 or m.worker_key_hash is null or m.worker_key_hash is distinct from encode(extensions.digest(p_key,'sha256'),'hex') then raise insufficient_privilege;end if;
 if p_action='list' then
  if m.paused or m.credential is null then return jsonb_build_object('skip',true);end if;
  with fresh as materialized (select q.* from olympiad_private.outreach_candidates q where state='ready' and not exists(select 1 from olympiad_private.outreach_gmail_drafts existing where existing.candidate_id=q.id) order by created_at,id limit 20)
  insert into olympiad_private.outreach_gmail_drafts(candidate_id,step,company,email,subject,body)
   select id,'initial',company,email,subject,body from fresh q where not olympiad_private.outreach_excluded(q.company,q.domain,q.email) on conflict do nothing;
  insert into olympiad_private.outreach_gmail_drafts(prospect_id,step,company,email,subject,body)
   select id,'followup',company_name,contact_email,case when left(draft_subject,3)='Re:' then draft_subject else 'Re: '||draft_subject end,draft_body from public.organizer_prospects p
   where event_year=2027 and not exists(select 1 from olympiad_private.outreach_gmail_drafts existing where existing.prospect_id=p.id and existing.step='followup') and status='sent' and not opted_out and last_reply_at is null and olympiad_private.followup_contact_ready(p.id) and draft_body<>''
   and not exists(select 1 from public.organizer_prospect_messages x where x.prospect_id=p.id and x.step='followup') on conflict do nothing;
  return jsonb_build_object('credential',m.credential,'drafts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select * from olympiad_private.outreach_gmail_drafts where (step='initial' or (step='followup' and (select followups_enabled from olympiad_private.outreach_daily_config where id))) and export_state<>'sent' and gmail_thread_id is not null and (lease_until is null or lease_until<now()) order by synced_at nulls first,created_at limit 20)x));
 elsif p_action='claim' then
  if m.paused or m.credential is null then return jsonb_build_object('skip',true);end if;
  select * into r from olympiad_private.outreach_gmail_drafts where (step='initial' or (step='followup' and (select followups_enabled from olympiad_private.outreach_daily_config where id))) and export_state='pending' and export_attempts=0 order by (step='followup') desc,created_at,id limit 1 for update skip locked;
  if r.id is null then return jsonb_build_object('skip',true);end if;
  update olympiad_private.outreach_gmail_drafts set export_state='exporting',export_attempts=1,lease_until=now()+interval '5 minutes' where id=r.id returning * into r;
  return jsonb_build_object('draft',to_jsonb(r));
 end if;
 perform 1 from olympiad_private.outreach_daily_config where id for update;
 select * into r from olympiad_private.outreach_gmail_drafts where id=(p_data->>'id')::uuid for update;
 if r.id is null or r.export_state='sent' then return jsonb_build_object('ignored',true);end if;
 -- Never change a copy while SMTP may be in flight.
 if exists(select 1 from olympiad_private.outreach_send_attempts a where (a.candidate_id=r.candidate_id or (a.prospect_id=r.prospect_id and a.step=r.step)) and a.state in ('sending','ambiguous')) then return jsonb_build_object('ignored',true);end if;
 if p_action='sync' then
  if coalesce(p_data->>'content_hash','')!~'^[a-f0-9]{64}$' or coalesce(p_data->>'gmail_thread_id','')!~'^[a-f0-9]{1,40}$' or coalesce(p_data->>'rfc_message_id','')='' or coalesce(p_data->>'subject','')='' or coalesce(p_data->>'body','')='' then raise check_violation;end if;
  update olympiad_private.outreach_gmail_drafts set subject=p_data->>'subject',body=p_data->>'body',content_hash=p_data->>'content_hash',gmail_thread_id=p_data->>'gmail_thread_id',rfc_message_id=p_data->>'rfc_message_id',
   approved_hash=case when r.content_hash=p_data->>'content_hash' and r.rfc_message_id=p_data->>'rfc_message_id' then r.approved_hash else null end,
   approved_at=case when r.content_hash=p_data->>'content_hash' and r.rfc_message_id=p_data->>'rfc_message_id' then r.approved_at else null end,
   export_state='ready',last_error='',synced_at=now(),lease_until=null where id=r.id;
  if r.content_hash is distinct from p_data->>'content_hash' or r.rfc_message_id is distinct from p_data->>'rfc_message_id' then update olympiad_private.outreach_candidates set copy_reviewed=false where id=r.candidate_id;end if;
  -- Standing authorization applies only to freshly generated policy copy, never edited drafts or follow-ups.
  if r.step='initial' and r.export_attempts=1 and r.content_hash is null and exists(select 1 from olympiad_private.outreach_candidates c where c.id=r.candidate_id and c.state='ready' and c.research->>'send_policy'='weekday50-2026-10-21' and c.subject=p_data->>'subject' and replace(trim(c.body),E'\r\n',E'\n')=replace(trim(p_data->>'body'),E'\r\n',E'\n')) then
   update olympiad_private.outreach_gmail_drafts set approved_hash=content_hash,approved_at=now() where id=r.id;
   update olympiad_private.outreach_candidates set copy_reviewed=true where id=r.candidate_id;
  end if;
  if r.step='followup' and (select followups_enabled from olympiad_private.outreach_daily_config where id) and exists(select 1 from public.organizer_prospects p where p.id=r.prospect_id and p.status='sent' and not p.opted_out and p.last_reply_at is null and olympiad_private.approved_followup_copy(p.contact_name,p_data->>'body') and p_data->>'subject'=case when left(p.draft_subject,3)='Re:' then p.draft_subject else 'Re: '||p.draft_subject end) then
   update olympiad_private.outreach_gmail_drafts set approved_hash=content_hash,approved_at=now() where id=r.id;
   update public.organizer_prospects set draft_body=p_data->>'body',draft_subject=p_data->>'subject' where id=r.prospect_id;
  end if;
  update olympiad_private.outreach_candidates set subject=p_data->>'subject',body=p_data->>'body' where id=r.candidate_id and state='ready';
 elsif p_action='error' then
  update olympiad_private.outreach_gmail_drafts set export_state='error',approved_hash=null,approved_at=null,last_error=left(coalesce(p_data->>'error','Draft needs review'),200),lease_until=null where id=r.id;
  update olympiad_private.outreach_candidates set copy_reviewed=false where id=r.candidate_id;
 else raise check_violation;end if;
 return jsonb_build_object('recorded',true);
end $function$
;
update public.organizer_prospects p set draft_body=z.body,draft_subject=z.subject from olympiad_private.outreach_gmail_drafts z where z.prospect_id=p.id and z.step='followup' and z.export_state='ready' and z.approved_hash=z.content_hash and z.approved_hash is not null and p.status='sent' and not p.opted_out and p.last_reply_at is null and olympiad_private.approved_followup_copy(p.contact_name,z.body) and p.draft_body is distinct from z.body;
