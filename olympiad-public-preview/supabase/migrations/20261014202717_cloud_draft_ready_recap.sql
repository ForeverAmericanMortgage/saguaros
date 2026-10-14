-- Pure scheduling rule, private and non-privileged. No caller can override the worker clock.
create function olympiad_private.outreach_notification_kind(d date,h numeric,gmail_ready integer,review_logged boolean,review_pending boolean,review_on date)
returns text language sql immutable set search_path='' as $$
 select case when d=date '2026-10-15' then
   case when h>=9 and (gmail_ready>=20 or h>=17) and not review_logged then 'review'
        when h>=17.25 then 'recap' end
 else case when review_pending and d>=review_on and h>=9.25 and h<17 then 'review'
           when h>=17.25 then 'recap' end end
$$;
revoke all on function olympiad_private.outreach_notification_kind(date,numeric,integer,boolean,boolean,date) from public,anon,authenticated;

-- October 15 cloud-only readiness recap. Never changes sending or approval state.
create or replace function olympiad_outreach_worker.notification(p_key text,p_action text,p_data jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare m olympiad_private.outreach_cloud_mailbox;c olympiad_private.outreach_daily_config;d date=(now() at time zone 'America/Phoenix')::date;h numeric=extract(hour from now() at time zone 'America/Phoenix')+extract(minute from now() at time zone 'America/Phoenix')/60;k text;inserted text;gmail_ready integer;
begin
 select * into m from olympiad_private.outreach_cloud_mailbox where id;
 if p_key is null or length(p_key)<32 or m.worker_key_hash is null or encode(extensions.digest(p_key,'sha256'),'hex') is distinct from m.worker_key_hash then raise insufficient_privilege;end if;
 if p_action='complete' then
  update olympiad_private.outreach_notifications set state=case when p_data->>'state'='sent' then 'sent' else 'uncertain' end,detail=left(coalesce(p_data->>'detail',''),500) where kind=p_data->>'kind' and local_day=(p_data->>'day')::date and state='sending';return '{}'::jsonb;
 elsif p_action<>'claim' then raise check_violation;end if;
 if m.credential is null or m.paused then return jsonb_build_object('skip',true);end if;
 select * into c from olympiad_private.outreach_daily_config where id;
 select count(*) into gmail_ready from olympiad_private.outreach_gmail_drafts g join olympiad_private.outreach_candidates q on q.id=g.candidate_id
 where q.state='ready' and g.step='initial' and g.export_state='ready' and g.gmail_thread_id is not null and g.synced_at>=now()-interval '15 minutes';
 k=olympiad_private.outreach_notification_kind(d,h,gmail_ready,exists(select 1 from olympiad_private.outreach_notifications where kind='review' and local_day=d),c.review_required and not c.review_released,c.review_on);
 if k is null then return jsonb_build_object('skip',true);end if;
 insert into olympiad_private.outreach_notifications(kind,local_day,state,rfc_message_id) values(k,d,'sending','<olympiad-'||k||'-'||d||'@saguaros.com>') on conflict do nothing returning kind into inserted;
 if inserted is null then return jsonb_build_object('skip',true);end if;
 if k='review' then update olympiad_private.outreach_notifications set candidate_ids=array(select id from olympiad_private.outreach_candidates where state='ready' order by created_at,id limit 20) where kind=k and local_day=d;end if;
 return jsonb_build_object('kind',k,'day',d,'message_id','<olympiad-'||k||'-'||d||'@saguaros.com>','credential',m.credential,'enabled',c.enabled,'review_pending',c.review_required and not c.review_released,'monitor_error',m.last_error,'monitor_checked_at',m.last_polled_at,'send_error',c.last_error,
 'gmail_ready',gmail_ready,
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
