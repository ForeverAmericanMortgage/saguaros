import {createHmac,timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {pilotConfiguration,pilotClient} from '../../../pilot/server';
import {chairmanAccess} from '../../../auth/chairman-access';
import {workerKey} from '../../../cloud-outreach/secret';
import {personalCopy,qualifiedLead} from '../../../cloud-outreach/copy';
export const runtime='nodejs';export const dynamic='force-dynamic';
const reply=(d:unknown,s=200)=>NextResponse.json(d,{status:s,headers:{'Cache-Control':'private, no-store'}});
// Separate capability: this token can add a bounded candidate queue, never send mail or read mailbox secrets.
const intakeKey=()=>createHmac('sha256',workerKey()).update('olympiad-clay-qualified-intake-v1').digest('base64url');
export async function GET(r:Request){try{const got=Buffer.from(r.headers.get('authorization')?.replace(/^Bearer /,'')||''),expected=Buffer.from(intakeKey());if(got.length===expected.length&&timingSafeEqual(got,expected)){const cfg=pilotConfiguration();const c=createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false}});const result=await c.rpc('organizer_daily_worker',{p_key:workerKey(),p_action:'context'});if(result.error)throw Error('Context unavailable');return reply(result.data);}const c=await pilotClient();const a=await chairmanAccess(c);if(!a.ok)return reply({error:'Chairman sign-in required'},a.status);return reply({url:'https://chairman.scottsdaleolympiad.com/olympiad/api/outreach-cloud/intake',token:intakeKey()});}catch{return reply({error:'Integration unavailable'},503);}}
export async function POST(r:Request){
 try{const got=Buffer.from(r.headers.get('authorization')?.replace(/^Bearer /,'')||''),expected=Buffer.from(intakeKey());if(got.length!==expected.length||!timingSafeEqual(got,expected))return reply({error:'Unauthorized'},401);}catch{return reply({error:'Integration unavailable'},503);}
 try{if(Number(r.headers.get('content-length')||0)>20000)return reply({error:'Payload too large'},413);const raw=await r.text();if(raw.length>20000)return reply({error:'Payload too large'},413);const lead=qualifiedLead(JSON.parse(raw));const copy=personalCopy(lead);const cfg=pilotConfiguration();const c=createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await c.rpc('organizer_daily_worker',{p_key:workerKey(),p_action:'intake',p_data:{...lead,...copy}});if(error)throw Error('Ledger failed');return reply(data);}catch{return reply({error:'Candidate held. Need matching work domain, fresh official research, local and role fit, and a personal opener without dashes.'},422);}
}
