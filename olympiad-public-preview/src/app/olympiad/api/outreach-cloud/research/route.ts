import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {pilotConfiguration} from '../../../pilot/server';
import {workerAuthorized} from '../../../cloud-outreach/secret';
import {runApolloResearch} from '../../../cloud-outreach/apollo';
import {syncGmailDrafts} from '../../../cloud-outreach/drafts';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=180;
export async function GET(request:Request){try{if(!workerAuthorized(request))return NextResponse.json({error:'Unauthorized'},{status:401});const cfg=pilotConfiguration();const db=createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false}});const research=await runApolloResearch(db);const drafts=await syncGmailDrafts(db,5).catch(()=>({error:true}));return NextResponse.json({research,drafts},{headers:{'Cache-Control':'private, no-store'}});}catch{return NextResponse.json({error:'Research unavailable; no send attempted'},{status:503});}}
