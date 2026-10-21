begin;
CREATE OR REPLACE FUNCTION olympiad_outreach_worker.apollo(p_key text, p_action text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c olympiad_private.outreach_apollo_config;m olympiad_private.outreach_cloud_mailbox;
 d date=(now() at time zone 'America/Phoenix')::date;h integer=extract(hour from now() at time zone 'America/Phoenix');
 x jsonb;ids text[];n integer;q integer;used numeric;daily integer;batch olympiad_private.outreach_apollo_batches;cid uuid;pid text;
begin
 select * into m from olympiad_private.outreach_cloud_mailbox where id;
 if p_key is null or length(p_key)<32 or m.worker_key_hash is null or encode(extensions.digest(p_key,'sha256'),'hex') is distinct from m.worker_key_hash then raise insufficient_privilege;end if;
 select * into c from olympiad_private.outreach_apollo_config where id for update;
 if p_action='summary' then
  return jsonb_build_object('qualified',(select count(*) from olympiad_private.outreach_candidates where research->>'supply'='apollo-cloud-v1' and (created_at at time zone 'America/Phoenix')::date=d),'attempted',(select coalesce(sum(reserved_credits),0) from olympiad_private.outreach_apollo_batches where local_day=d),'credits',(select coalesce(sum(actual_credits),0) from olympiad_private.outreach_apollo_batches where local_day=d),'uncertain',(select count(*) from olympiad_private.outreach_apollo_batches where local_day=d and (state<>'complete' or actual_credits is null)),'remaining',c.remaining,'last_error',c.last_error,'enabled',c.enabled);
 elsif p_action='check' then return jsonb_build_object('credential',c.credential);
 elsif p_action='begin' then
  if not c.enabled or c.credential is null or d<c.start_on or extract(isodow from d)>5 or h<6 or h>=17 or c.lease_until>now() then return jsonb_build_object('skip',true);end if;
  if exists(select 1 from olympiad_private.outreach_apollo_batches where state<>'complete') then update olympiad_private.outreach_apollo_config set last_error='Uncertain paid lookup needs review. No automatic retry.' where id;return jsonb_build_object('skip',true);end if;
  select count(*) into q from olympiad_private.outreach_candidates where state='ready' and research->>'supply'='apollo-cloud-v1';
  select coalesce(sum(reserved_credits),0) into daily from olympiad_private.outreach_apollo_batches where local_day=d;
  select coalesce(sum(coalesce(actual_credits,reserved_credits)),0) into used from olympiad_private.outreach_apollo_batches;
  if q>=150 or daily>=250 or used>=c.credit_budget then return jsonb_build_object('skip',true);end if;
  update olympiad_private.outreach_apollo_config set lease_id=gen_random_uuid(),lease_until=now()+interval '4 minutes' where id returning * into c;
  return jsonb_build_object('credential',c.credential,'lease_id',c.lease_id,'page',c.page);
 elsif p_action='balance' then
  if (p_data->>'lease_id') is null or (p_data->>'lease_id')::uuid is distinct from c.lease_id or c.lease_until is null or c.lease_until<now() then raise check_violation;end if;
  if jsonb_typeof(p_data->'remaining') is distinct from 'number' or (p_data->>'remaining')::numeric<0 then raise check_violation;end if;
  update olympiad_private.outreach_apollo_config set remaining=(p_data->>'remaining')::numeric,checked_at=now() where id;return '{}'::jsonb;
 end if;
 if (p_data->>'lease_id') is null or (p_data->>'lease_id')::uuid is distinct from c.lease_id or c.lease_until is null or c.lease_until<now() then raise check_violation using message='Research lease expired';end if;
 if p_action='search_results' then
  for x in select value from jsonb_array_elements(p_data->'people') loop
   if coalesce(x->>'id','')<>'' and coalesce(x->'organization'->>'name','')<>'' and x->>'has_email'='true'
   and not olympiad_private.outreach_excluded(x->'organization'->>'name','','')
   and not exists(select 1 from olympiad_private.outreach_candidates where company_key=olympiad_private.outreach_company_key(x->'organization'->>'name')) then
    insert into olympiad_private.outreach_apollo_people(person_id,company,company_key) values(x->>'id',x->'organization'->>'name',olympiad_private.outreach_company_key(x->'organization'->>'name')) on conflict do nothing;
   end if;
  end loop;
  update olympiad_private.outreach_apollo_config set page=least(500,page+1) where id;
 elsif p_action='reserve' then
  if exists(select 1 from olympiad_private.outreach_apollo_batches where state<>'complete') then return jsonb_build_object('skip',true);end if;
  select count(*) into q from olympiad_private.outreach_candidates where state='ready' and research->>'supply'='apollo-cloud-v1';
  select coalesce(sum(reserved_credits),0) into daily from olympiad_private.outreach_apollo_batches where local_day=d;
  select coalesce(sum(coalesce(actual_credits,reserved_credits)),0) into used from olympiad_private.outreach_apollo_batches;
  n=least(5,150-q,250-daily,c.credit_budget-used,floor(coalesce(c.remaining,0)));
  if not c.enabled or d<c.start_on or extract(isodow from d)>5 or h<6 or h>=17 or n<=0 or c.checked_at is null or c.checked_at<now()-interval '2 minutes' then return jsonb_build_object('skip',true);end if;
  select array_agg(person_id) into ids from (select person_id from (select distinct on (company_key) person_id,created_at from olympiad_private.outreach_apollo_people where state='pending' and not olympiad_private.outreach_excluded(company,'','') order by company_key,created_at,person_id) unique_companies order by created_at,person_id limit n) z;
  if ids is null then return jsonb_build_object('empty',true);end if;
  insert into olympiad_private.outreach_apollo_batches(local_day,person_ids,reserved_credits) values(d,ids,cardinality(ids)) returning * into batch;
  update olympiad_private.outreach_apollo_people set state='reserved' where person_id=any(ids);
  return jsonb_build_object('batch_id',batch.id,'ids',ids);
 elsif p_action='complete' then
  select * into batch from olympiad_private.outreach_apollo_batches where id=(p_data->>'batch_id')::uuid for update;
  if batch.id is null or batch.state<>'reserved' then raise check_violation;end if;
  if jsonb_typeof(p_data->'credits') is distinct from 'number' or jsonb_typeof(p_data->'results') is distinct from 'array' or (p_data->>'credits')::numeric<0 or (p_data->>'credits')::numeric>batch.reserved_credits or jsonb_array_length(p_data->'results')<>cardinality(batch.person_ids) then raise check_violation;end if;
  for x in select value from jsonb_array_elements(p_data->'results') loop
   pid=x->>'person_id';if pid is null or not pid=any(batch.person_ids) then raise check_violation;end if;
   update olympiad_private.outreach_apollo_people set state='rejected',evidence=x->'evidence',reason=coalesce(x->>'reason','') where person_id=pid and state='reserved';
   if not found then raise check_violation;end if;
   if x->>'qualified'='true' and not olympiad_private.outreach_excluded(x->>'company',x->>'domain',x->>'email') then
    cid=null;
    insert into olympiad_private.outreach_candidates(company,company_key,domain,email,name,role,research,subject,body,followup_subject,followup_body,state,copy_reviewed)
    values(x->>'company',olympiad_private.outreach_company_key(x->>'company'),x->>'domain',x->>'email',x->>'name',x->>'role',(x->'evidence')||jsonb_build_object('supply','apollo-cloud-v1','checked_at',now(),'review_hold',false,'send_policy','weekday50-2026-10-21'),x->>'subject',x->>'body',x->>'followup_subject',x->>'followup_body','ready',true) on conflict do nothing returning id into cid;
    if cid is not null then
     insert into olympiad_private.outreach_gmail_drafts(candidate_id,step,company,email,subject,body) values(cid,'initial',x->>'company',x->>'email',x->>'subject',x->>'body');
     update olympiad_private.outreach_apollo_people set state='qualified',candidate_id=cid where person_id=pid;
    else update olympiad_private.outreach_apollo_people set reason='Duplicate company or email' where person_id=pid;end if;
   end if;
  end loop;
  update olympiad_private.outreach_apollo_batches set state='complete',actual_credits=(p_data->>'credits')::numeric where id=batch.id;
 elsif p_action='error' then
  update olympiad_private.outreach_apollo_config set last_error=left(p_data->>'error',180),lease_until=null where id;
  if p_data ? 'batch_id' then update olympiad_private.outreach_apollo_batches set state='uncertain' where id=(p_data->>'batch_id')::uuid and state='reserved';end if;
 elsif p_action='finish' then update olympiad_private.outreach_apollo_config set lease_until=null,last_error='' where id;
 else raise check_violation;end if;
 return '{}'::jsonb;
end $function$
;
CREATE OR REPLACE FUNCTION olympiad_outreach_worker.daily(p_key text, p_action text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare m olympiad_private.outreach_cloud_mailbox;c olympiad_private.outreach_daily_config;r olympiad_private.outreach_candidates;p public.organizer_prospects;a olympiad_private.outreach_send_attempts;d date=(now() at time zone 'America/Phoenix')::date;h integer=extract(hour from now() at time zone 'America/Phoenix');n integer;pid uuid;tid text;mid text;inserted boolean=false;g olympiad_private.outreach_gmail_drafts;
begin
 select * into m from olympiad_private.outreach_cloud_mailbox where id;
 if p_key is null or length(p_key)<32 or m.worker_key_hash is null or m.worker_key_hash is distinct from encode(extensions.digest(p_key,'sha256'),'hex') then raise insufficient_privilege;end if;
 if p_action='intake' then
  perform 1 from olympiad_private.outreach_daily_config where id for update;
  if (select count(*) from olympiad_private.outreach_candidates where state='ready')>=25 then return jsonb_build_object('held','Qualified draft target reached');end if;
  if (select count(*) from olympiad_private.outreach_candidates where (created_at at time zone 'America/Phoenix')::date=d)>=25 then return jsonb_build_object('held','Daily candidate intake cap reached');end if;
  if olympiad_private.outreach_excluded(p_data->>'company',p_data->>'domain',p_data->>'email') then return jsonb_build_object('excluded',true);end if;
  if p_data->>'email' not like '%@'||(p_data->>'domain') or p_data->>'source_url'!~'^https://' or length(p_data->>'body')>5000 or coalesce(p_data->>'clay_task_id','')='' or (p_data->>'checked_at')::timestamptz<now()-interval '30 days' then raise check_violation;end if;
  insert into olympiad_private.outreach_candidates(company,company_key,domain,email,name,role,research,subject,body,followup_subject,followup_body) values(p_data->>'company',olympiad_private.outreach_company_key(p_data->>'company'),p_data->>'domain',p_data->>'email',p_data->>'name',p_data->>'role',p_data,p_data->>'subject',p_data->>'body',p_data->>'followup_subject',p_data->>'followup_body') on conflict do nothing returning true into inserted;
  return jsonb_build_object('queued',coalesce(inserted,false));
 elsif p_action='test' then
  if m.paused or m.credential is null then raise check_violation;end if;return jsonb_build_object('credential',m.credential);
 elsif p_action='context' then
  return jsonb_build_object('excluded_domains',(select coalesce(jsonb_agg(company_domain),'[]'::jsonb) from (select company_domain from public.organizer_prospects union select domain from olympiad_private.outreach_candidates union select domain from olympiad_private.outreach_exclusions where domain is not null) x),'excluded_companies',(select coalesce(jsonb_agg(company_key),'[]'::jsonb) from (select company_key from olympiad_private.outreach_exclusions union select olympiad_private.outreach_company_key(company_name) from public.teams union select olympiad_private.outreach_company_key(business_name) from public.returning_team_accounts union select company_key from olympiad_private.outreach_candidates union select olympiad_private.outreach_company_key(company_name) from public.organizer_prospects) x));
 elsif p_action='recover' then
  select * into a from olympiad_private.outreach_send_attempts where state in ('reserved','sending','ambiguous') and created_at<now()-interval '5 minutes' order by created_at limit 1;
  if a.id is null or m.paused or m.credential is null then return jsonb_build_object('skip',true);end if;
  return jsonb_build_object('attempt',to_jsonb(a),'credential',m.credential);
 elsif p_action='claim' then
  select * into c from olympiad_private.outreach_daily_config where id for update;
  if (c.review_required and not c.review_released) or not c.enabled or d<c.start_on or extract(isodow from d)>5 or h<9 or h>=17 or m.paused or m.credential is null or m.last_polled_at is null or m.last_polled_at<now()-interval '10 minutes' or m.last_error<>'' or c.last_attempt_at>now()-interval '9 minutes' then return jsonb_build_object('skip',true);end if;
  -- An uncertain SMTP send blocks further sends until its provider receipt is reconciled.
  if exists(select 1 from olympiad_private.outreach_send_attempts where state in ('reserved','sending','ambiguous')) then return jsonb_build_object('skip',true,'reason','Uncertain sender receipt needs review');end if;
  select count(*) into n from olympiad_private.outreach_send_attempts where local_day=d and step='initial' and state<>'cancelled';
  if n<50 then
   select * into r from olympiad_private.outreach_candidates q where state='ready' and q.research->>'send_policy'='weekday50-2026-10-21' and q.copy_reviewed and exists(select 1 from olympiad_private.outreach_gmail_drafts z where z.candidate_id=q.id and z.export_state='ready' and z.approved_hash=z.content_hash and z.approved_hash is not null) and (research->>'checked_at')::timestamptz>=now()-interval '30 days' and not olympiad_private.outreach_excluded(q.company,q.domain,q.email) order by created_at,id limit 1 for update skip locked;
  end if;
  if r.id is not null then
   select * into g from olympiad_private.outreach_gmail_drafts where candidate_id=r.id;
   insert into olympiad_private.outreach_send_attempts(candidate_id,step,local_day,email,subject,body,rfc_message_id) values(r.id,'initial',d,r.email,g.subject,g.body,g.rfc_message_id) returning * into a;
  else
   return jsonb_build_object('skip',true,'reason','Follow-ups held by Sean; initial queue empty or daily cap reached');
   select count(*) into n from olympiad_private.outreach_send_attempts where local_day=d and step='followup' and state<>'cancelled';
   if n>=20 then return jsonb_build_object('skip',true);end if;
   select * into p from public.organizer_prospects x where x.event_year=2027 and exists(select 1 from olympiad_private.outreach_gmail_drafts z where z.prospect_id=x.id and z.step='followup' and z.export_state='ready' and z.approved_hash=z.content_hash and z.approved_hash is not null) and status='sent' and not opted_out and last_reply_at is null and next_follow_up<=d and last_contact_at<=now()-interval '7 days' and draft_body<>'' and olympiad_private.followup_contact_ready(x.id) and not exists(select 1 from olympiad_private.outreach_exclusions ee where ee.company_key=olympiad_private.outreach_company_key(x.company_name) or ee.domain=x.company_domain) and not exists(select 1 from public.organizer_prospect_messages mm where mm.prospect_id=x.id and mm.step='followup') and not exists(select 1 from olympiad_private.outreach_send_attempts aa where aa.prospect_id=x.id and aa.step='followup' and aa.state<>'cancelled') order by next_follow_up,company_name limit 1 for update skip locked;
   if p.id is null then return jsonb_build_object('skip',true,'reason','No qualified prospects due');end if;
   select * into g from olympiad_private.outreach_gmail_drafts where prospect_id=p.id and step='followup';
   insert into olympiad_private.outreach_send_attempts(prospect_id,step,local_day,email,subject,body,rfc_message_id) values(p.id,'followup',d,p.contact_email,g.subject,g.body,g.rfc_message_id) returning * into a;
  end if;
  update olympiad_private.outreach_daily_config set last_attempt_at=now() where id;
  return jsonb_build_object('attempt',to_jsonb(a),'credential',m.credential,'thread',p.gmail_thread_id,'first_sent',p.last_contact_at,'review',to_jsonb(g));
 elsif p_action='before_send' then
  select * into a from olympiad_private.outreach_send_attempts where id=(p_data->>'id')::uuid for update;
  select * into c from olympiad_private.outreach_daily_config where id;
  select * into g from olympiad_private.outreach_gmail_drafts where (candidate_id=a.candidate_id or (prospect_id=a.prospect_id and step=a.step));
  if g.id is null or g.export_state<>'ready' or g.approved_hash is null or g.approved_hash is distinct from g.content_hash or g.approved_hash is distinct from p_data->>'content_hash' or g.subject is distinct from a.subject or g.body is distinct from a.body or g.rfc_message_id is distinct from a.rfc_message_id or not c.review_released then return jsonb_build_object('allowed',false);end if;
  if a.step='followup' then return jsonb_build_object('allowed',false);end if;
  if a.id is null or a.state<>'reserved' or not c.enabled or m.paused then return jsonb_build_object('allowed',false);end if;
  if a.prospect_id is not null then
   select * into p from public.organizer_prospects where id=a.prospect_id for update;
   if p.status<>'sent' or p.opted_out or p.last_reply_at is not null or p.next_follow_up is null or p.next_follow_up>d or p.last_contact_at>now()-interval '7 days' then update olympiad_private.outreach_send_attempts set state='cancelled',detail='Chairman suppression' where id=a.id;return jsonb_build_object('allowed',false);end if;
  else
   select * into r from olympiad_private.outreach_candidates where id=a.candidate_id;
   if olympiad_private.outreach_excluded(r.company,r.domain,r.email) then update olympiad_private.outreach_send_attempts set state='cancelled',detail='Excluded company' where id=a.id;return jsonb_build_object('allowed',false);end if;
  end if;
  update olympiad_private.outreach_send_attempts set state='sending' where id=a.id;
  update olympiad_private.outreach_daily_config set last_attempt_at=now() where id;
  return jsonb_build_object('allowed',true);
 elsif p_action='cancel_review' then
  update olympiad_private.outreach_send_attempts set state='cancelled',detail='Draft changed; review again' where id=(p_data->>'id')::uuid and state='reserved';
  return jsonb_build_object('held',true);
 elsif p_action='stop' then
  update olympiad_private.outreach_send_attempts set state='cancelled',detail=left(p_data->>'detail',200) where id=(p_data->>'id')::uuid and state='reserved';
  update public.organizer_prospects set next_follow_up=null where id=(select prospect_id from olympiad_private.outreach_send_attempts where id=(p_data->>'id')::uuid);
  update olympiad_private.outreach_candidates set state='held' where id=(select candidate_id from olympiad_private.outreach_send_attempts where id=(p_data->>'id')::uuid);
  return jsonb_build_object('held',true);
 elsif p_action='uncertain' then
  update olympiad_private.outreach_send_attempts set state='ambiguous',detail='Provider sender receipt needs review' where id=(p_data->>'id')::uuid and state in ('reserved','sending');
  update olympiad_private.outreach_daily_config set last_error='Sender receipt uncertain. Review the mailbox before retrying.' where id;
  return jsonb_build_object('held',true);
 elsif p_action='receipt' then
  select * into a from olympiad_private.outreach_send_attempts where id=(p_data->>'id')::uuid for update;
  if a.id is null or a.state not in ('sending','ambiguous','sent') then raise check_violation;end if;
  if a.state='sent' then return jsonb_build_object('recorded',true);end if;
  mid=p_data->>'message_id';tid=p_data->>'thread_id';if mid!~'^[a-f0-9]{1,40}$' or tid!~'^[a-f0-9]{1,40}$' then raise check_violation;end if;
  pid=a.prospect_id;
  if a.step='initial' then
   select * into r from olympiad_private.outreach_candidates where id=a.candidate_id;
   insert into public.organizer_prospects(company_name,company_domain,contact_name,contact_email,contact_title,status,assigned_to,next_follow_up,fit_reason,evidence_url,draft_subject,draft_body,source,channel,last_contact_at,outreach_subject,outreach_body,gmail_thread_id) values(r.company,r.domain,r.name,r.email,r.role,'sent','Sean Caldwell',d+7,r.research->>'fact',r.research->>'source_url',r.followup_subject,r.followup_body,coalesce(r.research->>'provider','Apollo'),'Gmail',now(),a.subject,a.body,tid) returning id into pid;
   update olympiad_private.outreach_candidates set state='sent',prospect_id=pid where id=r.id;
   insert into olympiad_private.outreach_followup_research(prospect_id,research) values(pid,r.research) on conflict(prospect_id) do nothing;
  else update public.organizer_prospects set last_contact_at=now(),next_follow_up=null where id=pid;end if;
  insert into public.organizer_prospect_messages(prospect_id,direction,step,provider_message_id,gmail_thread_id,subject,body,occurred_at) values(pid,'outbound',a.step,mid,tid,a.subject,a.body,now()) on conflict(provider_message_id) do nothing;
  update olympiad_private.outreach_send_attempts set state='sent',prospect_id=pid,provider_message_id=mid,gmail_thread_id=tid,sent_at=now() where id=a.id;
  update olympiad_private.outreach_gmail_drafts set export_state='sent' where candidate_id=a.candidate_id or (prospect_id=a.prospect_id and step=a.step);
  update olympiad_private.outreach_daily_config set last_error='' where id;
  return jsonb_build_object('recorded',true,'prospect_id',pid);
 else raise check_violation;end if;
end $function$
;
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
  insert into olympiad_private.outreach_gmail_drafts(candidate_id,step,company,email,subject,body)
   select id,'initial',company,email,subject,body from olympiad_private.outreach_candidates q where state='ready' and not olympiad_private.outreach_excluded(q.company,q.domain,q.email) on conflict do nothing;
  insert into olympiad_private.outreach_gmail_drafts(prospect_id,step,company,email,subject,body)
   select id,'followup',company_name,contact_email,case when left(draft_subject,3)='Re:' then draft_subject else 'Re: '||draft_subject end,draft_body from public.organizer_prospects p
   where event_year=2027 and status='sent' and not opted_out and last_reply_at is null and olympiad_private.followup_contact_ready(p.id) and draft_body<>''
   and not exists(select 1 from public.organizer_prospect_messages x where x.prospect_id=p.id and x.step='followup') on conflict do nothing;
  return jsonb_build_object('credential',m.credential,'drafts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (select * from olympiad_private.outreach_gmail_drafts where step='initial' and export_state<>'sent' and (lease_until is null or lease_until<now()) order by synced_at nulls first,created_at limit 20)x));
 elsif p_action='claim' then
  if m.paused or m.credential is null then return jsonb_build_object('skip',true);end if;
  select * into r from olympiad_private.outreach_gmail_drafts where step='initial' and export_state='pending' and export_attempts=0 order by created_at,id limit 1 for update skip locked;
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
  update olympiad_private.outreach_candidates set subject=p_data->>'subject',body=p_data->>'body' where id=r.candidate_id and state='ready';
 elsif p_action='error' then
  update olympiad_private.outreach_gmail_drafts set export_state='error',approved_hash=null,approved_at=null,last_error=left(coalesce(p_data->>'error','Draft needs review'),200),lease_until=null where id=r.id;
  update olympiad_private.outreach_candidates set copy_reviewed=false where id=r.candidate_id;
 else raise check_violation;end if;
 return jsonb_build_object('recorded',true);
end $function$
;
alter table olympiad_private.outreach_apollo_config drop constraint outreach_apollo_config_credit_budget_check;
alter table olympiad_private.outreach_apollo_config add constraint outreach_apollo_config_credit_budget_check check(credit_budget between 0 and 2564);
commit;
