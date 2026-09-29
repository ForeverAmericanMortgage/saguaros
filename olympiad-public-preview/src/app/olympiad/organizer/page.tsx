'use client';

import { useEffect, useState, type FormEvent } from 'react';
import styles from './organizer.module.css';
import Communications from './Communications';
import AudienceSync from './AudienceSync';
import SeasonOverview from './SeasonOverview';

type Followup = { status: string; assigned_to: string; notes: string; next_follow_up: string | null; updated_at: string };
type ClubMember = { id: string; name: string };
type MemberCredit = { member_id: string; member_name: string; team_count: number; total_cents: number };
type TeamHistory = 'unclassified' | 'new' | 'returning';
const historyLabels: Record<TeamHistory,string> = {unclassified:'Not yet classified',new:'New team',returning:'Returning team'};
type Review = { participation_history: TeamHistory; referring_club_member_id: string | null; referring_club_member_name: string; status: 'pending' | 'approved' | 'needs_changes' | 'declined'; message: string; version: number };
const reviewLabels: Record<Review['status'], string> = { pending: 'Pending review', approved: 'Approved', needs_changes: 'Changes requested', declined: 'Declined' };
type Team = { participation_history: TeamHistory; referring_club_member_id: string | null; approval_status: Review['status']; approval_message: string; approval_version: number; referring_club_member_name: string; duplicate_candidates: { id: string; name: string; company: string; reason: string }[]; followup?: Followup | null; id: string; name: string; company: string; industry: string; captain_name: string; captain_phone?: string; missing?: { name: number; email: number; phone: number; shirt: number }; listed: number; complete: number; needs_follow_up: boolean; is_public: boolean; stretch_goal_cents?: number };
class OrganizerRequestError extends Error { constructor(message: string, public status: number) { super(message); } }
async function readResponse(response: Response) { const data = await response.json(); if (!response.ok) throw new OrganizerRequestError(data.error || 'Unable to load teams.', response.status); return data; }
const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
export default function OrganizerPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [memberCredit, setMemberCredit] = useState<MemberCredit[]>([]);
  const [creditNeedsRefresh, setCreditNeedsRefresh] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState('');
  const [fundraisingActive, setFundraisingActive] = useState(false);
  const [revision, setRevision] = useState(0);
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [reviewFilter, setReviewFilter] = useState('active');
  function clearPrivateOverview() { setTeams([]); setClubMembers([]); setMemberCredit([]); setCreditNeedsRefresh(false); setLoadedAt(''); setFundraisingActive(false); setError('Organizer access is required. Please sign in again.'); }
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    fetch('/olympiad/api/pilot?action=organizer', { cache: 'no-store', signal: controller.signal })
      .then(readResponse)
      .then(data => { setTeams(data.teams); setClubMembers(data.club_members || []); setMemberCredit(data.member_credit || []); setCreditNeedsRefresh(false); setFundraisingActive(data.fundraising_active === true); setLoadedAt(new Date().toLocaleString()); })
      .catch(e => { if (e instanceof OrganizerRequestError && [401,403].includes(e.status)) clearPrivateOverview(); else if (e.name !== 'AbortError') setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  const activeTeams = teams.filter(t => t.approval_status !== 'declined');
  const today = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Phoenix',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const dueTeams = activeTeams.filter(t => t.followup?.next_follow_up && t.followup.next_follow_up <= today && t.followup.status !== 'complete');
  const readyCount = activeTeams.filter(t => !t.needs_follow_up).length;
  const industryCounts = Array.from(new Set(activeTeams.map(t => t.industry))).map(name => ({name, count: activeTeams.filter(t => t.industry === name).length}));
  const selectQueue = (value: string) => { setReviewFilter(value); setFollowUpOnly(false); setSearch(''); };
  const visible = teams.filter(t => (reviewFilter === 'all' || (reviewFilter === 'active' && t.approval_status !== 'declined') || (reviewFilter === 'due' && dueTeams.some(d => d.id === t.id)) || t.approval_status === reviewFilter) && (!followUpOnly || t.needs_follow_up) && `${t.name} ${t.company} ${t.industry} ${t.captain_name} ${t.followup?.assigned_to || ""}`.toLowerCase().includes(search.toLowerCase()));
  return <main className={styles.main}>
    <a href="/#signin">← Team sign in</a>
    <header><p className={styles.eyebrow}>OLYMPIAD 2027 · ORGANIZER</p><h1>Chairman dashboard</h1><p>Your team pipeline, priorities and event readiness in one place.</p><div className={styles.refresh}><button disabled={loading} onClick={() => setRevision(v => v + 1)}>{loading ? 'Refreshing…' : 'Refresh team overview'}</button>{loadedAt && <span>Last loaded {loadedAt}</span>}</div></header>
    {loading && !loadedAt && <p role="status">Loading your organizer overview…</p>}
    {error && <section role="alert"><h2>We couldn’t refresh this overview</h2><p>{error}</p><a href="/#signin">Go to captain sign-in →</a></section>}
    {loadedAt && <>
      <SeasonOverview approved={activeTeams.filter(t => t.approval_status === 'approved').length} active={activeTeams.length} ready={readyCount} due={dueTeams.length} pending={activeTeams.filter(t => t.approval_status === 'pending').length} fundraisingActive={fundraisingActive} onQueue={queue => { if(queue === 'roster'){selectQueue('active');setFollowUpOnly(true);}else selectQueue(queue);document.getElementById('team-actions')?.scrollIntoView({behavior:'smooth'});}} />
      <div className={styles.stats}>
        <section><strong>{activeTeams.length}</strong><span>Active teams signed up</span><small>{teams.filter(t => t.approval_status === 'declined').length} declined · excluded</small></section>
        <section><strong>{activeTeams.filter(t => t.approval_status === 'approved').length}</strong><span>Approved teams</span><small>Public listing also needs captain opt-in</small></section>
        <section><strong>{readyCount}/{activeTeams.length}</strong><span>Rosters ready</span><small>Six or more complete participant profiles</small></section>
        <section><strong>{activeTeams.reduce((sum,t) => sum+t.listed,0)}</strong><span>Participants listed</span><small>{activeTeams.reduce((sum,t) => sum+t.complete,0)} profiles complete</small></section>
      </div>
      <section id="team-actions"><h2>Action items</h2><p>Choose a priority to filter the teams below.</p><div className={styles.actionGrid}>
        <button onClick={() => selectQueue('pending')}>{activeTeams.filter(t => t.approval_status === 'pending').length} awaiting approval →</button>
        <button onClick={() => { selectQueue('active'); setFollowUpOnly(true); }}>{activeTeams.filter(t => t.needs_follow_up).length} need roster follow-up →</button>
        <button onClick={() => selectQueue('due')}>{dueTeams.length} follow-ups due →</button>
        <button onClick={() => selectQueue('needs_changes')}>{activeTeams.filter(t => t.approval_status === 'needs_changes').length} awaiting captain changes →</button>
      </div><p className={styles.caption}>Follow-ups use Arizona dates. Counts include private pilot test teams until those records are retired.</p></section>
      <div className={styles.insights}>
        <section><h2>Teams by industry</h2>{industryCounts.length ? industryCounts.map(row => <div key={row.name} className={styles.barRow}><span>{row.name} <strong>{row.count}</strong></span><meter min={0} max={Math.max(1,activeTeams.length)} value={row.count} aria-label={`${row.name}: ${row.count} teams`} /></div>) : <p>No active teams yet.</p>}</section>
        <section><h2>Fundraising activity</h2><strong className={styles.phase}>{fundraisingActive ? 'Tracking enabled' : 'Not active yet'}</strong><p>{fundraisingActive ? 'Member credit appears below when approved teams are assigned. A transaction activity feed is not yet available here.' : 'Purchase integration is pending. No live fundraising activity is available in this dashboard yet.'}</p><p><strong>{money(activeTeams.length * 300000)}</strong> combined minimum goal</p><p><strong>{money(activeTeams.reduce((sum,t) => sum+(t.stretch_goal_cents ?? 300000),0))}</strong> combined team targets</p><p className={styles.caption}>Planning targets, not money raised. Includes active private test teams.</p></section>
      </div>
      <section><div className={styles.filters}><label>Find a team<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Business, captain, industry or liaison" /></label><label>Team review<select value={reviewFilter} onChange={e => setReviewFilter(e.target.value)}><option value="active">Active teams</option><option value="due">Follow-ups due</option><option value="all">All teams, including declined</option>{Object.entries(reviewLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className={styles.check}><input type="checkbox" checked={followUpOnly} onChange={e => setFollowUpOnly(e.target.checked)} />Only incomplete rosters</label></div>
        <p>A complete record includes name, email, phone, shirt size and fit. Each team needs at least six people.</p><p>{fundraisingActive ? 'Team goals are shown below.' : 'Fundraising is not active. Goals are planning targets; no donations or transaction credit are collected here.'}</p>
        {teams.length ? <ul className={styles.list}>{teams.map(t => <li key={t.id} hidden={!visible.some(row => row.id === t.id)}><div><h2>{t.name}</h2><p>{t.company} · {t.industry}</p><p>Captain: {t.captain_name || 'Not recorded'}</p>{t.captain_phone && <p>Captain phone: <a href={`tel:${t.captain_phone.replace(/[^+0-9]/g, '')}`}>{t.captain_phone}</a></p>}<strong>{t.complete} of {t.listed} records complete</strong>{t.listed < 6 && <p>{6 - t.listed} more participants needed to reach six.</p>}{t.missing && t.complete < t.listed && <p>Missing details: {Object.entries(t.missing).filter(([, count]) => count > 0).map(([field, count]) => `${count} ${field === 'shirt' ? 'shirt preferences' : field}`).join(' · ')}</p>}<p>{t.needs_follow_up ? 'Roster follow-up needed' : 'Roster ready'} · {t.is_public ? (t.approval_status === 'approved' ? 'Approved · Public team page' : 'Public listing requested · Hidden until approved') : 'Captain chose a private team page'}</p></div><div className={styles.teamControls}><ReviewForm team={t} clubMembers={clubMembers} onAccessDenied={clearPrivateOverview} onSaved={review => { setTeams(current => current.map(team => team.id === t.id ? { ...team, participation_history: review.participation_history, approval_status: review.status, approval_message: review.message, approval_version: review.version, referring_club_member_id: review.referring_club_member_id, referring_club_member_name: review.referring_club_member_name } : team)); setCreditNeedsRefresh(true); }} /><FollowupForm team={t} onAccessDenied={clearPrivateOverview} onSaved={followup => setTeams(current => current.map(team => team.id === t.id ? { ...team, followup } : team))} /><GoalForm team={t} onAccessDenied={clearPrivateOverview} onSaved={cents => setTeams(current => current.map(team => team.id === t.id ? { ...team, stretch_goal_cents: cents } : team))} /></div></li>)}</ul> : <p>No teams have registered yet. Real registrations will appear here.</p>}{teams.length > 0 && visible.length === 0 && <p>No teams match these filters.</p>}
      </section>
      {(memberCredit.length > 0 || creditNeedsRefresh) && <section><p className={styles.eyebrow}>PRIVATE · MEMBER FUNDRAISING CREDIT</p><h2>Member associations</h2><p>{fundraisingActive ? 'Verified team fundraising credited to associated club members.' : 'Fundraising is not active. These are planned associations and current verified ledger totals.'} Only approved, assigned teams are included. Member credit represents the same team dollars, not additional revenue.</p>{creditNeedsRefresh && <p role="status">Review or association changed. Refresh the team overview to update this summary; the figures below are from the last overview load.</p>}{memberCredit.length > 0 && <ul className={styles.creditList}>{memberCredit.map(row => <li key={row.member_id}><strong>{row.member_name}</strong><span>{row.team_count} approved {row.team_count === 1 ? 'team' : 'teams'} · {money(row.total_cents)}</span></li>)}</ul>}</section>}
      <AudienceSync />
      <Communications />
    </>}
  </main>;
}
function GoalForm({ team, onSaved, onAccessDenied }: { team: Team; onAccessDenied: () => void; onSaved: (cents: number) => void }) {
  const savedCents = team.stretch_goal_cents ?? 300000;
  const [value, setValue] = useState(String(savedCents / 100));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { if (!dirty) setValue(String(savedCents / 100)); }, [savedCents, dirty]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  async function save(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice('');
    const dollars = Number(value); const cents = Math.round(dollars * 100);
    if (!/^\d+(\.\d{1,2})?$/.test(value) || !Number.isFinite(dollars) || dollars < 3000 || dollars > 10000000 || !Number.isSafeInteger(cents)) { setError('Enter a goal from $3,000 to $10,000,000 with no more than two decimal places.'); return; }
    setBusy(true);
    try { const response = await fetch('/olympiad/api/pilot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set-goal', team_id: team.id, stretch_goal_cents: cents }) }); await readResponse(response); onSaved(cents); setDirty(false); setNotice(`Goal saved: ${money(cents)}.`); } catch (e) { if (e instanceof OrganizerRequestError && [401,403].includes(e.status)) onAccessDenied(); else setError(e instanceof Error ? e.message : 'Unable to save this goal.'); } finally { setBusy(false); }
  }
  return <form className={styles.goalForm} onSubmit={save}><label htmlFor={`goal-${team.id}`}>Team stretch goal ($)</label><input id={`goal-${team.id}`} aria-describedby={`goal-hint-${team.id}`} type="number" inputMode="decimal" min="3000" max="10000000" step="0.01" required value={value} disabled={busy} onChange={e => { setValue(e.target.value); setDirty(true); setNotice(''); }} /><p id={`goal-hint-${team.id}`}>Saved target: {money(savedCents)} · $3,000 minimum</p><button disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save goal'}</button>{dirty && <span className={styles.unsaved}>Unsaved goal</span>}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}</form>;
}

