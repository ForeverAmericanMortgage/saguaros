import { NextResponse } from 'next/server';
import { allowedOrigin, pilotClient, pilotConfiguration, SITE_URL } from '../../pilot/server';
import * as validate from '../../pilot/validation';
export const dynamic = 'force-dynamic';
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Origin','Referrer-Policy':'no-referrer'}});
export async function POST(request:Request){
 // Public callers carry a write-only capability. Captain operations also require verified auth in SQL.
 if(!allowedOrigin(request) && request.headers.get('origin') !== (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''))return reply({error:'Open this form on the Olympiad website.'},403);
 if(!pilotConfiguration().enabled)return reply({error:'Roster sharing is currently unavailable.'},503);
 try{
  if(Number(request.headers.get('content-length')||0)>4096)return reply({error:'The submission is too large.'},413);
  const raw=await request.text();if(raw.length>4096)return reply({error:'The submission is too large.'},413);
  let body:Record<string,unknown>;try{body=JSON.parse(raw);}catch{return reply({error:'Check your form and try again.'},400);}
  if(!body||typeof body!=='object'||Array.isArray(body))return reply({error:'Invalid submission.'},400);
  const client=await pilotClient();
  if(['get','rotate','revoke'].includes(String(body.action))){
   const {data,error}=await client.rpc('manage_roster_link',{p_team_id:validate.uuid(body.team_id),p_action:body.action});
   if(error)return reply({error:'Sign in as this team’s captain to manage its roster link.'},403);
   return reply({...data,url:data.token?`${SITE_URL}/olympiad/join#${data.token}`:undefined});
  }
  const token=validate.text(body.token,'Roster link',64,true);
  if(!/^[a-f0-9]{64}$/.test(token))return reply({error:'This roster link is unavailable. Ask your captain for a new link.'},404);
  if(body.action==='details'){
   const {data,error}=await client.rpc('roster_link_details',{p_token:token});
   if(error)throw error;if(!data)return reply({error:'This roster link has expired or been disabled. Ask your captain for a new link.'},404);
   return reply(data);
  }
  if(body.action!=='join')return reply({error:'Unknown request.'},400);
  // Normalize fields here; SQL repeats validation for callers using the RPC directly.
  const first=validate.text(body.first_name,'First name',60,true),last=validate.text(body.last_name,'Last name',60,true);
  const person=validate.roster([{name:`${first} ${last}`,email:validate.email(body.email),phone:validate.phone(body.phone,true),shirt_size:body.shirt_size,shirt_fit:body.shirt_fit}])[0];
  const {data,error}=await client.rpc('join_team_roster',{p_token:token,p_first_name:first,p_last_name:last,p_email:person.email,p_phone:person.phone,p_shirt_size:person.shirt_size,p_shirt_fit:person.shirt_fit,p_consent:body.consent===true,p_email_updates:body.email_updates===true,p_sms_updates:body.sms_updates===true});
  if(error)throw error;
  if(data.error)return reply({error:data.error},data.code==='rate_limited'?429:data.code==='unavailable'?404:data.code==='duplicate'?409:400);
  return reply({ok:true});
 }catch(error){if(error instanceof validate.PilotInputError)return reply({error:error.message},400);return reply({error:'Unable to save right now. Your details are still in the form. Please try again.'},503);}
}
