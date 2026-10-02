'use client';
import { useEffect, useId, useRef, useState } from 'react';
import PublicTeamLogo from './PublicTeamLogo';
import s from './pilot.module.css';
export type TeamLogoAsset = { filename: string; content_type: string; size_bytes: number; updated_at: string };
export default function TeamLogo({ teamId, initialLogo, initialPublicUrl, onPublicSaved, onSaved }: { teamId: string; initialLogo?: TeamLogoAsset | null; initialPublicUrl?:string; onPublicSaved:(url:string|undefined)=>void; onSaved: (logo: TeamLogoAsset) => void }) {
 const [logo,setLogo] = useState(initialLogo);
 const [publicUrl,setPublicUrl]=useState(initialPublicUrl);
 const [webBusy,setWebBusy]=useState(false);
 const [webMessage,setWebMessage]=useState('');
 const webInput=useRef<HTMLInputElement>(null);
 const [busy,setBusy] = useState(false);
 const [error,setError] = useState('');
 const [saved,setSaved] = useState(false);
 const input = useRef<HTMLInputElement>(null);
 const id = useId();
 const reusable=!!logo && ['image/png','image/jpeg'].includes(logo.content_type);
 useEffect(()=>setPublicUrl(initialPublicUrl),[initialPublicUrl]);
 useEffect(() => {setLogo(initialLogo);},[initialLogo]);
 return <section className={s.logoCard} aria-labelledby={id}>
  <div className={s.logoHeading}><div><span className={s.eyebrow}>YOUR BUSINESS ON THE FIELD</span><h3 id={id}>Upload your logo</h3></div><span className={logo ? s.personReady : s.personIncomplete}>{logo ? 'Logo uploaded' : 'Add when ready'}</span></div>
  <p>Stand out on your team page, in the business directory and on the 2027 leaderboard. PNG and JPG uploads appear automatically once your team is approved and publicly listed. Vector files are saved for event materials.</p><p className={s.fine}><strong>Vector preferred:</strong> SVG, PDF, EPS or AI. PNG and JPG accepted. <strong>Up to 4 MB.</strong></p>
  {logo && <div className={s.logoFile}><strong>{logo.filename}</strong><span>{Math.max(1,Math.ceil(logo.size_bytes / 1024))} KB · Saved to your team</span><a className={s.secondary} href={`/olympiad/api/logo?team_id=${teamId}`} download>Download original</a></div>}
  <details className={s.logoGuide}><summary>What file should I use?</summary><ul className={s.quickFacts}><li><strong>Best for print:</strong> a vector SVG, PDF, EPS or Adobe Illustrator (AI) file, with text converted to outlines.</li><li><strong>Best for digital:</strong> a transparent PNG, ideally at least 1,200 pixels wide. JPG is also accepted.</li><li><strong>Keep it clean:</strong> use the original logo, with a little clear space around it. Avoid screenshots, social profile crops and photos of a logo.</li><li><strong>File limit:</strong> 4 MB. Have a larger file or need help? <a href="mailto:scaldwell@saguaros.com?subject=Olympiad%20team%20logo%20help">Contact the chairman.</a></li></ul></details>
  <form onChange={event => event.stopPropagation()} onSubmit={async event => {
   event.preventDefault(); setError(''); setSaved(false);
   const file = input.current?.files?.[0];
   if (!file) {setError('Choose a logo file first.');return;}
   if (file.size > 4 * 1024 * 1024) {setError('Choose a file up to 4 MB.');return;}
   const body = new FormData();body.set('team_id',teamId);body.set('logo',file);setBusy(true);
   try {
    const response = await fetch('/olympiad/api/logo',{method:'POST',body});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Your logo could not be uploaded.');
    setLogo(result.logo);onSaved(result.logo);if(result.logo_url){setPublicUrl(result.logo_url);onPublicSaved(result.logo_url);}setSaved(true);if(input.current)input.current.value='';
   } catch (error) {setError(error instanceof Error ? error.message : 'Please try uploading your logo again.');}
   finally {setBusy(false);}
  }}>
   <label className={s.field}>{logo ? 'Choose a replacement logo' : 'Choose your logo'}<input ref={input} type="file" accept=".png,.jpg,.jpeg,.svg,.pdf,.eps,.ai" disabled={busy} /></label>
   <button className={s.primary} disabled={busy}>{busy ? 'Uploading…' : logo ? 'Upload replacement' : 'Upload logo'}</button>
   {error && <p className={s.error} role="alert">{error}</p>}{saved && <p className={s.fine} role="status">Logo saved. PNG and JPG logos appear on your tile once your team is approved and publicly listed.</p>}
  </form>
  <section className={s.webLogoPanel} aria-label="Public team logo"><h4>Your logo on the website</h4><PublicTeamLogo url={publicUrl} name="Your business" /><p className={s.fine}><strong>Transparent PNG recommended.</strong> JPG also works. Use a clear logo with space around it, ideally 1,200 pixels wide. Up to 4 MB.</p><form onChange={e=>e.stopPropagation()} onSubmit={async e=>{
 e.preventDefault();setWebBusy(true);setWebMessage('');
 const form=e.currentTarget;const body=new FormData(form);body.set('team_id',teamId);body.set('publish','true');
 try {const response=await fetch('/olympiad/api/public-logo',{method:'POST',body});const result=await response.json();if(!response.ok)throw new Error(result.error);setPublicUrl(result.logo_url);onPublicSaved(result.logo_url);setWebMessage('Web logo saved. It appears publicly once your team is approved and publicly listed.');if(webInput.current)webInput.current.value='';}
 catch(error){setWebMessage(error instanceof Error?error.message:'Please try again.');}finally{setWebBusy(false);}
 }}><label className={s.field}>{reusable?'Web logo (optional replacement)':'Choose your web logo'}<input ref={webInput} required={!reusable} type="file" name="logo" accept=".png,.jpg,.jpeg" disabled={webBusy}/></label>{reusable&&<p className={s.fine}>Leave the file empty to use your saved PNG or JPG. We’ll keep the original private and publish a web copy.</p>}<label className={s.check}><input required type="checkbox" disabled={webBusy}/><span>I authorize this logo to appear on our public team page, directory and 2027 leaderboard after team approval.</span></label><button className={s.primary} disabled={webBusy}>{webBusy?'Saving…':publicUrl?'Replace web logo':'Show our logo on the website'}</button></form>{publicUrl&&<button type="button" className={s.secondary} disabled={webBusy} onClick={async()=>{
 setWebBusy(true);const body=new FormData();body.set('team_id',teamId);body.set('remove','true');
 try {const response=await fetch('/olympiad/api/public-logo',{method:'POST',body});if(!response.ok)throw new Error();setPublicUrl(undefined);onPublicSaved(undefined);setWebMessage('Public logo hidden. Your print original stays saved.');}catch{setWebMessage('Could not hide your logo. Please try again.');}finally{setWebBusy(false);}
 }}>Hide public logo</button>}{webMessage&&<p className={s.fine} role="status">{webMessage}</p>}</section><p className={s.fine}>Upload a logo your business authorizes us to use for Olympiad. PNG and JPG logos are featured on approved public team profiles. Vector originals stay private to you and the chairman. You can hide your public logo anytime.</p>
 </section>;
}
