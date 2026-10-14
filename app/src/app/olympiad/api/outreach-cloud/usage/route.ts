import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {allowedOrigin,pilotClient,pilotConfiguration} from '../../../pilot/server';
import {chairmanAccess} from '../../../auth/chairman-access';
import {seal} from '../../../cloud-outreach/secret';
import {refreshUsage} from '../../../cloud-outreach/usage';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=180;
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Origin'}});
export async function GET(){try{const c=await pilotClient();const a=await chairmanAccess(c);if(!a.ok)return reply({error:'Chairman sign-in required'},a.status);const r=await c.rpc('organizer_usage_manage');if(r.error)throw Error();return reply(r.data);}catch{return reply({error:'Usage status unavailable'},503);}}
export async function POST(request:Request){if(!allowedOrigin(request))return reply({error:'Use the chairman website'},403);try{
 const c=await pilotClient();const a=await chairmanAccess(c);if(!a.ok)return reply({error:'Chairman sign-in required'},a.status);
 const raw=await request.text();if(raw.length>10000)return reply({error:'Request too large'},413);const input=JSON.parse(raw);const data:Record<string,unknown>={};
 for(const provider of ['clay','apollo'] as const){if(input[provider]){const key=typeof input[provider]==='string'?input[provider].trim():'';if(key.length<10||key.length>3000)throw Error();data[provider]=seal(key);}}
 if(input.monthly_budget!==undefined){const budget=input.monthly_budget;if(budget!==null&&(typeof budget!=='number'||!Number.isFinite(budget)||budget<0||budget>100000))throw Error();data.monthly_budget=budget;}
 const r=await c.rpc('organizer_usage_manage',{p_data:data});if(r.error)throw Error();
 const cfg=pilotConfiguration();const worker=createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false}});
 await refreshUsage(worker,true).catch(()=>{});
 const status=await c.rpc('organizer_usage_manage');if(status.error)return reply({...r.data,checked_at:null,report:{errors:['Keys saved securely. Cloud reporting verification is pending.']}});return reply(status.data);
 }catch{return reply({error:'Reporting connection not saved. Check workspace 1426410 and API reporting permissions. No enrichment was run.'},422);}}
