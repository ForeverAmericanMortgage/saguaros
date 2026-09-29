import { NextResponse } from 'next/server';
import { pilotClient } from '../../pilot/server';
export const dynamic = 'force-dynamic';
const reply = (data: unknown, status=200) => NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
type Invitation = {email:string;invited_at:string;email_verified:boolean;last_sign_in_at:string|null;team_count:number;participant_count:number};
type Recipient = {email_address:string;status:string};
export async function GET(){
 try {
  const client=await pilotClient();
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user?.email_confirmed_at)return reply({error:'Sign in with your chairman account.'},401);
  const {data:member,error:memberError}=await client.from('organizer_memberships').select('user_id').eq('user_id',user.id).maybeSingle();
  if(memberError)throw memberError;
  if(!member)return reply({error:'Chairman access required.'},403);
  const {data:invitations,error}=await client.rpc('organizer_invitation_progress');
  if(error)throw error;
  const key=process.env.OLYMPIAD_MAILCHIMP_API_KEY;
  const campaignId=process.env.OLYMPIAD_MAILCHIMP_CAMPAIGN_ID;
  const listId=process.env.OLYMPIAD_MAILCHIMP_AUDIENCE_ID;
  const dc=key?.split('-').pop();
  if(!key||!campaignId||!listId||!dc||!/^us\d+$/.test(dc))return reply({invitations,connected:false,notice:'Mailchimp reporting is not connected.'});
  async function get(path:string){
   const response=await fetch(`https://${dc}.api.mailchimp.com/3.0${path}`,{headers:{Authorization:`Basic ${Buffer.from(`olympiad:${key}`).toString('base64')}`},cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw new Error('Mailchimp reporting temporarily unavailable.');
   return response.json();
  }
  try{
   const campaign=await get(`/campaigns/${encodeURIComponent(campaignId)}`);
   if(campaign.recipients?.list_id!==listId)throw new Error('Configured campaign does not belong to the Olympiad audience.');
   let recipients:Recipient[]=[]; let bounces=0;
   if(campaign.status==='sent'){
    const [report,sent]=await Promise.all([get(`/reports/${encodeURIComponent(campaignId)}`),get(`/reports/${encodeURIComponent(campaignId)}/sent-to?count=1000`)]);
    if(sent.total_items>1000)throw new Error('Campaign reporting requires pagination.');
    recipients=sent.sent_to||[];bounces=(report.bounces?.hard_bounces||0)+(report.bounces?.soft_bounces||0);
   }
   return reply({connected:true,updated_at:new Date().toISOString(),campaign:{title:campaign.settings.title,status:campaign.status,sent_at:campaign.send_time||null,emails_sent:campaign.emails_sent||0,bounces},invitations:(invitations as Invitation[]).map(i=>({...i,email_status:recipients.find(r=>r.email_address.toLowerCase()===i.email.toLowerCase())?.status||'not_in_campaign'}))});
  }catch{return reply({connected:true,invitations,notice:'Mailchimp reporting is temporarily unavailable. Website signup progress is still shown.'});}
 }catch{return reply({error:'Unable to load invitation progress. Please try again.'},503);}
}
