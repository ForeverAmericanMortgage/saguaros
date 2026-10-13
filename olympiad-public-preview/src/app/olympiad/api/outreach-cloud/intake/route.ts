import {createHmac,timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {pilotConfiguration,pilotClient} from '../../../pilot/server';
import {chairmanAccess} from '../../../auth/chairman-access';
import {workerKey} from '../../../cloud-outreach/secret';
import {personalCopy,qualifiedLead} from '../../../cloud-outreach/copy';
import {researchCompany,researchReservation} from '../../../cloud-outreach/research';
export const runtime='nodejs';export const dynamic='force-dynamic';
const reply=(d:unknown,s=200)=>NextResponse.json(d,{status:s,headers:{'Cache-Control':'private, no-store'}});
// Separate capability: this token can add a bounded candidate queue, never send mail or read mailbox secrets.
const intakeKey=()=>createHmac('sha256',workerKey()).update('olympiad-clay-qualified-intake-v1').digest('base64url');
export async function GET(r:Request){try{const got=Buffer.from(r.headers.get('authorization')?.replace(/^Bearer /,'')||''),expected=Buffer.from(intakeKey());if(got.length===expected.length&&timingSafeEqual(got,expected)){const cfg=pilotConfiguration();const c=createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false}});const result=await c.rpc('organizer_daily_worker',{p_key:workerKey(),p_action:'context'});if(result.error)throw Error('Context unavailable');const research=await c.rpc('organizer_research_worker',{p_key:workerKey(),p_action:'context'});if(research.error)throw Error('Research context unavailable');return reply({...result.data,research_today:research.data.research_today,research_limit:20,excluded_domains:[...new Set([...result.data.excluded_domains,...research.data.excluded_domains])],excluded_companies:[...new Set([...result.data.excluded_companies,...research.data.excluded_companies])]});}const c=await pilotClient();const a=await chairmanAccess(c);if(!a.ok)return reply({error:'Chairman sign-in required'},a.status);return reply({url:'https://chairman.scottsdaleolympiad.com/olympiad/api/outreach-cloud/intake',token:intakeKey()});}catch{return reply({error:'Integration unavailable'},503);}}
export async function POST(r:Request){
 try{const got=Buffer.from(r.headers.get('authorization')?.replace(/^Bearer /,'')||''),expected=Buffer.from(intakeKey());if(got.length!==expected.length||!timingSafeEqual(got,expected))return reply({error:'Unauthorized'},401);}catch{return reply({error:'Integration unavailable'},503);}
 try {
  if(Number(r.headers.get('content-length')||0)>20000)return reply({error:'Payload too large'},413);
  const raw=await r.text();if(raw.length>20000)return reply({error:'Payload too large'},413);
  const input=JSON.parse(raw);const cfg=pilotConfiguration();
  const c=createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false}});
  if(input?.operation==='reserve') {
   const company=researchCompany(input);
   const reservation=await c.rpc('organizer_research_worker',{p_key:workerKey(),p_action:'reserve',p_data:company});
   if(reservation.error)throw Error('Reservation unavailable');
   return reply(reservation.data);
  }
  const lead=qualifiedLead(input);const reservation_id=researchReservation(input);
  const reservation=await c.rpc('organizer_research_worker',{p_key:workerKey(),p_action:'check',p_data:{company:lead.company,domain:lead.domain,email:lead.email,reservation_id}});
  if(reservation.error)throw Error('Reservation unavailable');
  if(!reservation.data?.allowed)return reply({queued:false,error:'Matching research reservation required for today'},409);
  const copy=personalCopy(lead);
  const {data,error}=await c.rpc('organizer_daily_worker',{p_key:workerKey(),p_action:'intake',p_data:{...lead,...copy}});
  if(error)throw Error('Ledger failed');return reply(data);
 }catch{return reply({error:'Candidate held. Need a research reservation, matching work domain, fresh official research, local and role fit, and a personal opener without dashes.'},422);}

}
