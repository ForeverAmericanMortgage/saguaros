-- Trusted invitation roster for the 2027 pilot only. No client-facing email lookup.
create table public.pilot_invitations (
 email text primary key check(email=lower(btrim(email)) and position('@' in email)>1),
 event_year integer not null default 2027 check(event_year=2027),
 created_at timestamptz not null default now()
);
alter table public.pilot_invitations enable row level security;
revoke all on public.pilot_invitations from public,anon,authenticated;

-- Auth confirmation and cohort enrollment commit together. Never consult user_metadata.
create function olympiad_private.enroll_verified_pilot() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.email_confirmed_at is not null and new.email is not null and exists(
   select 1 from public.pilot_invitations i where i.email=lower(btrim(new.email)) and i.event_year=2027
 ) then
   insert into public.pilot_captains(user_id) values(new.id) on conflict(user_id) do nothing;
 end if;
 return new;
end; $$;
revoke all on function olympiad_private.enroll_verified_pilot() from public,anon,authenticated;
create trigger olympiad_enroll_verified_pilot after insert or update of email,email_confirmed_at on auth.users
 for each row execute function olympiad_private.enroll_verified_pilot();

-- Also handle an invitation added AFTER the user has already verified their inbox.
create function olympiad_private.enroll_existing_pilot_invitation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.pilot_captains(user_id)
 select u.id from auth.users u
 where u.email_confirmed_at is not null and lower(btrim(u.email))=new.email
 on conflict(user_id) do nothing;
 return new;
end; $$;
revoke all on function olympiad_private.enroll_existing_pilot_invitation() from public,anon,authenticated;
create trigger olympiad_enroll_existing_invitation after insert on public.pilot_invitations
 for each row execute function olympiad_private.enroll_existing_pilot_invitation();

-- Safe replay/backfill: only verified identities with an explicit trusted invitation.
insert into public.pilot_captains(user_id)
select u.id from auth.users u join public.pilot_invitations i on i.email=lower(btrim(u.email))
where u.email_confirmed_at is not null and i.event_year=2027
on conflict(user_id) do nothing;

comment on table public.pilot_invitations is 'Trusted 2027 captain invitations. Removing an invitation does not revoke existing captain access; remove pilot_captains separately to prevent new registrations. Never grants organizer access.';
