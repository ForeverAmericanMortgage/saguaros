-- Cancelled reservations never reached SMTP. Preserve them for audit while allowing
-- the same approved Gmail draft to reserve a fresh attempt. Sending, ambiguous,
-- reserved and sent attempts must continue to exclude every duplicate message ID.
begin;
create unique index outreach_active_rfc_message_once
 on olympiad_private.outreach_send_attempts(rfc_message_id)
 where state <> 'cancelled';
alter table olympiad_private.outreach_send_attempts
 drop constraint outreach_send_attempts_rfc_message_id_key;
commit;
