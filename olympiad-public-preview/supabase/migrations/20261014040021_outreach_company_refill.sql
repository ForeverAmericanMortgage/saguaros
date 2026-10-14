-- Company-only refill control. No mailbox credentials, personal contacts, or sent records.
create table olympiad_private.outreach_refill_control(id boolean primary key default true check(id),enabled boolean not null default false,start_on date not null default '2026-10-14',partition integer not null default 0 check(partition between 0 and 32),page integer not null default 1 check(page between 1 and 500),offset_in_page integer not null default 0 check(offset_in_page between 0 and 49),snapshot jsonb not null default '[]',checked_at timestamptz,last_error text not null default '');
create table olympiad_private.outreach_refill_runs(id uuid primary key default gen_random_uuid(),local_day date not null unique,partition integer not null,page integer not null,offset_in_page integer not null,pending integer not null check(pending between 0 and 50),capacity integer not null check(capacity between 0 and 50),state text not null default 'claimed' check(state in ('claimed','complete','held')),snapshot jsonb not null,saved jsonb not null default '[]',created_at timestamptz not null default now());
alter table olympiad_private.outreach_refill_control enable row level security;
alter table olympiad_private.outreach_refill_runs enable row level security;
revoke all on olympiad_private.outreach_refill_control,olympiad_private.outreach_refill_runs from public,anon,authenticated;
insert into olympiad_private.outreach_refill_control(id)values(true);
create function olympiad_private.refill_known(p_company text,p_domain text) returns boolean language sql stable security invoker set search_path='' as $$
 select olympiad_private.outreach_excluded(p_company,p_domain,'')
 or exists(select 1 from olympiad_private.outreach_candidates where domain=p_domain or company_key=olympiad_private.outreach_company_key(p_company))
 or exists(select 1 from olympiad_private.outreach_research_reservations where domain=p_domain or company_key=olympiad_private.outreach_company_key(p_company))
