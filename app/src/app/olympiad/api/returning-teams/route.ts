import {NextResponse} from 'next/server';
import {allowedOrigin,pilotClient} from '../../pilot/server';
import {chairmanAccess} from '../../auth/chairman-access';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Origin'}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(request:Request){
 try{
  const client=await pilotClient();const access=await chairmanAccess(client);
  if(!access.ok)return reply({error:'Sign in with your chairman Google account.'},access.status);
  const id=new URL(request.url).searchParams.get('account_id');
  if(id){
   if(!uuid.test(id))return reply({error:'Invalid business.'},400);
   const {data,error}=await client.from('returning_team_activities').select('id,kind,outcome,outreach_status,created_at').eq('account_id',id).order('created_at',{ascending:false}).limit(50);
   if(error)throw error;return reply({activities:data});
  }
  const {data,error}=await client.from('returning_team_accounts').select('*').order('business_name').limit(2500);
  if(error)throw error;return reply({accounts:data});
 }catch{return reply({error:'Unable to load returning teams. Please retry.'},503);}
}
export async function POST(request:Request){
 if(!allowedOrigin(request))return reply({error:'Use the chairman website to save this record.'},403);
 try{
  const client=await pilotClient();const access=await chairmanAccess(client);
  if(!access.ok)return reply({error:'Sign in with your chairman Google account.'},access.status);
  const body=await request.json();
  if(!uuid.test(body.id||'')||!Number.isSafeInteger(body.version)||body.version<1)return reply({error:'Invalid record. Refresh and retry.'},400);
  const fields={contact_name:250,contact_email:320,contact_phone:60,assigned_to:250,notes:10000};
  for(const [key,max] of Object.entries(fields))if(typeof body[key]!=='string'||body[key].length>max)return reply({error:'Check the contact details and note length.'},400);
  if(body.contact_email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.contact_email.trim()))return reply({error:'Enter a valid email address or leave it blank.'},400);
  if(body.contact_phone&&!/^\+?[0-9().\s\-xext]{7,60}$/i.test(body.contact_phone.trim()))return reply({error:'Enter a valid phone number or leave it blank.'},400);
  if(!['not_contacted','attempted','follow_up','interested','committed','not_returning','do_not_contact'].includes(body.outreach_status))return reply({error:'Choose an outreach status.'},400);
  if(body.next_follow_up&&(!/^\d{4}-\d{2}-\d{2}$/.test(body.next_follow_up)||new Date(body.next_follow_up+'T12:00:00Z').toISOString().slice(0,10)!==body.next_follow_up))return reply({error:'Choose a valid follow-up date.'},400);
  if(body.linked_team_id&&!uuid.test(body.linked_team_id))return reply({error:'Choose a registered team.'},400);
  if(body.activity_kind&&(!['call','email','text','meeting','note'].includes(body.activity_kind)||typeof body.activity_outcome!=='string'||!body.activity_outcome.trim()||body.activity_outcome.length>2000))return reply({error:'Add a short outcome for this activity.'},400);
  const {data,error}=await client.rpc('save_returning_team',{
   p_id:body.id,p_version:body.version,p_contact_name:body.contact_name,p_contact_email:body.contact_email,p_contact_phone:body.contact_phone,
   p_status:body.outreach_status,p_assigned_to:body.assigned_to,p_notes:body.notes,p_next_follow_up:body.next_follow_up||null,p_linked_team_id:body.linked_team_id||null,
   p_activity_kind:body.activity_kind||null,p_activity_outcome:body.activity_kind?body.activity_outcome:null,
  });
  if(error)return reply({error:error.code==='40001'?'Someone updated this business. Reload the list before saving.':'Unable to save. Check your selected team and retry.'},error.code==='40001'?409:400);
  return reply({account:data});
 }catch{return reply({error:'Unable to save this business. Please retry.'},503);}
}
