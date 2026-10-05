-- Public access eligibility only; authentication is still required to access a team.
create function public.recruit_email_access_allowed(p_email text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.pilot_invitations where email=lower(trim(p_email))); $$;
revoke all on function public.recruit_email_access_allowed(text) from public;
grant execute on function public.recruit_email_access_allowed(text) to anon,authenticated;
