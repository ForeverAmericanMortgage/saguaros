import 'server-only';
import nodemailer from 'nodemailer';
import {simpleParser} from 'mailparser';
import type {SupabaseClient} from '@supabase/supabase-js';
import {mailbox} from './mailbox';
import {workerKey,unseal} from './secret';
import {sender,gmailHex} from './model';
import {reviewedCopy,type ReviewDraft} from './draft-model';
type Mailbox=ReturnType<typeof mailbox>;
export async function draftCall(db:SupabaseClient,action:string,data:Record<string,unknown>={}){const r=await db.rpc('organizer_draft_worker',{p_key:workerKey(),p_action:action,p_data:data});if(r.error)throw Error('Draft review is unavailable');return r.data;}
export async function readGmailDraft(client:Mailbox,draft:ReviewDraft){
 const folders=await client.list(),folder=folders.find(f=>f.specialUse==='\\Drafts');if(!folder)throw Error('Gmail Drafts folder unavailable.');
 const lock=await client.getMailboxLock(folder.path,{readOnly:true});
 try{
  const found=await client.search(draft.gmail_thread_id?{threadId:BigInt('0x'+draft.gmail_thread_id).toString()}:{header:{'message-id':draft.rfc_message_id}},{uid:true});
  if(!Array.isArray(found)||found.length!==1)throw Error('Draft missing or duplicated. Nothing will send.');
  const raw=await client.fetchOne(found[0],{source:{maxLength:100000},emailId:true,threadId:true},{uid:true});if(!raw||!raw.source||!raw.threadId)throw Error('Draft could not be read.');
  const p=await simpleParser(raw.source,{skipHtmlToText:false,skipTextToHtml:true});
  const addresses=(v:typeof p.to)=>v?(Array.isArray(v)?v:[v]).flatMap(x=>x.value.map(a=>a.address?.toLowerCase())):[];
  const to=addresses(p.to),from=addresses(p.from);
  if(to.length!==1||to[0]!==draft.email.toLowerCase()||from.length!==1||from[0]!==sender||addresses(p.cc).length||addresses(p.bcc).length||p.attachments.length)throw Error('Keep the original recipient, no CC/BCC and no attachments.');
  if(!p.messageId||/[\r\n]/.test(p.messageId))throw Error('Draft message identity unavailable.');
  return {...reviewedCopy(draft.email,p.subject||'',p.text||''),gmail_thread_id:gmailHex(raw.threadId),rfc_message_id:p.messageId,uid:found[0],folder:folder.path};
 }finally{lock.release();}
}
export async function appendGmailDraft(client:Mailbox,draft:ReviewDraft){
 const folders=await client.list(),folder=folders.find(f=>f.specialUse==='\\Drafts');if(!folder)throw Error('Gmail Drafts folder unavailable.');
 // Build MIME locally. A stream transport never connects to SMTP or sends mail.
 const built=await nodemailer.createTransport({streamTransport:true,buffer:true}).sendMail({from:`Sean Caldwell <${sender}>`,to:draft.email,subject:draft.subject,text:draft.body,messageId:draft.rfc_message_id,headers:{'X-Olympiad-Review-Id':draft.id},disableFileAccess:true,disableUrlAccess:true});
 const result=await client.append(folder.path,built.message as Buffer,['\\Draft']);if(!result)throw Error('Draft creation outcome needs review.');
 return readGmailDraft(client,draft);
}
export async function syncGmailDrafts(db:SupabaseClient,createLimit=0){
 const state=await draftCall(db,'list');if(state.skip)return {synced:0,created:0};
 const client=mailbox(unseal(state.credential));let synced=0,created=0;
 try{await client.connect();
  for(const d of state.drafts as ReviewDraft[]){
   if(!d.gmail_thread_id&&d.export_state==='pending')continue;
   try{const copy=await readGmailDraft(client,d);await draftCall(db,'sync',{id:d.id,...copy});synced++;}
   catch(e){await draftCall(db,'error',{id:d.id,error:e instanceof Error?e.message:'Draft needs review'});}
  }
  for(let i=0;i<createLimit;i++){
   const claimed=await draftCall(db,'claim');if(claimed.skip)break;const d=claimed.draft as ReviewDraft;
   try{
    // A previous uncertain append is never automatically repeated.
    const copy=d.export_attempts===1?await appendGmailDraft(client,d):await readGmailDraft(client,d);
    await draftCall(db,'sync',{id:d.id,...copy});created++;
   }catch(e){await draftCall(db,'error',{id:d.id,error:e instanceof Error?e.message:'Draft creation needs review'});}
  }
 }finally{client.close();}
 return {synced,created};
}
export async function retireGmailDraft(client:Mailbox,draft:ReviewDraft){
 const folder=(await client.list()).find(f=>f.specialUse==='\\Trash');if(!folder)return;
 // Only move the exact approved draft, after its sent receipt was persisted.
 const copy=await readGmailDraft(client,draft).catch(()=>null);if(!copy||copy.content_hash!==draft.approved_hash)return;
 const lock=await client.getMailboxLock(copy.folder);try{await client.messageMove(copy.uid,folder.path,{uid:true});}finally{lock.release();}
}
