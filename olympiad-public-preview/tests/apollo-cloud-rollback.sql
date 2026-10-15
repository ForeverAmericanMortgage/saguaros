-- Run only in an explicit rollback transaction after the migration.
begin;
do $$declare k text=repeat('test',16);lease uuid=gen_random_uuid();r jsonb;begin
 update olympiad_private.outreach_cloud_mailbox set worker_key_hash=encode(extensions.digest(k,'sha256'),'hex') where id;
 update olympiad_private.outreach_apollo_config set enabled=true,credential='test.test.test',start_on=current_date-2,lease_id=lease,lease_until=now()+interval '4 minutes' where id;
 begin perform public.organizer_apollo_worker('wrong','summary');raise exception 'Unauthorized key accepted';exception when insufficient_privilege then null;end;
 begin perform public.organizer_apollo_worker(k,'balance',jsonb_build_object('lease_id',lease,'remaining',null));raise exception 'Null balance accepted';exception when check_violation then null;end;
 perform public.organizer_apollo_worker(k,'balance',jsonb_build_object('lease_id',lease,'remaining',10));
 perform public.organizer_apollo_worker(k,'search_results',jsonb_build_object('lease_id',lease,'people',jsonb_build_array(jsonb_build_object('id','synthetic-only','has_email',true,'organization',jsonb_build_object('name','Synthetic Rollback Company')))));
 update olympiad_private.outreach_apollo_config set enabled=false where id;
 r=public.organizer_apollo_worker(k,'reserve',jsonb_build_object('lease_id',lease));
 if r->>'skip' is distinct from 'true' then raise exception 'Paused config reserved paid credits';end if;
 update olympiad_private.outreach_apollo_config set enabled=true where id;
 insert into olympiad_private.outreach_apollo_batches(local_day,person_ids,reserved_credits,state) values(current_date,array['synthetic-only'],1,'uncertain');
 r=public.organizer_apollo_worker(k,'reserve',jsonb_build_object('lease_id',lease));
 if r->>'skip' is distinct from 'true' then raise exception 'Uncertain lookup permitted another';end if;
end $$;
do $$declare k text=repeat('test',16);lease uuid;bid uuid;begin
 select lease_id into lease from olympiad_private.outreach_apollo_config where id;
 update olympiad_private.outreach_apollo_people set state='reserved' where person_id='synthetic-only';
 insert into olympiad_private.outreach_apollo_batches(local_day,person_ids,reserved_credits) values(current_date,array['synthetic-only'],1) returning id into bid;
 perform public.organizer_apollo_worker(k,'complete',jsonb_build_object('lease_id',lease,'batch_id',bid,'credits',1,'results',jsonb_build_array(jsonb_build_object('person_id','synthetic-only','qualified',true,'company','Synthetic Rollback Company','domain','example.invalid','email','synthetic@example.invalid','name','Synthetic Test','role','Owner','evidence','{}'::jsonb,'subject','Test','body','Test only','followup_subject','Test','followup_body','Test only'))));
 if not exists(select 1 from olympiad_private.outreach_candidates c join olympiad_private.outreach_gmail_drafts d on d.candidate_id=c.id where c.email='synthetic@example.invalid' and c.copy_reviewed=false and d.approved_at is null and d.approved_hash is null and d.export_state='pending') then raise exception 'Draft hold not preserved';end if;
end $$;
select 'Apollo guards and held-draft intake passed; all test changes rolled back' as result;
rollback;
