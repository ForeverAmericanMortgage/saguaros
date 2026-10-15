import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {workerKey,unseal} from './secret';
import {postalAddress} from './copy';
import {qualifyApollo,type ApolloPerson} from './apollo-model';
export async function apolloRequest(key:string,path:string,body?:unknown){
 const r=await fetch('https://api.apollo.io/api/v1/'+path,{method:body===undefined?'GET':'POST',headers:{'x-api-key':key,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),cache:'no-store',signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw Error('Apollo access failed ('+r.status+'). Check key permissions and existing credits.');return r.json();
}
export async function apolloBalance(key:string){
 const r=await apolloRequest(key,'users/api_profile?include_credit_usage=true');
 const p=r.user||r;
 if(p.email?.toLowerCase()!=='scaldwell@saguaros.com'||typeof p.num_credits_remaining!=='number'||!Number.isFinite(p.num_credits_remaining)||p.num_credits_remaining<0)throw Error('Saguaros account and remaining credits could not be verified.');
 return p.num_credits_remaining as number;
}
export const apolloSearch=(page:number)=>({person_locations:['Phoenix, Arizona, US','Scottsdale, Arizona, US','Tempe, Arizona, US','Mesa, Arizona, US','Chandler, Arizona, US'],person_titles:['owner','founder','president','human resources director','people operations director'],include_similar_titles:false,organization_locations:['Arizona, US'],organization_num_employees_ranges:['11,50','51,200','201,500'],contact_email_status:['verified'],page,per_page:100});
export function apolloCall(db:SupabaseClient){return async(action:string,data:Record<string,unknown>={})=>{const r=await db.rpc('organizer_apollo_worker',{p_key:workerKey(),p_action:action,p_data:data});if(r.error)throw Error('Apollo research ledger unavailable');return r.data;};}
export async function runApolloResearch(db:SupabaseClient){
 const call=apolloCall(db),state=await call('begin');if(state.skip)return {skipped:true};
 let batchId:string|undefined;
 const base={lease_id:state.lease_id};
 try{
  const address=postalAddress(process.env.OUTREACH_POSTAL_ADDRESS),key=unseal(state.credential);
  const remaining=await apolloBalance(key);await call('balance',{...base,remaining});
  let batch=await call('reserve',base);
  if(batch.empty){const results=await apolloRequest(key,'mixed_people/api_search',apolloSearch(state.page));if(!Array.isArray(results.people))throw Error('Apollo search response unavailable');await call('search_results',{...base,people:results.people});batch=await call('reserve',base);}
  if(!batch.ids){await call('finish',base);return {skipped:true};}
  batchId=batch.batch_id;const ids:string[]=batch.ids;
  // No automatic retry. A timeout leaves the durable reservation uncertain.
  const response=await apolloRequest(key,'people/bulk_match?reveal_personal_emails=false&reveal_phone_number=false&run_waterfall_email=false&run_waterfall_phone=false',{details:ids.map(id=>({id}))});
  if(!Array.isArray(response.matches)||typeof response.credits_consumed!=='number'||!Number.isFinite(response.credits_consumed)||response.credits_consumed<0||response.credits_consumed>ids.length)throw Error('Paid lookup receipt needs review; no retry was made.');
  const results=ids.map(id=>qualifyApollo(id,(response.matches as ApolloPerson[]).find(p=>p?.id===id)||null,address));
  await call('complete',{...base,batch_id:batchId,credits:response.credits_consumed,results});
  const after=await apolloBalance(key).catch(()=>null);if(after!==null)await call('balance',{...base,remaining:after});
  await call('finish',base);return {researched:ids.length,qualified:results.filter(r=>r.qualified).length,credits:response.credits_consumed};
 }catch(e){await call('error',{...base,...(batchId?{batch_id:batchId}:{}),error:e instanceof Error?e.message:'Research stopped for review'}).catch(()=>{});return {error:true};}
}
