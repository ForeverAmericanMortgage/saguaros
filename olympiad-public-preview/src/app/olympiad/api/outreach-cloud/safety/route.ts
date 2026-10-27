import {NextResponse} from 'next/server';
import {allowedOrigin,pilotClient} from '../../../pilot/server';
import {chairmanAccess} from '../../../auth/chairman-access';
export const runtime='nodejs';export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Origin'}});
async function act(action:'status'|'resume'){try{
 const c=await pilotClient();const a=await chairmanAccess(c);if(!a.ok)return reply({error:'Sign in with your chairman Google account.'},a.status);
 const {data,error}=await c.rpc('organizer_safety_manage',{p_action:action});if(error)throw error;return reply(data);
}catch{return reply({error:'Sender safety status is unavailable.'},503);}}
export async function GET(){return act('status');}
// Resume is the only way out of an automatic safety pause, and it needs an explicit confirmation.
export async function POST(request:Request){if(!allowedOrigin(request))return reply({error:'Use the chairman website.'},403);const body=await request.json().catch(()=>null);if(!body||body.action!=='resume'||body.confirm!==true)return reply({error:'Confirm before resuming sending.'},400);return act('resume');}
