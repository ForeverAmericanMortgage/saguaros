import 'server-only';
import nodemailer from 'nodemailer';
import {simpleParser} from 'mailparser';
import type {SupabaseClient} from '@supabase/supabase-js';
import {mailbox} from './mailbox';
import {workerKey,unseal} from './secret';
import {sender} from './model';
export function interestCopy(name:string,company:string,reply:string){
 const first=name.trim().split(/\s+/)[0]||'there';
 const overview=/overview|details|information|how.*work/i.test(reply);
 return `${first},\n\nReally appreciate the interest in Olympiad. ${overview?"It's a spring field day bringing Valley businesses together for local children's charities. Teams get a day together outside the office while supporting the community.\n\n":''}I'd love to learn more about your team at ${company}, share a little about what we do in the community and the event itself, and see if it might be a good fit this year. It's always a great time.\n\nMy schedule is flexible. Would a quick phone call or Google Meet be convenient? What day and time works best for you?\n\nSean Caldwell\nOlympiad Chairman | The Saguaros\n602-388-0896`;
}
export async function prepareInterestedReply(db:SupabaseClient){
 const call=async(action:string,data:Record<string,unknown>={})=>{const r=await db.rpc('organizer_interest_worker',{p_key:workerKey(),p_action:action,p_data:data});if(r.error)throw Error('Interest preparation unavailable');return r.data;};
 const s=await call('claim');if(s.skip)return {skipped:true};
 const p=s.prospect,x=s.reply,thread=p.gmail_thread_id;
 const link=thread&&/^[a-f0-9]+$/.test(thread)?`https://mail.google.com/mail/u/?authuser=scaldwell%40saguaros.com#all/${thread}`:'';
 const reviewDay=new Date(Date.now()+86400000).toLocaleDateString('en-CA',{timeZone:'America/Phoenix'});
 const brief=`COMPANY BRIEF\n${p.company_name}\nContact: ${p.contact_name}, ${p.contact_title||'role not recorded'}.\nWork email: ${p.contact_email}\nSaved fit (verify on call): ${p.fit_reason||'Not recorded; ask about their local team.'}\nSource: ${p.evidence_url||'Existing outreach record and reply'}\nInterest: ${String(x.body).slice(0,600)}\n\nNEXT STEP\nSean to review the Gmail response and arrange a short call. Review by ${reviewDay}. No call is booked. Automatic cold follow-ups stay paused.\nAsk: local team size, participation goals, fundraising questions and who else should join the conversation.\n${link}`;
 const client=mailbox(unseal(s.credential));let drafted=false;
 try{
  if(!link)throw Error('Conversation identity missing');
  await client.connect();const folders=await client.list();const drafts=folders.find(f=>f.specialUse==='\\Drafts'),all=folders.find(f=>f.specialUse==='\\All');if(!drafts||!all)throw Error('Folders unavailable');
  let lock=await client.getMailboxLock(drafts.path,{readOnly:true});
  try{const existing=await client.search({threadId:BigInt('0x'+thread).toString()},{uid:true});if(Array.isArray(existing)&&existing.length){drafted=true;return await finish('Existing Gmail draft preserved for review.');}}finally{lock.release();}
  let parent:string|undefined;
  lock=await client.getMailboxLock(all.path,{readOnly:true});try{
   const ids=await client.search({emailId:BigInt('0x'+x.provider_message_id).toString()},{uid:true});
   if(!Array.isArray(ids)||ids.length!==1)throw Error('Reply identity missing');
   const raw=await client.fetchOne(ids[0],{source:{maxLength:100000}},{uid:true});if(!raw||!raw.source)throw Error('Reply unavailable');
   parent=(await simpleParser(raw.source)).messageId;if(!parent||/[\r\n]/.test(parent))throw Error('Reply headers unavailable');
  }finally{lock.release();}
  const messageId=`<olympiad-interest-${p.id}@saguaros.com>`;
  const built=await nodemailer.createTransport({streamTransport:true,buffer:true}).sendMail({from:`Sean Caldwell <${sender}>`,to:p.contact_email,subject:/^re:/i.test(x.subject)?x.subject:`Re: ${x.subject}`,text:interestCopy(p.contact_name,p.company_name,x.body),messageId,inReplyTo:parent,references:[parent],disableFileAccess:true,disableUrlAccess:true});
  // Draft-folder append only. This module has no SMTP transport or send-queue entry.
  if(!await client.append(drafts.path,built.message as Buffer,['\\Draft']))throw Error('Draft outcome uncertain');
  lock=await client.getMailboxLock(drafts.path,{readOnly:true});try{const found=await client.search({header:{'message-id':messageId}},{uid:true});if(!Array.isArray(found)||found.length!==1)throw Error('Draft verification uncertain');drafted=true;}finally{lock.release();}
  return await finish('Personal response saved in Gmail Drafts. Review before sending.');
 }catch{return await finish('Draft preparation needs manual review. Check Gmail before creating another draft; uncertain attempts are not repeated.');}
 finally{client.close();}
 async function finish(note:string){await call('complete',{id:p.id,drafted,brief:brief+'\n'+note});return {drafted};}
}
