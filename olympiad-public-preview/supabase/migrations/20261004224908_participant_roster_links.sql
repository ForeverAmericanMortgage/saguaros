-- One revocable capability per team. Never expose tokens or roster contacts via public SELECT.
create table olympiad_private.roster_links (
 team_id uuid primary key references public.teams(id) on delete cascade,
 token text not null unique check(token ~ '^[0-9a-f]{64}$'),
 expires_at timestamptz not null,
 revoked_at timestamptz,
 created_by uuid not null references auth.users(id),
 window_started_at timestamptz not null default now(),
 window_attempts integer not null default 0,
 updated_at timestamptz not null default now()
);
alter table olympiad_private.roster_links enable row level security;
revoke all on olympiad_private.roster_links from public,anon,authenticated;

create table public.roster_contact_preferences (
 participant_id uuid primary key references public.roster_participants(id) on delete cascade,
 first_name text not null,
 last_name text not null,
 submitted_email text not null,
 source text not null default 'participant_link' check(source='participant_link'),
 consent_text text not null,
 email_updates_requested boolean not null default false,
 sms_updates_requested boolean not null default false,
 email_consent_text text,
 sms_consent_text text,
 submitted_at timestamptz not null default now(),
 email_verified boolean not null default false
);
alter table public.roster_contact_preferences enable row level security;
revoke all on public.roster_contact_preferences from public,anon,authenticated;
grant select on public.roster_contact_preferences to authenticated;
create policy roster_contact_preferences_read on public.roster_contact_preferences for select to authenticated
 using(exists(select 1 from public.roster_participants p join public.teams t on t.id=p.team_id where p.id=participant_id));

create function public.manage_roster_link(p_team_id uuid,p_action text default 'get') returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_link olympiad_private.roster_links; v_name text;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Sign in to manage this link'; end if;
 if p_action not in ('get','rotate','revoke') or p_action is null then raise exception 'Invalid link action'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_team_id::text,0));
 select t.team_name into v_name from public.teams t join public.event_editions e on e.id=t.event_id
 where t.id=p_team_id and t.captain_user_id=auth.uid() and t.status='registered' and e.year=2027
 and not exists(select 1 from public.team_reviews r where r.team_id=t.id and r.status='declined') for update of t;
 if not found then raise exception 'Captain access required for an active team'; end if;
 if p_action='revoke' then
  update olympiad_private.roster_links set revoked_at=now(),updated_at=now() where team_id=p_team_id;
  return jsonb_build_object('ok',true,'disabled',true);
 end if;
 select * into v_link from olympiad_private.roster_links where team_id=p_team_id;
 if p_action='rotate' or not found or v_link.revoked_at is not null or v_link.expires_at<=now() then
  insert into olympiad_private.roster_links(team_id,token,expires_at,created_by)
  values(p_team_id,encode(extensions.gen_random_bytes(32),'hex'),now()+interval '90 days',auth.uid())
  on conflict(team_id) do update set token=excluded.token,expires_at=excluded.expires_at,revoked_at=null,
   created_by=excluded.created_by,window_started_at=now(),window_attempts=0,updated_at=now()
  returning * into v_link;
 end if;
 return jsonb_build_object('token',v_link.token,'expires_at',v_link.expires_at,'team_name',v_name);
end $$;
revoke all on function public.manage_roster_link(uuid,text) from public,anon;
grant execute on function public.manage_roster_link(uuid,text) to authenticated;

-- Only the invitation header is returned. No participant, email, phone or ownership data.
create function public.roster_link_details(p_token text) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('team_name',t.team_name,'captain_name',coalesce(c.name,''),'event_year',e.year)
 from olympiad_private.roster_links l join public.teams t on t.id=l.team_id
 join public.event_editions e on e.id=t.event_id left join public.team_captain_details c on c.team_id=t.id
 where p_token ~ '^[0-9a-f]{64}$' and l.token=p_token and l.revoked_at is null and l.expires_at>now()
 and t.status='registered' and e.year=2027
 and not exists(select 1 from public.team_reviews r where r.team_id=t.id and r.status='declined');
$$;
revoke all on function public.roster_link_details(text) from public;
grant execute on function public.roster_link_details(text) to anon,authenticated;

