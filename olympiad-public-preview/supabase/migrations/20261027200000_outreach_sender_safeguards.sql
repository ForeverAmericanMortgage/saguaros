-- Sender safeguards (Sean, 2026-10-27).
-- 1. Automatic safety pause: a rolling 24-hour bounce rate above 3% (with at least 20 sends),
--    or any spam complaint / abuse notice, stops all sending and records last_error.
--    Resume is manual: only a chairman can clear it.
-- 2. Sender-stopped alert ledger: at most one alert email per hour, 08:00-18:30 Arizona time.
-- Additive only: no existing function is replaced, and daily caps, sending hours and
-- sequence logic are untouched. The reply monitor keeps polling while sending is paused.

alter table olympiad_private.outreach_cloud_mailbox
 add column if not exists safety_paused_at timestamptz,
 add column if not exists safety_pause_reason text not null default '' check(length(safety_pause_reason)<=300),
 add column if not exists safety_resumed_at timestamptz,
 add column if not exists safety_resumed_by uuid;

-- Audit trail of every event that tripped (or re-tripped) the safety pause.
create table if not exists olympiad_private.outreach_safety_events(
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('bounce_rate','complaint','abuse_notice')),
 provider_message_id text unique check(provider_message_id ~ '^[a-f0-9]{1,40}$'),
 detail text not null default '' check(length(detail)<=300),
 created_at timestamptz not null default now()
);
alter table olympiad_private.outreach_safety_events enable row level security;
revoke all on olympiad_private.outreach_safety_events from public,anon,authenticated;

create table if not exists olympiad_private.outreach_sender_alerts(
 id uuid primary key default gen_random_uuid(),
 reason text not null check(length(reason)<=500),
 state text not null default 'sending' check(state in ('sending','sent','uncertain')),
 message_id text not null unique,
 created_at timestamptz not null default now()
);
create index if not exists outreach_sender_alerts_recent on olympiad_private.outreach_sender_alerts(created_at);
alter table olympiad_private.outreach_sender_alerts enable row level security;
revoke all on olympiad_private.outreach_sender_alerts from public,anon,authenticated;

-- Start (or keep) the safety pause. The first reason is kept until a chairman resumes.
create or replace function olympiad_private.outreach_safety_pause(p_reason text) returns void
language plpgsql security definer set search_path='' as $$
begin
 update olympiad_private.outreach_cloud_mailbox
  set safety_pause_reason=case when safety_paused_at is null then left(coalesce(nullif(btrim(p_reason),''),'Safety stop'),300) else safety_pause_reason end,
      safety_paused_at=coalesce(safety_paused_at,now()),
      last_error='',updated_at=now()
  where id;
end $$;
revoke all on function olympiad_private.outreach_safety_pause(text) from public,anon,authenticated;

-- Rolling 24-hour bounce check. Returns the pause reason, or null when sending may continue.
create or replace function olympiad_private.outreach_bounce_trip() returns text
language plpgsql stable security definer set search_path='' as $$
declare sends integer;bounces integer;
begin
 select count(*) into sends from olympiad_private.outreach_send_attempts where state='sent' and sent_at>now()-interval '24 hours';
 select count(distinct prospect_id) into bounces from public.organizer_prospect_messages where direction='inbound' and step='bounced' and occurred_at>now()-interval '24 hours';
 if sends>=20 and bounces*100>sends*3 then
  return format('Bounce rate %s%% in 24 hours (%s bounces / %s sends)',round(bounces*100.0/sends,1),bounces,sends);
 end if;
 return null;
end $$;
revoke all on function olympiad_private.outreach_bounce_trip() from public,anon,authenticated;

-- Evaluated only when a new bounce is recorded, so a manual resume holds until a new bad event.
create or replace function olympiad_private.outreach_bounce_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare reason text;
begin
 reason=olympiad_private.outreach_bounce_trip();
 if reason is not null then
  insert into olympiad_private.outreach_safety_events(kind,detail) values('bounce_rate',left(reason,300));
  perform olympiad_private.outreach_safety_pause(reason);
 end if;
 return null;
