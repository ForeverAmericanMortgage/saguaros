import 'server-only';
import {refreshUsage} from './usage';
import {usageCopy,type UsageReport} from './usage-model';
import type {SupabaseClient} from '@supabase/supabase-js';
import {workerKey,unseal} from './secret';
import {mailbox,transport} from './mailbox';
import {sender,gmailHex} from './model';
export type SentConfirmation={company:string;name:string;email:string;message_id:string;thread_id:string;sent_at:string};
export type Notice={usage?:UsageReport;kind:'review'|'recap'|'send_confirmation';confirmations?:SentConfirmation[];day:string;message_id:string;enabled:boolean;review_pending:boolean;monitor_error:string;monitor_checked_at:string|null;send_error:string;new_sent:number;followups_sent:number;contacted:number;ready:number;gmail_ready?:number;research_reserved?:number;new_qualified?:number;carryover_ready?:number;draft_errors?:number;due:number;uncertain:number;replies:{company:string;name:string;kind:string;body:string;thread:string}[];drafts:{company:string;name:string;subject:string;body:string}[]};
export function notificationCopy(n:Notice){
 const tracker='https://chairman.scottsdaleolympiad.com/#prospect-tracker';
 if(n.kind==='send_confirmation')return {subject:'Olympiad: both approved emails are sent and in the tracker',text:`Sean,\n\nBoth approved introductions are confirmed in Gmail Sent and recorded in the chairman tracker:\n\n${(n.confirmations||[]).map(x=>`${x.company} / ${x.name}\nSent ${new Date(x.sent_at).toLocaleString('en-US',{timeZone:'America/Phoenix'})} Arizona time\nhttps://mail.google.com/mail/u/?authuser=scaldwell%40saguaros.com#all/${x.thread_id}`).join('\n\n')}\n\nThis confirms sending, not inbox delivery or a reply. Tomorrow's new drafts still require their own approval in the chairman portal.\n\nChairman tracker: ${tracker}`};
 const replies=n.replies.map(r=>`${r.company} / ${r.name}: ${r.kind}\n${r.body}\nhttps://mail.google.com/mail/u/?authuser=scaldwell%40saguaros.com#all/${r.thread}`).join('\n\n');
 const status=`${n.new_sent} new introductions sent; ${n.followups_sent} follow-ups sent.\n${n.contacted} companies contacted overall; ${n.ready} qualified drafts queued.\n${n.replies.length} inbound messages today, including automatic replies and delivery failures.\n${n.due} follow-ups due by tomorrow; ${n.uncertain} unresolved send receipts.\nSending: ${n.review_pending?'held for portal approval':n.enabled?'enabled':'paused'}.\nLast reply check: ${n.monitor_checked_at||'not yet recorded'}.\n${n.monitor_error?`Monitor needs attention: ${n.monitor_error}\n`:''}${n.send_error?`Sender needs attention: ${n.send_error}\n`:''}`;
 if(n.kind==='review'){
  const ready=n.gmail_ready??0;
  const readiness=n.day==='2026-10-15';
  return {subject:readiness?`Olympiad drafts: ${ready}/20 ready for review`: `Review before sending: Olympiad ${n.day}`,text:`Sean,\n\n${readiness?(ready>=20?'Your target of 20 Gmail drafts is ready for review.':'The 5 p.m. check is complete. The batch is below the 20-draft target; review the available drafts and any research or export blockers.'):'Your queued outreach drafts are ready to review.'}\n\n${ready} introductions confirmed in Gmail Drafts within the last 15 minutes.\n${n.new_qualified??'Unavailable'} new qualified contacts added today; ${n.carryover_ready??'unavailable'} carryover contacts still queued.\n${n.research_reserved??'Unavailable'} company research reservations today (not a count of completed paid lookups).\n${n.ready} qualified contacts in the queue; ${n.draft_errors??0} Gmail draft export errors.\n\n${usageCopy(n.usage,n.day,n.new_qualified)}\n\nAll unapproved emails remain held. Read or edit in Gmail Drafts, select Refresh from Gmail under Review outreach drafts in the chairman portal, then approve the displayed batch when ready. Edits after approval require approval again.\n\nGmail Drafts: https://mail.google.com/mail/u/?authuser=scaldwell%40saguaros.com#drafts\nChairman portal: ${tracker}\n\nCompanies awaiting review:\n${n.drafts.map(d=>`${d.company} / ${d.name}`).join('\n')||'None currently queued.'}\n\n${n.monitor_error?`Reply monitor needs attention: ${n.monitor_error}\n`:''}${n.send_error?`Cloud sender needs attention: ${n.send_error}\n`:''}`};
 }
 return {subject:`Olympiad outreach daily recap: ${n.day}`,text:`Sean,\n\n${status}\n${usageCopy(n.usage,n.day,n.new_qualified)}\n\n${n.new_sent===0?'No new introductions were sent today. Check the queue, review hold and provider supply before assuming the 20-company cap was filled.\n':''}\n${replies||'No inbound replies recorded today.'}\n\nGauge the smoke test by relevant conversations, requests for an overview, calls and eventual team registrations. An automatic reply or email open is not a conversion.\n\nChairman tracker: ${tracker}`};
}
export async function verifyConfirmationSent(client:ReturnType<typeof mailbox>,items:SentConfirmation[]){
 if(items.length!==2||new Set(items.map(x=>x.message_id)).size!==2)throw Error('Two distinct sent receipts required');
 const folder=(await client.list()).find(f=>f.specialUse==='\\Sent');if(!folder)throw Error('Gmail Sent folder unavailable');
 const lock=await client.getMailboxLock(folder.path,{readOnly:true});
 try{for(const item of items){
  if(!/^[a-f0-9]{1,40}$/.test(item.thread_id)||!/^[a-f0-9]{1,40}$/.test(item.message_id))throw Error('Invalid receipt');
  const found=await client.search({threadId:BigInt('0x'+item.thread_id).toString()},{uid:true});
  if(!Array.isArray(found)||!found.length||found.length>50)throw Error('Sent receipt unavailable');
  const rows=await client.fetchAll(found,{emailId:true,envelope:true},{uid:true});
  if(!rows.some(m=>m.emailId&&gmailHex(m.emailId)===item.message_id&&m.envelope?.from?.some(a=>a.address?.toLowerCase()===sender)&&m.envelope?.to?.some(a=>a.address?.toLowerCase()===item.email.toLowerCase())))throw Error('Exact Gmail sent receipt not confirmed');
 }}finally{lock.release();}
}
export async function deliverNotification(db:SupabaseClient){
 const call=async(action:string,data:Record<string,unknown>={})=>{const r=await db.rpc('organizer_notification_worker',{p_key:workerKey(),p_action:action,p_data:data});if(r.error)throw Error('Notification ledger unavailable');return r.data;};
 const state=await call('claim');if(state.skip)return;
 const n=state as Notice&{credential:string};
 if(n.kind!=='send_confirmation')n.usage=await refreshUsage(db,true).catch(()=>undefined);
 let smtpStarted=false;
 try{
  if(n.kind==='send_confirmation'){
   const client=mailbox(unseal(n.credential));try{await client.connect();await verifyConfirmationSent(client,n.confirmations||[]);}finally{client.close();}
  }
  const copy=notificationCopy(n);smtpStarted=true;const receipt=await transport(unseal(n.credential)).sendMail({from:`Sean Caldwell <${sender}>`,to:sender,messageId:n.message_id,...copy});if(!receipt.accepted?.some((a:unknown)=>String(a).toLowerCase()===sender))throw Error('No accepted notification recipient');await call('complete',{kind:n.kind,day:n.day,state:'sent',detail:'SMTP accepted the notification for Sean. Message ID: '+n.message_id});}
 catch{await call('complete',{kind:n.kind,day:n.day,state:n.kind==='send_confirmation'&&!smtpStarted?'waiting':'uncertain',detail:!smtpStarted?'Waiting for exact Gmail Sent verification; no confirmation email attempted.':'Notification delivery uncertain. Check Sean Sent mail for the stored message ID before retrying.'}).catch(()=>{});throw Error('Notification needs review');}
}
