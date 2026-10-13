import {NextResponse} from 'next/server';
import {allowedOrigin,pilotClient} from '../../pilot/server';
import {chairmanAccess} from '../../auth/chairman-access';
import {seal} from '../../cloud-outreach/secret';
import {verifyMailbox} from '../../cloud-outreach/mailbox';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Origin'}});
export async function GET(){try{const c=await pilotClient();const a=await chairmanAccess(c);if(!a.ok)return reply({error:'Sign in with your chairman Google account.'},a.status);const {data,error}=await c.rpc('organizer_cloud_manage',{p_action:'status'});if(error)throw error;return reply(data);}catch{return reply({error:'Cloud monitor status is unavailable.'},503);}}
export async function POST(request:Request){if(!allowedOrigin(request))return reply({error:'Use the chairman website.'},403);try{const c=await pilotClient();const a=await chairmanAccess(c);if(!a.ok)return reply({error:'Sign in with your chairman Google account.'},a.status);const body=await request.json().catch(()=>null);if(!body||!['connect','pause'].includes(body.action))return reply({error:'Choose a valid action.'},400);
 let encrypted:string|undefined;
 if(body.action==='connect'){const pass=typeof body.password==='string'?body.password.replace(/\s/g,''):'';if(!/^[a-z]{16}$/.test(pass))return reply({error:'Enter the 16-letter Google app password, not your account password.'},400);await verifyMailbox(pass);encrypted=seal(pass);}
 const {data,error}=await c.rpc('organizer_cloud_manage',{p_action:body.action,p_credential:encrypted});if(error)throw error;return reply(data);
 }catch{return reply({error:'Mailbox verification failed. Check the app password and IMAP access. Your secret was not saved.'},503);}}
