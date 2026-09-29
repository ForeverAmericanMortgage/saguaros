import {NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {allowedOrigin,pilotClient} from '../../pilot/server';
import {mailchimp} from '../audience/sync';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Origin'}});
const consent='I want Olympiad event updates and fundraising tips by email. I can unsubscribe at any time.';
async function context(){const client=await pilotClient();const {data:{user},error}=await client.auth.getUser();if(error||!user?.email_confirmed_at||!user.email)return {error:reply({error:'Sign in to manage email updates.'},401)};const {data:pilot,error:pilotError}=await client.from('pilot_captains').select('user_id').eq('user_id',user.id).maybeSingle();if(pilotError)throw pilotError;if(!pilot)return {error:reply({error:'Pilot access required.'},403)};return {client,user,email:user.email.trim().toLowerCase()};}
export async function GET(){try{const ctx=await context();if(ctx.error)return ctx.error;const member=await mailchimp()(`/members/${createHash('md5').update(ctx.email).digest('hex')}`);return reply({status:member?.status||'not_subscribed'});}catch{return reply({error:'Email preferences are temporarily unavailable.'},503);}}
export async function POST(request:Request){if(!allowedOrigin(request))return reply({error:'Submit from the Olympiad website.'},403);try{const ctx=await context();if(ctx.error)return ctx.error;const body=await request.json();if(body.opt_in!==true)return reply({error:'Choose email updates to subscribe.'},400);const api=mailchimp(),path=`/members/${createHash('md5').update(ctx.email).digest('hex')}`,member=await api(path);
 // Subscription must be requested by the verified owner. Suppression remains in place.
 if(member&&member.status==='cleaned')return reply({error:'Mailchimp cannot use this address. Contact the event team for help.'},409);
 if(member&&!['subscribed','pending','cleaned'].includes(member.status))return reply({error:'This address previously unsubscribed. Please use Mailchimp’s signup form to subscribe again; we will preserve your unsubscribe here.'},409);
 const {error}=await ctx.client.from('captain_campaign_preferences').upsert({user_id:ctx.user.id,requested_at:new Date().toISOString(),consent_text:consent},{onConflict:'user_id'});if(error)throw error;
 if(!member)await api(path,'PUT',{email_address:ctx.email,status_if_new:'pending'});
 return reply({status:member?.status||'pending',message:member?.status==='subscribed'?'You’re subscribed to Olympiad email updates.': 'Check your email to confirm your Olympiad updates subscription. Sign-in and team access are unchanged.'});
}catch{return reply({error:'Unable to request updates. Please retry later.'},503);}}
