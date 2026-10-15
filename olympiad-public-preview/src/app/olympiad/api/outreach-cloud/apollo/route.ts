import {NextResponse} from 'next/server';
import {allowedOrigin,pilotClient} from '../../../pilot/server';
import {chairmanAccess} from '../../../auth/chairman-access';
import {seal} from '../../../cloud-outreach/secret';
import {apolloBalance,apolloRequest,apolloSearch} from '../../../cloud-outreach/apollo';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Origin'}});
export async function GET(){try{const c=await pilotClient();const a=await chairmanAccess(c);if(!a.ok)return reply({error:'Chairman sign-in required'},a.status);const r=await c.rpc('organizer_apollo_manage');if(r.error)throw Error();return reply(r.data);}catch{return reply({error:'Research status unavailable'},503);}}
export async function POST(request:Request){if(!allowedOrigin(request))return reply({error:'Use the chairman website'},403);try{
 const c=await pilotClient();const a=await chairmanAccess(c);if(!a.ok)return reply({error:'Chairman sign-in required'},a.status);
 const raw=await request.text();if(raw.length>5000)return reply({error:'Request too large'},413);const input=JSON.parse(raw),data:Record<string,unknown>={};
 if(input.key){if(typeof input.key!=='string'||input.key.length<10||input.key.length>3000)throw Error('Invalid key');const key=input.key.trim();await apolloBalance(key);const search=await apolloRequest(key,'mixed_people/api_search',{...apolloSearch(1),per_page:1});if(!Array.isArray(search.people))throw Error('People Search access not confirmed');data.credential=seal(key);}
 if(typeof input.enabled==='boolean')data.enabled=input.enabled;
 const r=await c.rpc('organizer_apollo_manage',{p_data:data});if(r.error)throw Error('Connection could not be saved');return reply(r.data);
 }catch(e){return reply({error:e instanceof Error?e.message:'Connection could not be verified'},422);}}
