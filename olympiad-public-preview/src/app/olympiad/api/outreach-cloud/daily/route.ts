import {NextResponse} from 'next/server';
import {allowedOrigin,pilotClient} from '../../../pilot/server';
import {chairmanAccess} from '../../../auth/chairman-access';
import {syncGmailDrafts} from '../../../cloud-outreach/drafts';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=180;
const reply=(d:unknown,s=200)=>NextResponse.json(d,{status:s,headers:{'Cache-Control':'private, no-store'}});
async function act(action:string,items:unknown=[]){try{
 const c=await pilotClient();const access=await chairmanAccess(c);if(!access.ok)return reply({error:'Sign in with your chairman Google account'},access.status);
 if(action==='refresh_drafts'||action==='approve_batch')await syncGmailDrafts(c,action==='refresh_drafts'?5:0);
 const review=await c.rpc('organizer_review_manage',{p_action:action==='approve_batch'?'approve':'status',p_items:items});
 if(review.error)return reply({error:'A draft changed or is unavailable. Refresh and review again before approving.'},409);
 const {data,error}=await c.rpc('organizer_daily_manage',{p_action:['enable','pause'].includes(action)?action:'status'});
 return error?reply({error:'Unable to update daily outreach'},503):reply({...data,...review.data});
 }catch{return reply({error:'Unable to refresh Gmail drafts. Nothing was approved. Please try again.'},503);}}
export async function GET(){return act('status');}
export async function POST(r:Request){if(!allowedOrigin(r))return reply({error:'Origin not allowed'},403);const d=await r.json().catch(()=>null);if(!d||!['enable','pause','refresh_drafts','approve_batch'].includes(d.action))return reply({error:'Invalid action'},400);return act(d.action,d.items);}
