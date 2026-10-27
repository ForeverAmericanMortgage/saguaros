import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {workerKey,unseal} from './secret';
import {transport} from './mailbox';
import {sender} from './model';
import {alertRecipient,senderAlertCopy} from './safety-model';
export function safetyCall(db:SupabaseClient){return async(action:string,data:Record<string,unknown>={})=>{const r=await db.rpc('organizer_safety_worker',{p_key:workerKey(),p_action:action,p_data:data});if(r.error)throw Error('Safety ledger unavailable');return r.data;};}
// Called by the reply monitor and the sender every run. The database decides whether an
// alert is due (08:00-18:30 Arizona, sender stopped, none in the last hour) and records it first.
export async function deliverSenderAlert(db:SupabaseClient){
 const call=safetyCall(db);
 const a=await call('alert_claim');if(a.skip)return {skipped:true};
 const copy=senderAlertCopy(a);let state='uncertain';
 try{const receipt=await transport(unseal(a.credential)).sendMail({from:`Olympiad Sender <${sender}>`,to:alertRecipient,messageId:a.message_id,...copy});if(receipt.accepted?.some((v:unknown)=>String(v).toLowerCase()===alertRecipient))state='sent';}
 finally{await call('alert_complete',{id:a.id,state}).catch(()=>{});}
 return {alerted:state==='sent'};
}
