import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {simpleParser} from 'mailparser';
import {pilotConfiguration} from '../../../pilot/server';
import {workerAuthorized,workerKey,unseal} from '../../../cloud-outreach/secret';
import {mailbox,transport} from '../../../cloud-outreach/mailbox';
import {classifyReply,gmailHex,replyText,sender} from '../../../cloud-outreach/model';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=180;
type Prospect={id:string;company:string;email:string;thread:string|null;first_sent:string};
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){
 try{if(!workerAuthorized(request))return reply({error:'Unauthorized'},401);}catch{return reply({error:'Worker not configured'},503);}
 const cfg=pilotConfiguration();if(!cfg.configured)return reply({error:'Worker not configured'},503);
 const db=createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false}});
 const call=async(action:string,data:Record<string,unknown>={})=>{const r=await db.rpc('organizer_cloud_worker',{p_key:workerKey(),p_action:action,p_data:data});if(r.error)throw Error('Cloud ledger operation failed');return r.data;};
 let claimed=false,notificationStarted=false,client:ReturnType<typeof mailbox>|undefined;
 try{
  const state=await call('claim');if(state.skip)return reply({skipped:true});claimed=true;
  const pass=unseal(state.credential);const prospects:Prospect[]=state.prospects;const seen=new Set<string>(state.seen);const since=new Date(state.since);const checked=new Date().toISOString();
  client=mailbox(pass);await client.connect();const folders=await client.list();const paths=[...new Set(folders.filter(f=>f.specialUse==='\\All'||f.specialUse==='\\Junk').map(f=>f.path))];
  if(!paths.length)throw Error('Required Gmail mailbox folders not found');
  const alerts:string[]=[];let inserted=0;let complete=true;
  for(const path of paths){const lock=await client.getMailboxLock(path,{readOnly:true});try{
   for(let i=0;i<prospects.length;i+=20){
    const group=prospects.slice(i,i+20);const or=group.flatMap(p=>[{from:p.email},...(p.thread&&/^[a-f0-9]+$/.test(p.thread)?[{threadId:BigInt('0x'+p.thread).toString()}]:[])]);
    if(!or.length)continue;
    const found=await client.search({since,or},{uid:true});const ids=Array.isArray(found)?found:[];
    if(ids.length>200){complete=false;throw Error('Mailbox backlog needs review');}
    if(!ids.length)continue;
    const metadata=await client.fetchAll(ids,{uid:true,envelope:true,internalDate:true,emailId:true,threadId:true},{uid:true});
    for(const m of metadata){
     if(!m.emailId||!m.threadId)continue;
     const mid=gmailHex(m.emailId),tid=gmailHex(m.threadId);if(seen.has(mid))continue;
     const from=m.envelope?.from?.map(a=>a.address?.toLowerCase()).filter(Boolean)||[];
     const outbound=from.includes(sender);
     const p=prospects.find(p=>p.thread===tid)||(!outbound?prospects.find(p=>from.includes(p.email.toLowerCase())):undefined);if(!p)continue;
     const body=await client.fetchOne(m.uid,{source:{maxLength:100000}},{uid:true});if(!body||!body.source)throw Error('Unable to read a matched reply');
     const parsed=await simpleParser(body.source,{skipHtmlToText:true,skipTextToHtml:true});
     const text=replyText(parsed.text||String(parsed.html||'').replace(/<[^>]*>/g,' '));const subject=parsed.subject||'';const auto=String(parsed.headers.get('auto-submitted')||'no')!=='no';
     const kind=classifyReply(subject,text,auto);const occurred=new Date(m.internalDate||parsed.date||Date.now()).toISOString();
     const result=await call('message',{message_id:mid,thread_id:tid,prospect_id:p.id,outbound,kind,occurred_at:occurred,subject,body:text});seen.add(mid);
     if(result.inserted)inserted++;if(result.alert)alerts.push(`${p.company}\n${text.slice(0,1000)}\nhttps://mail.google.com/mail/u/?authuser=scaldwell%40saguaros.com#all/${tid}`);
    }
   }
  }finally{lock.release();}}
  if(alerts.length){notificationStarted=true;await transport(pass).sendMail({from:`Sean Caldwell <${sender}>`,to:sender,subject:`Olympiad outreach: ${alerts.length} new interested repl${alerts.length===1?'y':'ies'}`,text:alerts.join('\n\n')+'\n\nChairman tracker: https://chairman.scottsdaleolympiad.com/#prospect-tracker'});}
  await call('complete',complete?{checked_at:checked}:{error:'Mailbox backlog needs review'});return reply({checked:true,recorded:inserted,interest_alerts:alerts.length});
 }catch{
  if(claimed)await call('complete',{error:notificationStarted?'Notification delivery uncertain. Review new interested replies in the tracker before resending an alert.':'Cloud reply check failed. Verify mailbox access and retry.'}).catch(()=>{});
  return reply({error:'Cloud reply check failed. Review the chairman monitor status.'},503);
 }finally{client?.close();}
}
