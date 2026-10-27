'use client';
import {useEffect,useState} from 'react';
type State={paused:boolean;paused_at:string|null;reason:string;resumed_at:string|null;sends_24h:number;bounces_24h:number;last_alert_at:string|null};
const az=(v:string)=>new Date(v).toLocaleString('en-US',{timeZone:'America/Phoenix',dateStyle:'medium',timeStyle:'short'});
async function read(r:Response){const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Sender safety status is unavailable.');return d as State;}
export default function SenderSafety(){
 const [state,setState]=useState<State|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);
 useEffect(()=>{let live=true;fetch('/olympiad/api/outreach-cloud/safety',{cache:'no-store'}).then(read).then(d=>{if(live)setState(d);}).catch(e=>{if(live)setError(e instanceof Error?e.message:'Sender safety status is unavailable.');});return()=>{live=false;};},[]);
 async function resume(){setBusy(true);setError('');try{setState(await read(await fetch('/olympiad/api/outreach-cloud/safety',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'resume',confirm:true})})));setConfirm(false);}catch(e){setError(e instanceof Error?e.message:'Unable to resume.');}finally{setBusy(false);}}
 if(!state)return error?<p role="alert">{error}</p>:null;
 const rate=state.sends_24h?` (${(state.bounces_24h*100/state.sends_24h).toFixed(1)}%)`:'';
 return <section aria-label="Sender safety">
  {state.paused?<div role="alert"><p><strong>Sending is paused by a safety stop.</strong> {state.reason}{state.paused_at?` Paused ${az(state.paused_at)} Arizona time.`:''}</p>
   <p>Replies are still being tracked. Review the bounces or complaint before resuming. Sending only restarts when you resume it here.</p>
   <label><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)} disabled={busy}/> I reviewed the cause and want outreach sending to resume.</label>{' '}
   <button type="button" disabled={busy||!confirm} onClick={()=>void resume()}>{busy?'Resuming…':'Resume sending'}</button></div>
  :<p>Sender safety: active. Last 24 hours: {state.sends_24h} sends, {state.bounces_24h} bounces{rate}. Sending pauses automatically above 3% bounces (at least 20 sends) or on any spam complaint.</p>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
