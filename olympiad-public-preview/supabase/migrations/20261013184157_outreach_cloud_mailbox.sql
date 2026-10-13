-- Cloud mailbox credentials are sealed by the server before storage.
create table olympiad_private.outreach_cloud_mailbox (
 id boolean primary key default true check(id),
 credential text,
 worker_key_hash text,
 paused boolean not null default true,
 last_polled_at timestamptz,
 lock_until timestamptz,
 last_error text not null default '',
 updated_at timestamptz not null default now()
);
alter table olympiad_private.outreach_cloud_mailbox enable row level security;
revoke all on olympiad_private.outreach_cloud_mailbox from public,anon,authenticated;
insert into olympiad_private.outreach_cloud_mailbox(id) values(true);
create function olympiad_private.outreach_cloud_manage(p_action text,p_credential text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c olympiad_private.outreach_cloud_mailbox;
begin
 if auth.uid() is null or not olympiad_private.chairman_access_allowed() then raise insufficient_privilege;end if;
 if p_action='connect' then
  if p_credential is null or length(p_credential)>500 or p_credential!~'^[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.][A-Za-z0-9_-]+$' then raise check_violation;end if;
  update olympiad_private.outreach_cloud_mailbox set credential=p_credential,paused=false,last_error='',updated_at=now() where id;
 elsif p_action='pause' then update olympiad_private.outreach_cloud_mailbox set paused=true,updated_at=now() where id;
 elsif p_action<>'status' then raise check_violation;end if;
 select * into c from olympiad_private.outreach_cloud_mailbox where id;
 return jsonb_build_object('connected',c.credential is not null,'paused',c.paused,'last_polled_at',c.last_polled_at,'last_error',c.last_error);
end $$;
revoke all on function olympiad_private.outreach_cloud_manage(text,text) from public,anon,authenticated;
grant execute on function olympiad_private.outreach_cloud_manage(text,text) to authenticated;
create function public.organizer_cloud_manage(p_action text,p_credential text default null) returns jsonb
language sql security invoker set search_path='' as $$ select olympiad_private.outreach_cloud_manage(p_action,p_credential) $$;
revoke all on function public.organizer_cloud_manage(text,text) from public,anon;
grant execute on function public.organizer_cloud_manage(text,text) to authenticated;

create schema if not exists olympiad_outreach_worker;
revoke all on schema olympiad_outreach_worker from public,anon,authenticated;
grant usage on schema olympiad_outreach_worker to anon;

-- Machine calls have a separate random server credential. Invalid credentials
-- return no data. The secret hash is provisioned separately, never in Git.
create function olympiad_outreach_worker.outreach_cloud_worker(p_key text,p_action text,p_data jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c olympiad_private.outreach_cloud_mailbox;p public.organizer_prospects;inserted uuid;kind text;mid text;tid text;occurred timestamptz;outbound boolean;
begin
 select * into c from olympiad_private.outreach_cloud_mailbox where id for update;
 if p_key is null or length(p_key)<32 or c.worker_key_hash is null or encode(extensions.digest(p_key,'sha256'),'hex')<>c.worker_key_hash then raise insufficient_privilege;end if;
 if p_action='claim' then
  if c.paused or c.credential is null or c.lock_until>now() then return jsonb_build_object('skip',true);end if;
  update olympiad_private.outreach_cloud_mailbox set lock_until=now()+interval '4 minutes' where id;
  return jsonb_build_object('credential',c.credential,'since',coalesce(c.last_polled_at-interval '2 days','2026-10-13'::timestamptz),'prospects',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'company',company_name,'email',contact_email,'thread',gmail_thread_id,'first_sent',last_contact_at)),'[]'::jsonb) from public.organizer_prospects where event_year=2027 and last_contact_at is not null),'seen',(select coalesce(jsonb_agg(provider_message_id),'[]'::jsonb) from public.organizer_prospect_messages));
 elsif p_action='complete' then
  update olympiad_private.outreach_cloud_mailbox set lock_until=null,last_polled_at=coalesce((p_data->>'checked_at')::timestamptz,last_polled_at),last_error=case when p_data?'error' then left(coalesce(p_data->>'error',''),500) when last_error like 'Notification%' then last_error else '' end,updated_at=now() where id;return '{}'::jsonb;
 elsif p_action='message' then
  mid=p_data->>'message_id';tid=p_data->>'thread_id';kind=p_data->>'kind';outbound=coalesce((p_data->>'outbound')::boolean,false);occurred=(p_data->>'occurred_at')::timestamptz;
  if mid!~'^[a-f0-9]{1,32}$' or tid!~'^[a-f0-9]{1,32}$' or kind not in ('reply','interested','declined','opted_out','bounced','out_of_office') or occurred is null then raise check_violation;end if;
  select * into p from public.organizer_prospects where id=(p_data->>'prospect_id')::uuid and event_year=2027 and last_contact_at is not null for update;
  if p.id is null then raise check_violation;end if;
  insert into public.organizer_prospect_messages(prospect_id,direction,step,provider_message_id,gmail_thread_id,subject,body,occurred_at)
  values(p.id,case when outbound then 'outbound' else 'inbound' end,case when outbound then 'reply' else kind end,mid,tid,left(coalesce(p_data->>'subject',''),500),left(coalesce(p_data->>'body',''),20000),occurred)
  on conflict(provider_message_id) do nothing returning id into inserted;
  if inserted is null then return jsonb_build_object('inserted',false);end if;
  if outbound then
   update public.organizer_prospects set last_contact_at=greatest(last_contact_at,occurred) where id=p.id;
  else
   update public.organizer_prospects set last_reply_at=greatest(last_reply_at,occurred),last_reply_message_id=mid,last_reply_summary=case when occurred>=coalesce(last_reply_at,'1900-01-01'::timestamptz) then left(coalesce(p_data->>'body',''),2000) else last_reply_summary end,
    next_follow_up=null,
    status=case when opted_out or kind='opted_out' then 'opted_out' when status in ('registered','held','declined','bounced') then status when kind='out_of_office' then 'held' when kind='reply' then 'replied' else kind end,
    opted_out=opted_out or kind='opted_out' where id=p.id;
  end if;
  return jsonb_build_object('inserted',true,'alert',not outbound and kind='interested');
 else raise check_violation;end if;
end $$;
revoke all on function olympiad_outreach_worker.outreach_cloud_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function olympiad_outreach_worker.outreach_cloud_worker(text,text,jsonb) to anon;
create function public.organizer_cloud_worker(p_key text,p_action text,p_data jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select olympiad_outreach_worker.outreach_cloud_worker(p_key,p_action,p_data) $$;
revoke all on function public.organizer_cloud_worker(text,text,jsonb) from public,authenticated;
grant execute on function public.organizer_cloud_worker(text,text,jsonb) to anon;
