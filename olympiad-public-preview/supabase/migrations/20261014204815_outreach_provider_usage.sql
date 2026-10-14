-- Private reporting credentials and observations. No sender or approval changes.
create table olympiad_private.outreach_usage_config(id boolean primary key default true check(id),clay text,apollo text,monthly_budget numeric check(monthly_budget>=0 and monthly_budget<=100000),checked_at timestamptz,report jsonb not null default '{}'::jsonb);
alter table olympiad_private.outreach_usage_config enable row level security;
revoke all on olympiad_private.outreach_usage_config from public,anon,authenticated;
insert into olympiad_private.outreach_usage_config(id) values(true);
create table olympiad_private.outreach_apollo_usage(observed_at timestamptz primary key default now(),local_day date not null,cycle_start text not null,consumed numeric not null,remaining numeric not null);
alter table olympiad_private.outreach_apollo_usage enable row level security;
revoke all on olympiad_private.outreach_apollo_usage from public,anon,authenticated;
create function olympiad_private.outreach_usage_manage(p_data jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare c olympiad_private.outreach_usage_config;k text;
begin
 if auth.uid() is null or not olympiad_private.chairman_access_allowed() then raise insufficient_privilege;end if;
 foreach k in array array['clay','apollo'] loop
  if p_data ? k and (length(p_data->>k)>5000 or p_data->>k !~ '^[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.][A-Za-z0-9_-]+$') then raise check_violation;end if;
 end loop;
 update olympiad_private.outreach_usage_config set clay=coalesce(p_data->>'clay',clay),apollo=coalesce(p_data->>'apollo',apollo),monthly_budget=case when p_data ? 'monthly_budget' then (p_data->>'monthly_budget')::numeric else monthly_budget end,checked_at=case when p_data ? 'clay' or p_data ? 'apollo' then null else checked_at end where id;
 select * into c from olympiad_private.outreach_usage_config where id;
 return jsonb_build_object('clay_connected',c.clay is not null,'apollo_connected',c.apollo is not null,'monthly_budget',c.monthly_budget,'checked_at',c.checked_at,'report',c.report);
end $$;
revoke all on function olympiad_private.outreach_usage_manage(jsonb) from public,anon,authenticated;
grant execute on function olympiad_private.outreach_usage_manage(jsonb) to authenticated;
create function public.organizer_usage_manage(p_data jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select olympiad_private.outreach_usage_manage(p_data)$$;
revoke all on function public.organizer_usage_manage(jsonb) from public,anon;
grant execute on function public.organizer_usage_manage(jsonb) to authenticated;
create function olympiad_outreach_worker.usage(p_key text,p_action text,p_data jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare m olympiad_private.outreach_cloud_mailbox;c olympiad_private.outreach_usage_config;b olympiad_private.outreach_apollo_usage;d date=(now() at time zone 'America/Phoenix')::date;
begin
 select * into m from olympiad_private.outreach_cloud_mailbox where id;
 if p_key is null or length(p_key)<32 or m.worker_key_hash is null or encode(extensions.digest(p_key,'sha256'),'hex') is distinct from m.worker_key_hash then raise insufficient_privilege;end if;
 if p_action='save' then
  update olympiad_private.outreach_usage_config set checked_at=now(),report=p_data->'report' where id;
  if p_data ? 'apollo' then insert into olympiad_private.outreach_apollo_usage(local_day,cycle_start,consumed,remaining) values(d,p_data->'apollo'->>'cycle_start',(p_data->'apollo'->>'consumed')::numeric,(p_data->'apollo'->>'remaining')::numeric);end if;
 elsif p_action<>'read' then raise check_violation;end if;
 select * into c from olympiad_private.outreach_usage_config where id;
 select * into b from olympiad_private.outreach_apollo_usage where local_day=d order by observed_at limit 1;
 return jsonb_build_object('clay',c.clay,'apollo',c.apollo,'monthly_budget',c.monthly_budget,'checked_at',c.checked_at,'report',c.report,'baseline',to_jsonb(b),'day',d);
end $$;
revoke all on function olympiad_outreach_worker.usage(text,text,jsonb) from public,anon,authenticated;
grant execute on function olympiad_outreach_worker.usage(text,text,jsonb) to anon;
create function public.organizer_usage_worker(p_key text,p_action text,p_data jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select olympiad_outreach_worker.usage(p_key,p_action,p_data)$$;
revoke all on function public.organizer_usage_worker(text,text,jsonb) from public,authenticated;
grant execute on function public.organizer_usage_worker(text,text,jsonb) to anon;
