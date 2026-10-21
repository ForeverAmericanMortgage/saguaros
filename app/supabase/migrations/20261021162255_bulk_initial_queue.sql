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
  if q>=2500 or used>=c.credit_budget then return jsonb_build_object('skip',true);end if;
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
  n=least(10,2500-q,c.credit_budget-used,floor(coalesce(c.remaining,0)));
  if not c.enabled or d<c.start_on or extract(isodow from d)>5 or h<6 or h>=17 or n<=0 or c.checked_at is null or c.checked_at<now()-interval '2 minutes' then return jsonb_build_object('skip',true);end if;
  select array_agg(person_id) into ids from (select person_id from (select distinct on (company_key) person_id,created_at from olympiad_private.outreach_apollo_people where state='pending' and not olympiad_private.outreach_excluded(company,'','') and not exists(select 1 from olympiad_private.outreach_candidates c where c.company_key=outreach_apollo_people.company_key) and not exists(select 1 from olympiad_private.outreach_apollo_people prior where prior.company_key=outreach_apollo_people.company_key and prior.state<>'pending') order by company_key,created_at,person_id) unique_companies order by created_at,person_id limit n) z;
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

select cron.alter_job(job_id := (select jobid from cron.job where jobname='olympiad-apollo-held-drafts'), schedule := '*/2 13-23 * * 1-5');
