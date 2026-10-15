-- Contact-first research only. This worker has no approval or send action.
create table olympiad_private.outreach_apollo_config(
 id boolean primary key default true check(id), credential text, enabled boolean not null default false,
 start_on date not null default ((now() at time zone 'America/Phoenix')::date+1),
 credit_budget integer not null default 80 check(credit_budget between 0 and 80),
 page integer not null default 1 check(page between 1 and 500),
 lease_until timestamptz, lease_id uuid,last_error text not null default '',checked_at timestamptz,remaining numeric);
insert into olympiad_private.outreach_apollo_config(id) values(true);
create table olympiad_private.outreach_apollo_people(
 person_id text primary key,company text not null,company_key text not null unique,
 state text not null default 'pending' check(state in ('pending','reserved','qualified','rejected','uncertain')),
 evidence jsonb not null default '{}'::jsonb,reason text not null default '',candidate_id uuid,
 created_at timestamptz not null default now());
create table olympiad_private.outreach_apollo_batches(
 id uuid primary key default gen_random_uuid(),local_day date not null,
 person_ids text[] not null, reserved_credits integer not null check(reserved_credits between 1 and 5),
 actual_credits numeric,state text not null default 'reserved' check(state in ('reserved','complete','uncertain')),
 created_at timestamptz not null default now());
alter table olympiad_private.outreach_apollo_config enable row level security;
alter table olympiad_private.outreach_apollo_people enable row level security;
alter table olympiad_private.outreach_apollo_batches enable row level security;
revoke all on olympiad_private.outreach_apollo_config,olympiad_private.outreach_apollo_people,olympiad_private.outreach_apollo_batches from public,anon,authenticated;
create function olympiad_private.apollo_manage(p_data jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare c olympiad_private.outreach_apollo_config;
begin
 if auth.uid() is null or not olympiad_private.chairman_access_allowed() then raise insufficient_privilege;end if;
 if p_data ? 'credential' and (length(p_data->>'credential')>5000 or p_data->>'credential' !~ '^[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.][A-Za-z0-9_-]+$') then raise check_violation;end if;
 update olympiad_private.outreach_apollo_config set credential=coalesce(p_data->>'credential',credential),enabled=case when p_data ? 'enabled' then (p_data->>'enabled')::boolean else enabled end,last_error=case when p_data ? 'credential' then '' else last_error end where id;
 select * into c from olympiad_private.outreach_apollo_config where id;
 return jsonb_build_object('connected',c.credential is not null,'enabled',c.enabled,'start_on',c.start_on,'last_error',c.last_error,'remaining',c.remaining,'checked_at',c.checked_at,'credit_budget',c.credit_budget);
end $$;
revoke all on function olympiad_private.apollo_manage(jsonb) from public,anon;
grant execute on function olympiad_private.apollo_manage(jsonb) to authenticated;
create function public.organizer_apollo_manage(p_data jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select olympiad_private.apollo_manage(p_data)$$;
revoke all on function public.organizer_apollo_manage(jsonb) from public,anon;
grant execute on function public.organizer_apollo_manage(jsonb) to authenticated;
create function olympiad_outreach_worker.apollo(p_key text,p_action text,p_data jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
  if not c.enabled or c.credential is null or d<c.start_on or extract(isodow from d)>5 or h<8 or h>=16 or c.lease_until>now() then return jsonb_build_object('skip',true);end if;
  if exists(select 1 from olympiad_private.outreach_apollo_batches where state<>'complete') then update olympiad_private.outreach_apollo_config set last_error='Uncertain paid lookup needs review. No automatic retry.' where id;return jsonb_build_object('skip',true);end if;
  select count(*) into q from olympiad_private.outreach_candidates where research->>'supply'='apollo-cloud-v1' and (created_at at time zone 'America/Phoenix')::date=d;
  select coalesce(sum(reserved_credits),0) into daily from olympiad_private.outreach_apollo_batches where local_day=d;
  select coalesce(sum(coalesce(actual_credits,reserved_credits)),0) into used from olympiad_private.outreach_apollo_batches;
  if q>=20 or daily>=40 or used>=c.credit_budget then return jsonb_build_object('skip',true);end if;
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
  select count(*) into q from olympiad_private.outreach_candidates where research->>'supply'='apollo-cloud-v1' and (created_at at time zone 'America/Phoenix')::date=d;
  select coalesce(sum(reserved_credits),0) into daily from olympiad_private.outreach_apollo_batches where local_day=d;
  select coalesce(sum(coalesce(actual_credits,reserved_credits)),0) into used from olympiad_private.outreach_apollo_batches;
  n=least(5,20-q,40-daily,c.credit_budget-used,floor(coalesce(c.remaining,0)));
  if not c.enabled or d<c.start_on or extract(isodow from d)>5 or h<8 or h>=16 or n<=0 or c.checked_at is null or c.checked_at<now()-interval '2 minutes' then return jsonb_build_object('skip',true);end if;
  select array_agg(person_id) into ids from (select person_id from olympiad_private.outreach_apollo_people where state='pending' and not olympiad_private.outreach_excluded(company,'','') order by created_at,person_id limit n) z;
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
    values(x->>'company',olympiad_private.outreach_company_key(x->>'company'),x->>'domain',x->>'email',x->>'name',x->>'role',(x->'evidence')||jsonb_build_object('supply','apollo-cloud-v1','checked_at',now(),'review_hold',true),x->>'subject',x->>'body',x->>'followup_subject',x->>'followup_body','ready',false) on conflict do nothing returning id into cid;
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
end $$;
revoke all on function olympiad_outreach_worker.apollo(text,text,jsonb) from public,authenticated;
grant execute on function olympiad_outreach_worker.apollo(text,text,jsonb) to anon;
create function public.organizer_apollo_worker(p_key text,p_action text,p_data jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select olympiad_outreach_worker.apollo(p_key,p_action,p_data)$$;
revoke all on function public.organizer_apollo_worker(text,text,jsonb) from public,authenticated;
grant execute on function public.organizer_apollo_worker(text,text,jsonb) to anon;

-- Schedule is inert until a chairman connects and enables the dedicated key.
select cron.schedule('olympiad-apollo-held-drafts','*/10 15-22 * * 1-5', $cron$select net.http_get(url:='https://chairman.scottsdaleolympiad.com/olympiad/api/outreach-cloud/research',headers:=jsonb_build_object('Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='olympiad_cloud_reply_worker')),timeout_milliseconds:=200000);$cron$);
