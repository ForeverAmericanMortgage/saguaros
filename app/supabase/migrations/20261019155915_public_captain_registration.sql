-- Public registration retains verified identity, ownership RLS and chairman review.
-- Keep the existing eligibility table to preserve captain preference policies.
create or replace function olympiad_private.enroll_verified_pilot() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.email_confirmed_at is not null and new.email is not null then
   insert into public.pilot_captains(user_id) values(new.id) on conflict(user_id) do nothing;
 end if;
 return new;
end; $$;
revoke all on function olympiad_private.enroll_verified_pilot() from public,anon,authenticated;

-- Include verified people who previously encountered the invitation gate.
insert into public.pilot_captains(user_id)
select id from auth.users where email_confirmed_at is not null and email is not null
on conflict(user_id) do nothing;

update public.event_editions set registration_open=true where year=2027;
comment on table public.pilot_captains is 'Verified captain eligibility for public registration. Does not grant organizer access or team approval.';
