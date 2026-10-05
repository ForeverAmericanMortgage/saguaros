alter table public.returning_team_accounts add column priority text not null default 'warm' check(priority in ('hot','warm','later'));
grant update(priority) on public.returning_team_accounts to authenticated;
create table public.recruitment_invitations(
 account_id uuid primary key references public.returning_team_accounts(id) on delete cascade,
 email text not null,
 token text not null unique default encode(extensions.gen_random_bytes(32),'hex'),
 issued_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '90 days',
 invited_at timestamptz,
 campaign_id text,
 send_state text not null default 'ready' check(send_state in ('ready','preparing','sending','sent','unknown'))
);
alter table public.recruitment_invitations enable row level security;
revoke all on public.recruitment_invitations from public,anon,authenticated;
grant select on public.recruitment_invitations to authenticated;
grant update(invited_at,campaign_id,send_state) on public.recruitment_invitations to authenticated;
create policy chairman_read_recruit_invites on public.recruitment_invitations for select to authenticated using((select olympiad_private.chairman_access_allowed()));
create policy chairman_update_recruit_invites on public.recruitment_invitations for update to authenticated using((select olympiad_private.chairman_access_allowed())) with check((select olympiad_private.chairman_access_allowed()));
create function public.prepare_recruit_invitation(p_account_id uuid,p_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.returning_team_accounts;i public.recruitment_invitations;
begin
 if not olympiad_private.chairman_access_allowed() then raise exception 'Chairman access required' using errcode='42501';end if;
 select * into a from public.returning_team_accounts where id=p_account_id for update;
 if not found or a.version<>p_version then raise exception 'Reload this business before inviting';end if;
 if a.outreach_status in ('do_not_contact','not_returning') or a.linked_team_id is not null then raise exception 'This business is not in the recruitment queue';end if;
 if a.contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Save a valid captain email first';end if;
 select * into i from public.recruitment_invitations where account_id=a.id;
 if found and i.email<>a.contact_email then raise exception 'Existing invitation uses a different email. Reconcile it before reinviting';end if;
 if found and i.expires_at<=now() then raise exception 'Invitation expired. Ask the event team to renew it';end if;
 insert into public.pilot_invitations(email) values(lower(trim(a.contact_email))) on conflict(email) do nothing;
 if i.account_id is null then insert into public.recruitment_invitations(account_id,email) values(a.id,lower(trim(a.contact_email))) returning * into i;end if;
 return to_jsonb(i);
end;$$;
revoke all on function public.prepare_recruit_invitation(uuid,integer) from public,anon;
grant execute on function public.prepare_recruit_invitation(uuid,integer) to authenticated;
-- Bearer invitation reveals only the intended business and email, never roster/contact history.
create function public.recruit_invitation_details(p_token text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('business',a.business_name,'email',i.email) from public.recruitment_invitations i join public.returning_team_accounts a on a.id=i.account_id where length(p_token)=64 and i.token=p_token and i.expires_at>now() and a.outreach_status not in ('do_not_contact','not_returning');
$$;
revoke all on function public.recruit_invitation_details(text) from public;
grant execute on function public.recruit_invitation_details(text) to anon,authenticated;
