import 'server-only';
import {createHash} from 'node:crypto';
export const managedTags = ['Olympiad 2027 | Registered','Olympiad 2027 | Approved','Olympiad 2027 | New team','Olympiad 2027 | Returning team','Olympiad 2027 | Unclassified','Olympiad 2027 | Mixed history','Olympiad 2027 | Roster reminder','Olympiad 2027 | Roster ready','Olympiad 2027 | Review needed'];
export type Contact = {captain_user_id:string;email:string;revision:number;synced_revision:number;last_synced_at:string|null;last_result:string|null;last_error:string|null;teams:{id:string;status:string;history:string;needs_roster:boolean}[]|null};
export function desiredTags(contact:Contact){
 const teams=contact.teams||[],approved=teams.filter(t=>t.status==='approved');
 const tags:string[]=[];
 if(teams.length)tags.push(managedTags[0]);
 if(approved.length){tags.push(managedTags[1]);const histories=new Set(approved.map(t=>t.history));tags.push(histories.size>1?managedTags[5]:histories.has('new')?managedTags[2]:histories.has('returning')?managedTags[3]:managedTags[4]);tags.push(approved.some(t=>t.needs_roster)?managedTags[6]:managedTags[7]);}
 if(teams.some(t=>t.status==='pending'||t.status==='needs_changes'))tags.push(managedTags[8]);
 return tags;
}
export function mailchimp(){
 const key=process.env.OLYMPIAD_MAILCHIMP_API_KEY,list=process.env.OLYMPIAD_MAILCHIMP_AUDIENCE_ID,dc=key?.split('-').pop();
 if(!key||!list||!dc||!/^us\d+$/.test(dc))throw Error('Mailchimp audience sync is not configured.');
 return async(path:string,method='GET',body?:unknown)=>{
 const response=await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${encodeURIComponent(list)}${path}`,{method,headers:{Authorization:`Basic ${Buffer.from(`olympiad:${key}`).toString('base64')}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(response.status===404&&method==='GET')return null;
 if(!response.ok)throw Error('Mailchimp could not complete this sync. Retry shortly.');
 return response.status===204?null:response.json();
 };
}
export async function syncContact(contact:Contact){
 const api=mailchimp(),path=`/members/${createHash('md5').update(contact.email.trim().toLowerCase()).digest('hex')}`;
 const member=await api(path);
 if(!member)return {result:'missing_contact',tags:[]};
 // Never create, subscribe, resubscribe or change contact details from captured roster data.
 const desired=member.status==='subscribed'?desiredTags(contact):[];
 await api(`${path}/tags`,'POST',{tags:managedTags.map(name=>({name,status:desired.includes(name)?'active':'inactive'}))});
 const saved=await api(path);const actual=(saved.tags||[]).map((t:{name:string})=>t.name).filter((name:string)=>managedTags.includes(name));
 if(actual.length!==desired.length||desired.some(tag=>!actual.includes(tag)))throw Error('Mailchimp tags did not match. Retry sync.');
 return {result:member.status==='subscribed'?'synced':`suppressed_${member.status}`,tags:desired};
}
