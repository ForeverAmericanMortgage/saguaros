# Olympiad outreach sender runbook

One page for pausing, resuming, checking the schedule and reading the daily recap.
Everything below happens in the chairman portal (https://chairman.scottsdaleolympiad.com/#prospect-tracker, Outreach view) unless it says SQL.

## What stops sending on its own

| Stop | What triggers it | How it clears |
| --- | --- | --- |
| Safety pause | Rolling 24 hour bounce rate above 3% with at least 20 sends, any spam complaint from a recipient, or any abuse notice in the mailbox | Manual only: **Resume sending** under Sender safety |
| Monitor stale | Mailbox not checked for more than 10 minutes | Clears by itself after the next clean mailbox check |
| Monitor or sender error | `last_error` set (mailbox access failed, uncertain send receipt, notification uncertain) | Clears after the next clean check or after the receipt is reconciled |
| Outside policy | Weekends, outside 08:00 to 18:30 Arizona, daily caps reached, unapproved drafts | Normal schedule |

While a safety pause is on, replies, bounces and opt-outs are still recorded. Only sending stops.
The bounce check runs each time a new bounce is recorded, so after you resume it only pauses again on a new bounce, complaint or abuse notice.

## Alerts

During 08:00 to 18:30 Arizona time, scaldwell@saguaros.com gets **"Olympiad sender stopped: &lt;reason&gt;"** when the mailbox check is more than 10 minutes stale or any sender error or safety pause is set. At most one per hour. No alert while you have manually paused the cloud monitor or when no mailbox is connected. Alerts go out through the same Gmail connection, so if the app password itself stopped working the alert may not arrive: the portal still shows the error.

## Pause

1. **Stop sending only (recommended):** Review outreach drafts area, select **Pause cloud sending**. Reply tracking continues.
2. **Stop everything:** Cloud reply monitor, select **Pause cloud monitor**. This also stops reply tracking and alerts, so use it only for mailbox problems.

## Resume

1. Find the cause. Safety pause: open Sender safety for the reason, then check the tracker's Responded teams and the bounced or opted out companies. Monitor problem: Cloud reply monitor, **Check monitor status**.
2. Fix it: remove bad addresses or hold the source list; reconnect the monitor with a new Google app password if access failed.
3. Resume the matching stop:
   - Safety pause: tick the confirmation under Sender safety, then **Resume sending**.
   - Manual send pause: **Enable daily cloud sending**.
   - Monitor pause: **Connect cloud monitor** with the app password.
4. Confirm the Sender safety line shows "active" and the monitor shows a recent check.

Resume never happens by itself after a safety pause.

## Cron (Supabase `cron` schema)

Check the live schedule: `select jobid, jobname, schedule, active from cron.job order by jobid;`
All schedules are UTC. Arizona is UTC minus 7 all year.

| Job | Schedule (UTC) | Arizona | Calls |
| --- | --- | --- | --- |
| 2 (set in `20261022150855_outreach_extended_send_window.sql`) | `* 0-1,15-23 * * *` | every minute, 08:00 to 18:59 | cloud sender `/olympiad/api/outreach-cloud/send` (sends only 08:00 to 18:30 weekdays, at least 5 minutes apart) |
| `olympiad-apollo-held-drafts` | `*/2 13-23 * * 1-5` | every 2 minutes, 06:00 to 16:59 weekdays | research `/olympiad/api/outreach-cloud/research` |
| Reply monitor | confirm in `cron.job` | every few minutes | `/olympiad/api/outreach-cloud/run` (replies, bounces, complaints, recap and alerts) |

Never paste the worker key or app password into chat, a ticket or this file. To pause a job from SQL: `select cron.alter_job(<jobid>, active := false);` and `active := true` to restore.

## Daily recap

- Sent by the reply monitor to scaldwell@saguaros.com after 18:45 Arizona: "Olympiad outreach daily recap: &lt;date&gt;".
- Shows new introductions and follow ups sent, replies (including declines, bounces and automatic replies), follow ups due, unresolved send receipts, and any monitor or sender error, including "Sending paused: &lt;reason&gt;".
- No recap by 19:15: check the monitor status in the portal. A recap marked uncertain means check Sent mail before asking for another.
