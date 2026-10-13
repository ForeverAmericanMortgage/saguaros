-- Run after the migration inside a rollback-only transaction. No SMTP actions.
do $$
declare k text;r jsonb;rid uuid;i integer;
begin
 select decrypted_secret into k from vault.decrypted_secrets where name='olympiad_cloud_reply_worker';
 begin perform olympiad_outreach_worker.research(null,'context');raise exception 'Null key accepted';exception when insufficient_privilege then null;end;
 begin perform olympiad_outreach_worker.research('synthetic-invalid-key-at-least-32-characters','context');raise exception 'Wrong key accepted';exception when insufficient_privilege then null;end;
 if has_table_privilege('anon','olympiad_private.outreach_research_reservations','select') or has_table_privilege('authenticated','olympiad_private.outreach_research_reservations','insert') then raise exception 'Private records exposed';end if;
 update olympiad_private.outreach_daily_config set enabled=true,start_on=current_date where id;
 r=olympiad_outreach_worker.research(k,'reserve','{"company":"Reservation test one","domain":"reservation-test-one.invalid"}');
 if r->>'reserved'<>'true' then raise exception 'First reservation failed';end if;rid=(r->>'reservation_id')::uuid;
 r=olympiad_outreach_worker.research(k,'reserve','{"company":"Reservation test one","domain":"reservation-test-one.invalid"}');
 if r->>'reserved'<>'false' or r->>'excluded'<>'true' then raise exception 'Duplicate snapshot accepted';end if;
 r=olympiad_outreach_worker.research(k,'check',jsonb_build_object('company','Reservation test one','domain','wrong.invalid','reservation_id',rid));
 if r->>'allowed'<>'false' then raise exception 'Mismatched reservation accepted';end if;
 r=olympiad_outreach_worker.research(k,'check',jsonb_build_object('company','Reservation test one','domain','reservation-test-one.invalid','reservation_id',rid));
 if r->>'allowed'<>'true' then raise exception 'Matching reservation failed';end if;
 for i in 2..20 loop
  r=olympiad_outreach_worker.research(k,'reserve',jsonb_build_object('company','Reservation test '||i,'domain','reservation-test-'||i||'.invalid'));
  if r->>'reserved'<>'true' then raise exception 'Slot % failed',i;end if;
 end loop;
 r=olympiad_outreach_worker.research(k,'reserve','{"company":"Reservation test 21","domain":"reservation-test-21.invalid"}');
 if r->>'reserved'<>'false' or r->>'held'<>'Daily research cap reached' then raise exception 'Twenty-first reservation accepted';end if;
 if (select count(*) from olympiad_private.outreach_research_reservations where local_day=(now() at time zone 'America/Phoenix')::date)<>20 then raise exception 'Incorrect daily count';end if;
 r=olympiad_outreach_worker.research(k,'context');
 if not (r->'excluded_domains' ? 'reservation-test-one.invalid') then raise exception 'Reservation absent from exclusions';end if;
 raise notice 'Research reservation tests passed: key denial, privileges, duplicate, identity binding, daily cap and persistent exclusions. All records roll back.';
end $$;
