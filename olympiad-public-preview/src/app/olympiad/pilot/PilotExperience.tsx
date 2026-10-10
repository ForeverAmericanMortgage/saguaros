'use client';
import PublicTeamLogo from './PublicTeamLogo';
import RosterLink from './RosterLink';
import { roster as validateRoster } from './validation';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import s from './pilot.module.css';
import results2026 from '../data/results-2026.json';
const lastYearTeams = results2026.teams.length;
import EmailPreferences from './EmailPreferences';
import TeamLogo, { type TeamLogoAsset } from './TeamLogo';
import { CaptainProgress, ShareKit, type ProgressStep } from './CaptainProgress';

type Person = { id?: string; name: string; email: string; phone: string; shirt_size: string; shirt_fit: string };
type ClubMember = { id: string; name: string };
type Team = { logo_url?: string; logo?: TeamLogoAsset | null; referring_club_member_id?: string | null; approval_status?: 'pending' | 'approved' | 'needs_changes' | 'declined'; approval_message?: string; id: string; slug: string; name: string; company: string; industry: string; description: string; event_year: number; captain_name?: string; captain_phone?: string; is_public?: boolean; roster_version?: number; stretch_goal_cents?: number; roster?: Person[] };
type Props = { mode: 'teams' | 'captain' | 'invite' | 'team'; slug?: string; accessIntent?: 'new' | 'returning'; onNavigate: (hash: string) => void };
const fallbackIndustries = ['Commercial real estate', 'Residential real estate', 'Finance', 'Healthcare', 'Technology', 'Other businesses', 'Construction & trades', 'Hospitality'];
const blankPerson = (): Person => ({ name: '', email: '', phone: '', shirt_size: '', shirt_fit: '' });
class PilotApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
async function api(action: string, body?: Record<string, unknown>) {
  const response = await fetch(`/olympiad/api/pilot${body ? '' : `?${action}`}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) } : { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new PilotApiError(data.error || 'Something went wrong. Please try again.', response.status);
  return data;
}
export default function PilotExperience({ mode, slug, accessIntent = 'new', onNavigate }: Props) {
  const dirty = useRef(false);
  const dirtyForms = useRef(new Set<string>());
  const region = useRef<HTMLElement>(null);
  const markDirty = (value: boolean, formId?: string) => { if (value && formId) dirtyForms.current.add(formId); if (!value) dirtyForms.current.clear(); dirty.current = value; window.dispatchEvent(new CustomEvent('olympiad-dirty', { detail: value })); };
  const navigate = (hash: string) => { if (!dirty.current || window.confirm('You have unsaved changes. Leave without saving?')) { markDirty(false); onNavigate(hash); } };
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { window.removeEventListener('beforeunload', beforeUnload); window.dispatchEvent(new CustomEvent('olympiad-dirty', { detail: false })); };
  }, []);
  const [industries, setIndustries] = useState(fallbackIndustries);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [adding, setAdding] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [pilotOnly, setPilotOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settledRequest, setSettledRequest] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [user, setUser] = useState<{ email: string; is_organizer?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const pendingRefresh = useRef<{ action: string; body: Record<string, unknown> } | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const accessMode = accessIntent;
  useEffect(() => { setLinkEmail(''); setError(''); setNotice(''); }, [accessIntent]);
  const [filter, setFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [revision, setRevision] = useState(0);
  const [inviter, setInviter] = useState('');
  const requestKey = JSON.stringify([mode, slug, revision]);
  // Route changes render before their effect runs; never show the previous route's data.
  const isLoading = loading || settledRequest !== requestKey;
  useEffect(() => {
    try {
      const incoming = new URLSearchParams(window.location.search).get('from');
      if (incoming && /^[a-zA-Z0-9-]{1,160}$/.test(incoming)) sessionStorage.setItem('olympiad-inviter', incoming);
      setInviter(sessionStorage.getItem('olympiad-inviter') || '');
    } catch { setInviter(new URLSearchParams(window.location.search).get('from') || ''); }
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setNotice('');
    if (mode === 'team') setTeams([]);
    api('action=status').then(async status => [status, mode === 'captain' && !status.enabled ? {} : await api(mode === 'captain' ? 'action=mine' : mode === 'team' ? `action=team&slug=${encodeURIComponent(slug || '')}` : 'action=directory')])
      .then(([status, data]) => { if (active) { setEnabled(status.enabled); setGoogleEnabled(status.google_sign_in_enabled === true); setPilotOnly(status.pilot_only === true); setRegistrationOpen(mode === 'captain' && data.user ? data.registration_allowed ?? status.registration_open === true : status.registration_open === true); setIndustries(status.industries || fallbackIndustries); setClubMembers(mode === 'captain' && data.user ? data.club_members || [] : []); setTeams(data.team ? [data.team] : data.teams || []); setUser(data.user || null); setRefreshRequired(false); if (new URLSearchParams(window.location.search).get('auth_error') === 'link_expired') setError('This sign-in link could not be completed. Request a fresh sign-in link below.'); const authError = new URLSearchParams(window.location.search).get('auth_error'); if (authError === 'google_not_invited') setError('That Google account isn’t on the early-access list. Choose Continue with Google again and select the email we invited, or use that address for an email link. Your existing team stays with its original account.'); if (authError === 'google_failed') setError('Google sign-in wasn’t completed. Try Continue with Google again, choose your invited account, or request an email link below.'); } })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) { setSettledRequest(requestKey); setLoading(false); } });
    return () => { active = false; };
  }, [mode, slug, revision, requestKey]);
  async function share(team?: Team) {
    const url = `${window.location.origin}/?${team && team.is_public !== false && (team.approval_status === 'approved' || mode === 'team') ? `from=${encodeURIComponent(team.slug)}` : ''}#invite`;
    const title = team ? `${team.company} invites you to Olympiad` : 'Bring your business to Scottsdale Olympiad';
    try { if (navigator.share) await navigator.share({ title, text: 'Friendly rivals. A shared purpose. Discover Scottsdale Olympiad 2027.', url }); else { await navigator.clipboard.writeText(url); setNotice('Invitation link copied. Share it with another business.'); } }
    catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) setNotice(`Copy this invitation link: ${url}`); }
  }
  async function copyTeam(team: Team) {
    const url = `${window.location.origin}/#team/${encodeURIComponent(team.slug)}`;
    try { await navigator.clipboard.writeText(url); setNotice('Team page link copied.'); } catch { setNotice(`Copy this team page link: ${url}`); }
  }
  function startFromTeam(team: Team) {
    try { sessionStorage.setItem('olympiad-inviter', team.slug); } catch {}
    setInviter(team.slug); navigate('#captain');
  }
  function clearInvitation() {
    try { sessionStorage.removeItem('olympiad-inviter'); const url = new URL(window.location.href); url.searchParams.delete('from'); window.history.replaceState(null, '', url); } catch {}
    setInviter(''); setNotice('Remembered invitation removed. You can register without it.');
  }
  async function refreshRoster(teamId: string) {
    const formId = `roster-${teamId}`;
    if (dirtyForms.current.has(formId) && !window.confirm('Reload the roster and discard your unsaved roster edits? Other form drafts will stay here.')) return;
    setBusy(true); setError('');
    try {
      const latest = await api('action=mine');
      if (!latest.user || latest.user.email !== user?.email) throw new Error('Sign in again before refreshing your roster.');
      const fresh = latest.teams.find((row: Team) => row.id === teamId);
      if (!fresh) throw new Error('Your team could not be loaded.');
      setTeams(current => current.map(team => team.id === teamId ? { ...team, roster: fresh.roster, roster_version: fresh.roster_version } : team));
      dirtyForms.current.delete(formId); if (!dirtyForms.current.size) markDirty(false);
      setNotice('Roster refreshed with the latest saved teammates.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to refresh your roster.'); }
    finally { setBusy(false); }
  }
  async function submit(action: string, body: Record<string, unknown>, refresh = true) {
    if (action === 'sign-out' && dirty.current && !window.confirm('Sign out and discard unsaved changes?')) return false;
    setBusy(true); setGoogleBusy(action === 'google-sign-in'); setError(''); setNotice('');
    if (action === 'sign-in') {
      const cleanUrl = new URL(window.location.href); cleanUrl.searchParams.delete('auth_error'); window.history.replaceState(null, '', cleanUrl);
    }
    try {
      let refreshFailed = false;
      const data = await api(action, body);
      if (action === 'google-sign-in') { window.location.assign(data.url); return true; }
      if (['save-roster', 'update-team', 'register'].includes(action)) {
        try {
          const latest = await api('action=mine');
          if (!latest.user || latest.user.email !== user?.email) throw new Error('Session changed while refreshing');
          mergeSavedTeam(action, body, latest);
        } catch {
          refreshFailed = true; pendingRefresh.current = { action, body }; setRefreshRequired(true);
          setError('Your changes were saved. We could not reload the saved details. Retry the refresh below; your other drafts will stay here.');
        }
      }
      dirtyForms.current.delete(action === 'save-roster' ? `roster-${body.team_id}` : action === 'update-team' ? `profile-${body.team_id}` : action);
      if (dirtyForms.current.size === 0) markDirty(false);
      if (action === 'register') { setAdding(false); try { sessionStorage.removeItem('olympiad-onboarding'); } catch {} }
      if (action === 'sign-out') { markDirty(false); setUser(null); setTeams([]); }
      else if (!['save-roster', 'update-team', 'register'].includes(action) && refresh) setRevision(v => v + 1);
      else if (!refreshFailed && action !== 'save-roster') setNotice(data.message || 'Saved.');
      return !refreshFailed;
    } catch (e) {
      if (e instanceof PilotApiError && e.status === 401) { setSessionExpired(true); setError('Your session ended. Your unsaved changes are still here. Sign in again in a new tab, then return here to continue.'); }
      else setError(e instanceof Error ? e.message : 'Unable to save. Please try again.');
      return false;
    }
    finally { setBusy(false); setGoogleBusy(false); }
  }
  function mergeSavedTeam(action: string, body: Record<string, unknown>, latest: { teams: Team[] }) {
          setTeams(current => {
            if (action === 'register') return [...current, ...latest.teams.filter((fresh: Team) => !current.some(team => team.id === fresh.id))];
            return current.map(team => {
              if (team.id !== body.team_id) return team;
              const fresh = latest.teams.find((row: Team) => row.id === team.id);
              if (!fresh) return team;
              return action === 'update-team' ? { ...fresh, roster: team.roster, roster_version: team.roster_version } : { ...team, roster: fresh.roster, roster_version: fresh.roster_version };
            });
          });
  }
  async function retrySavedRefresh() {
    const pending = pendingRefresh.current;
    if (!pending) return;
    setBusy(true);
    try {
      const latest = await api('action=mine');
      if (!latest.user || latest.user.email !== user?.email) { setSessionExpired(true); setError('Sign in again with the same captain email. Your drafts remain here.'); return; }
      mergeSavedTeam(pending.action, pending.body, latest);
      pendingRefresh.current = null; setRefreshRequired(false); setError(''); setNotice('Saved details refreshed. Your other drafts are unchanged.');
    } catch { setError('Saved details are still unavailable. Your drafts remain here; try refreshing saved details again shortly.'); }
    finally { setBusy(false); }
  }
  async function resumeSession() {
    setBusy(true);
    try {
      const latest = await api('action=mine');
      if (!latest.user || latest.user.email !== user?.email) { setError('Sign in in the new tab using ' + user?.email + ', then return here. Your drafts remain here.'); return; }
      setSessionExpired(false); setError(pendingRefresh.current ? 'Your changes were saved. Refresh the saved details to continue.' : ''); setNotice('You are signed in again. Your drafts are ready to save.');
    } catch { setError('We could not check your sign-in. Your drafts remain here. Please try again.'); }
    finally { setBusy(false); }
  }
  const visibleTeams = teams.filter(t => (!industryFilter || t.industry === industryFilter) && `${t.name} ${t.company} ${t.industry}`.toLowerCase().includes(filter.toLowerCase()));
  const heading = mode === 'captain' ? user && teams.length ? 'Your team hub.' : accessMode === 'returning' ? 'Welcome back to your team.' : 'Your team starts here.' : mode === 'invite' ? 'A little friendly competition. A lasting local impact.' : mode === 'team' ? (!isLoading && teams[0]?.slug === slug ? teams[0].name : 'Meet the team.') : 'Meet the businesses taking the field.';
  return <section ref={region} onChange={event => { if (mode === 'captain') { const form = (event.target as HTMLElement).closest('form'); dirtyForms.current.add(form?.dataset.draft || 'draft'); markDirty(true); } }} className={`${s.page} ${mode === 'captain' && !user ? s.captainAccess : ''}`} aria-labelledby="pilot-heading">
    <header className={s.hero}><span className={s.eyebrow}>SCOTTSDALE OLYMPIAD · 2027</span><h1 id="pilot-heading">{heading}</h1>{mode !== 'captain' && <p>Local businesses come together for spirited games and support for Arizona children’s charities.</p>}</header>
    {(mode !== 'captain' || user) && <nav className={s.hubNav} aria-label="Team hub">{user?.is_organizer && <a className={s.primary} href="/olympiad/organizer">Chairman dashboard →</a>}<button className={mode === 'teams' ? s.primary : s.secondary} onClick={() => navigate('#teams')}>Teams</button><button className={mode === 'captain' ? s.primary : s.secondary} onClick={() => navigate('#signin')}>{user ? 'My team hub' : 'Manage my team'}</button>{mode !== 'captain' && <button className={s.secondary} onClick={() => share()}>Invite business ↗</button>}</nav>}
    {mode === 'captain' && inviter && <p className={s.notice}>An invitation is attached to your registration. <button className={s.secondary} onClick={clearInvitation}>Remove invitation</button></p>}{notice && <p className={s.notice} role="status">{notice}</p>}{error && <div className={s.error} role="alert">{error} {sessionExpired ? <><a href="/#signin" target="_blank" rel="noopener noreferrer">Sign in again in a new tab</a> <button disabled={busy} onClick={resumeSession}>I’ve signed in · continue here</button></> : refreshRequired ? <button disabled={busy} onClick={retrySavedRefresh}>Refresh saved details</button> : <button onClick={() => { if (!dirty.current || window.confirm('Reload and discard unsaved changes?')) { markDirty(false); setRevision(v => v + 1); } }}>Try again</button>}</div>}
    {isLoading ? <p className={s.empty} role="status">Loading team information…</p> : <>
      {!enabled && <p className={s.notice}>Registration is not open yet. Explore the event and share an invitation now; captain registration will be available when the pilot opens.</p>}
      {enabled && pilotOnly && !(user && teams.length) && <p className={s.notice}>{user ? registrationOpen ? 'Invited pilot · Team setup is enabled for your account.' : 'Invited pilot · You’re signed in. New team setup is not enabled for this account.' : 'Early access · Use your invited email address.'}</p>}
      {enabled && !registrationOpen && !pilotOnly && <p className={s.notice}>New team registration is closed; registered captains can still manage their team.</p>}
      {mode === 'invite' && <><div className={s.intro}><div><span className={s.eyebrow}>YOU’RE INVITED</span><h2>Bring your colleagues.<br />Challenge your rivals.</h2><p>Olympiad is a company team competition hosted by the Saguaros. Your business participates as a sponsor team, connecting colleagues and friendly competitors around a shared charitable purpose.</p>{inviter && <p className={s.notice}>You arrived through a team invitation. We’ll carry that invitation into your registration.</p>}<button className={s.primary} disabled={!enabled || !registrationOpen} onClick={() => navigate('#captain')}>Register your team</button><p className={s.fine}>Early access is limited to invited email addresses. A shared invitation does not enable registration automatically; contact the event team to join the pilot.</p></div><div className={s.facts}><div><strong>6 people minimum</strong><span>Including your captain. Start now and finish the roster later.</span></div><div><strong>$3,000 team commitment</strong><span>A fundraising goal for every team. No payment is collected in this registration pilot.</span></div><div><strong>Two ways to win</strong><span>Top fundraising in each industry earns a cup. Winning games earns medals.</span></div></div></div><div className={s.steps}>{[['01','A captain gets things started','Register your company and team. Choose whether to appear in the public business directory.'],['02','Bring your people together','Add participant details privately, including contact information and shirt preferences.'],['03','Make it a friendly rivalry','Share an invitation with another business and get ready to take the field.']].map(([number,title,copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div><p className={s.fine}>2027 event date, final schedule, and other event details will be announced. Registration does not collect a deposit.</p><button className={s.secondary} onClick={() => navigate('#guide')}>Explore the team guide →</button></>}
      {mode === 'teams' && <><div className={s.sectionHead}><div><h2>The company you’ll keep.</h2><p>Businesses that have chosen to share their participation. Participant rosters and contact details stay private.</p></div><label className={s.field}>Find a business<input type="search" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Company, team, or industry" /></label></div><div className={s.directoryTools}><label className={s.field}>Industry<select value={industryFilter} onChange={e => setIndustryFilter(e.target.value)}><option value="">All industries</option>{industries.map(industry => <option key={industry}>{industry}</option>)}</select></label><span role="status">{visibleTeams.length} {visibleTeams.length === 1 ? "team" : "teams"} shown</span>{(filter || industryFilter) && <button className={s.secondary} onClick={() => { setFilter(''); setIndustryFilter(''); }}>Clear filters</button>}</div><div className={s.grid}>{visibleTeams.map(t => <article key={t.id} className={s.card}><PublicTeamLogo url={t.logo_url} name={t.company} /><span className={s.eyebrow}>{t.industry}</span><h3>{t.company}</h3><p>{t.name}</p>{t.description && <p>{t.description}</p>}<button className={s.secondary} onClick={() => navigate(`#team/${t.slug}`)}>Meet this team →</button></article>)}</div>{!teams.length ? <div className={s.empty}><h3>The 2027 field is taking shape.</h3><p>{lastYearTeams} businesses took the field in 2026. 2027 teams appear here once they register and choose to be listed.</p><div className={s.actions}><button className={s.primary} disabled={!enabled || !registrationOpen} onClick={() => navigate('#captain')}>Register your team</button><button className={s.secondary} onClick={() => navigate('#leaderboard')}>See who played in 2026</button></div></div> : !visibleTeams.length && <p className={s.empty}>No businesses match your search.</p>}</>}
      {mode === 'team' && (teams[0] ? <article className={s.teamDetail}><PublicTeamLogo url={teams[0].logo_url} name={teams[0].company} large /><span className={s.eyebrow}>{teams[0].industry}</span><h2>{teams[0].company}</h2><p className={s.teamName}>{teams[0].name}</p><p>{teams[0].description || 'Taking the field with local businesses in support of Arizona children’s charities.'}</p><div className={s.actions}><button className={s.primary} onClick={() => share(teams[0])}>Invite a friendly rival ↗</button><button className={s.secondary} onClick={() => copyTeam(teams[0])}>Copy team page link</button><button className={s.secondary} disabled={!enabled || !registrationOpen} onClick={() => startFromTeam(teams[0])}>Register your own team</button></div><p className={s.fine}>Public business profile · Participant details are private.</p></article> : <p className={s.empty}>This team isn’t publicly listed. Explore participating businesses or start your own team.</p>)}
      {mode === 'captain' && enabled && (!user ? <div className={s.formCard}><nav className={s.accessChoices} aria-label="Captain journey">{accessMode === 'new' ? <span className={s.accessCurrent} aria-current="page">Register a team <small>Current view</small></span> : <a className={s.accessLink} href="#captain">Register a team</a>}{accessMode === 'returning' ? <span className={s.accessCurrent} aria-current="page">Manage my team <small>Current view</small></span> : <a className={s.accessLink} href="#signin">Manage my team</a>}</nav>{!linkEmail ? <AccessForm googleBusy={googleBusy} googleEnabled={googleEnabled} mode={accessMode} busy={busy || refreshRequired || sessionExpired} submit={submit} onSent={setLinkEmail} /> : <div className={s.linkSent} role="status"><span className={s.eyebrow}>CHECK YOUR INBOX</span><h2>Your team hub is ready to open.</h2><p>We sent a secure sign-in link to <strong>{linkEmail}</strong>. Open it, then choose Continue to team hub. No password or code to enter.</p><p className={s.fine}>If you don’t see it, check spam and your company’s email quarantine, or ask your email administrator to look for mail from teams@scottsdaleolympiad.com. After confirming your email, you can create or reopen your team.</p><div className={s.actions}><button className={s.secondary} disabled={busy} onClick={() => submit('sign-in', { email: linkEmail }, false)}>Send a fresh link</button><button className={s.secondary} disabled={busy} onClick={() => { setLinkEmail(''); setError(''); setNotice(''); markDirty(false); }}>Use another email</button></div></div>}<p className={s.fine}>Sign-in emails give you access to your team. They do not subscribe you to marketing messages.</p></div> : <>{teams.length === 0 && <OlympiadWelcome expanded />}{teams.length ? teams.map(t => <CaptainTeam key={t.id} team={t} industries={industries} clubMembers={clubMembers} email={user.email} busy={busy || refreshRequired || sessionExpired} submit={submit} share={share} refreshRoster={refreshRoster} markDirty={markDirty} />) : registrationOpen ? <Registration email={user.email} busy={busy || refreshRequired || sessionExpired} inviter={inviter} submit={submit} industries={industries} clubMembers={clubMembers} /> : <p className={s.empty}>You’re signed in. New team registration isn’t open for this account yet. Your details have not been submitted.</p>}<details className={s.settings}><summary>Account, sign-in & email preferences</summary><div className={s.account}><p>Signed in as <strong>{user.email}</strong></p><button className={s.secondary} onClick={async () => { const url = `${window.location.origin}/#signin`; try { await navigator.clipboard.writeText(url); setNotice('Return page copied. This is a bookmark, not a personal magic link.'); } catch { setNotice(`Save this team sign-in address: ${url}`); } }}>Copy return page link</button><button className={s.secondary} disabled={busy} onClick={() => submit('sign-out', {})}>Sign out</button></div><p className={s.fine}>Your saved team and roster stay here when you sign out. Bookmark <a href="/#signin">Manage my team</a> to return with the same account. Google or a secure email link will reopen your saved details.</p><EmailPreferences /></details>{registrationOpen && teams.length > 0 && teams.length < 10 && <button className={s.secondary} onClick={() => { if (!dirty.current || window.confirm('Discard unsaved changes?')) { markDirty(false); setAdding(v => !v); } }}>{adding ? 'Cancel new team' : '+ Register another team'}</button>}{registrationOpen && adding && <Registration email={user.email} busy={busy || refreshRequired || sessionExpired} inviter={inviter} submit={submit} industries={industries} clubMembers={clubMembers} />}</>)}
    </>}
  </section>;
}

type Submit = (action: string, body: Record<string, unknown>, refresh?: boolean) => Promise<boolean>;
function splitCaptainName(name = '') { const parts = name.trim().split(/\s+/); return { first: parts.shift() || '', last: parts.join(' ') }; }
type OnboardingDraft = { email: string; company: string; name: string; captain_name: string; captain_first_name: string; captain_last_name: string; captain_phone: string; expires: number };
function readDraft(email: string): Partial<OnboardingDraft> {
 try { const draft = JSON.parse(sessionStorage.getItem('olympiad-onboarding') || 'null'); if (draft && draft.expires > Date.now() && draft.email === email.trim().toLowerCase()) return { ...draft, captain_first_name: draft.captain_first_name ?? splitCaptainName(draft.captain_name).first, captain_last_name: draft.captain_last_name ?? splitCaptainName(draft.captain_name).last }; sessionStorage.removeItem('olympiad-onboarding'); } catch {} return {};
}
function AccessForm({ mode, busy, submit, onSent, googleEnabled, googleBusy }: { googleBusy: boolean; googleEnabled: boolean; mode: 'new' | 'returning'; busy: boolean; submit: Submit; onSent: (email: string) => void }) {
 return <form data-draft="sign-in" onSubmit={async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); const email = String(f.get('email') || '').trim().toLowerCase(); if (await submit('sign-in', { email }, false)) onSent(email); }}><span className={s.eyebrow}>{mode === 'new' ? '01 · YOUR STARTING LINE' : 'WELCOME BACK'}</span><h2>{mode === 'new' ? 'Bring your business to Olympiad.' : 'Back to your team.'}</h2><p>{mode === 'new' ? <>Sign in, then add your <strong>business, team name and captain details.</strong> Add your roster later.</> : <>Use the <strong>same sign-in email</strong> to reopen your saved team and roster.</>}</p>{googleEnabled && <><button type="button" className={s.primary} disabled={busy} onClick={() => void submit('google-sign-in', {}, false)}>{googleBusy ? 'Opening Google…' : 'Continue with Google'}</button><p className={s.fine}>Works with Gmail and Google Workspace. During early access, choose the exact email we invited. Google shares your name and email, not access to your inbox.</p><p className={s.fine}>Or receive a secure link by email</p></>}<label className={s.field}>Your sign-in email<input required type="email" name="email" autoComplete="email" maxLength={254} /></label><button className={s.primary} disabled={busy}>{busy && !googleBusy ? 'Sending your link…' : mode === 'new' ? 'Email my get-started link' : 'Email my sign-in link'}</button>{mode === 'new' && <p className={s.fine}>Six people minimum, including you. $3,000 team fundraising goal. No deposit or payment today.</p>}<div className={s.accountHint}><strong>One account. Your whole team.</strong><ul className={s.quickFacts}><li><strong>Sign-in email:</strong> your account access; business details come next.</li><li><strong>Returning?</strong> Use the same email to reopen your team.</li><li><strong>No password:</strong> use Google or a secure email link.</li></ul></div><details className={s.settings}><summary>What is Olympiad? · The essentials</summary><ul className={s.quickFacts}><li><strong>The experience:</strong> local businesses compete in field-style games and support Arizona children’s charities.</li><li><strong>Your team:</strong> at least six people, including you. Add your roster when ready.</li><li><strong>Fundraising:</strong> $3,000 minimum per team. No deposit or payment today.</li><li><strong>The awards:</strong> industry cups for top fundraising teams; medals for game winners.</li></ul><p className={s.fine}>The 2027 date and event-day details will follow.</p></details></form>;
}
function OlympiadWelcome({ expanded = false }: { expanded?: boolean }) {
 return <details className={s.welcome} open={expanded || undefined}>
  <summary><span><span className={s.eyebrow}>YOUR 30-SECOND WELCOME</span><strong>Welcome to Olympiad.</strong></span><span className={s.welcomeToggle} aria-hidden="true">+</span></summary>
  <div className={s.welcomeBody}>
   <p>Whether it’s your first Olympiad or your tenth, we’re honored to have your support. Good people, friendly competition and a shared purpose: helping Arizona’s kids.</p>
   <h3>Over the next few months, let’s keep it simple.</h3>
   <ol className={s.welcomeSteps}>
    <li><strong>Your team. One hub.</strong><span>Create your team, add at least six people and save contact details and shirt sizes as you go.</span></li>
    <li><strong>A little planning. A big impact.</strong><span>Work toward your $3,000 team goal. Explore Arizona tax credits and sponsorship packages that fit your business.</span></li>
    <li><strong>We’re on your team.</strong><span>We’re here for questions and fundraising help. Opt into email updates below for reminders along the way.</span></li>
   </ol>
   <p>We can’t wait to see you on the field.</p>
   <div className={s.welcomeLinks}><a href="/#fundraising">Explore fundraising & sponsorships →</a><a href="mailto:scaldwell@saguaros.com?subject=Olympiad%202027%20team%20support">How can we help? ↗</a></div>
   <details className={s.taxNote}><summary>How does the Arizona tax credit help?</summary><p>Eligible contributions to a qualifying charity can reduce Arizona state income tax dollar for dollar, up to the applicable limits and your tax liability. You may benefit even if you’re already expecting a refund. This is a nonrefundable credit; it isn’t a guaranteed cash refund. Unused eligible credit can generally carry forward for up to five years.</p><a href="https://azdor.gov/tax-credits/credits-contributions-qcos-and-qfcos" target="_blank" rel="noopener noreferrer">See eligibility and current limits at Arizona Department of Revenue ↗</a><p>2027 fundraising options are being finalized. The hub’s package examples are from the prior-year catalog.</p></details>
  </div>
 </details>;
}
function ClubMemberField({ members, disabled, value }: { members: ClubMember[]; disabled: boolean; value?: string | null }) {
 return <div><label className={s.field}>Referring Saguaros club member <span>(optional)</span><select name="referring_club_member_id" disabled={disabled} defaultValue={value || ''}><option value="">No member / not sure</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><p className={s.fine}>Optional. Used internally for referral tracking; never shown on your public team page.</p></div>;
}
function TeamApproval({ team }: { team: Team }) {
 const status = team.approval_status || 'pending';
 const heading = status === 'approved' ? 'Approved by the chairman' : status === 'needs_changes' ? 'An update is needed' : status === 'declined' ? 'Team not approved' : 'Awaiting chairman approval';
 const copy = status === 'approved' ? team.is_public ? 'Your business can appear in the public directory. Participant details stay private.' : 'Your team is approved. You can opt into the public directory in Team profile & public visibility.' : status === 'needs_changes' ? 'Review the chairman’s feedback below and update your team profile. Your team stays out of the public directory while it is reviewed.' : status === 'declined' ? 'Your team is not listed publicly. Contact the chairman to discuss your submission.' : 'Your submission is saved. You can finish your private roster while the chairman reviews your team. Public listing begins only after approval and your permission.';
 return <aside className={s.approval} aria-label="Team approval"><strong>{heading}</strong><p>{copy}</p>{team.approval_message && <p><strong>Chairman’s message:</strong> {team.approval_message}</p>}{(status === 'needs_changes' || status === 'declined') && <a href="mailto:scaldwell@saguaros.com?subject=Olympiad%202027%20team%20submission">Contact the chairman</a>}</aside>;
}
function Registration({ email, busy, inviter, submit, industries, clubMembers }: { email: string; industries: string[]; clubMembers: ClubMember[]; busy: boolean; inviter: string; submit: Submit }) {
 const [draft, setDraft] = useState<Partial<OnboardingDraft>>({});
 useEffect(() => { setDraft(readDraft(email)); }, [email]);
 function update(field: keyof OnboardingDraft, value: string) { setDraft(current => { const next = { ...current, [field]: value, email: email.trim().toLowerCase(), expires: Date.now() + 30 * 60 * 1000 }; try { sessionStorage.setItem('olympiad-onboarding', JSON.stringify(next)); } catch {} return next; }); }
 return <form data-draft="register" className={s.formCard} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void submit('register', { company: f.get('company'), name: f.get('company'), industry: f.get('industry'), captain_first_name: f.get('captain_first_name'), captain_last_name: f.get('captain_last_name'), captain_phone: f.get('captain_phone'), description: '', is_public: f.get('is_public') === 'on', referring_club_member_id: f.get('referring_club_member_id') || null, invited_by_slug: inviter || null }); }}><ol className={s.progressSteps} aria-label="Team setup"><li>Account verified</li><li aria-current="step">Create your team</li><li>Add people later</li></ol><h2>Make it your team.</h2><p>Add your <strong>business and captain details</strong> to get started. <strong>Your roster can come later.</strong></p><div className={s.formGrid}><label className={s.field}>Business / team name<input name="company" required value={draft.company || ''} onChange={e => update('company', e.target.value)} maxLength={120} autoComplete="organization" /><span>The name we’ll use for your team throughout Olympiad.</span></label><label className={s.field}>Industry<select name="industry" required defaultValue=""><option value="" disabled>Select your industry</option>{industries.map(i => <option key={i}>{i}</option>)}</select></label><label className={s.field}>Your first name<input name="captain_first_name" required pattern=".*\S.*" title="Enter your first name." value={draft.captain_first_name || ''} onChange={e => update('captain_first_name', e.target.value)} maxLength={120} autoComplete="given-name" /></label><label className={s.field}>Your last name<input name="captain_last_name" required pattern=".*\S.*" title="Enter your last name." value={draft.captain_last_name || ''} onChange={e => update('captain_last_name', e.target.value)} maxLength={120} autoComplete="family-name" /></label><label className={s.field}>Your phone<input name="captain_phone" required value={draft.captain_phone || ''} onChange={e => update('captain_phone', e.target.value)} type="tel" maxLength={40} autoComplete="tel" /></label></div><ClubMemberField members={clubMembers} disabled={busy} /><p className={s.fine}>Captain & sign-in email: {email}. Return with this same account to manage your team. Your business name can be different from your email domain.</p><label className={s.check}><input name="is_public" type="checkbox" /><span>Show our business, team name and industry in the public directory after chairman approval. Participant names and contact details stay private.</span></label><p className={s.fine}>Your team commits to at least six people and a $3,000 fundraising goal. Fundraising collection is not open; no payment is collected here.</p><button className={s.primary} disabled={busy}>{busy ? 'Creating your team…' : 'Submit team & continue'}</button></form>;
}
function missingPersonDetails(person: Person) {
 return [
  ['name', 'full name'], ['email', 'email'], ['phone', 'phone'],
  ['shirt_fit', 'shirt fit'], ['shirt_size', 'shirt size'],
 ].filter(([field]) => !person[field as keyof Person]?.trim()).map(([, label]) => label);
}
function RosterCard({ person, index, expanded, busy, onToggle, onOpen, onChange, onRemove }: {
 person: Person; index: number; expanded: boolean; busy: boolean;
 onToggle: () => void; onOpen: () => void;
 onChange: (field: keyof Person, value: string) => void; onRemove: () => void;
}) {
 const detailsId = useId();
 const name = person.name.trim() || `Participant ${index + 1}`;
 const missing = missingPersonDetails(person);
 const shirt = [person.shirt_fit === 'male' ? 'Male fit' : person.shirt_fit === 'female' ? 'Female fit' : '', person.shirt_size].filter(Boolean).join(' · ');
 return <article className={s.rosterCard}>
  <button type="button" className={s.personSummary} disabled={busy} aria-expanded={expanded} aria-controls={detailsId} aria-label={`${expanded ? 'Close' : 'Edit'} ${name} details`} onClick={onToggle}>
   <span className={s.personNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
   <span className={s.personIdentity}><strong>{name}</strong><span>{shirt || 'Shirt details needed'}</span><small className={missing.length ? s.personIncomplete : s.personReady}>{missing.length ? `${missing.length} ${missing.length === 1 ? 'detail' : 'details'} missing` : 'All details complete'}</small></span>
   <svg className={s.personChevron} aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
  </button>
  <fieldset id={detailsId} className={s.personFields} hidden={!expanded} disabled={busy} onInvalidCapture={event => { const field = event.target as HTMLInputElement; onOpen(); requestAnimationFrame(() => field.focus()); }}>
   <legend className={s.visuallyHidden}>Participant {index + 1}</legend>
   {missing.length > 0 && <p className={s.personHint}><strong>Still needed:</strong> {missing.join(', ')}. You can save a partial roster.</p>}
   <div className={s.formGrid}>
    <label className={s.field}>Full name<input value={person.name} maxLength={120} onChange={e => onChange('name', e.target.value)} autoComplete="off" enterKeyHint="next" /></label>
    <label className={s.field}>Email<input type="email" inputMode="email" autoCapitalize="none" spellCheck={false} value={person.email} maxLength={254} onChange={e => onChange('email', e.target.value)} autoComplete="off" enterKeyHint="next" /></label>
    <label className={s.field}>Phone<input type="tel" inputMode="tel" value={person.phone} maxLength={40} onChange={e => onChange('phone', e.target.value)} autoComplete="off" enterKeyHint="next" /></label>
    <label className={s.field}>Shirt fit<select value={person.shirt_fit} onChange={e => onChange('shirt_fit', e.target.value)}><option value="">Choose later</option><option value="male">Male</option><option value="female">Female</option></select></label>
    <label className={s.field}>Shirt size<select value={person.shirt_size} onChange={e => onChange('shirt_size', e.target.value)}><option value="">Choose later</option>{['XS','S','M','L','XL','2XL','3XL'].map(size => <option key={size}>{size}</option>)}</select></label>
   </div>
   <div className={s.personActions}><button type="button" className={s.secondary} onClick={onToggle}>Done editing</button><button className={s.remove} type="button" aria-label={`Remove participant ${index + 1}`} onClick={onRemove}>Remove participant</button></div>
   <p className={s.personHint}>Changes save automatically when you pause typing.</p>
  </fieldset>
 </article>;
}
function CaptainTeam({ team, industries, clubMembers, email, busy, submit, share, refreshRoster, markDirty }: { team: Team; industries: string[]; clubMembers: ClubMember[]; email: string; busy: boolean; submit: (action: string, body: Record<string, unknown>, refresh?: boolean) => Promise<boolean>; share: (team?: Team) => Promise<void>; refreshRoster: (teamId: string) => Promise<void>; markDirty: (value: boolean, formId?: string) => void }) {
 const captain = (): Person => ({ ...blankPerson(), name: team.captain_name || '', email, phone: team.captain_phone || '' });
 const [roster, setRoster] = useState<Person[]>(team.roster ?? [captain()]);
 const [showRoster, setShowRoster] = useState(true);
 const [expandedParticipant, setExpandedParticipant] = useState<number | null>(null);
 const [logo, setLogo] = useState(team.logo);
 const [webLogo,setWebLogo]=useState(team.logo_url);
 const profilePanel = useRef<HTMLDetailsElement>(null);
 const rosterPanel = useRef<HTMLFormElement>(null);
 const logoPanel = useRef<HTMLDetailsElement>(null);
 useEffect(() => {setLogo(team.logo);},[team.logo]);
 const [saved, setSaved] = useState(false);
 const [rosterDirty, setRosterDirty] = useState(false);
 const [saveProblem, setSaveProblem] = useState('');
 const lastAttempt = useRef('');
 const saveInFlight = useRef(false);
 const saveCurrent = useRef<() => Promise<void>>(async () => {});
 saveCurrent.current = async () => {
   if (busy || saveInFlight.current || !rosterDirty) return;
   const snapshot = JSON.stringify(roster);
   lastAttempt.current = snapshot;
   try { validateRoster(roster); }
   catch (error) { setSaveProblem(error instanceof Error ? error.message + ' Your edits are still here.' : 'Check your roster details.'); return; }
   saveInFlight.current = true;
   setSaveProblem('');
   const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
   try {
     const ok = await submit('save-roster', { team_id: team.id, expected_version: team.roster_version ?? 0, roster }, false);
     setSaved(ok);
     if (ok) setRosterDirty(false);
     else setSaveProblem('Autosave paused. Your edits are still here. Resolve the message above, then retry saving.');
   } finally {
     saveInFlight.current = false;
     requestAnimationFrame(() => {
       if (focused?.isConnected && document.activeElement === document.body) focused.focus({ preventScroll: true });
     });
   }
 };
 useEffect(() => {
   if (!rosterDirty || busy || JSON.stringify(roster) === lastAttempt.current) return;
   const timer = window.setTimeout(() => { void saveCurrent.current(); }, 1200);
   return () => window.clearTimeout(timer);
 }, [roster, rosterDirty, busy]);
 const displayedRosterVersion = useRef(team.roster_version);
 useEffect(() => {
   setRoster(team.roster ?? [captain()]); setRosterDirty(false); setSaveProblem(''); lastAttempt.current = '';
   if (displayedRosterVersion.current !== team.roster_version) setSaved(true);
   displayedRosterVersion.current = team.roster_version;
 }, [team.roster_version, team.roster]);
 const savedCount = (team.roster || []).length;
 const savedComplete = (team.roster || []).filter(p => p.name && p.email && p.phone && p.shirt_fit && p.shirt_size).length;
 const complete = roster.filter(p => missingPersonDetails(p).length === 0).length;
 function openRoster() {setShowRoster(true);setExpandedParticipant(roster.findIndex(p => missingPersonDetails(p).length > 0));requestAnimationFrame(() => rosterPanel.current?.scrollIntoView({block:'start'}));}
 function openProfile() {if(profilePanel.current){profilePanel.current.open=true;profilePanel.current.scrollIntoView({block:'start'});}}
 const hasLogo = !!logo || !!webLogo;
 const steps: ProgressStep[] = [
  { key: 'profile', title: 'Business & captain details', done: true, detail: 'Saved. Update your profile anytime.', action: 'Edit profile', onAction: openProfile },
  { key: 'roster', title: 'Six people on your roster', done: savedCount >= 6, detail: savedCount >= 6 ? `${savedCount} people saved, including you.` : `${savedCount} of 6 saved. Add ${6 - savedCount} more, including yourself.`, action: 'Add people', onAction: openRoster },
  { key: 'details', title: 'Contact info & shirt sizes', done: savedCount > 0 && savedComplete === savedCount, detail: savedCount > savedComplete ? `${savedCount - savedComplete} ${savedCount - savedComplete === 1 ? 'person needs' : 'people need'} an email, phone or shirt size.` : 'Every saved teammate has contact details and a shirt size.', action: 'Finish details', onAction: openRoster },
  { key: 'logo', title: 'Business logo', done: hasLogo, detail: hasLogo ? (logo ? logo.filename : 'Web logo saved.') : 'Shown on your team page and the 2027 leaderboard.', action: 'Add logo', onAction: () => { if (logoPanel.current) { logoPanel.current.open = true; logoPanel.current.scrollIntoView({block:'start'}); } } },
  { key: 'intro', title: 'Team introduction', done: !!team.description?.trim(), detail: team.description?.trim() ? 'Your team page has an introduction.' : 'A sentence or two about your team for your public page.', action: 'Write intro', onAction: openProfile },
 ];
 function update(index: number, field: keyof Person, value: string) { lastAttempt.current = ''; markDirty(true, `roster-${team.id}`); setSaveProblem(''); setSaved(false); setRosterDirty(true); setRoster(rows => rows.map((p, i) => i === index ? { ...p, [field]: value } : p)); }
 return <div className={s.workspace}><TeamApproval team={team} /><div className={s.sectionHead}><div>{team.company !== team.name && <span className={s.eyebrow}>{team.company}</span>}<h2>{team.name}</h2><p>{savedComplete} saved complete profiles · Minimum six, including the captain</p></div></div><CaptainProgress approval={team.approval_status || 'pending'} steps={steps} />{team.approval_status !== 'declined' && <RosterLink teamId={team.id} teamName={team.name} captainName={team.captain_name} disabled={busy} onRefresh={() => void refreshRoster(team.id)} />}<details ref={profilePanel} className={s.settings}><summary>Team profile & public visibility</summary><form data-draft={`profile-${team.id}`} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void submit('update-team', { team_id: team.id, company: f.get('company'), industry: f.get('industry'), captain_first_name: f.get('captain_first_name'), captain_last_name: f.get('captain_last_name'), captain_phone: f.get('captain_phone'), name: f.get('company') === team.company ? team.name : f.get('company'), description: f.get('description'), is_public: f.get('is_public') === 'on', referring_club_member_id: f.get('referring_club_member_id') || null }); }}><label className={s.field}>Business / team name<input disabled={busy} required name="company" defaultValue={team.company} maxLength={120} autoComplete="organization" /><span>The name we’ll use for your team throughout Olympiad.</span></label><label className={s.field}>Industry<select disabled={busy} required name="industry" defaultValue={team.industry}>{industries.map(industry => <option key={industry}>{industry}</option>)}</select></label><label className={s.field}>Captain first name<input disabled={busy} required name="captain_first_name" pattern=".*\S.*" title="Enter your first name." defaultValue={splitCaptainName(team.captain_name).first} maxLength={120} autoComplete="given-name" /></label><label className={s.field}>Captain last name<input disabled={busy} required name="captain_last_name" pattern=".*\S.*" title="Enter your last name." defaultValue={splitCaptainName(team.captain_name).last} maxLength={120} autoComplete="family-name" /></label><label className={s.field}>Captain phone<input disabled={busy} required type="tel" name="captain_phone" defaultValue={team.captain_phone} maxLength={40} autoComplete="tel" /></label><ClubMemberField members={clubMembers} disabled={busy} value={team.referring_club_member_id} /><p className={s.fine}>Sign-in email: {email}. Updating captain contact details does not change existing participant roster entries. Changing the business, team name, industry or referring member may return your team to chairman review.</p><label className={s.field}>Team introduction<textarea disabled={busy} name="description" defaultValue={team.description} rows={3} maxLength={500} /></label><label className={s.check}><input disabled={busy} type="checkbox" name="is_public" defaultChecked={team.is_public} /><span>Show our business publicly after chairman approval. Only company, team name, industry, and introduction are shared. Participant details stay private.</span></label><button className={s.primary} disabled={busy}>Save team profile</button></form></details><form ref={rosterPanel} hidden={!showRoster} onKeyDown={event => { if (event.key === 'Enter' && event.target instanceof HTMLSelectElement) event.preventDefault(); }} data-draft={`roster-${team.id}`} onSubmit={e => { e.preventDefault(); void saveCurrent.current(); }}><div className={s.sectionHead}><div><h3>Private participant roster</h3><p className={s.fine}><strong>{roster.length} {roster.length === 1 ? 'person' : 'people'} · {complete} complete</strong><br/>Tap a name to edit. Changes save automatically.</p><p className={s.fine}>Include yourself. Add what you know and finish later. Get permission before entering teammates’ contact information.</p></div></div><div className={s.rosterList}>{roster.map((p, index) => <RosterCard key={index} person={p} index={index} expanded={expandedParticipant === index} busy={busy} onToggle={() => setExpandedParticipant(current => current === index ? null : index)} onOpen={() => setExpandedParticipant(index)} onChange={(field, value) => update(index, field, value)} onRemove={() => { lastAttempt.current = ''; setSaveProblem(''); setRoster(rows => rows.filter((_, i) => i !== index)); setExpandedParticipant(null); setSaved(false); setRosterDirty(true); markDirty(true, `roster-${team.id}`); }} />)}</div><div className={`${s.actions} ${s.rosterActions}`}><button type="button" className={s.secondary} disabled={busy || roster.length >= 50} onClick={() => { setExpandedParticipant(roster.length); setRoster(rows => rows.length < 50 ? [...rows, blankPerson()] : rows); }}>+ Add participant</button>{roster.length >= 50 && <span>Maximum 50 participants.</span>}<button className={s.secondary} disabled={busy || !rosterDirty}>{busy ? 'Saving…' : saveProblem ? 'Retry save' : 'Save now'}</button><span role="status" aria-live="polite">{busy && rosterDirty ? 'Saving roster…' : saveProblem || (rosterDirty ? 'Waiting to save…' : saved ? 'All roster changes saved.' : 'Roster saves automatically.')}</span></div><p className={s.fine}>Saving a roster does not send invitations or enroll participants in email or SMS campaigns.</p></form><details ref={logoPanel} className={s.settings}><summary>{logo || webLogo ? 'Business logo · uploaded' : 'Add your business logo'}</summary><TeamLogo teamId={team.id} initialLogo={logo} initialPublicUrl={webLogo} onPublicSaved={setWebLogo} onSaved={setLogo} /></details><details className={s.settings}><summary>Share your public team page & invite businesses</summary><ShareKit company={team.company} slug={team.slug} approved={team.approval_status === 'approved'} isPublic={!!team.is_public} onInviteRival={() => share(team)} onOpenProfile={openProfile} /></details></div>;
}