function FollowupForm({ team, onSaved, onAccessDenied }: { team: Team; onAccessDenied: () => void; onSaved: (value: Followup | null) => void }) {
  const empty = { status: 'not_contacted', assigned_to: '', notes: '', next_follow_up: '', updated_at: '' };
  const [draft, setDraft] = useState<Followup>(team.followup || empty);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false);
  useEffect(() => { if (!dirty) setDraft(team.followup || empty); }, [team.followup, dirty]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  function change(field: keyof Followup, value: string) { setDraft(current => ({ ...current, [field]: value })); setDirty(true); setNotice(''); }
  async function loadLatest() {
    setBusy(true); setError('');
    try {
      const data = await readResponse(await fetch('/olympiad/api/pilot?action=organizer', { cache: 'no-store' }));
      const latest = (data.teams as Team[]).find(row => row.id === team.id);
      if (!latest) throw new Error('This team is no longer available. Refresh the overview.');
      setDraft(latest.followup || empty); onSaved(latest.followup || null); setDirty(false); setConflict(false); setNotice('Latest saved follow-up loaded. Your unsaved changes were discarded.');
    } catch (e) { if (e instanceof OrganizerRequestError && [401,403].includes(e.status)) onAccessDenied(); else setError(e instanceof Error ? e.message : 'Unable to reload follow-up.'); } finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/olympiad/api/pilot', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'save-followup',team_id:team.id,...draft,expected_updated_at:draft.updated_at || null}) });
      const data = await readResponse(response);
      setDraft(data.followup); onSaved(data.followup); setDirty(false); setConflict(false); setNotice('Follow-up saved.');
    } catch (e) { if (e instanceof OrganizerRequestError && [401,403].includes(e.status)) onAccessDenied(); else { if (e instanceof OrganizerRequestError && e.status === 409) setConflict(true); setError(e instanceof Error ? e.message : 'Unable to save follow-up.'); } } finally { setBusy(false); }
  }
  return <form className={styles.goalForm} onSubmit={save}><h3>Private organizer follow-up</h3><label>Status<select disabled={busy} value={draft.status} onChange={e => change('status',e.target.value)}><option value="not_contacted">Not contacted</option><option value="contacted">Contacted</option><option value="waiting">Waiting for captain</option><option value="complete">Follow-up complete</option></select></label><label>Assigned liaison or organizer<input disabled={busy} maxLength={120} value={draft.assigned_to} onChange={e => change('assigned_to',e.target.value)} /></label><p>For coordination only; this does not grant account access.</p><label>Next follow-up<input disabled={busy} type="date" value={draft.next_follow_up || ''} onChange={e => change('next_follow_up',e.target.value)} /></label><label>Notes<textarea disabled={busy} maxLength={2000} rows={3} value={draft.notes} onChange={e => change('notes',e.target.value)} /></label><button disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save follow-up'}</button>{dirty && <span className={styles.unsaved}>Unsaved follow-up</span>}{error && <p role="alert">{error}</p>}{conflict && <div><p>Another session saved a newer follow-up. Copy any notes you want to keep, then load the latest saved version. This discards your unsaved changes.</p><button type="button" disabled={busy} onClick={loadLatest}>Load latest saved follow-up</button></div>}{notice && <p role="status">{notice}</p>}</form>;
}