create function public.join_team_roster(p_token text,p_first_name text,p_last_name text,p_email text,p_phone text,
 p_shirt_size text,p_shirt_fit text,p_consent boolean,p_email_updates boolean default false,p_sms_updates boolean default false)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare v_link olympiad_private.roster_links; v_team uuid; v_id uuid; v_position integer;
 v_first text:=trim(coalesce(p_first_name,'')); v_last text:=trim(coalesce(p_last_name,''));
 v_email text:=lower(trim(coalesce(p_email,''))); v_phone text:=trim(coalesce(p_phone,''));
begin
 if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return jsonb_build_object('error','This roster link is unavailable. Ask your captain for a new link.','code','unavailable'); end if;
 select team_id into v_team from olympiad_private.roster_links where token=p_token;
 if not found then return jsonb_build_object('error','This roster link is unavailable. Ask your captain for a new link.','code','unavailable'); end if;
 -- Same lock and roster version as captain saves: an old captain draft cannot erase a new join.
 perform pg_advisory_xact_lock(hashtextextended(v_team::text,0));
 perform 1 from public.teams t join public.event_editions e on e.id=t.event_id where t.id=v_team and t.status='registered' and e.year=2027
 and not exists(select 1 from public.team_reviews r where r.team_id=t.id and r.status='declined') for update of t;
 if not found then return jsonb_build_object('error','This roster link is unavailable. Ask your captain for a new link.','code','unavailable'); end if;
 select * into v_link from olympiad_private.roster_links where team_id=v_team and token=p_token and revoked_at is null and expires_at>now() for update;
 if not found then return jsonb_build_object('error','This roster link is unavailable. Ask your captain for a new link.','code','unavailable'); end if;
 if v_link.window_started_at<now()-interval '1 hour' then
  update olympiad_private.roster_links set window_started_at=now(),window_attempts=1 where team_id=v_team;
 elsif v_link.window_attempts>=30 then
  return jsonb_build_object('error','This link has had several submissions. Please try again in an hour or contact your captain.','code','rate_limited');
 else update olympiad_private.roster_links set window_attempts=window_attempts+1 where team_id=v_team; end if;
 if v_first='' or v_last='' or length(v_first||' '||v_last)>120 then return jsonb_build_object('error','Enter your first and last name.','code','invalid'); end if;
 if length(v_email)>254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then return jsonb_build_object('error','Enter a valid email.','code','invalid'); end if;
 if length(v_phone)>40 or v_phone !~ '^[+0-9().[:space:]-]+$' or length(regexp_replace(v_phone,'[^0-9]','','g')) not between 10 and 15 then return jsonb_build_object('error','Enter a valid phone number.','code','invalid'); end if;
 if p_shirt_size is null or p_shirt_size not in ('XS','S','M','L','XL','2XL','3XL') or p_shirt_fit is null or p_shirt_fit not in ('male','female') then return jsonb_build_object('error','Choose your shirt size and fit.','code','invalid'); end if;
 if p_consent is distinct from true then return jsonb_build_object('error','Please agree to share your details with your captain and organizers.','code','invalid'); end if;
 if exists(select 1 from public.roster_participants where team_id=v_team and lower(trim(email))=v_email) then
  return jsonb_build_object('error','This email already has a roster entry. Ask your captain to update it if any details are missing.','code','duplicate');
 end if;
 select pos into v_position from generate_series(0,49) pos where not exists(select 1 from public.roster_participants where team_id=v_team and position=pos) order by pos limit 1;
 if v_position is null then return jsonb_build_object('error','This roster is full. Please contact your captain.','code','full'); end if;
 insert into public.roster_participants(team_id,name,email,phone,shirt_size,shirt_fit,position)
 values(v_team,v_first||' '||v_last,v_email,v_phone,p_shirt_size,p_shirt_fit,v_position) returning id into v_id;
 insert into public.roster_contact_preferences(participant_id,first_name,last_name,submitted_email,consent_text,
  email_updates_requested,sms_updates_requested,email_consent_text,sms_consent_text)
 values(v_id,v_first,v_last,v_email,'I agree to share these details with my team captain and Olympiad organizers for shirt planning and event updates.',
  coalesce(p_email_updates,false),coalesce(p_sms_updates,false),
  case when p_email_updates then 'I would like Olympiad email updates and fundraising tips. I can unsubscribe anytime.' end,
  case when p_sms_updates then 'I would like Olympiad event updates by text. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Optional; not required to participate.' end);
 update public.teams set roster_version=roster_version+1 where id=v_team;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.join_team_roster(text,text,text,text,text,text,text,boolean,boolean,boolean) from public;
grant execute on function public.join_team_roster(text,text,text,text,text,text,text,boolean,boolean,boolean) to anon,authenticated;
