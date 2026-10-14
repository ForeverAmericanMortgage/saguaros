-- Execute with migration in a rollback-only transaction. Never send mail.
do $$
declare k text;r jsonb;i integer;d date=(now() at time zone 'America/Phoenix')::date;
begin
 select decrypted_secret into k from vault.decrypted_secrets where name='olympiad_cloud_reply_worker';
 begin perform olympiad_outreach_worker.research(null,'context');raise exception 'Missing key accepted';exception when insufficient_privilege then null;end;
 update olympiad_private.outreach_daily_config set enabled=true,start_on=d,review_required=true,review_released=false where id;
 update olympiad_private.outreach_research_reservations set local_day=d-1 where local_day=d;
 update olympiad_private.outreach_candidates set state='held' where state='ready';
 for i in 1..40 loop
  r=olympiad_outreach_worker.research(k,'reserve',jsonb_build_object('company','Qualified test '||i,'domain','qualified-test-'||i||'.invalid'));
  if r->>'reserved' is distinct from 'true' then raise exception 'Slot % failed: %',i,r;end if;
 end loop;
 r=olympiad_outreach_worker.research(k,'reserve','{"company":"Qualified test overflow","domain":"qualified-test-overflow.invalid"}');
 if r->>'held' is distinct from 'Daily research cap reached' then raise exception '41st admitted';end if;
 update olympiad_private.outreach_research_reservations set local_day=d-1 where local_day=d;
 for i in 1..20 loop
  insert into olympiad_private.outreach_candidates(company,company_key,domain,email,name,role,research,subject,body,followup_subject,followup_body,created_at)
  values('Ready test '||i,'readytest'||i,'ready-test-'||i||'.invalid','test@ready-test-'||i||'.invalid','Synthetic','Test','{}','Test','Test','Test','Test',now()-interval '1 day');
 end loop;
 r=olympiad_outreach_worker.research(k,'reserve','{"company":"Ready overflow","domain":"ready-overflow.invalid"}');
 if r->>'held' is distinct from 'Qualified draft target reached' then raise exception 'Ready backlog did not stop research';end if;
 r=olympiad_outreach_worker.daily(k,'intake','{}');
 if r->>'held' is distinct from 'Qualified draft target reached' then raise exception 'Ready backlog did not stop intake';end if;
 r=olympiad_outreach_worker.daily(k,'claim');
 if r->>'skip' is distinct from 'true' then raise exception 'Review hold failed';end if;
 r=olympiad_outreach_worker.research(k,'context');
 if r->>'research_limit'<>'40' or r->>'ready_drafts'<>'20' or r->>'draft_target'<>'20' then raise exception 'Incorrect context';end if;
 if has_table_privilege('anon','olympiad_private.outreach_candidates','select') then raise exception 'Private draft access';end if;
 raise notice 'PASS:40cap, carryover20target, intake target, review hold, key denial, private access.';
end $$;
