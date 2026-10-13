-- Reserve a company before spending enrichment credits. Never release/retry a
-- spent slot automatically: rejected, interrupted and accepted runs all count.
create table olympiad_private.outreach_research_reservations (
 id uuid primary key default gen_random_uuid(),
 company text not null,
 company_key text not null unique,
 domain text not null unique,
 local_day date not null,
 created_at timestamptz not null default now()
);
create index outreach_research_day on olympiad_private.outreach_research_reservations(local_day);
alter table olympiad_private.outreach_research_reservations enable row level security;
revoke all on olympiad_private.outreach_research_reservations from public,anon,authenticated;

create function olympiad_outreach_worker.research(p_key text,p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m olympiad_private.outreach_cloud_mailbox;c olympiad_private.outreach_daily_config;
 d date=(now() at time zone 'America/Phoenix')::date;n integer;k text;v_domain text;v_company text;rid uuid;
begin
 select * into m from olympiad_private.outreach_cloud_mailbox where id;
 if p_key is null or length(p_key)<32 or m.worker_key_hash is null or m.worker_key_hash is distinct from encode(extensions.digest(p_key,'sha256'),'hex') then raise insufficient_privilege;end if;
 if p_action='context' then
  return jsonb_build_object('excluded_domains',(select coalesce(jsonb_agg(domain),'[]'::jsonb) from olympiad_private.outreach_research_reservations),'excluded_companies',(select coalesce(jsonb_agg(company_key),'[]'::jsonb) from olympiad_private.outreach_research_reservations),'research_today',(select count(*) from olympiad_private.outreach_research_reservations where local_day=d),'research_limit',20);
 end if;
 v_company=trim(p_data->>'company');v_domain=lower(trim(p_data->>'domain'));k=olympiad_private.outreach_company_key(v_company);
 if v_company is null or k='' or length(v_company)>200 or v_company~E'[\r\n]' or v_domain is null or length(v_domain)>253 or v_domain!~'^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$' then raise check_violation;end if;
 if p_action='check' then
  return jsonb_build_object('allowed',exists(select 1 from olympiad_private.outreach_research_reservations where id=(p_data->>'reservation_id')::uuid and company_key=k and domain=v_domain and local_day=d) and not olympiad_private.outreach_excluded(v_company,v_domain,p_data->>'email'));
 elsif p_action<>'reserve' then raise check_violation;end if;
 -- Serialize the daily count AND company insert. A stale Clay snapshot cannot
 -- win twice, and a concurrent twenty-first request cannot pass the cap.
 select * into c from olympiad_private.outreach_daily_config where id for update;
 if not c.enabled or d<c.start_on or extract(isodow from d)>5 or m.paused then return jsonb_build_object('reserved',false,'held','Research schedule paused');end if;
 if olympiad_private.outreach_excluded(v_company,v_domain,'') or exists(select 1 from olympiad_private.outreach_research_reservations where domain=v_domain or company_key=k) then return jsonb_build_object('reserved',false,'excluded',true);end if;
 select count(*) into n from olympiad_private.outreach_research_reservations where local_day=d;
 if n>=20 then return jsonb_build_object('reserved',false,'held','Daily research cap reached');end if;
 insert into olympiad_private.outreach_research_reservations(company,company_key,domain,local_day) values(v_company,k,v_domain,d) returning id into rid;
 return jsonb_build_object('reserved',true,'reservation_id',rid,'company',v_company,'domain',v_domain,'remaining',19-n);
end $$;
revoke all on function olympiad_outreach_worker.research(text,text,jsonb) from public,anon,authenticated;
grant execute on function olympiad_outreach_worker.research(text,text,jsonb) to anon,authenticated;
create function public.organizer_research_worker(p_key text,p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$select olympiad_outreach_worker.research(p_key,p_action,p_data)$$;
revoke all on function public.organizer_research_worker(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.organizer_research_worker(text,text,jsonb) to anon,authenticated;
