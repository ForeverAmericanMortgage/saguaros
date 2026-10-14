-- Sean approved up to40 research attempts for20 qualified drafts, existing credits only.
-- Ready backlog includes carryover. The shared config row serializes intake and reservations.
-- Sender20/day cap, review hold and suppression are unchanged.
create or replace function olympiad_outreach_worker.research(p_key text,p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m olympiad_private.outreach_cloud_mailbox;c olympiad_private.outreach_daily_config;
 d date=(now() at time zone 'America/Phoenix')::date;n integer;k text;v_domain text;v_company text;rid uuid;
begin
 select * into m from olympiad_private.outreach_cloud_mailbox where id;
 if p_key is null or length(p_key)<32 or m.worker_key_hash is null or m.worker_key_hash is distinct from encode(extensions.digest(p_key,'sha256'),'hex') then raise insufficient_privilege;end if;
 if p_action='context' then
  return jsonb_build_object('excluded_domains',(select coalesce(jsonb_agg(domain),'[]'::jsonb) from olympiad_private.outreach_research_reservations),'excluded_companies',(select coalesce(jsonb_agg(company_key),'[]'::jsonb) from olympiad_private.outreach_research_reservations),'research_today',(select count(*) from olympiad_private.outreach_research_reservations where local_day=d),'research_limit',40,'draft_target',20,'ready_drafts',(select count(*) from olympiad_private.outreach_candidates where state='ready'),'research_remaining',greatest(0,40-(select count(*) from olympiad_private.outreach_research_reservations where local_day=d)));
 end if;
 v_company=trim(p_data->>'company');v_domain=lower(trim(p_data->>'domain'));k=olympiad_private.outreach_company_key(v_company);
 if v_company is null or k='' or length(v_company)>200 or v_company~E'[\r\n]' or v_domain is null or length(v_domain)>253 or v_domain!~'^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$' then raise check_violation;end if;
 if p_action='check' then
  return jsonb_build_object('allowed',exists(select 1 from olympiad_private.outreach_research_reservations where id=(p_data->>'reservation_id')::uuid and company_key=k and domain=v_domain and local_day=d) and not olympiad_private.outreach_excluded(v_company,v_domain,p_data->>'email'));
 elsif p_action<>'reserve' then raise check_violation;end if;
 -- Serialize the daily count AND company insert. A stale Clay snapshot cannot
 -- win twice, and a concurrent forty-first request cannot pass the cap.
 select * into c from olympiad_private.outreach_daily_config where id for update;
 if not c.enabled or d<c.start_on or extract(isodow from d)>5 or m.paused then return jsonb_build_object('reserved',false,'held','Research schedule paused');end if;
 if olympiad_private.outreach_excluded(v_company,v_domain,'') or exists(select 1 from olympiad_private.outreach_research_reservations where domain=v_domain or company_key=k) then return jsonb_build_object('reserved',false,'excluded',true);end if;
 select count(*) into n from olympiad_private.outreach_research_reservations where local_day=d;
 if (select count(*) from olympiad_private.outreach_candidates where state='ready')>=20 then return jsonb_build_object('reserved',false,'held','Qualified draft target reached');end if;
 if n>=40 then return jsonb_build_object('reserved',false,'held','Daily research cap reached');end if;
 insert into olympiad_private.outreach_research_reservations(company,company_key,domain,local_day) values(v_company,k,v_domain,d) returning id into rid;
 return jsonb_build_object('reserved',true,'reservation_id',rid,'company',v_company,'domain',v_domain,'remaining',39-n);
end $$;

create or replace function olympiad_outreach_worker.daily(p_key text,p_action text,p_data jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare m olympiad_private.outreach_cloud_mailbox;c olympiad_private.outreach_daily_config;r olympiad_private.outreach_candidates;p public.organizer_prospects;a olympiad_private.outreach_send_attempts;d date=(now() at time zone 'America/Phoenix')::date;h integer=extract(hour from now() at time zone 'America/Phoenix');n integer;pid uuid;tid text;mid text;inserted boolean=false;
begin
 select * into m from olympiad_private.outreach_cloud_mailbox where id;
 if p_key is null or length(p_key)<32 or m.worker_key_hash is null or m.worker_key_hash is distinct from encode(extensions.digest(p_key,'sha256'),'hex') then raise insufficient_privilege;end if;
 if p_action='intake' then
  perform 1 from olympiad_private.outreach_daily_config where id for update;
  if (select count(*) from olympiad_private.outreach_candidates where state='ready')>=20 then return jsonb_build_object('held','Qualified draft target reached');end if;
  if (select count(*) from olympiad_private.outreach_candidates where (created_at at time zone 'America/Phoenix')::date=d)>=20 then return jsonb_build_object('held','Daily candidate intake cap reached');end if;
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
  if (c.review_required and not c.review_released) or not c.enabled or d<c.start_on or h<9 or h>=17 or m.paused or m.credential is null or m.last_polled_at is null or m.last_polled_at<now()-interval '10 minutes' or m.last_error<>'' or c.last_attempt_at>now()-interval '10 minutes' then return jsonb_build_object('skip',true);end if;
  -- An uncertain SMTP send blocks further sends until its provider receipt is reconciled.
  if exists(select 1 from olympiad_private.outreach_send_attempts where state in ('reserved','sending','ambiguous')) then return jsonb_build_object('skip',true,'reason','Uncertain sender receipt needs review');end if;
  select count(*) into n from olympiad_private.outreach_send_attempts where local_day=d and step='initial' and state<>'cancelled';
  if n<20 then
   select * into r from olympiad_private.outreach_candidates q where state='ready' and (not c.review_required or d<>c.review_on or q.copy_reviewed) and (research->>'checked_at')::timestamptz>=now()-interval '30 days' and not olympiad_private.outreach_excluded(q.company,q.domain,q.email) order by created_at,id limit 1 for update skip locked;
  end if;
  if r.id is not null then
   insert into olympiad_private.outreach_send_attempts(candidate_id,step,local_day,email,subject,body,rfc_message_id) values(r.id,'initial',d,r.email,r.subject,r.body,'<'||gen_random_uuid()::text||'@saguaros.com>') returning * into a;
  else
   select count(*) into n from olympiad_private.outreach_send_attempts where local_day=d and step='followup' and state<>'cancelled';
   if n>=20 then return jsonb_build_object('skip',true);end if;
   select * into p from public.organizer_prospects x where x.event_year=2027 and status='sent' and not opted_out and last_reply_at is null and next_follow_up<=d and last_contact_at<=now()-interval '7 days' and draft_body<>'' and evidence_url like 'https://%' and exists(select 1 from olympiad_private.outreach_followup_research rr where rr.prospect_id=x.id and (rr.research->>'checked_at')::timestamptz>=now()-interval '30 days' and coalesce(rr.research->>'clay_task_id','')<>'') and not exists(select 1 from olympiad_private.outreach_exclusions ee where ee.company_key=olympiad_private.outreach_company_key(x.company_name) or ee.domain=x.company_domain) and not exists(select 1 from public.organizer_prospect_messages mm where mm.prospect_id=x.id and mm.step='followup') and not exists(select 1 from olympiad_private.outreach_send_attempts aa where aa.prospect_id=x.id and aa.step='followup' and aa.state<>'cancelled') order by next_follow_up,company_name limit 1 for update skip locked;
   if p.id is null then return jsonb_build_object('skip',true,'reason','No qualified prospects due');end if;
   insert into olympiad_private.outreach_send_attempts(prospect_id,step,local_day,email,subject,body,rfc_message_id) values(p.id,'followup',d,p.contact_email,case when left(p.draft_subject,3)='Re:' then p.draft_subject else 'Re: '||p.draft_subject end,p.draft_body,'<'||gen_random_uuid()::text||'@saguaros.com>') returning * into a;
  end if;
  update olympiad_private.outreach_daily_config set last_attempt_at=now() where id;
  return jsonb_build_object('attempt',to_jsonb(a),'credential',m.credential,'thread',p.gmail_thread_id,'first_sent',p.last_contact_at);
 elsif p_action='before_send' then
  select * into a from olympiad_private.outreach_send_attempts where id=(p_data->>'id')::uuid for update;
  select * into c from olympiad_private.outreach_daily_config where id;
  if a.id is null or a.state<>'reserved' or not c.enabled or m.paused then return jsonb_build_object('allowed',false);end if;
  if a.prospect_id is not null then
   select * into p from public.organizer_prospects where id=a.prospect_id for update;
   if p.status<>'sent' or p.opted_out or p.last_reply_at is not null or p.next_follow_up is null or p.next_follow_up>d then update olympiad_private.outreach_send_attempts set state='cancelled',detail='Chairman suppression' where id=a.id;return jsonb_build_object('allowed',false);end if;
  else
   select * into r from olympiad_private.outreach_candidates where id=a.candidate_id;
   if olympiad_private.outreach_excluded(r.company,r.domain,r.email) then update olympiad_private.outreach_send_attempts set state='cancelled',detail='Excluded company' where id=a.id;return jsonb_build_object('allowed',false);end if;
  end if;
  update olympiad_private.outreach_send_attempts set state='sending' where id=a.id;
  update olympiad_private.outreach_daily_config set last_attempt_at=now() where id;
  return jsonb_build_object('allowed',true);
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
   insert into public.organizer_prospects(company_name,company_domain,contact_name,contact_email,contact_title,status,assigned_to,next_follow_up,fit_reason,evidence_url,draft_subject,draft_body,source,channel,last_contact_at,outreach_subject,outreach_body,gmail_thread_id) values(r.company,r.domain,r.name,r.email,r.role,'sent','Sean Caldwell',d+7,r.research->>'fact',r.research->>'source_url',r.followup_subject,r.followup_body,'Clay cloud research','Gmail',now(),a.subject,a.body,tid) returning id into pid;
   update olympiad_private.outreach_candidates set state='sent',prospect_id=pid where id=r.id;
   insert into olympiad_private.outreach_followup_research(prospect_id,research) values(pid,r.research) on conflict(prospect_id) do nothing;
  else update public.organizer_prospects set last_contact_at=now(),next_follow_up=null where id=pid;end if;
  insert into public.organizer_prospect_messages(prospect_id,direction,step,provider_message_id,gmail_thread_id,subject,body,occurred_at) values(pid,'outbound',a.step,mid,tid,a.subject,a.body,now()) on conflict(provider_message_id) do nothing;
  update olympiad_private.outreach_send_attempts set state='sent',prospect_id=pid,provider_message_id=mid,gmail_thread_id=tid,sent_at=now() where id=a.id;
  update olympiad_private.outreach_daily_config set last_error='' where id;
  return jsonb_build_object('recorded',true,'prospect_id',pid);
 else raise check_violation;end if;
end $$;
