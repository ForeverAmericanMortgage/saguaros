-- Follow-ups reuse a recorded introduction, not a paid supplier-specific research marker.
create function olympiad_private.followup_contact_ready(p_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.organizer_prospects p
 where p.id=p_id and p.event_year=2027 and p.status='sent' and not p.opted_out
 and p.last_reply_at is null and p.next_follow_up is not null
 and p.contact_email like '%@%' and p.gmail_thread_id is not null
 and exists(select 1 from public.organizer_prospect_messages m where m.prospect_id=p.id
   and m.direction='outbound' and m.step='initial' and m.provider_message_id<>'' and m.gmail_thread_id=p.gmail_thread_id)
 and not exists(select 1 from public.organizer_prospect_messages m where m.prospect_id=p.id and (m.direction='inbound' or m.step='followup'))
 and not exists(select 1 from olympiad_private.outreach_exclusions e where e.company_key=olympiad_private.outreach_company_key(p.company_name) or e.domain=p.company_domain)
 and not exists(select 1 from olympiad_private.outreach_send_attempts a where a.prospect_id=p.id and a.step='followup' and a.state<>'cancelled'));
$$;
revoke all on function olympiad_private.followup_contact_ready(uuid) from public,anon,authenticated;

do $patch$
declare src text;old text;
begin
 src=pg_get_functiondef('olympiad_outreach_worker.daily(text,text,jsonb)'::regprocedure);
 old=$old$and evidence_url like 'https://%' and exists(select 1 from olympiad_private.outreach_followup_research rr where rr.prospect_id=x.id and (rr.research->>'checked_at')::timestamptz>=now()-interval '30 days' and coalesce(rr.research->>'clay_task_id','')<>'')$old$;
 if position(old in src)=0 then raise exception 'Follow-up eligibility source changed';end if;
 src=replace(src,old,'and olympiad_private.followup_contact_ready(x.id)');
 -- Preserve the seven-day minimum and exact-copy approval before and at send time.
 src=replace(src,$guard$if p.status<>'sent' or p.opted_out or p.last_reply_at is not null or p.next_follow_up is null or p.next_follow_up>d then$guard$, $guard$if p.status<>'sent' or p.opted_out or p.last_reply_at is not null or p.next_follow_up is null or p.next_follow_up>d or p.last_contact_at>now()-interval '7 days' then$guard$);
 execute src;
 src=pg_get_functiondef('olympiad_outreach_worker.drafts(text,text,jsonb)'::regprocedure);
 old=$old$next_follow_up<=(now() at time zone 'America/Phoenix')::date+1$old$;
 if position(old in src)=0 then raise exception 'Draft preparation source changed';end if;
 src=replace(src,old,'olympiad_private.followup_contact_ready(p.id)');
 src=replace(src,'order by created_at limit 40','order by synced_at nulls first,created_at limit 200');
 execute src;
 src=pg_get_functiondef('olympiad_private.outreach_review(text,jsonb)'::regprocedure);
 src=replace(src,'not between 1 and 40','not between 1 and 200');
 src=replace(src,'order by created_at,id limit 40','order by created_at,id limit 200');
 execute src;
end $patch$;
