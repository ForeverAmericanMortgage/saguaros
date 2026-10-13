-- Run after applying the migration in a transaction; this test rolls back all synthetic records.
begin;
select set_config('olympiad.test_claims',(
 select jsonb_build_object('sub',u.id,'email',u.email,'role','authenticated','is_anonymous',false,
 'session_id',s.id,'amr',jsonb_build_array(jsonb_build_object('method','oauth')))::text
 from auth.users u join auth.sessions s on s.user_id=u.id
 where lower(u.email)='scaldwell@saguaros.com'
 and exists(select 1 from auth.mfa_amr_claims c where c.session_id=s.id and c.authentication_method='oauth')
 order by s.created_at desc limit 1),true);
set local role authenticated;
do $test$
declare base jsonb:=current_setting('olympiad.test_claims')::jsonb;pid uuid;affected integer;
begin
 if base is null then raise exception 'No OAuth session to test';end if;
 perform set_config('request.jwt.claims',base::text,true);
 insert into public.organizer_prospects(company_name,company_domain,contact_email,created_by) values('Synthetic prospect','prospect-test.invalid','test@prospect-test.invalid',auth.uid()) returning id into pid;
 update public.organizer_prospects set notes='first update' where id=pid and version=1;
 if (select version from public.organizer_prospects where id=pid)<>2 then raise exception 'Version did not advance';end if;
 update public.organizer_prospects set notes='stale update' where id=pid and version=1;
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Stale update overwrote notes';end if;
 begin update public.organizer_prospects set status='registered' where id=pid;raise exception 'Fake registration allowed';exception when check_violation then null;end;
 update public.organizer_prospects set status='opted_out',next_follow_up=current_date where id=pid;
 if not (select opted_out and next_follow_up is null from public.organizer_prospects where id=pid) then raise exception 'Opt-out not suppressed';end if;
 begin update public.organizer_prospects set status='sent',opted_out=false where id=pid;raise exception 'Opt-out reactivated';exception when check_violation then null;end;
 perform set_config('request.jwt.claims',(base || '{"amr":[{"method":"magiclink"}]}'::jsonb)::text,true);
 if exists(select 1 from public.organizer_prospects) then raise exception 'Non-Google access leak';end if;
 begin insert into public.organizer_prospects(company_name,company_domain,contact_email,created_by) values('Denied','denied.invalid','test@denied.invalid',auth.uid());raise exception 'Non-Google insert allowed';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims',(base || '{"email":"other@saguaros.com"}'::jsonb)::text,true);
 if exists(select 1 from public.organizer_prospects) then raise exception 'Other email access leak';end if;
end $test$;
reset role;
set local role anon;
do $test$ begin
 begin perform 1 from public.organizer_prospects;raise exception 'Anonymous access allowed';exception when insufficient_privilege then null;end;
end $test$;
reset role;
rollback;
select 'PASS: chairman save, stale update, registration guard, sticky opt-out, non-Google and anonymous denial; rolled back' as result;
