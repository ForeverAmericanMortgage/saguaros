'use client';
import { useState } from 'react';
import s from './pilot.module.css';

export type ProgressStep = { key: string; title: string; done: boolean; detail: string; action: string; onAction: () => void };
type Approval = 'pending' | 'approved' | 'needs_changes' | 'declined';

function ProgressRing({ steps }: { steps: ProgressStep[] }) {
 const done = steps.filter(step => step.done).length;
 const radius = 52, circumference = 2 * Math.PI * radius, gap = steps.length > 1 ? 6 : 0;
 const segment = circumference / steps.length;
 return <div className={s.ring} role="img" aria-label={`${done} of ${steps.length} team setup steps complete`}>
  <svg viewBox="0 0 120 120" aria-hidden="true">
   {steps.map((step, index) => <circle key={step.key} cx="60" cy="60" r={radius} fill="none" strokeWidth="9" strokeLinecap="butt"
    className={step.done ? s.ringDone : s.ringOpen}
    strokeDasharray={`${segment - gap} ${circumference - segment + gap}`} strokeDashoffset={-index * segment} transform="rotate(-90 60 60)" />)}
  </svg>
  <span><strong>{done}<small>/{steps.length}</small></strong><em>{done === steps.length ? 'Ready' : 'Complete'}</em></span>
 </div>;
}

export function CaptainProgress({ steps, approval }: { steps: ProgressStep[]; approval: Approval }) {
 const next = steps.find(step => !step.done);
 const approvalCopy = approval === 'approved' ? 'Approved. You’re officially on the field.' : approval === 'needs_changes' ? 'The chairman asked for an update. See the note above.' : approval === 'declined' ? 'Not approved. Contact the chairman with questions.' : 'In review. Keep building your team in the meantime.';
 return <section className={s.setupCard} aria-labelledby="captain-progress-heading">
  <div className={s.progressLayout}>
   <ProgressRing steps={steps} />
   <div>
    <span className={s.eyebrow}>YOUR CAPTAIN CHECKLIST</span>
    <h3 id="captain-progress-heading">{next ? `Next up: ${next.title.toLowerCase()}.` : 'Your team is ready for the field.'}</h3>
    <p className={s.fine}>{next ? 'Here’s everything we ask of a captain before game day. Work at your own pace; your progress saves as you go.' : 'Every setup step is done. Share your team page and we’ll keep you posted as the season takes shape.'}</p>
    {next && <button type="button" className={s.primary} onClick={next.onAction}>{next.action}</button>}
   </div>
  </div>
  <ol className={s.setupTasks}>
   {steps.map(step => <li key={step.key} className={step === next ? s.taskCurrent : undefined} aria-current={step === next ? 'step' : undefined}>
    <span className={step.done ? s.taskDone : s.taskOpen} aria-hidden="true">{step.done ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg> : null}</span>
    <div><strong>{step.title}<span className={s.visuallyHidden}>{step.done ? ' (complete)' : ' (to do)'}</span></strong><span>{step.detail}</span></div>
    <button type="button" className={s.secondary} onClick={step.onAction}>{step.done ? 'Review' : step.action}</button>
   </li>)}
  </ol>
  <div className={s.comingUp}>
   <span className={s.eyebrow}>WHAT’S AHEAD</span>
   <ul>
    <li><strong>Chairman review</strong><span>{approvalCopy}</span></li>
    <li><strong>Fundraising</strong><span>$3,000 team minimum. Opens later in the season; nothing to collect yet.</span></li>
    <li><strong>Game day</strong><span>Scottsdale Stadium. 2027 date to be announced.</span></li>
   </ul>
  </div>
 </section>;
}

export function ShareKit({ company, slug, approved, isPublic, onInviteRival, onOpenProfile }: { company: string; slug: string; approved: boolean; isPublic: boolean; onInviteRival: () => void; onOpenProfile: () => void }) {
 const [status, setStatus] = useState('');
 const live = approved && isPublic;
 const url = typeof window === 'undefined' ? '' : `${window.location.origin}/#team/${encodeURIComponent(slug)}`;
 const message = `We’re taking the field! ${company} is building a team for Scottsdale Olympiad 2027, a spring field day at Scottsdale Stadium supporting Arizona children’s charities. Meet our team: ${url}`;
 async function copy(text: string, label: string) {
  try { await navigator.clipboard.writeText(text); setStatus(`${label} copied.`); } catch { setStatus(`Copy this ${label.toLowerCase()}: ${text}`); }
 }
 async function nativeShare() {
  try { if (navigator.share) await navigator.share({ title: `${company} · Scottsdale Olympiad 2027`, text: message, url }); else await copy(url, 'Team page link'); }
  catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) setStatus(`Copy this team page link: ${url}`); }
 }
 return <section className={s.shareCard} aria-labelledby={`share-${slug}`}>
  <div><span className={s.eyebrow}>SHARE YOUR TEAM</span><h3 id={`share-${slug}`}>{live ? 'Your team page is live.' : 'Your shareable team page'}</h3></div>
  {live ? <>
   <p className={s.fine}>Share it with coworkers, clients and your network. Your page shows your business, team name, industry and introduction. Participant details stay private.</p>
   <div className={s.shareLink}><input readOnly value={url} aria-label="Team page link" onFocus={e => e.currentTarget.select()} /><button type="button" className={s.primary} onClick={() => copy(url, 'Team page link')}>Copy link</button></div>
   <label className={s.field}>Ready-to-post message<textarea readOnly rows={3} value={message} onFocus={e => e.currentTarget.select()} /></label>
   <div className={s.actions}>
    <button type="button" className={s.secondary} onClick={() => copy(message, 'Message')}>Copy message</button>
    <a className={s.secondary} href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">Post on LinkedIn ↗</a>
    <a className={s.secondary} href={`mailto:?subject=${encodeURIComponent(`${company} is on the field for Olympiad 2027`)}&body=${encodeURIComponent(message)}`}>Email it</a>
    <button type="button" className={s.secondary} onClick={nativeShare}>More ways to share</button>
   </div>
  </> : <p className={s.fine}>{approved ? 'Your team is approved. Turn on public listing to unlock your team page.' : isPublic ? 'Your team page unlocks once the chairman approves your team.' : 'Your team page unlocks once the chairman approves your team and you turn on public listing.'} Nothing is shared until then.{!isPublic && <> <button type="button" className={s.textButton} onClick={onOpenProfile}>Public listing settings</button></>}</p>}
  <div className={s.shareRival}><div><strong>Know a business that should be out there too?</strong><span>Send a friendly invitation. It’s just a link; we won’t contact them for you.</span></div><button type="button" className={s.secondary} onClick={onInviteRival}>Invite a friendly rival ↗</button></div>
  {status && <p className={s.fine} role="status">{status}</p>}
 </section>;
}
