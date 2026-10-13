import {NextResponse} from 'next/server';
import {allowedOrigin,pilotClient} from '../../../pilot/server';
import {chairmanAccess} from '../../../auth/chairman-access';
import {workerKey,unseal} from '../../../cloud-outreach/secret';
import {transport} from '../../../cloud-outreach/mailbox';
import {sender} from '../../../cloud-outreach/model';
export const runtime='nodejs';export const dynamic='force-dynamic';
const reply=(d:unknown,s=200)=>NextResponse.json(d,{status:s,headers:{'Cache-Control':'private, no-store'}});
async function act(action:string){try{const c=await pilotClient();const access=await chairmanAccess(c);if(!access.ok)return reply({error:'Sign in with your chairman Google account'},access.status);if(action==='test'){const r=await c.rpc('organizer_daily_worker',{p_key:workerKey(),p_action:'test'});if(r.error||!r.data.credential)throw Error('Mailbox unavailable');const sent=await transport(unseal(r.data.credential)).sendMail({from:`Sean Caldwell <${sender}>`,to:sender,subject:'Olympiad cloud sender connection test',text:'The Olympiad cloud sender can send from scaldwell@saguaros.com while your computer is off. This is a connection test sent only to Sean. No prospect outreach was sent and no CC was added.'});if(!sent.accepted?.includes(sender))throw Error('Test receipt unavailable');return reply({test_sent:true,message_id:sent.messageId});}const {data,error}=await c.rpc('organizer_daily_manage',{p_action:action});return error?reply({error:'Unable to update daily outreach'},503):reply(data);}catch{return reply({error:'Daily outreach is unavailable'},503);}}
export async function GET(){return act('status');}
export async function POST(r:Request){if(!allowedOrigin(r))return reply({error:'Origin not allowed'},403);const d=await r.json().catch(()=>null);if(!d||!['enable','pause','test'].includes(d.action))return reply({error:'Invalid action'},400);return act(d.action);}
