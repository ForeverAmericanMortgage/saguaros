-- Narrow organizer-only projection; never expose auth.users or invitations directly.
create function public.organizer_invitation_progress()
returns table(email text, invited_at timestamptz, email_verified boolean, last_sign_in_at timestamptz, team_count bigint, participant_count bigint)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.organizer_memberships m where m.user_id=auth.uid()) then
  raise exception 'Organizer access required' using errcode='42501';
 end if;
 return query
 select i.email,i.created_at,u.email_confirmed_at is not null,u.last_sign_in_at,
 (select count(*) from public.teams t join public.event_editions e on e.id=t.event_id where t.captain_user_id=u.id and e.year=2027),
 (select count(*) from public.roster_participants r join public.teams t on t.id=r.team_id join public.event_editions e on e.id=t.event_id where t.captain_user_id=u.id and e.year=2027)
 from public.pilot_invitations i left join auth.users u on lower(btrim(u.email))=i.email
 where i.event_year=2027 order by i.created_at desc,i.email;
end; $$;
revoke all on function public.organizer_invitation_progress() from public,anon;
grant execute on function public.organizer_invitation_progress() to authenticated;
