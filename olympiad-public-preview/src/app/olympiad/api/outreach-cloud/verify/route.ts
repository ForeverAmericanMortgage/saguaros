import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {pilotConfiguration} from '../../../pilot/server';
import {workerAuthorized,unseal} from '../../../cloud-outreach/secret';
import {mailbox} from '../../../cloud-outreach/mailbox';
import {draftCall,readGmailDraft} from '../../../cloud-outreach/drafts';
import {retryMailboxRead} from '../../../cloud-outreach/read-retry';
import type {ReviewDraft} from '../../../cloud-outreach/draft-model';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=180;
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
// Read-only acceptance check: no claims, approvals, sync, SMTP, research, or draft writes.
export async function GET(request:Request){
 try{if(!workerAuthorized(request))return reply({error:'Unauthorized'},401);}catch{return reply({error:'Not configured'},503);}
 const cfg=pilotConfiguration();if(!cfg.configured)return reply({error:'Not configured'},503);
 const db=createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false}});
 let client:ReturnType<typeof mailbox>|undefined;
 try{
  const state=await draftCall(db,'list');if(state.skip)return reply({held:true,reason:'Mailbox unavailable'},503);
  const pass=unseal(state.credential);client=mailbox(pass);await client.connect();
  const drafts=(state.drafts as ReviewDraft[]).filter(d=>d.gmail_thread_id).slice(0,20);
  const results=[];
  for(const d of drafts){
   try{const copy=await retryMailboxRead(()=>readGmailDraft(client!,d),async()=>{client?.close();client=mailbox(pass);await client.connect();});results.push({id:d.id,company:d.company,verified:copy.content_hash===d.content_hash&&copy.rfc_message_id===d.rfc_message_id,approved:!!d.approved_hash&&d.approved_hash===copy.content_hash});}
   catch{results.push({id:d.id,company:d.company,verified:false,approved:false});}
  }
  return reply({read_only:true,checked:results.length,results});
 }catch{return reply({read_only:true,error:'Mailbox verification unavailable'},503);}finally{client?.close();}
}
