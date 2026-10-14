create table olympiad_private.outreach_interest_preparations (
 prospect_id uuid primary key references public.organizer_prospects(id),
 state text not null check(state in ('preparing','drafted','needs_review')),
 created_at timestamptz not null default now(), completed_at timestamptz
);
alter table olympiad_private.outreach_interest_preparations enable row level security;
revoke all on olympiad_private.outreach_interest_preparations from public,anon,authenticated;
create function olympiad_outreach_worker.interest(p_key text,p_action text,p_data jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare m olympiad_private.outreach_cloud_mailbox;p public.organizer_prospects;x public.organizer_prospect_messages;added uuid;
begin
 select * into m from olympiad_private.outreach_cloud_mailbox where id;
 if p_key is null or length(p_key)<32 or m.worker_key_hash is null or encode(extensions.digest(p_key,'sha256'),'hex') is distinct from m.worker_key_hash then raise insufficient_privilege;end if;
 if p_action='claim' then
  if m.paused or m.credential is null then return jsonb_build_object('skip',true);end if;
  select * into p from public.organizer_prospects q where q.status='interested' and not q.opted_out and q.last_reply_at is not null and not exists(select 1 from olympiad_private.outreach_interest_preparations z where z.prospect_id=q.id) order by q.last_reply_at limit 1 for update skip locked;
  if p.id is null then return jsonb_build_object('skip',true);end if;
  select * into x from public.organizer_prospect_messages where prospect_id=p.id and direction='inbound' order by occurred_at desc limit 1;
  if x.id is null then return jsonb_build_object('skip',true);end if;
  insert into olympiad_private.outreach_interest_preparations(prospect_id,state) values(p.id,'preparing') on conflict do nothing returning prospect_id into added;
  if added is null then return jsonb_build_object('skip',true);end if;
  return jsonb_build_object('prospect',to_jsonb(p),'reply',to_jsonb(x),'credential',m.credential);
 elsif p_action='complete' then
  update olympiad_private.outreach_interest_preparations set state=case when p_data->>'drafted'='true' then 'drafted' else 'needs_review' end,completed_at=now() where prospect_id=(p_data->>'id')::uuid and state='preparing' returning prospect_id into added;
  if added is not null then
   update public.organizer_prospects set notes=left(coalesce(notes,'')||E'\n\n'||left(p_data->>'brief',3000),5000),assigned_to=case when coalesce(assigned_to,'')='' then 'Sean Caldwell' else assigned_to end where id=added;
  end if;
  return '{}'::jsonb;
 else raise check_violation;end if;
end $$;
revoke all on function olympiad_outreach_worker.interest(text,text,jsonb) from public,anon,authenticated;
grant execute on function olympiad_outreach_worker.interest(text,text,jsonb) to anon;
create function public.organizer_interest_worker(p_key text,p_action text,p_data jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select olympiad_outreach_worker.interest(p_key,p_action,p_data)$$;
revoke all on function public.organizer_interest_worker(text,text,jsonb) from public,authenticated;
grant execute on function public.organizer_interest_worker(text,text,jsonb) to anon;
