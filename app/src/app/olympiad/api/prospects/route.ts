import {NextResponse} from 'next/server';
import {allowedOrigin,pilotClient} from '../../pilot/server';
import {chairmanAccess} from '../../auth/chairman-access';
import {validateProspectEdit} from '../../organizer/prospect-model';
export const dynamic='force-dynamic';
const prospectColumns='*,organizer_prospect_messages(id,direction,step,provider_message_id,gmail_thread_id,subject,body,occurred_at)';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Origin'}});
export async function GET(){try{
 const client=await pilotClient();const access=await chairmanAccess(client);
 if(!access.ok)return reply({error:'Sign in with your chairman Google account.'},access.status);
 const {data,error,count}=await client.from('organizer_prospects').select(prospectColumns,{count:'exact'}).eq('event_year',2027).order('company_name').limit(1000);
 if(error)throw error;if(count && count>1000)return reply({error:'The prospect list needs pagination. No partial list is shown.'},503);
 return reply({prospects:data,checked_at:new Date().toISOString()});
}catch{return reply({error:'Unable to load prospects. Please retry.'},503);}}
export async function POST(request:Request){
 if(!allowedOrigin(request))return reply({error:'Use the chairman website to save prospects.'},403);
 try{
  const client=await pilotClient();const access=await chairmanAccess(client);
  if(!access.ok)return reply({error:'Sign in with your chairman Google account.'},access.status);
  const body=await request.json().catch(()=>null);if(!body || typeof body!=='object' || Array.isArray(body))return reply({error:'Check your prospect details.'},400);
  if(body.action==='create'){
   for(const [field,max] of Object.entries({company_name:250,company_domain:253,contact_name:250,contact_email:320,contact_title:250}))if(typeof body[field]!=='string'||!body[field].trim()||body[field].length>max)return reply({error:'Enter the company, domain, contact, email and role.'},400);
   const domain=body.company_domain.trim().toLowerCase();const email=body.contact_email.trim().toLowerCase();
   if(!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(domain)||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))return reply({error:'Enter a valid company domain and work email.'},400);
   const {data:{user}}=await client.auth.getUser();
   const {data,error}=await client.from('organizer_prospects').insert({company_name:body.company_name.trim(),company_domain:domain,contact_name:body.contact_name.trim(),contact_email:email,contact_title:body.contact_title.trim(),created_by:user!.id}).select(prospectColumns).single();
   if(error)return reply({error:error.code==='23505'?'This company is already tracked. Search the existing record.':'Unable to add this prospect.'},error.code==='23505'?409:400);
   return reply({prospect:data},201);
  }
  const invalid=validateProspectEdit(body);if(invalid)return reply({error:invalid},400);
  const {data,error}=await client.from('organizer_prospects').update({status:body.status,assigned_to:body.assigned_to.trim(),next_follow_up:body.status==='opted_out'?null:body.next_follow_up||null,notes:body.notes,fit_reason:body.fit_reason,evidence_url:body.evidence_url,draft_subject:body.draft_subject,draft_body:body.draft_body,linked_team_id:body.linked_team_id||null,...(body.status==='opted_out'?{opted_out:true}:{})}).eq('id',body.id).eq('version',body.version).select(prospectColumns).maybeSingle();
  if(error)return reply({error:'Unable to save. Opt-outs stay suppressed and registrations require a real team.'},400);
  if(!data)return reply({error:'Someone updated this prospect. Reload its saved version before saving your notes.'},409);
  return reply({prospect:data});
 }catch{return reply({error:'Unable to save this prospect. Please retry.'},503);}
}
