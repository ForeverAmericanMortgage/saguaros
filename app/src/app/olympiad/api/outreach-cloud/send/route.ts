import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {pilotConfiguration} from '../../../pilot/server';
import {workerAuthorized,workerKey,unseal} from '../../../cloud-outreach/secret';
import {mailbox,transport} from '../../../cloud-outreach/mailbox';
import {gmailHex,sender} from '../../../cloud-outreach/model';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=180;
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){
 try{if(!workerAuthorized(request))return reply({error:'Unauthorized'},401);}catch{return reply({error:'Not configured'},503);}
 const cfg=pilotConfiguration();if(!cfg.configured)return reply({error:'Not configured'},503);
 const db=createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false}});
 const call=async(action:string,data:Record<string,unknown>={})=>{const r=await db.rpc('organizer_daily_worker',{p_key:workerKey(),p_action:action,p_data:data});if(r.error)throw Error('Daily ledger operation failed');return r.data;};
 let aid:string|undefined,client:ReturnType<typeof mailbox>|undefined,sending=false;
 try{
  const recovery=await call('recover');
  if(!recovery.skip){
   const a=recovery.attempt;client=mailbox(unseal(recovery.credential));await client.connect();const folders=await client.list();const all=folders.find(f=>f.specialUse==='\\All');if(!all)throw Error('All Mail unavailable');const lock=await client.getMailboxLock(all.path,{readOnly:true});try{const found=await client.search({header:{'message-id':a.rfc_message_id}},{uid:true});if(!Array.isArray(found)||found.length!==1)return reply({held:true,reason:'Uncertain Gmail sender receipt needs review'});const meta=await client.fetchAll(found,{emailId:true,threadId:true,envelope:true},{uid:true});const m=meta[0];if(!m?.emailId||!m.threadId||!(m.envelope?.from||[]).some(x=>x.address?.toLowerCase()===sender)||!(m.envelope?.to||[]).some(x=>x.address?.toLowerCase()===a.email))throw Error('Receipt identity mismatch');await call('receipt',{id:a.id,message_id:gmailHex(m.emailId),thread_id:gmailHex(m.threadId)});return reply({reconciled:true});}finally{lock.release();}
  }
  const state=await call('claim');if(state.skip)return reply({skipped:true,reason:state.reason||'Outside sending window or daily limit'});
  const a=state.attempt;aid=a.id;
  if(!a.email||!a.subject||!a.body||/[\u2013\u2014]/.test(a.subject+a.body)||a.body.split(/\s+/).length>180){await call('stop',{id:aid,detail:'Message needs personal copy review'});return reply({held:true});}
  const pass=unseal(state.credential);client=mailbox(pass);await client.connect();const folders=await client.list();const all=folders.find(f=>f.specialUse==='\\All');if(!all)throw Error('Gmail All Mail unavailable');
  let reference:string|undefined;
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
  const permitted=await call('before_send',{id:aid});if(!permitted.allowed)return reply({held:true,reason:'Chairman suppression'});
  sending=true;
  const sent=await transport(pass).sendMail({from:`Sean Caldwell <${sender}>`,to:a.email,subject:a.subject,text:a.body,messageId:a.rfc_message_id,...(a.step==='followup'&&reference?{inReplyTo:reference,references:reference}:{})});
  if(!sent.accepted?.some((v:unknown)=>String(v).toLowerCase()===a.email.toLowerCase()))throw Error('Sender receipt unavailable');
  // SMTP acceptance alone is not the tracker receipt. Resolve the exact generated Message-ID in Gmail.
  const receiptLock=await client.getMailboxLock(all.path,{readOnly:true});try{
   const found=await client.search({header:{'message-id':a.rfc_message_id}},{uid:true});
   if(!Array.isArray(found)||found.length!==1)throw Error('Gmail sender receipt not yet available');
   const records=await client.fetchAll(found,{emailId:true,threadId:true,envelope:true},{uid:true});const m=records[0];
   if(!m?.emailId||!m.threadId||!(m.envelope?.from||[]).some(x=>x.address?.toLowerCase()===sender)||!(m.envelope?.to||[]).some(x=>x.address?.toLowerCase()===a.email))throw Error('Gmail sender identity mismatch');
   await call('receipt',{id:aid,message_id:gmailHex(m.emailId),thread_id:gmailHex(m.threadId)});
  }finally{receiptLock.release();}
  return reply({sent:true,step:a.step});
 }catch{if(aid)await call(sending?'uncertain':'stop',{id:aid,detail:'Mailbox preflight failed; no automatic retry'}).catch(()=>{});return reply({error:'Cloud send held. Review daily outreach status.'},503);}finally{client?.close();}
}
