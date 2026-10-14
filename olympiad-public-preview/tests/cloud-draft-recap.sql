-- Roll back all notification claims; never sends mail. Requires existing three held drafts and current October14 daytime.
begin;
do $$ declare k text;r jsonb;before_hold jsonb;after_hold jsonb;begin
 if olympiad_private.outreach_notification_kind('2026-10-15',8.5,20,false,true,'2026-10-14') is not null then raise exception 'too early';end if;
 if olympiad_private.outreach_notification_kind('2026-10-15',9,3,false,true,'2026-10-14') is not null then raise exception 'partial early';end if;
 if olympiad_private.outreach_notification_kind('2026-10-15',9,20,false,true,'2026-10-14') is distinct from 'review' then raise exception 'ready missing';end if;
 if olympiad_private.outreach_notification_kind('2026-10-15',10,20,true,true,'2026-10-14') is not null then raise exception 'duplicate';end if;
 if olympiad_private.outreach_notification_kind('2026-10-15',17,3,false,true,'2026-10-14') is distinct from 'review' then raise exception 'partial missing';end if;
 if olympiad_private.outreach_notification_kind('2026-10-15',17.5,3,true,true,'2026-10-14') is distinct from 'recap' then raise exception 'daily recap lost';end if;
 select jsonb_build_object('required',review_required,'released',review_released) into before_hold from olympiad_private.outreach_daily_config where id;
 select decrypted_secret into k from vault.decrypted_secrets where name='olympiad_cloud_reply_worker';
 begin perform public.organizer_notification_worker(null,'claim');raise exception 'null authorized';exception when insufficient_privilege then null;end;
 delete from olympiad_private.outreach_notifications where kind='review' and local_day=(now() at time zone 'America/Phoenix')::date;
 r=public.organizer_notification_worker(k,'claim');
 if r->>'kind' is distinct from 'review' then raise exception 'expected current-day review';end if;
 if (r->>'gmail_ready')::int<>3 or (r->>'research_reserved')::int<>40 then raise exception 'incorrect actual counts';end if;
 r=public.organizer_notification_worker(k,'claim');if r->>'skip' is distinct from 'true' then raise exception 'claim not deduplicated';end if;
 select jsonb_build_object('required',review_required,'released',review_released) into after_hold from olympiad_private.outreach_daily_config where id;
 if before_hold is distinct from after_hold then raise exception 'hold changed';end if;
 if exists(select 1 from olympiad_private.outreach_gmail_drafts where export_state='ready' and approved_hash is not null) then raise exception 'draft approved';end if;
end $$;
rollback;
