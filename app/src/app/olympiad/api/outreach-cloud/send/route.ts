import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {pilotConfiguration} from '../../../pilot/server';
import {workerAuthorized,workerKey,unseal} from '../../../cloud-outreach/secret';
import {mailbox,transport} from '../../../cloud-outreach/mailbox';
import {readGmailDraft,retireGmailDraft,draftCall} from '../../../cloud-outreach/drafts';
import {retryMailboxRead} from '../../../cloud-outreach/read-retry';
import {arizonaWeekend,gmailHex,sender} from '../../../cloud-outreach/model';
import {htmlBody,postalAddress,withFooter} from '../../../cloud-outreach/copy';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=180;
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){
 try{if(!workerAuthorized(request))return reply({error:'Unauthorized'},401);}catch{return reply({error:'Not configured'},503);}
 const cfg=pilotConfiguration();if(!cfg.configured)return reply({error:'Not configured'},503);
 const db=createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false}});
 const call=async(action:string,data:Record<string,unknown>={})=>{const r=await db.rpc('organizer_daily_worker',{p_key:workerKey(),p_action:action,p_data:data});if(r.error){console.error('OUTREACH_LEDGER',JSON.stringify({action,code:r.error.code}));throw Error('Daily ledger operation failed');}return r.data;};
 let aid:string|undefined,reviewId:string|undefined,client:ReturnType<typeof mailbox>|undefined,sending=false,stage='recovery';
 try{
  const recovery=await call('recover');
  if(!recovery.skip){
   const a=recovery.attempt;client=mailbox(unseal(recovery.credential));await client.connect();const folders=await client.list();const all=folders.find(f=>f.specialUse==='\\Sent');if(!all)throw Error('Sent Mail unavailable');const lock=await client.getMailboxLock(all.path,{readOnly:true});try{const found=await client.search({header:{'message-id':a.rfc_message_id}},{uid:true});if(!Array.isArray(found)||found.length!==1)return reply({held:true,reason:'Uncertain Gmail sender receipt needs review'});const meta=await client.fetchAll(found,{emailId:true,threadId:true,envelope:true},{uid:true});const m=meta[0];if(!m?.emailId||!m.threadId||!(m.envelope?.from||[]).some(x=>x.address?.toLowerCase()===sender)||!(m.envelope?.to||[]).some(x=>x.address?.toLowerCase()===a.email))throw Error('Receipt identity mismatch');await call('receipt',{id:a.id,message_id:gmailHex(m.emailId),thread_id:gmailHex(m.threadId)});return reply({reconciled:true});}finally{lock.release();}
  }
  if(arizonaWeekend())return reply({skipped:true,reason:'Weekend in Arizona. Sending resumes Monday.'});
  let address:string;try{address=postalAddress(process.env.OUTREACH_POSTAL_ADDRESS);}catch{console.error('OUTREACH: OUTREACH_POSTAL_ADDRESS is missing or invalid. Cloud sending is blocked until it is set in Vercel.');return reply({skipped:true,reason:'OUTREACH_POSTAL_ADDRESS not configured'});}
  stage='claim';const state=await call('claim');if(state.skip)return reply({skipped:true,reason:state.reason||'Outside sending window or daily limit'});
  const a=state.attempt;aid=a.id;reviewId=state.review?.id;
  if(!a.email||!a.subject||!a.body||/[\u2013\u2014]/.test(a.subject+a.body)||a.body.split(/\s+/).length>220){await call('stop',{id:aid,detail:'Message needs personal copy review'});return reply({held:true});}
  const text=withFooter(a.body,address);
  if(text.split(/\s+/).length>220||/[\u2013\u2014]/.test(a.subject+text)){await call('stop',{id:aid,detail:'Message needs personal copy review'});return reply({held:true});}
  stage='mailbox_connection';const pass=unseal(state.credential);client=mailbox(pass);await client.connect();const folders=await client.list();const all=folders.find(f=>f.specialUse==='\\All');if(!all)throw Error('Gmail All Mail unavailable');
  stage='reply_check';let reference:string|undefined;
  const lock=await client.getMailboxLock(all.path,{readOnly:true});try{
   // Read the actual conversation immediately before each send, not just a cached status.
   const found=await client.search({since:new Date(state.first_sent||'2026-10-13T00:00:00Z'),or:[{from:a.email},...(state.thread?[{threadId:BigInt('0x'+state.thread).toString()}]:[])]},{uid:true});
   if(Array.isArray(found)&&found.length){
    const meta=await client.fetchAll(found,{envelope:true,emailId:true,threadId:true,internalDate:true},{uid:true});
    const incoming=meta.find(m=>!(m.envelope?.from||[]).some(x=>x.address?.toLowerCase()===sender));
    if(incoming){await call('stop',{id:aid,detail:'Incoming mailbox response pauses follow-up'});return reply({held:true,reason:'Incoming response detected'});}
    reference=meta.sort((x,y)=>+new Date(y.internalDate||0)-+new Date(x.internalDate||0))[0]?.envelope?.messageId;
   }
  }finally{lock.release();}
  if(a.step==='followup'&&!reference){await call('stop',{id:aid,detail:'Original Gmail conversation could not be verified'});return reply({held:true});}
  stage='draft_read';const copy=await retryMailboxRead(()=>readGmailDraft(client!,state.review),async()=>{client?.close();client=mailbox(pass);await client.connect();});
  stage='draft_sync';await draftCall(db,'sync',{id:state.review.id,...copy});
  stage='approval_check';const permitted=await call('before_send',{id:aid,content_hash:copy.content_hash});
  if(!permitted.allowed){await call('cancel_review',{id:aid});return reply({held:true,reason:'Draft changed or chairman hold. Review again.'});}
  stage='smtp';sending=true;
  const sent=await transport(pass).sendMail({from:`Sean Caldwell <${sender}>`,to:a.email,subject:a.subject,text,html:htmlBody(text,address),messageId:a.rfc_message_id,...(a.step==='followup'&&reference?{inReplyTo:reference,references:reference}:{})});
  if(!sent.accepted?.some((v:unknown)=>String(v).toLowerCase()===a.email.toLowerCase()))throw Error('Sender receipt unavailable');
  // SMTP acceptance alone is not the tracker receipt. Resolve the exact generated Message-ID in Gmail.
  stage='sent_receipt';const sentFolder=folders.find(f=>f.specialUse==='\\Sent');if(!sentFolder)throw Error('Sent folder unavailable');
  const receiptLock=await client.getMailboxLock(sentFolder.path,{readOnly:true});try{
   const found=await client.search({header:{'message-id':a.rfc_message_id}},{uid:true});
   if(!Array.isArray(found)||found.length!==1)throw Error('Gmail sender receipt not yet available');
   const records=await client.fetchAll(found,{emailId:true,threadId:true,envelope:true},{uid:true});const m=records[0];
   if(!m?.emailId||!m.threadId||!(m.envelope?.from||[]).some(x=>x.address?.toLowerCase()===sender)||!(m.envelope?.to||[]).some(x=>x.address?.toLowerCase()===a.email))throw Error('Gmail sender identity mismatch');
   await call('receipt',{id:aid,message_id:gmailHex(m.emailId),thread_id:gmailHex(m.threadId)});
  }finally{receiptLock.release();}
  stage='retire_draft';await retireGmailDraft(client,state.review).catch(()=>{});
  return reply({sent:true,step:a.step});
 }catch(e){
  // Do not log provider text, credentials, or message contents. Keep the failing stage observable.
  const code=e&&typeof e==='object'&&'code' in e?String(e.code).replace(/[^A-Za-z0-9_-]/g,'').slice(0,50):'UNKNOWN';
  console.error('OUTREACH_SEND_HELD',JSON.stringify({stage,code,attempt_id:aid||null,smtp_started:sending}));
  if(aid)await call(sending?'uncertain':'cancel_review',{id:aid,detail:`Cloud check failed at ${stage}. No automatic retry.`}).catch(()=>{});
  if(reviewId&&!sending)await draftCall(db,'error',{id:reviewId,error:`Cloud check failed at ${stage}. Nothing sent. Refresh and review again.`}).catch(()=>{});
  return reply({error:sending?'Sender receipt needs review. Do not resend.':'Cloud check failed. Nothing sent.',stage},503);
 }finally{client?.close();}
}
