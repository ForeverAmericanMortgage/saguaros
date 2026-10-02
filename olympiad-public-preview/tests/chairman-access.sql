-- Run as the migration/admin connection. No roster or team writes.
begin;
select set_config('olympiad.test_claims',(
 select jsonb_build_object('sub',u.id,'email',u.email,'role','authenticated','is_anonymous',false,
 'session_id',s.id,'amr',jsonb_build_array(jsonb_build_object('method','oauth')))::text
 from auth.users u join auth.sessions s on s.user_id=u.id
 where lower(u.email)='scaldwell@saguaros.com'
 and exists(select 1 from auth.mfa_amr_claims c where c.session_id=s.id and c.authentication_method='oauth')
 order by s.created_at desc limit 1),true);
select set_config('olympiad.test_own_teams',(select count(*)::text from public.teams where captain_user_id=(current_setting('olympiad.test_claims')::jsonb->>'sub')::uuid),true);
set local role authenticated;
do $test$
declare base jsonb:=current_setting('olympiad.test_claims')::jsonb;
begin
 if base is null then raise exception 'No OAuth session to test'; end if;
 perform set_config('request.jwt.claims',base::text,true);
 if not olympiad_private.chairman_access_allowed() then raise exception 'Expected Google chairman allowed'; end if;
 if (select count(*) from public.organizer_memberships)<>1 then raise exception 'Membership RLS mismatch'; end if;
 perform 1 from public.organizer_campaign_contacts();
 perform 1 from public.organizer_invitation_progress();
 perform set_config('request.jwt.claims',(base || '{"amr":[{"method":"magiclink"}]}'::jsonb)::text,true);
 if olympiad_private.chairman_access_allowed() then raise exception 'Email-link wrongly allowed'; end if;
 if exists(select 1 from public.organizer_memberships) then raise exception 'Email membership bypass'; end if;
 if exists(select 1 from public.team_captain_details d join public.teams t on t.id=d.team_id where t.captain_user_id<>auth.uid()) then raise exception 'Other captain details exposed'; end if;
 if (select count(*) from public.teams where captain_user_id=auth.uid())<>current_setting('olympiad.test_own_teams')::bigint then raise exception 'Captain ownership regression'; end if;
 begin perform 1 from public.organizer_invitation_progress(); raise exception 'Invitation function bypass'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.organizer_campaign_contacts(); raise exception 'Contacts function bypass'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims',(base - 'amr')::text,true);
 if olympiad_private.chairman_access_allowed() then raise exception 'Missing AMR allowed'; end if;
 perform set_config('request.jwt.claims',(base || '{"email":"other@saguaros.com"}'::jsonb)::text,true);
 if olympiad_private.chairman_access_allowed() then raise exception 'Other email allowed'; end if;
 perform set_config('request.jwt.claims',(base || '{"session_id":"00000000-0000-4000-8000-000000000000"}'::jsonb)::text,true);
 if olympiad_private.chairman_access_allowed() then raise exception 'Missing session allowed'; end if;
end $test$;
reset role;
rollback;
select 'PASS: Google chairman, email denial, private RPC denial, captain ownership, missing AMR/email/session denial; all changes rolled back' as result;