end $$;
revoke all on function olympiad_private.outreach_bounce_guard() from public,anon,authenticated;
drop trigger if exists outreach_bounce_guard on public.organizer_prospect_messages;
create trigger outreach_bounce_guard after insert on public.organizer_prospect_messages
 for each row when (new.direction='inbound' and new.step='bounced') execute function olympiad_private.outreach_bounce_guard();

-- While paused, last_error always carries the safety reason, so the existing monitor
-- completion (which clears last_error after a clean poll) and reconnects cannot erase it.
create or replace function olympiad_private.outreach_safety_last_error() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.safety_paused_at is not null then
  new.last_error=left('Sending paused: '||new.safety_pause_reason||case when coalesce(new.last_error,'')<>'' and new.last_error not like 'Sending paused:%' then ' Also: '||new.last_error else '' end,500);
 end if;
 return new;
end $$;
revoke all on function olympiad_private.outreach_safety_last_error() from public,anon,authenticated;
drop trigger if exists outreach_safety_last_error on olympiad_private.outreach_cloud_mailbox;
create trigger outreach_safety_last_error before update on olympiad_private.outreach_cloud_mailbox
 for each row execute function olympiad_private.outreach_safety_last_error();

-- Hard stop in the ledger itself: while paused, no new send can be reserved and no
-- reserved send can move to SMTP. Cancels, receipts and reconciliation still work.
create or replace function olympiad_private.outreach_safety_send_block() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if (tg_op='INSERT' or (new.state='sending' and old.state is distinct from 'sending'))
    and exists(select 1 from olympiad_private.outreach_cloud_mailbox where id and safety_paused_at is not null) then
  raise exception 'Outreach sending is paused by a safety stop' using errcode='check_violation';
 end if;
 return new;
end $$;
revoke all on function olympiad_private.outreach_safety_send_block() from public,anon,authenticated;
drop trigger if exists outreach_safety_send_block on olympiad_private.outreach_send_attempts;
create trigger outreach_safety_send_block before insert or update on olympiad_private.outreach_send_attempts
 for each row execute function olympiad_private.outreach_safety_send_block();