function ReviewForm({ team, clubMembers, onSaved, onAccessDenied }: { team: Team; clubMembers: ClubMember[]; onSaved: (review: Review) => void; onAccessDenied: () => void }) {
  const saved = { participation_history: team.participation_history || 'unclassified', referring_club_member_id: team.referring_club_member_id, referring_club_member_name: team.referring_club_member_name || '', status: team.approval_status, message: team.approval_message || '', version: team.approval_version };
  const [draft, setDraft] = useState<Review>(saved);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false);
  useEffect(() => { if (!dirty) setDraft({ participation_history: team.participation_history || 'unclassified', referring_club_member_id: team.referring_club_member_id, referring_club_member_name: team.referring_club_member_name || '', status: team.approval_status, message: team.approval_message || '', version: team.approval_version }); }, [team.participation_history, team.approval_status, team.approval_message, team.approval_version, team.referring_club_member_id, team.referring_club_member_name, dirty]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  function failed(e: unknown) { if (e instanceof OrganizerRequestError && [401,403].includes(e.status)) onAccessDenied(); else { if (e instanceof OrganizerRequestError && e.status === 409) setConflict(true); setError(e instanceof Error ? e.message : 'Unable to save team review.'); } }
  async function loadLatest() {
    setBusy(true); setError('');
    try {
      const data = await readResponse(await fetch('/olympiad/api/pilot?action=organizer', { cache: 'no-store' }));
      const latest = (data.teams as Team[]).find(row => row.id === team.id);
      if (!latest) throw new Error('This team is no longer available. Refresh the overview.');
      const review = { participation_history: latest.participation_history || 'unclassified', referring_club_member_id: latest.referring_club_member_id, referring_club_member_name: latest.referring_club_member_name || '', status: latest.approval_status, message: latest.approval_message || '', version: latest.approval_version };
      setDraft(review); onSaved(review); setDirty(false); setConflict(false); setNotice('Latest review loaded. Unsaved review changes discarded.');
    } catch (e) { failed(e); } finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const data = await readResponse(await fetch('/olympiad/api/pilot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'review-team', participation_history: draft.participation_history, team_id: team.id, status: draft.status, message: draft.message, referring_club_member_id: draft.referring_club_member_id, expected_version: draft.version }) }));
      setDraft(data.review); onSaved(data.review); setDirty(false); setConflict(false); setNotice('Team review saved. The captain can see this status and message in their hub.'); window.dispatchEvent(new Event('olympiad-audience-changed'));
    } catch (e) { failed(e); } finally { setBusy(false); }
  }
  return <form className={styles.goalForm} onSubmit={save}>
    <h3>Chairman team review</h3><p><strong>Saved status: {reviewLabels[team.approval_status]}</strong></p>
    <p>Saved audience: {historyLabels[team.participation_history || 'unclassified']}</p>
    <aside><strong>Suggested outreach</strong><p>{team.approval_status !== 'approved' ? 'Finish the team review before campaign outreach.' : team.participation_history === 'unclassified' ? 'Classify this team to choose the right welcome message.' : team.participation_history === 'returning' ? 'Welcome back: introduce the new hub and what is easier this year.' : 'New-team orientation: explain the games, community impact and next steps.'}</p>{team.approval_status === 'approved' && team.needs_follow_up && <p>Next action: a friendly roster reminder. Invite the captain to add missing participants and details.</p>}<p>Registered teams should leave recruitment campaigns. Recommendations do not enroll contacts or send email.</p></aside>
    <p>Saved member association: {team.referring_club_member_name || 'Not assigned'}</p>
    {!!team.duplicate_candidates?.length && <div className={styles.reviewWarning}><strong>Possible duplicate businesses</strong><ul>{team.duplicate_candidates.map(candidate => <li key={candidate.id}>{candidate.name} · {candidate.company}<br />{candidate.reason}</li>)}</ul><p>Review these similarities before deciding. No teams are automatically merged or declined.</p></div>}
    <label>Review decision<select disabled={busy} value={draft.status} onChange={e => { setDraft(current => ({ ...current, status: e.target.value as Review['status'] })); setDirty(true); setNotice(''); }}>{Object.entries(reviewLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>Team history · private<select disabled={busy} value={draft.participation_history} onChange={e => {setDraft(current => ({...current,participation_history:e.target.value as TeamHistory}));setDirty(true);setNotice('');}}>{Object.entries(historyLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <p>Chairman classification for outreach planning. It is not displayed on public team pages.</p>
    <label>Referring club member<select disabled={busy} value={draft.referring_club_member_id || ''} onChange={e => { const member = clubMembers.find(row => row.id === e.target.value); setDraft(current => ({ ...current, referring_club_member_id: member?.id || null, referring_club_member_name: member?.name || '' })); setDirty(true); setNotice(''); }}><option value="">Not assigned</option>{clubMembers.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
    <p>Private referral selected by the captain; the chairman can correct it. Choices come from the checkout member list. This list is not an active club roster. Changing the member applies the team’s entire current credited total to that member. It does not create additional funds.</p>
    <label>Message to captain<textarea required={draft.status === 'needs_changes' || draft.status === 'declined'} disabled={busy} rows={3} maxLength={2000} value={draft.message} onChange={e => { setDraft(current => ({ ...current, message: e.target.value })); setDirty(true); setNotice(''); }} /></label>
    <p>This message appears in the captain’s hub. Keep private internal notes in organizer follow-up below. Saving does not send email.</p>
    <p>Only approved teams that choose public visibility appear in the public team directory. Declined teams leave the active list; find them under Declined to review or restore them.</p>
    <button disabled={busy || !dirty || conflict}>{busy ? 'Saving…' : 'Save team review'}</button>{dirty && <span className={styles.unsaved}>Unsaved team review</span>}
    {error && <p role="alert">{error}</p>}{conflict && <div><p>Another session updated this review. Copy any message you want to keep before loading the latest saved version; your unsaved review changes will be discarded.</p><button type="button" disabled={busy} onClick={loadLatest}>Load latest saved review</button></div>}{notice && <p role="status">{notice}</p>}
  </form>;
}
