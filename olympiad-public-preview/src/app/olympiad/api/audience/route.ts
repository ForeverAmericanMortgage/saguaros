import {NextResponse} from 'next/server';
import {allowedOrigin,pilotClient} from '../../pilot/server';
import {desiredTags,syncContact,type Contact} from './sync';
export const dynamic='force-dynamic';
export const maxDuration=60;
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Origin'}});
async function context(){
 const client=await pilotClient();const {data:{user},error}=await client.auth.getUser();
 if(error||!user?.email_confirmed_at)return {error:reply({error:'Sign in with your chairman account.'},401)};
 const {data:membership,error:membershipError}=await client.from('organizer_memberships').select('user_id').eq('user_id',user.id).maybeSingle();
 if(membershipError)throw membershipError;
 if(!membership)return {error:reply({error:'Chairman access required.'},403)};
 const {data,error:contactsError}=await client.rpc('organizer_campaign_contacts');if(contactsError)throw contactsError;
 return {client,contacts:(data||[]) as Contact[]};
}
export async function GET(){try{const ctx=await context();if(ctx.error)return ctx.error;return reply({contacts:ctx.contacts.map(c=>({...c,teams:undefined,tags:desiredTags(c),pending:c.revision!==c.synced_revision})),connected:!!(process.env.OLYMPIAD_MAILCHIMP_API_KEY&&process.env.OLYMPIAD_MAILCHIMP_AUDIENCE_ID)});}catch{return reply({error:'Unable to load campaign groups.'},503);}}
export async function POST(request:Request){
 if(!allowedOrigin(request))return reply({error:'This request must come from the Olympiad website.'},403);
 try{
 const ctx=await context();if(ctx.error)return ctx.error;
 const body=await request.json();if(body.action!=='sync')return reply({error:'Unknown audience action.'},400);
 const offset=body.force===true&&Number.isSafeInteger(body.offset)&&body.offset>=0?body.offset:0;
 const candidates=body.force===true?ctx.contacts:ctx.contacts.filter(c=>c.revision!==c.synced_revision);
 const batch=candidates.slice(offset,offset+10);const results=[];
 for(const c of batch){try{const result=await syncContact(c);
 const {data,error}=await ctx.client.from('mailchimp_sync_queue').update({synced_revision:c.revision,last_synced_at:new Date().toISOString(),last_result:result.result,last_error:null}).eq('captain_user_id',c.captain_user_id).eq('revision',c.revision).select('captain_user_id');
 if(error)throw Error('Tags updated; website sync status needs retry.');
 if(!data?.length)await ctx.client.from('mailchimp_sync_queue').update({synced_revision:0}).eq('captain_user_id',c.captain_user_id);
 results.push({email:c.email,...result,pending:!data?.length});
 }catch{await ctx.client.from('mailchimp_sync_queue').update({synced_revision:0,last_error:'Mailchimp sync failed. Retry sync.'}).eq('captain_user_id',c.captain_user_id);results.push({email:c.email,result:'failed',pending:true});}}
 return reply({results,next_offset:body.force===true&&offset+10<candidates.length?offset+10:null,remaining:Math.max(0,candidates.length-offset-batch.length)});
 }catch{return reply({error:'Audience sync could not run. Please retry.'},503);}
}
