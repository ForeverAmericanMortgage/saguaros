-- Cloud-only readiness/failure alerts. No approval or send state is changed.
alter table olympiad_private.outreach_notifications drop constraint outreach_notifications_kind_check;
alter table olympiad_private.outreach_notifications add constraint outreach_notifications_kind_check check(kind in ('review','recap','send_confirmation','research_ready','research_failure'));
create function olympiad_private.apollo_alert_status(d date,h numeric,checked timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
declare c olympiad_private.outreach_apollo_config;q integer;g integer;attempts integer;used numeric;last_batch timestamptz;reason text='';kind text;
begin
 select * into c from olympiad_private.outreach_apollo_config where id;
 if not c.enabled or d<c.start_on or extract(isodow from d)>5 or h<8 then return '{}'::jsonb;end if;
 select count(*),count(*) filter(where g.export_state='ready' and g.gmail_thread_id is not null and g.synced_at>=checked-interval '15 minutes') into q,g from olympiad_private.outreach_candidates q left join olympiad_private.outreach_gmail_drafts g on g.candidate_id=q.id and g.step='initial' where q.research->>'supply'='apollo-cloud-v1' and (q.created_at at time zone 'America/Phoenix')::date=d;
 select coalesce(sum(reserved_credits),0),max(created_at) into attempts,last_batch from olympiad_private.outreach_apollo_batches where local_day=d;
 select coalesce(sum(coalesce(actual_credits,reserved_credits)),0) into used from olympiad_private.outreach_apollo_batches;
 if c.last_error<>'' then reason=c.last_error;
 elsif exists(select 1 from olympiad_private.outreach_apollo_batches where state='uncertain' or (state='reserved' and created_at<checked-interval '5 minutes')) then reason='A paid lookup has no confirmed result. Research stopped to prevent duplicate spending.';
 elsif exists(select 1 from olympiad_private.outreach_gmail_drafts g join olympiad_private.outreach_candidates q on q.id=g.candidate_id where q.research->>'supply'='apollo-cloud-v1' and (q.created_at at time zone 'America/Phoenix')::date=d and g.export_state='error') then reason='A qualified email could not be verified in Gmail Drafts.';
 elsif q<20 and (attempts>=40 or used>=c.credit_budget or c.remaining<1) then reason='Research stopped at the existing-credit or daily lookup limit before reaching 20 qualified drafts.';
 elsif q<20 and h>=9 and (last_batch is null or last_batch<checked-interval '45 minutes') then reason='Scheduled research has not started or has stopped making progress. No extra credits were purchased.';
 elsif h>=16 and g<20 then reason='The research window ended below 20 confirmed Gmail drafts.';
 end if;
 if reason<>'' then kind='research_failure';elsif q>=20 and g>=20 then kind='research_ready';end if;
 return jsonb_build_object('kind',kind,'reason',reason,'ready',g,'qualified',q);
end $$;
revoke all on function olympiad_private.apollo_alert_status(date,numeric,timestamptz) from public,anon,authenticated;
create or replace function olympiad_outreach_worker.notification(p_key text,p_action text,p_data jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare m olympiad_private.outreach_cloud_mailbox;c olympiad_private.outreach_daily_config;d date=(now() at time zone 'America/Phoenix')::date;h numeric=extract(hour from now() at time zone 'America/Phoenix')+extract(minute from now() at time zone 'America/Phoenix')/60;k text;inserted text;gmail_ready integer;watch olympiad_private.outreach_notifications;confirmed jsonb;research_alert jsonb;
begin
 select * into m from olympiad_private.outreach_cloud_mailbox where id;
 if p_key is null or length(p_key)<32 or m.worker_key_hash is null or encode(extensions.digest(p_key,'sha256'),'hex') is distinct from m.worker_key_hash then raise insufficient_privilege;end if;
 if p_action='complete' then
  update olympiad_private.outreach_notifications set state=case when p_data->>'state'='waiting' and p_data->>'kind'='send_confirmation' then 'waiting' when p_data->>'state'='sent' then 'sent' else 'uncertain' end,detail=left(coalesce(p_data->>'detail',''),500) where kind=p_data->>'kind' and local_day=(p_data->>'day')::date and state='sending';return '{}'::jsonb;
 elsif p_action<>'claim' then raise check_violation;end if;
 if m.credential is null or m.paused then return jsonb_build_object('skip',true);end if;
 -- This watches only explicitly configured candidate IDs. No prospect send path.
 select * into watch from olympiad_private.outreach_notifications where kind='send_confirmation' and state='waiting' order by local_day limit 1 for update skip locked;
 if watch.kind is not null and cardinality(watch.candidate_ids)=2 then
  select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into confirmed from (
   select distinct on(q.id) q.id as candidate_id,q.company,q.name,q.email,x.provider_message_id as message_id,x.gmail_thread_id as thread_id,x.occurred_at as sent_at
   from olympiad_private.outreach_candidates q
   join public.organizer_prospects p on p.id=q.prospect_id and p.contact_email=q.email
   join olympiad_private.outreach_send_attempts a on a.candidate_id=q.id and a.prospect_id=p.id and a.state='sent' and a.step='initial'
   join public.organizer_prospect_messages x on x.prospect_id=p.id and x.provider_message_id=a.provider_message_id and x.gmail_thread_id=a.gmail_thread_id and x.direction='outbound' and x.step='initial'
   where q.id=any(watch.candidate_ids) and q.state='sent' and x.provider_message_id is not null and x.gmail_thread_id is not null
   order by q.id,x.occurred_at desc
  ) t;
  if jsonb_array_length(confirmed)=2 then
   update olympiad_private.outreach_notifications set state='sending' where kind=watch.kind and local_day=watch.local_day;
   return jsonb_build_object('kind',watch.kind,'day',watch.local_day,'message_id',watch.rfc_message_id,'credential',m.credential,'confirmations',confirmed);
  end if;
 end if;
 select * into c from olympiad_private.outreach_daily_config where id;
 select count(*) into gmail_ready from olympiad_private.outreach_gmail_drafts g join olympiad_private.outreach_candidates q on q.id=g.candidate_id
 where q.state='ready' and g.step='initial' and g.export_state='ready' and g.gmail_thread_id is not null and g.synced_at>=now()-interval '15 minutes';
 k=olympiad_private.outreach_notification_kind(d,h,gmail_ready,exists(select 1 from olympiad_private.outreach_notifications where kind='review' and local_day=d),c.review_required and not c.review_released,c.review_on);
 research_alert=olympiad_private.apollo_alert_status(d,h,now());
 if research_alert->>'kind' is not null and not exists(select 1 from olympiad_private.outreach_notifications where kind=research_alert->>'kind' and local_day=d) then k=research_alert->>'kind';end if;
 if k is null then return jsonb_build_object('skip',true);end if;
 insert into olympiad_private.outreach_notifications(kind,local_day,state,rfc_message_id) values(k,d,'sending','<olympiad-'||k||'-'||d||'@saguaros.com>') on conflict do nothing returning kind into inserted;
 if inserted is null then return jsonb_build_object('skip',true);end if;
 if k='review' then update olympiad_private.outreach_notifications set candidate_ids=array(select id from olympiad_private.outreach_candidates where state='ready' order by created_at,id limit 20) where kind=k and local_day=d;end if;
 return jsonb_build_object('kind',k,'day',d,'message_id','<olympiad-'||k||'-'||d||'@saguaros.com>','credential',m.credential,'enabled',c.enabled,'review_pending',c.review_required and not c.review_released,'monitor_error',m.last_error,'monitor_checked_at',m.last_polled_at,'send_error',c.last_error,
 'gmail_ready',gmail_ready,'apollo_ready',research_alert->'ready','apollo_issue',research_alert->>'reason',
 'research_reserved',(select count(*) from olympiad_private.outreach_research_reservations where local_day=d),
 'new_qualified',(select count(*) from olympiad_private.outreach_candidates where (created_at at time zone 'America/Phoenix')::date=d),
 'carryover_ready',(select count(*) from olympiad_private.outreach_candidates where state='ready' and (created_at at time zone 'America/Phoenix')::date<d),
 'draft_errors',(select count(*) from olympiad_private.outreach_gmail_drafts where export_state='error'),
 'new_sent',(select count(*) from public.organizer_prospect_messages where direction='outbound' and step='initial' and (occurred_at at time zone 'America/Phoenix')::date=d),
 'followups_sent',(select count(*) from public.organizer_prospect_messages where direction='outbound' and step='followup' and (occurred_at at time zone 'America/Phoenix')::date=d),
 'contacted',(select count(*) from public.organizer_prospects where event_year=2027 and last_contact_at is not null),
 'ready',(select count(*) from olympiad_private.outreach_candidates where state='ready'),
 'due',(select count(*) from public.organizer_prospects where event_year=2027 and status='sent' and not opted_out and next_follow_up is not null and next_follow_up<=(d+1)::timestamp at time zone 'America/Phoenix'),
 'uncertain',(select count(*) from olympiad_private.outreach_send_attempts where state in ('reserved','sending','ambiguous')),
 'replies',(select coalesce(jsonb_agg(jsonb_build_object('company',p.company_name,'name',p.contact_name,'kind',x.step,'body',left(x.body,500),'thread',x.gmail_thread_id)),'[]'::jsonb) from public.organizer_prospect_messages x join public.organizer_prospects p on p.id=x.prospect_id where x.direction='inbound' and (x.occurred_at at time zone 'America/Phoenix')::date=d),
 'drafts',case when k='review' then (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (select company,name,subject,body from olympiad_private.outreach_candidates where id in (select unnest(candidate_ids) from olympiad_private.outreach_notifications where kind=k and local_day=d) order by created_at,id)t) else '[]'::jsonb end);
end $$;