-- Machine worker: complaint / abuse notices and sender-stopped alerts.
create or replace function olympiad_outreach_worker.outreach_safety_worker(p_key text,p_action text,p_data jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m olympiad_private.outreach_cloud_mailbox;c olympiad_private.outreach_daily_config;inserted uuid;kind text;mid text;reason text;t time;aid uuid;
begin
 select * into m from olympiad_private.outreach_cloud_mailbox where id for update;
 if p_key is null or length(p_key)<32 or m.worker_key_hash is null or m.worker_key_hash is distinct from encode(extensions.digest(p_key,'sha256'),'hex') then raise insufficient_privilege;end if;
 if p_action='notice' then
  kind=p_data->>'kind';mid=p_data->>'message_id';
  if kind not in ('complaint','abuse_notice') or mid is null or mid!~'^[a-f0-9]{1,40}$' then raise check_violation;end if;
  insert into olympiad_private.outreach_safety_events(kind,provider_message_id,detail) values(kind,mid,left(coalesce(p_data->>'detail',''),300)) on conflict(provider_message_id) do nothing returning id into inserted;
  if inserted is null then return jsonb_build_object('recorded',false);end if;
  perform olympiad_private.outreach_safety_pause(case when kind='complaint' then 'Spam complaint received' else 'Abuse notice received' end);
  return jsonb_build_object('recorded',true,'paused',true);
 elsif p_action='alert_claim' then
  t=(now() at time zone 'America/Phoenix')::time;
  -- Manual pause or no mailbox means a deliberate stop (or no way to send): no alert.
  if t<time '08:00' or t>=time '18:30' or m.paused or m.credential is null then return jsonb_build_object('skip',true);end if;
  select * into c from olympiad_private.outreach_daily_config where id;
  reason=case
   when m.safety_paused_at is not null then m.safety_pause_reason
   when coalesce(m.last_error,'')<>'' then m.last_error
   when coalesce(c.last_error,'')<>'' then c.last_error
   when m.last_polled_at is null then 'Mailbox polling has not completed'
   when m.last_polled_at<now()-interval '10 minutes' then format('Mailbox polling stale for %s minutes',floor(extract(epoch from now()-m.last_polled_at)/60)::int)
  end;
  if reason is null then return jsonb_build_object('skip',true);end if;
  if exists(select 1 from olympiad_private.outreach_sender_alerts where created_at>now()-interval '1 hour') then return jsonb_build_object('skip',true,'reason','Alert already sent this hour');end if;
  aid=gen_random_uuid();
  insert into olympiad_private.outreach_sender_alerts(id,reason,message_id) values(aid,left(reason,500),'<olympiad-sender-alert-'||aid||'@saguaros.com>');
  return jsonb_build_object('id',aid,'reason',left(reason,500),'message_id','<olympiad-sender-alert-'||aid||'@saguaros.com>','credential',m.credential,
   'safety_paused',m.safety_paused_at is not null,'last_polled_at',m.last_polled_at);
 elsif p_action='alert_complete' then
  if p_data->>'state' not in ('sent','uncertain') then raise check_violation;end if;
  update olympiad_private.outreach_sender_alerts set state=p_data->>'state' where id=(p_data->>'id')::uuid and state='sending';
  return jsonb_build_object('recorded',true);
 else raise check_violation;end if;
end $$;
revoke all on function olympiad_outreach_worker.outreach_safety_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function olympiad_outreach_worker.outreach_safety_worker(text,text,jsonb) to anon;
create or replace function public.organizer_safety_worker(p_key text,p_action text,p_data jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select olympiad_outreach_worker.outreach_safety_worker(p_key,p_action,p_data) $$;
revoke all on function public.organizer_safety_worker(text,text,jsonb) from public,authenticated;
grant execute on function public.organizer_safety_worker(text,text,jsonb) to anon;

-- Chairman status and the one manual resume.
create or replace function olympiad_private.outreach_safety_manage(p_action text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m olympiad_private.outreach_cloud_mailbox;
begin
 if auth.uid() is null or not olympiad_private.chairman_access_allowed() then raise insufficient_privilege;end if;
 if p_action='resume' then
  update olympiad_private.outreach_cloud_mailbox set safety_paused_at=null,safety_pause_reason='',safety_resumed_at=now(),safety_resumed_by=auth.uid(),last_error='',updated_at=now() where id and safety_paused_at is not null;
 elsif p_action<>'status' then raise check_violation;end if;
 select * into m from olympiad_private.outreach_cloud_mailbox where id;
 return jsonb_build_object('paused',m.safety_paused_at is not null,'paused_at',m.safety_paused_at,'reason',m.safety_pause_reason,'resumed_at',m.safety_resumed_at,
  'sends_24h',(select count(*) from olympiad_private.outreach_send_attempts where state='sent' and sent_at>now()-interval '24 hours'),
  'bounces_24h',(select count(distinct prospect_id) from public.organizer_prospect_messages where direction='inbound' and step='bounced' and occurred_at>now()-interval '24 hours'),
  'last_alert_at',(select max(created_at) from olympiad_private.outreach_sender_alerts));
end $$;
revoke all on function olympiad_private.outreach_safety_manage(text) from public,anon,authenticated;
grant execute on function olympiad_private.outreach_safety_manage(text) to authenticated;
create or replace function public.organizer_safety_manage(p_action text) returns jsonb
language sql security invoker set search_path='' as $$ select olympiad_private.outreach_safety_manage(p_action) $$;
revoke all on function public.organizer_safety_manage(text) from public,anon;
grant execute on function public.organizer_safety_manage(text) to authenticated;
