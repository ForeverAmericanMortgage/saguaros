import {NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {allowedOrigin,pilotClient,SITE_URL} from '../../pilot/server';
import {chairmanAccess} from '../../auth/chairman-access';
export const dynamic='force-dynamic';export const maxDuration=60;
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Origin'}});
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function provider(){const key=process.env.OLYMPIAD_MAILCHIMP_API_KEY,dc=key?.split('-').pop();if(!key||!dc||!/^us\d+$/.test(dc))throw Error('Mailchimp is not connected. Use the personal invitation link.');return async(path:string,method='GET',body?:unknown)=>{const r=await fetch(`https://${dc}.api.mailchimp.com/3.0${path}`,{method,headers:{Authorization:`Basic ${Buffer.from(`olympiad:${key}`).toString('base64')}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(8000)});if(r.status===404&&method==='GET')return null;if(!r.ok)throw Error('Mailchimp could not complete this action. Check the campaign before retrying.');return r.status===204?null:r.json();};}
export async function POST(request:Request){
 if(!allowedOrigin(request))return reply({error:'Use the chairman portal.'},403);
 try{
  const client=await pilotClient();const access=await chairmanAccess(client);if(!access.ok)return reply({error:'Chairman Google access required.'},access.status);
  const body=await request.json();if(typeof body.account_id!=='string'||!/^[a-f0-9-]{36}$/i.test(body.account_id))return reply({error:'Choose a business.'},400);
  const {data:account,error:accountError}=await client.from('returning_team_accounts').select('*').eq('id',body.account_id).single();if(accountError||!account)return reply({error:'Business unavailable.'},404);
  if(['do_not_contact','not_returning'].includes(account.outreach_status)||account.linked_team_id)return reply({error:'This business is outside the active recruitment queue.'},409);
  if(body.action==='prepare'){
   const {data:invite,error}=await client.rpc('prepare_recruit_invitation',{p_account_id:account.id,p_version:body.version});if(error)return reply({error:'Save a valid contact email and reload this business before preparing its invitation.'},409);
   let mailchimpStatus='unavailable';try{const api=provider();const list=process.env.OLYMPIAD_MAILCHIMP_AUDIENCE_ID;if(list){const member=await api(`/lists/${encodeURIComponent(list)}/members/${createHash('md5').update(invite.email).digest('hex')}`);mailchimpStatus=member?.status||'not_in_audience';}}catch{/* Personal invitation still works. */}
   return reply({invite,link:`${SITE_URL}/olympiad/invite#${invite.token}`,mailchimp_status:mailchimpStatus});
  }
  const {data:invite,error:inviteError}=await client.from('recruitment_invitations').select('*').eq('account_id',account.id).single();
  if(inviteError||!invite||invite.email!==account.contact_email||invite.email!==body.email||new Date(invite.expires_at).getTime()<=Date.now())return reply({error:'Prepare an invitation for the saved contact before sending.'},409);
  if(body.action==='mark-personal'){
   const {error}=await client.from('recruitment_invitations').update({invited_at:new Date().toISOString()}).eq('account_id',account.id);if(error)throw error;return reply({ok:true,notice:'Recorded as personally invited. No email was sent by this button.'});
  }
  if(body.action!=='send-mailchimp')return reply({error:'Unknown invitation action.'},400);
  const api=provider(),list=process.env.OLYMPIAD_MAILCHIMP_AUDIENCE_ID,base=process.env.OLYMPIAD_MAILCHIMP_CAMPAIGN_ID;if(!list||!base)throw Error('Mailchimp campaign settings are missing.');
  const member=await api(`/lists/${encodeURIComponent(list)}/members/${createHash('md5').update(invite.email).digest('hex')}`);
  if(member?.status!=='subscribed')return reply({error:'This contact is not subscribed in Mailchimp. Send the personal invite link through your email instead.'},409);
  let id=invite.campaign_id;
  if(id){const existing=await api(`/campaigns/${encodeURIComponent(id)}`);if(existing?.status==='sent'){await client.from('recruitment_invitations').update({send_state:'sent',invited_at:existing.send_time||new Date().toISOString()}).eq('account_id',account.id);return reply({ok:true,sent:true,notice:'Mailchimp already sent this invitation. No duplicate was sent.'});}return reply({error:'An invitation campaign already exists. Review it in Mailchimp before sending or retrying.'},409);}
  const {data:reserved,error:reserveError}=await client.from('recruitment_invitations').update({send_state:'preparing'}).eq('account_id',account.id).eq('send_state','ready').is('campaign_id',null).select('account_id');
  if(reserveError||!reserved?.length)return reply({error:'This invitation is already being prepared. Reload and check Mailchimp.'},409);
  try{
   const baseline=await api(`/campaigns/${encodeURIComponent(base)}`);if(baseline?.recipients?.list_id!==list||!baseline.settings?.reply_to)throw Error('Check the configured Olympiad sender and audience.');
   const campaign=await api('/campaigns','POST',{type:'regular',recipients:{list_id:list,segment_opts:{match:'all',conditions:[{condition_type:'EmailAddress',field:'EMAIL',op:'is',value:invite.email}]}},settings:{title:`Olympiad 2027 | Returning team | ${account.business_name}`,subject_line:'You’re invited: your new Olympiad team hub',preview_text:'A simpler way to register, gather your roster and get ready for Olympiad 2027.',from_name:baseline.settings.from_name,reply_to:baseline.settings.reply_to},tracking:{opens:false,html_clicks:false,text_clicks:false}});
   id=campaign.id;const {error:storeError}=await client.from('recruitment_invitations').update({campaign_id:id,send_state:'sending'}).eq('account_id',account.id);if(storeError)throw Error('Campaign created; review Mailchimp before retrying.');
   const link=`${SITE_URL}/olympiad/invite#${invite.token}`,business=escape(account.business_name);
   const text=`${account.business_name}, you’re invited to Olympiad 2027 early access.\n\nRally for the Valley. We’d love to welcome your business back for friendly competition and support for Arizona children.\n\nOur new team hub makes it simpler to register your business, share a roster link for teammate details and shirt sizes, and find fundraising resources and event updates. Your roster can come later.\n\nGet started: ${link}\n\nUse ${invite.email} for early access. Continue with Google if this email uses Gmail or Google Workspace, or request a secure email sign-in link.\n\nTake a look and let me know what you think.\nSean Caldwell\nOlympiad 2027 Chairman\n\n*|UNSUB|*`;
   const html=`<html><body style="margin:0;background:#f7f5ee;font-family:Arial,sans-serif;color:#183d35"><div style="max-width:560px;margin:auto;padding:36px 24px"><p style="font-size:12px;letter-spacing:2px">THE SAGUAROS · OLYMPIAD 2027</p><h1>Rally for the Valley.</h1><p><strong>${business}, you’re invited.</strong></p><p>We’d love to welcome your business back for friendly competition and support for Arizona children.</p><h2 style="font-size:21px">A simpler way to get your team ready.</h2><ul style="line-height:1.9"><li><strong>Register your business</strong> and captain details.</li><li><strong>Share your roster link</strong> for teammate details and shirt sizes.</li><li><strong>Find resources and updates</strong> throughout the season.</li></ul><p>Your roster can come later. Start with your business and captain information.</p><p style="margin:28px 0"><a href="${escape(link)}" style="background:#183d35;color:white;padding:16px 22px;border-radius:8px;display:inline-block;text-decoration:none;font-weight:bold">Explore your team hub →</a></p><p style="font-size:14px">Use <strong>${escape(invite.email)}</strong> for early access. Continue with Google if this address uses Gmail or Google Workspace, or request a secure email sign-in link.</p><p>Take a look and let me know what you think.</p><p><strong>Sean Caldwell</strong><br>Olympiad 2027 Chairman</p><p style="font-size:12px"><a href="*|UNSUB|*">Unsubscribe</a> · <a href="*|UPDATE_PROFILE|*">Update preferences</a><br>*|LIST:ADDRESS|*</p></div></body></html>`;
   await api(`/campaigns/${encodeURIComponent(id)}/content`,'PUT',{html,plain_text:text});
   const [ready,check]=await Promise.all([api(`/campaigns/${encodeURIComponent(id)}`),api(`/campaigns/${encodeURIComponent(id)}/send-checklist`)]);
   const condition=ready?.recipients?.segment_opts?.conditions?.[0];
   if(ready?.recipients?.list_id!==list||ready.recipients.recipient_count!==1||ready.recipients.segment_opts.conditions.length!==1||condition?.condition_type!=='EmailAddress'||condition?.field!=='EMAIL'||condition?.op!=='is'||condition?.value?.toLowerCase()!==invite.email||!check?.is_ready)throw Error('Campaign is not ready for exactly one selected recipient. Review Mailchimp.');
   await api(`/campaigns/${encodeURIComponent(id)}/actions/send`,'POST');
   const sent=await api(`/campaigns/${encodeURIComponent(id)}`);
   if(sent?.status!=='sent'){await client.from('recruitment_invitations').update({send_state:'unknown'}).eq('account_id',account.id);return reply({ok:true,notice:'Mailchimp accepted the send request. Delivery is still pending; check the campaign before retrying.'});}
   const {error}=await client.from('recruitment_invitations').update({send_state:'sent',invited_at:sent.send_time||new Date().toISOString()}).eq('account_id',account.id);if(error)throw Error('Mailchimp sent the campaign; tracker status needs review.');
   return reply({ok:true,sent:true,notice:'Mailchimp reports this invitation sent. Inbox delivery is not yet confirmed.'});
  }catch(e){await client.from('recruitment_invitations').update({send_state:'unknown'}).eq('account_id',account.id);return reply({error:e instanceof Error?e.message:'Check Mailchimp before retrying.'},503);}
 }catch(e){return reply({error:e instanceof Error?e.message:'Unable to prepare this invitation.'},503);}
}
