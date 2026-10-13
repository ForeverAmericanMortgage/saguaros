import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {workerKey,unseal} from './secret';
import {transport} from './mailbox';
import {sender} from './model';
export type Notice={kind:'review'|'recap';day:string;message_id:string;enabled:boolean;review_pending:boolean;monitor_error:string;monitor_checked_at:string|null;send_error:string;new_sent:number;followups_sent:number;contacted:number;ready:number;due:number;uncertain:number;replies:{company:string;name:string;kind:string;body:string;thread:string}[];drafts:{company:string;name:string;subject:string;body:string}[]};
export function notificationCopy(n:Notice){
 const tracker='https://chairman.scottsdaleolympiad.com/#prospect-tracker';
 const replies=n.replies.map(r=>`${r.company} / ${r.name}: ${r.kind}\n${r.body}\nhttps://mail.google.com/mail/u/?authuser=scaldwell%40saguaros.com#all/${r.thread}`).join('\n\n');
 const status=`${n.new_sent} new introductions sent; ${n.followups_sent} follow-ups sent.\n${n.contacted} companies contacted overall; ${n.ready} qualified drafts queued.\n${n.replies.length} inbound messages today, including automatic replies and delivery failures.\n${n.due} follow-ups due by tomorrow; ${n.uncertain} unresolved send receipts.\nSending: ${n.review_pending?'held for first-batch review':n.enabled?'enabled':'paused'}.\nLast reply check: ${n.monitor_checked_at||'not yet recorded'}.\n${n.monitor_error?`Monitor needs attention: ${n.monitor_error}\n`:''}${n.send_error?`Sender needs attention: ${n.send_error}\n`:''}`;
 if(n.kind==='review')return {subject:`Review before sending: Olympiad ${n.day}`,text:`Sean,\n\nHere are the ${n.drafts.length} currently queued messages. This is a preview, not a sent receipt. New outreach is held until you review and click "Release reviewed first batch" under Daily cloud outreach in the chairman portal. Reply tracking and research continue. The weekday cap remains 20 new companies plus due follow-ups.\n\n${n.drafts.map(d=>`${d.company} / ${d.name}\nSubject: ${d.subject}\n\n${d.body}`).join('\n\n--------------------------------\n\n')}\n\n${status}\nChairman tracker: ${tracker}`};
 return {subject:`Olympiad outreach daily recap: ${n.day}`,text:`Sean,\n\n${status}\n${n.new_sent===0?'No new introductions were sent today. Check the queue, review hold and provider supply before assuming the 20-company cap was filled.\n':''}\n${replies||'No inbound replies recorded today.'}\n\nGauge the smoke test by relevant conversations, requests for an overview, calls and eventual team registrations. An automatic reply or email open is not a conversion.\n\nChairman tracker: ${tracker}`};
}
export async function deliverNotification(db:SupabaseClient){
 const call=async(action:string,data:Record<string,unknown>={})=>{const r=await db.rpc('organizer_notification_worker',{p_key:workerKey(),p_action:action,p_data:data});if(r.error)throw Error('Notification ledger unavailable');return r.data;};
 const state=await call('claim');if(state.skip)return;
 const n=state as Notice&{credential:string};
 try{const copy=notificationCopy(n);const receipt=await transport(unseal(n.credential)).sendMail({from:`Sean Caldwell <${sender}>`,to:sender,messageId:n.message_id,...copy});if(!receipt.accepted?.some((a:unknown)=>String(a).toLowerCase()===sender))throw Error('No accepted notification recipient');await call('complete',{kind:n.kind,day:n.day,state:'sent',detail:'SMTP accepted the notification for Sean. Message ID: '+n.message_id});}
 catch{await call('complete',{kind:n.kind,day:n.day,state:'uncertain',detail:'Notification delivery uncertain. Check Sean Sent mail for the stored message ID before retrying.'}).catch(()=>{});throw Error('Notification needs review');}
}
