'use client';
import { useEffect, useId, useRef, useState } from 'react';
import s from './pilot.module.css';
export type TeamLogoAsset = { filename: string; content_type: string; size_bytes: number; updated_at: string };
export default function TeamLogo({ teamId, initialLogo, onSaved }: { teamId: string; initialLogo?: TeamLogoAsset | null; onSaved: (logo: TeamLogoAsset) => void }) {
 const [logo,setLogo] = useState(initialLogo);
 const [busy,setBusy] = useState(false);
 const [error,setError] = useState('');
 const [saved,setSaved] = useState(false);
 const input = useRef<HTMLInputElement>(null);
 const id = useId();
 useEffect(() => {setLogo(initialLogo);},[initialLogo]);
 return <section className={s.logoCard} aria-labelledby={id}>
  <div className={s.logoHeading}><div><span className={s.eyebrow}>YOUR BUSINESS ON THE FIELD</span><h3 id={id}>Upload your logo</h3></div><span className={logo ? s.personReady : s.personIncomplete}>{logo ? 'Logo uploaded' : 'Add when ready'}</span></div>
  <p>Help us feature your business in Olympiad marketing, signage and merchandise.</p><p className={s.fine}><strong>Vector preferred:</strong> SVG, PDF, EPS or AI. PNG and JPG accepted. <strong>Up to 4 MB.</strong></p>
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
    setLogo(result.logo);onSaved(result.logo);setSaved(true);if(input.current)input.current.value='';
   } catch (error) {setError(error instanceof Error ? error.message : 'Please try uploading your logo again.');}
   finally {setBusy(false);}
  }}>
   <label className={s.field}>{logo ? 'Choose a replacement logo' : 'Choose your logo'}<input ref={input} type="file" accept=".png,.jpg,.jpeg,.svg,.pdf,.eps,.ai" disabled={busy} /></label>
   <button className={s.primary} disabled={busy}>{busy ? 'Uploading…' : logo ? 'Upload replacement' : 'Upload logo'}</button>
   {error && <p className={s.error} role="alert">{error}</p>}{saved && <p className={s.fine} role="status">Logo uploaded and saved.</p>}
  </form>
  <p className={s.fine}>Upload a logo your business authorizes us to use for Olympiad. Originals are available privately to you and the chairman; uploading does not publish the file.</p>
 </section>;
}
