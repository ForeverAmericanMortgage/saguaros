begin;
do $$ declare k text;r jsonb;begin
 select decrypted_secret into k from vault.decrypted_secrets where name='olympiad_cloud_reply_worker';
 begin perform public.organizer_notification_worker(null,'claim');raise exception 'Null worker key accepted';exception when insufficient_privilege then null;end;
 begin perform public.organizer_notification_worker(repeat('x',40),'claim');raise exception 'Wrong worker key accepted';exception when insufficient_privilege then null;end;
 update olympiad_private.outreach_daily_config set enabled=true,review_required=true,review_released=false,review_on=(now() at time zone 'America/Phoenix')::date,start_on=(now() at time zone 'America/Phoenix')::date;
 update olympiad_private.outreach_cloud_mailbox set last_polled_at=now(),last_error='',lock_until=null;
 r=public.organizer_daily_worker(k,'claim');if not (r->>'skip')::boolean then raise exception 'Review gate did not block sending';end if;
 r=public.organizer_notification_worker(k,'claim');if r->>'kind'<>'review' or jsonb_array_length(r->'drafts')<>2 then raise exception 'Actual review payload incorrect';end if;
 if not exists(select 1 from olympiad_private.outreach_notifications where kind='review' and cardinality(candidate_ids)=2) then raise exception 'Review snapshot identifiers missing';end if;
 r=public.organizer_notification_worker(k,'claim');if not (r->>'skip')::boolean then raise exception 'Duplicate notification claim';end if;
 perform public.organizer_notification_worker(k,'complete',jsonb_build_object('kind','review','day',(now() at time zone 'America/Phoenix')::date,'state','sent'));
 if has_table_privilege('anon','olympiad_private.outreach_notifications','SELECT') or has_table_privilege('authenticated','olympiad_private.outreach_notifications','SELECT') then raise exception 'Private notification data exposed';end if;
end $$;
rollback;
