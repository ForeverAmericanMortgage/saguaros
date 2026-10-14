import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {workerKey,unseal} from './secret';
import type {UsageReport} from './usage-model';
export class UsageAccessError extends Error {}
const workflows=['wf_0tmv1f1Gtj3FUyV3iPH','wf_0tmv3sgiac3ufh38cHn','wf_0tmva6536fN7Dn7YYPT','wf_0tmwr1jCKS644aK4DuX'];
async function request(url:string,key:string,provider:'clay'|'apollo',body?:unknown){
 const r=await fetch(url,{method:body===undefined?'GET':'POST',headers:{[provider==='clay'?'clay-api-key':'x-api-key']:key,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new UsageAccessError(`${provider==='clay'?'Clay':'Apollo'} reporting check ${new URL(url).pathname} returned HTTP ${r.status}. The encrypted key is retained. Check its reporting scope.`);return r.json();
}
function number(v:unknown){if(typeof v!=='number'||!Number.isFinite(v)||v<0)throw new UsageAccessError('Provider usage response has an invalid or missing number.');return v;}
export async function apolloUsage(key:string){const d=await request('https://api.apollo.io/api/v1/usage_stats/credit_usage_stats',key,'apollo',{});const a=d.credit_usage_stats?.lead_credit;const cycle=d.current_credit_cycle?.start;if(typeof cycle!=='string')throw new UsageAccessError('Apollo usage response is missing billing-cycle dates.');return {consumed:number(a?.consumed),remaining:number(a?.left_over),cycle_start:cycle};}
export async function clayUsage(key:string,day:string){
 const me=await request('https://api.clay.com/public/v0/me',key,'clay');if(String(me.workspace?.id)!=='1426410')throw new UsageAccessError('Clay key belongs to another workspace. Use workspace 1426410.');
 const balance=await request('https://api.clay.com/public/v0/credits/balance',key,'clay');
 const from=Date.parse(day+'T07:00:00Z'),to=from+86400000;
 const lower=new Date(from-86400000).toISOString().slice(0,10),upper=new Date(to+172800000).toISOString().slice(0,10),deadline=Date.now()+30000;const seen=new Set<string>();let credits=0,actions=0,runs=0,active=0;
 for(const workflow of workflows){let cursor: string|undefined;let complete=false;
  for(let page=0;page<20;page++){
   if(Date.now()>deadline)throw Error('Reporting time limit');
   const d=await request('https://api.clay.com/public/v0/workflows/runs/query',key,'clay',{query:`select from runs where workflow = "${workflow}" and started_at >= "${lower}" and started_at < "${upper}"`,limit:100,...(cursor?{cursor}:{})});
   if(!Array.isArray(d.data))throw new UsageAccessError('Clay run report did not contain the expected data array.');
   for(const r of d.data){if(r.workflow_id!==workflow||typeof r.id!=='string')throw Error('Invalid workflow');const t=Date.parse(r.started_at);if(!Number.isFinite(t))throw Error('Missing run date');if(t<from||t>=to||seen.has(r.id))continue;seen.add(r.id);credits+=number(r.data_credits_used);actions+=number(r.action_credits_used);runs++;if(!r.ended_at)active++;}
   if(!d.cursor){complete=true;break;}if(typeof d.cursor!=='string'||d.cursor===cursor)throw Error('Invalid cursor');cursor=d.cursor;
  }if(!complete)throw Error('Run report incomplete');
 }
 return {credits,actions,runs,active,remaining:number(balance.balance),actions_remaining:balance.action_execution_balance===undefined?null:number(balance.action_execution_balance)};
}
export async function refreshUsage(db:SupabaseClient,force=false){
 const call=async(action:string,data:Record<string,unknown>={})=>{const r=await db.rpc('organizer_usage_worker',{p_key:workerKey(),p_action:action,p_data:data});if(r.error)throw Error('Usage ledger unavailable');return r.data;};
 const state=await call('read');if(!force&&state.report?.day===state.day&&state.checked_at&&Date.now()-Date.parse(state.checked_at)<900000)return state.report as UsageReport;
 const report:UsageReport={day:state.day,observed_at:new Date().toISOString(),monthly_budget:state.monthly_budget,errors:[]};let apollo;
 if(state.clay){try{report.clay=await clayUsage(unseal(state.clay),state.day);}catch(e){report.errors.push(e instanceof UsageAccessError?e.message:'Clay usage unavailable. Check reporting access; no zero-cost assumption.');}}else report.errors.push('Clay reporting key not connected.');
 if(state.apollo){try{apollo=await apolloUsage(unseal(state.apollo));const b=state.baseline;const valid=b&&b.cycle_start===apollo.cycle_start&&apollo.consumed>=Number(b.consumed);report.apollo={...apollo,delta:valid?apollo.consumed-Number(b.consumed):null,since:valid?b.observed_at:null};}catch(e){report.errors.push(e instanceof UsageAccessError?e.message:'Apollo usage unavailable. Check the credit-usage permission.');}}else report.errors.push('Apollo reporting key not connected.');
 await call('save',{report,...(apollo?{apollo}:{})});return report;
}
