import {createHash} from 'node:crypto';
export type ReviewDraft={id:string;candidate_id:string|null;prospect_id:string|null;step:'initial'|'followup';company:string;email:string;subject:string;body:string;rfc_message_id:string;gmail_thread_id:string|null;content_hash:string|null;approved_hash:string|null;export_state:string;export_attempts:number;last_error:string};
export function draftHash(email:string,subject:string,body:string){return createHash('sha256').update(JSON.stringify([email.toLowerCase(),subject,body.replace(/\r\n/g,'\n').trim()])).digest('hex');}
export function reviewedCopy(email:string,subject:string,body:string){
 const text=body.replace(/\r\n/g,'\n').trim();
 if(!email||!subject.trim()||subject.length>250||/[\r\n]/.test(subject)||!text||text.length>5000||text.split(/\s+/).length>220||/[\u2013\u2014]/.test(subject+text))throw Error('Keep the draft under 220 words, with a subject and no em dashes.');
 return {subject:subject.trim(),body:text,content_hash:draftHash(email,subject.trim(),text)};
}