$$;
revoke all on function olympiad_private.refill_known(text,text) from public,anon,authenticated;
create function olympiad_outreach_worker.refill(p_key text,p_action text,p_data jsonb default '{}')returns jsonb language plpgsql security definer set search_path='' as $$
declare c olympiad_private.outreach_refill_control;j olympiad_private.outreach_refill_runs;m olympiad_private.outreach_cloud_mailbox;d date=(now() at time zone 'America/Phoenix')::date;items jsonb;pending integer;r jsonb;saved_rows jsonb;returned integer;scanned integer;
begin
 select * into m from olympiad_private.outreach_cloud_mailbox where id;
 if p_key is null or length(p_key)<32 or m.worker_key_hash is null or encode(extensions.digest(p_key,'sha256'),'hex')<>m.worker_key_hash then raise insufficient_privilege;end if;
 select * into c from olympiad_private.outreach_refill_control where id for update;
 if p_action='context' then return jsonb_build_object('enabled',c.enabled,'partition',c.partition,'page',c.page,'offset_in_page',c.offset_in_page,'checked_at',c.checked_at,'last_error',c.last_error);end if;
 if p_action='claim' then
  if jsonb_typeof(p_data->'snapshot') is distinct from 'array' then raise check_violation;end if;
  if jsonb_array_length(p_data->'snapshot')>50 or coalesce((p_data->>'total_records')::integer,-1)<jsonb_array_length(p_data->'snapshot') or (p_data->>'total_records')::integer>50 or coalesce((p_data->>'total_matched')::integer,-1)<>coalesce((p_data->>'total_records')::integer,-1) or coalesce((p_data->>'observed_count')::integer,jsonb_array_length(p_data->'snapshot'))<>coalesce((p_data->>'total_records')::integer,-1) then raise check_violation;end if;
  for r in select value from jsonb_array_elements(p_data->'snapshot')loop
   if coalesce(r->>'company','')='' or length(r->>'company')>200 or (r->>'company')~E'[\r\n]' or coalesce(r->>'domain','')!~'^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?[.])+[a-z]{2,63}$' then raise check_violation;end if;
  end loop;
  if (select count(distinct value->>'domain') from jsonb_array_elements(p_data->'snapshot'))<>jsonb_array_length(p_data->'snapshot') then raise check_violation;end if;
  select coalesce(jsonb_agg(jsonb_build_object('company',value->>'company','domain',value->>'domain')),'[]'),count(*) into items,pending from jsonb_array_elements(p_data->'snapshot') where not olympiad_private.refill_known(value->>'company',value->>'domain');
  update olympiad_private.outreach_refill_control set snapshot=items,checked_at=now() where id;
  if not c.enabled or m.paused or m.credential is null or extract(isodow from d)>5 or d<c.start_on or not (select enabled from olympiad_private.outreach_daily_config where id) then return jsonb_build_object('claimed',false,'reason','Refill schedule paused','pending',pending);end if;
  if exists(select 1 from olympiad_private.outreach_refill_runs where state in ('claimed','held')) then return jsonb_build_object('claimed',false,'reason','Previous refill needs reconciliation','pending',pending);end if;
  if pending>=40 then return jsonb_build_object('claimed',false,'reason','Buffer sufficient','pending',pending);end if;
  if (p_data->>'total_records')::integer>=50 then return jsonb_build_object('claimed',false,'reason','Queue statuses need reconciliation','pending',pending);end if;
  if c.partition>=32 then return jsonb_build_object('claimed',false,'reason','Approved search partitions exhausted','pending',pending);end if;
  insert into olympiad_private.outreach_refill_runs(local_day,partition,page,offset_in_page,pending,capacity,snapshot)values(d,c.partition,c.page,c.offset_in_page,pending,50-(p_data->>'total_records')::integer,items) on conflict(local_day)do nothing returning * into j;
  if j.id is null then return jsonb_build_object('claimed',false,'reason','Already attempted today','pending',pending);end if;
  return jsonb_build_object('claimed',true,'refill_id',j.id,'partition',j.partition,'page',j.page,'offset_in_page',j.offset_in_page,'pending',pending,'capacity',j.capacity,'snapshot',items);
 end if;
 select * into j from olympiad_private.outreach_refill_runs where id=(p_data->>'refill_id')::uuid for update;
 if j.id is null then raise check_violation;end if;
 if j.state<>'claimed' then return jsonb_build_object('completed',j.state='complete','state',j.state);end if;
 if p_action='fail' then update olympiad_private.outreach_refill_runs set state='held' where id=j.id;update olympiad_private.outreach_refill_control set last_error='Refill failed or saved records are uncertain. Reconcile before another company search.' where id;return jsonb_build_object('held',true);end if;
 if p_action<>'complete' or jsonb_typeof(p_data->'saved') is distinct from 'array' then raise check_violation;end if;
 select coalesce(jsonb_agg(jsonb_build_object('company',value->>'company','domain',value->>'domain','account_id',value->>'account_id')),'[]') into saved_rows from jsonb_array_elements(p_data->'saved');returned=(p_data->>'returned_count')::integer;scanned=(p_data->>'scanned_count')::integer;
 if returned is null or scanned is null or returned<0 or returned>50 or scanned<j.offset_in_page or scanned>returned or jsonb_array_length(saved_rows)>j.capacity or jsonb_array_length(saved_rows)>scanned-j.offset_in_page then raise check_violation;end if;
 for r in select value from jsonb_array_elements(saved_rows)loop
  if coalesce(r->>'company','')='' or length(r->>'company')>200 or (r->>'company')~E'[\r\n]' or coalesce(r->>'domain','')!~'^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?[.])+[a-z]{2,63}$' or coalesce(r->>'account_id','')!~'^[1-9][0-9]{0,19}$' or exists(select 1 from jsonb_array_elements(j.snapshot) where value->>'domain'=r->>'domain') or olympiad_private.refill_known(r->>'company',r->>'domain') then raise check_violation;end if;
 end loop;
 if (select count(distinct value->>'domain')from jsonb_array_elements(saved_rows))<>jsonb_array_length(saved_rows)then raise check_violation;end if;
 update olympiad_private.outreach_refill_runs set saved=saved_rows,state='complete' where id=j.id;
 update olympiad_private.outreach_refill_control set partition=case when scanned=returned and (returned<50 or j.page=500)then j.partition+1 else j.partition end,page=case when scanned=returned and (returned<50 or j.page=500)then 1 when scanned=returned then j.page+1 else j.page end,offset_in_page=case when scanned=returned then 0 else scanned end,snapshot=j.snapshot||saved_rows,checked_at=now(),last_error='' where id;
 return jsonb_build_object('completed',true,'added',jsonb_array_length(saved_rows),'pending',j.pending+jsonb_array_length(saved_rows));
end $$;
revoke all on function olympiad_outreach_worker.refill(text,text,jsonb)from public,anon,authenticated;
grant execute on function olympiad_outreach_worker.refill(text,text,jsonb)to anon;
create function public.organizer_refill_worker(p_key text,p_action text,p_data jsonb default '{}')returns jsonb language sql security invoker set search_path='' as $$select olympiad_outreach_worker.refill(p_key,p_action,p_data)$$;
revoke all on function public.organizer_refill_worker(text,text,jsonb)from public,authenticated;
grant execute on function public.organizer_refill_worker(text,text,jsonb)to anon;
