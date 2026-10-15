begin;
do $$declare d date=(now() at time zone 'America/Phoenix')::date;t timestamptz=now();v jsonb;k text=repeat('test',16);begin
 update olympiad_private.outreach_apollo_config set enabled=true,start_on=d,remaining=80,last_error='' where id;
 v=olympiad_private.apollo_alert_status(d,8,t);if v->>'kind' is not null then raise exception 'Early false failure';end if;
 v=olympiad_private.apollo_alert_status(d,9,t);if v->>'kind' is distinct from 'research_failure' then raise exception 'Missed start not detected';end if;
 insert into olympiad_private.outreach_candidates(company,company_key,domain,email,name,role,research,subject,body,followup_subject,followup_body,state,copy_reviewed,created_at) select 'Alert rollback '||i,'alertrollback'||i,'example'||i||'.invalid','test@example'||i||'.invalid','Test','Owner','{"supply":"apollo-cloud-v1"}'::jsonb,'Test','Test only','Test','Test only','ready',false,t from generate_series(1,20)i;
 insert into olympiad_private.outreach_gmail_drafts(candidate_id,step,company,email,subject,body,export_state,gmail_thread_id,synced_at) select id,'initial',company,email,subject,body,'ready','abc123',t from olympiad_private.outreach_candidates where company like 'Alert rollback %';
 v=olympiad_private.apollo_alert_status(d,10,t);if v->>'kind' is distinct from 'research_ready' or (v->>'ready')::int<>20 then raise exception 'Ready target not detected';end if;
 update olympiad_private.outreach_cloud_mailbox set worker_key_hash=encode(extensions.digest(k,'sha256'),'hex'),paused=false where id;
 v=public.organizer_notification_worker(k,'claim');if v->>'kind' is distinct from 'research_ready' then raise exception 'Ready alert not claimed';end if;
 v=public.organizer_notification_worker(k,'claim');if v->>'kind'='research_ready' then raise exception 'Duplicate alert claimed';end if;
 update olympiad_private.outreach_apollo_config set last_error='Simulated failed lookup' where id;
 v=olympiad_private.apollo_alert_status(d,10,t);if v->>'kind' is distinct from 'research_failure' then raise exception 'Failure not detected';end if;
 if exists(select 1 from olympiad_private.outreach_gmail_drafts where company like 'Alert rollback %' and approved_at is not null) then raise exception 'Approval changed';end if;
end $$;
select 'Ready, failure, missing-start, deduplication and approval guards passed' as result;
rollback;
