-- Existing cloud monitor also delivers private, once-per-day status and review emails.
alter table olympiad_private.outreach_daily_config add column review_required boolean not null default false, add column review_released boolean not null default false, add column review_on date;
alter table olympiad_private.outreach_candidates add column copy_reviewed boolean not null default false;
create table olympiad_private.outreach_notifications(kind text not null check(kind in ('review','recap')),local_day date not null,state text not null check(state in ('sending','sent','uncertain')),rfc_message_id text not null,detail text not null default '',candidate_ids uuid[] not null default '{}',created_at timestamptz not null default now(),primary key(kind,local_day));
alter table olympiad_private.outreach_notifications enable row level security;
revoke all on olympiad_private.outreach_notifications from public,anon,authenticated;
create or replace function olympiad_private.outreach_daily_manage(p_action text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c olympiad_private.outreach_daily_config;d date=(now() at time zone 'America/Phoenix')::date;
begin
 if auth.uid() is null or not olympiad_private.chairman_access_allowed() then raise insufficient_privilege;end if;
 if p_action='pause' then update olympiad_private.outreach_daily_config set enabled=false where id;
 elsif p_action='release_review' then if not exists(select 1 from olympiad_private.outreach_notifications where kind='review' and local_day=d and state='sent') then raise check_violation using message='Wait for the review preview email before releasing the batch';end if; update olympiad_private.outreach_candidates set copy_reviewed=true where state='ready' and id=any(coalesce((select candidate_ids from olympiad_private.outreach_notifications where kind='review' and local_day=d and state='sent'),'{}'::uuid[])); update olympiad_private.outreach_daily_config set review_released=true where id;
 elsif p_action='enable' then update olympiad_private.outreach_daily_config set enabled=true,last_error='' where id;
 elsif p_action<>'status' then raise check_violation;end if;
 select * into c from olympiad_private.outreach_daily_config where id;
 return jsonb_build_object('enabled',c.enabled,'review_pending',c.review_required and not c.review_released,'review_on',c.review_on,'unreviewed',(select count(*) from olympiad_private.outreach_candidates where state='ready' and not copy_reviewed and d=c.review_on),'start_on',c.start_on,'last_error',c.last_error,'ready',(select count(*) from olympiad_private.outreach_candidates where state='ready'),'new_today',(select count(*) from olympiad_private.outreach_send_attempts where local_day=d and step='initial' and state<>'cancelled'),'followups_today',(select count(*) from olympiad_private.outreach_send_attempts where local_day=d and step='followup' and state<>'cancelled'),'uncertain',(select count(*) from olympiad_private.outreach_send_attempts where state in ('reserved','sending','ambiguous')));
end $$;
create or replace function olympiad_outreach_worker.daily(p_key text,p_action text,p_data jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare m olympiad_private.outreach_cloud_mailbox;c olympiad_private.outreach_daily_config;r olympiad_private.outreach_candidates;p public.organizer_prospects;a olympiad_private.outreach_send_attempts;d date=(now() at time zone 'America/Phoenix')::date;h integer=extract(hour from now() at time zone 'America/Phoenix');n integer;pid uuid;tid text;mid text;inserted boolean=false;
begin
 select * into m from olympiad_private.outreach_cloud_mailbox where id;
 if p_key is null or length(p_key)<32 or m.worker_key_hash is null or m.worker_key_hash is distinct from encode(extensions.digest(p_key,'sha256'),'hex') then raise insufficient_privilege;end if;
 if p_action='intake' then
  perform 1 from olympiad_private.outreach_daily_config where id for update;
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

create function olympiad_outreach_worker.notification(p_key text,p_action text,p_data jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare m olympiad_private.outreach_cloud_mailbox;c olympiad_private.outreach_daily_config;d date=(now() at time zone 'America/Phoenix')::date;h numeric=extract(hour from now() at time zone 'America/Phoenix')+extract(minute from now() at time zone 'America/Phoenix')/60;k text;inserted text;
begin
 select * into m from olympiad_private.outreach_cloud_mailbox where id;
 if p_key is null or length(p_key)<32 or m.worker_key_hash is null or encode(extensions.digest(p_key,'sha256'),'hex')<>m.worker_key_hash then raise insufficient_privilege;end if;
 if p_action='complete' then
  update olympiad_private.outreach_notifications set state=case when p_data->>'state'='sent' then 'sent' else 'uncertain' end,detail=left(coalesce(p_data->>'detail',''),500) where kind=p_data->>'kind' and local_day=(p_data->>'day')::date and state='sending';return '{}'::jsonb;
 elsif p_action<>'claim' then raise check_violation;end if;
 if m.credential is null or m.paused then return jsonb_build_object('skip',true);end if;
 select * into c from olympiad_private.outreach_daily_config where id;
 if c.review_required and not c.review_released and d>=c.review_on and h>=9.25 and h<17 then k='review';
 elsif h>=17.25 then k='recap';else return jsonb_build_object('skip',true);end if;
 insert into olympiad_private.outreach_notifications(kind,local_day,state,rfc_message_id) values(k,d,'sending','<olympiad-'||k||'-'||d||'@saguaros.com>') on conflict do nothing returning kind into inserted;
 if inserted is null then return jsonb_build_object('skip',true);end if;
 if k='review' then update olympiad_private.outreach_notifications set candidate_ids=array(select id from olympiad_private.outreach_candidates where state='ready' order by created_at,id limit 20) where kind=k and local_day=d;end if;
 return jsonb_build_object('kind',k,'day',d,'message_id','<olympiad-'||k||'-'||d||'@saguaros.com>','credential',m.credential,'enabled',c.enabled,'review_pending',c.review_required and not c.review_released,'monitor_error',m.last_error,'monitor_checked_at',m.last_polled_at,'send_error',c.last_error,
 'new_sent',(select count(*) from public.organizer_prospect_messages where direction='outbound' and step='initial' and (occurred_at at time zone 'America/Phoenix')::date=d),
 'followups_sent',(select count(*) from public.organizer_prospect_messages where direction='outbound' and step='followup' and (occurred_at at time zone 'America/Phoenix')::date=d),
 'contacted',(select count(*) from public.organizer_prospects where event_year=2027 and last_contact_at is not null),
 'ready',(select count(*) from olympiad_private.outreach_candidates where state='ready'),
 'due',(select count(*) from public.organizer_prospects where event_year=2027 and status='sent' and not opted_out and next_follow_up is not null and next_follow_up<=(d+1)::timestamp at time zone 'America/Phoenix'),
 'uncertain',(select count(*) from olympiad_private.outreach_send_attempts where state in ('reserved','sending','ambiguous')),
 'replies',(select coalesce(jsonb_agg(jsonb_build_object('company',p.company_name,'name',p.contact_name,'kind',x.step,'body',left(x.body,500),'thread',x.gmail_thread_id)),'[]'::jsonb) from public.organizer_prospect_messages x join public.organizer_prospects p on p.id=x.prospect_id where x.direction='inbound' and (x.occurred_at at time zone 'America/Phoenix')::date=d),
 'drafts',case when k='review' then (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (select company,name,subject,body from olympiad_private.outreach_candidates where id in (select unnest(candidate_ids) from olympiad_private.outreach_notifications where kind=k and local_day=d) order by created_at,id)t) else '[]'::jsonb end);
end $$;
revoke all on function olympiad_outreach_worker.notification(text,text,jsonb) from public,anon,authenticated;
grant execute on function olympiad_outreach_worker.notification(text,text,jsonb) to anon;
create function public.organizer_notification_worker(p_key text,p_action text,p_data jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select olympiad_outreach_worker.notification(p_key,p_action,p_data)$$;
revoke all on function public.organizer_notification_worker(text,text,jsonb) from public,authenticated;
grant execute on function public.organizer_notification_worker(text,text,jsonb) to anon;
