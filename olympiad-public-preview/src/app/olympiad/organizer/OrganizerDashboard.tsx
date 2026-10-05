'use client';

import { useEffect, useState, type FormEvent } from 'react';
import ChairmanRosterLink from './ChairmanRosterLink';
import TeamLogo, {type TeamLogoAsset} from '../pilot/TeamLogo';
import styles from './organizer.module.css';
import Communications from './Communications';
import AudienceSync from './AudienceSync';
import SeasonOverview from './SeasonOverview';
import ReturningTeams from './ReturningTeams';
import PeopleDirectory, { TeamRoster, type DirectoryTeam } from './PeopleDirectory';

type Followup = { status: string; assigned_to: string; notes: string; next_follow_up: string | null; updated_at: string };
type ClubMember = { id: string; name: string };
type MemberCredit = { member_id: string; member_name: string; team_count: number; total_cents: number };
type ChairmanView = 'overview' | 'teams' | 'outreach' | 'people' | 'planning';
const chairmanViews: {id:ChairmanView;label:string;description:string}[] = [{id:'overview',label:'Overview',description:'Start with the teams that need your attention.'},{id:'teams',label:'Teams',description:'Review registrations, complete rosters and support captains.'},{id:'outreach',label:'Outreach',description:'Recruit returning businesses and manage invitations.'},{id:'people',label:'People',description:'Find captains, participants and missing contact or shirt details.'},{id:'planning',label:'Planning',description:'Review the season timeline, industry mix and fundraising targets.'}];
const viewForHash:Record<string,ChairmanView> = {'#overview':'overview','#team-directory':'teams','#team-actions':'overview','#returning-teams':'outreach','#communication-overview':'outreach','#people-directory':'people','#season-plan':'planning'};
type TeamHistory = 'unclassified' | 'new' | 'returning';
const historyLabels: Record<TeamHistory,string> = {unclassified:'Not yet classified',new:'New team',returning:'Returning team'};
type Review = { participation_history: TeamHistory; referring_club_member_id: string | null; referring_club_member_name: string; status: 'pending' | 'approved' | 'needs_changes' | 'declined'; message: string; version: number };
const reviewLabels: Record<Review['status'], string> = { pending: 'Pending review', approved: 'Approved', needs_changes: 'Changes requested', declined: 'Declined' };
type Team = DirectoryTeam & { logo?: TeamLogoAsset; logo_url?:string; participation_history: TeamHistory; referring_club_member_id: string | null; approval_status: Review['status']; approval_message: string; approval_version: number; referring_club_member_name: string; duplicate_candidates: { id: string; name: string; company: string; reason: string }[]; followup?: Followup | null; id: string; name: string; company: string; industry: string; captain_name: string; captain_phone?: string; missing?: { name: number; email: number; phone: number; shirt: number }; listed: number; complete: number; needs_follow_up: boolean; is_public: boolean; stretch_goal_cents?: number };
class OrganizerRequestError extends Error { constructor(message: string, public status: number) { super(message); } }
async function readResponse(response: Response) { const data = await response.json(); if (!response.ok) throw new OrganizerRequestError(data.error || 'Unable to load teams.', response.status); return data; }
const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
export default function OrganizerPage() {
  const [view,setView] = useState<ChairmanView>('overview');
  useEffect(()=>{const sync=()=>setView(viewForHash[window.location.hash] || 'overview');sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[]);
  function chooseView(next:ChairmanView){setView(next);window.history.replaceState(null,'',next==='overview'?'#overview':next==='teams'?'#team-directory':next==='outreach'?'#returning-teams':next==='people'?'#people-directory':'#season-plan');}
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
  const [industryFilter, setIndustryFilter] = useState('');
  const [sort, setSort] = useState('priority');
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  function clearPrivateOverview() { setTeams([]); setClubMembers([]); setMemberCredit([]); setCreditNeedsRefresh(false); setLoadedAt(''); setFundraisingActive(false); setError('Organizer access is required. Please sign in again.'); }
  async function signOut() {
    clearPrivateOverview();
    try {
      await readResponse(await fetch('/olympiad/auth/chairman/start', { method: 'DELETE' }));
      window.location.assign('/');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to finish sign-out.'); }
  }
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
  const selectQueue = (value: string) => { chooseView('teams'); setReviewFilter(value); setFollowUpOnly(false); setSearch(''); setIndustryFilter(''); };
  const orderedTeams = [...teams].sort((a,b) => (sort === 'priority' ? teamPriority(a,today) - teamPriority(b,today) : 0) || (sort === 'team' ? a.name.localeCompare(b.name) : a.company.localeCompare(b.company)) || a.name.localeCompare(b.name));
  const visible = orderedTeams.filter(t => (reviewFilter === 'all' || (reviewFilter === 'active' && t.approval_status !== 'declined') || (reviewFilter === 'due' && dueTeams.some(d => d.id === t.id)) || t.approval_status === reviewFilter) && (!industryFilter || t.industry === industryFilter) && (!followUpOnly || t.needs_follow_up) && `${t.name} ${t.company} ${t.industry} ${t.captain_name} ${t.followup?.assigned_to || ""}`.toLowerCase().includes(search.toLowerCase()));
  return <main className={styles.main}>
    <a href="https://scottsdaleolympiad.com">← Public Olympiad website</a>
    <button type="button" onClick={signOut}>Sign out</button>
    <header><p className={styles.eyebrow}>OLYMPIAD 2027 · ORGANIZER</p><h1>Chairman dashboard</h1><p>Your team pipeline, priorities and event readiness in one place.</p><div className={styles.refresh}><button disabled={loading} onClick={() => setRevision(v => v + 1)}>{loading ? 'Refreshing…' : 'Refresh team overview'}</button>{loadedAt && <span>Last loaded {loadedAt}</span>}</div></header>
    {loading && !loadedAt && <p role="status">Loading your organizer overview…</p>}
    {error && <section role="alert"><h2>We couldn’t refresh this overview</h2><p>{error}</p><a href="/">Sign in with Google again →</a></section>}
    {loadedAt && <>

      <nav className={styles.workspaceNav} aria-label="Chairman views">{chairmanViews.map(item=><button key={item.id} type="button" aria-current={view===item.id?'page':undefined} onClick={()=>chooseView(item.id)}>{item.label}</button>)}</nav>
      <p className={styles.workspaceIntro}>{chairmanViews.find(item=>item.id===view)?.description}</p>
      <div hidden={view!=='overview'} className={styles.stats}>
        <section><strong>{activeTeams.filter(t=>t.approval_status==='approved').length}<small>/ 150 goal</small></strong><span>Teams confirmed</span></section>
        <section><strong>{activeTeams.filter(t=>t.approval_status==='pending').length}</strong><span>Awaiting approval</span></section>
        <section><strong>{activeTeams.filter(t=>t.needs_follow_up).length}</strong><span>Incomplete rosters</span><small>{readyCount} {readyCount===1?'team':'teams'} roster-ready</small></section>
        <section><strong>{activeTeams.reduce((sum,t)=>sum+t.complete,0)}</strong><span>Complete participant profiles</span><small>Communication permission tracked separately</small></section>
      </div>
      <div hidden={view!=='outreach'}><ReturningTeams teams={teams} /></div>
      <div hidden={view!=='people'}><PeopleDirectory teams={teams} /></div>
      <section id="team-actions" hidden={view!=='overview'}><h2>Action items</h2><p>Choose an action to open the matching teams.</p><div className={styles.actionGrid}>
        <button onClick={() => selectQueue('pending')}>{activeTeams.filter(t => t.approval_status === 'pending').length} awaiting approval →</button>
        <button onClick={() => { selectQueue('active'); setFollowUpOnly(true); }}>{activeTeams.filter(t => t.needs_follow_up).length} need roster follow-up →</button>
        <button onClick={() => selectQueue('due')}>{dueTeams.length} follow-ups due →</button>
        <button onClick={() => selectQueue('needs_changes')}>{activeTeams.filter(t => t.approval_status === 'needs_changes').length} awaiting captain changes →</button>
      </div><p><button type="button" onClick={()=>selectQueue('active')}>View all teams →</button></p><p className={styles.caption}>Follow-ups use Arizona dates. Counts include private pilot test teams until those records are retired.</p></section>

      <section id="team-directory" hidden={view!=='teams'}><div className={styles.directoryHead}><div><p className={styles.eyebrow}>THE BIGGER PICTURE</p><h2>Businesses & teams</h2><p>Open one business to review its team and take action.</p></div><div className={styles.directoryButtons}><button type="button" hidden={!expandedTeams.size} onClick={() => setExpandedTeams(new Set())}>Collapse team</button></div></div><div className={styles.filters}><label>Find a team<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Business, captain, industry or liaison" /></label><details className={styles.filterDisclosure}><summary>Filters & sort{reviewFilter!=='active'||industryFilter?' · active':''}</summary><div className={styles.filters}><label>Team review<select value={reviewFilter} onChange={e => setReviewFilter(e.target.value)}><option value="active">Active teams</option><option value="due">Follow-ups due</option><option value="all">All teams, including declined</option>{Object.entries(reviewLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Industry<select value={industryFilter} onChange={e => setIndustryFilter(e.target.value)}><option value="">All industries</option>{Array.from(new Set(teams.map(t => t.industry))).sort().map(industry => <option key={industry}>{industry}</option>)}</select></label><label>Sort by<select value={sort} onChange={e => setSort(e.target.value)}><option value="priority">Needs attention first</option><option value="business">Business A–Z</option><option value="team">Team A–Z</option></select></label></div></details><label className={styles.check}><input type="checkbox" checked={followUpOnly} onChange={e => setFollowUpOnly(e.target.checked)} />Only incomplete rosters</label></div>
        <p className={styles.caption}>Each team needs <strong>at least six people</strong>. Complete profiles include name, email, phone and shirt size / fit.</p>
        <div className={styles.directoryStatus}><span role="status">{visible.length} of {teams.length} teams shown{reviewFilter!=='active' && reviewFilter!=='all' ? ` · ${reviewLabels[reviewFilter as Review['status']] || 'Follow-ups due'}` : ''}</span>{(search||industryFilter||followUpOnly||reviewFilter!=='active') && <button type="button" onClick={()=>selectQueue('active')}>Clear filters</button>}<span>Rows show saved information. Open a team to make changes.</span></div>
        {teams.length ? <><div className={styles.rowLabels} aria-hidden="true"><span>Business / team</span><span>Captain</span><span>Approval</span><span>Roster</span><span>Next step</span><span /></div><ul className={styles.list}>{orderedTeams.map(t => <li className={styles.teamListItem} key={t.id} hidden={!visible.some(row => row.id === t.id)}><TeamDisclosure team={t} today={today} clubMembers={clubMembers} expanded={expandedTeams.has(t.id)} onToggle={open => setExpandedTeams(current => open ? new Set([t.id]) : current.has(t.id) ? new Set() : current)} onAccessDenied={clearPrivateOverview} onReviewSaved={review => { setTeams(current => current.map(team => team.id === t.id ? { ...team, participation_history: review.participation_history, approval_status: review.status, approval_message: review.message, approval_version: review.version, referring_club_member_id: review.referring_club_member_id, referring_club_member_name: review.referring_club_member_name } : team)); setCreditNeedsRefresh(true); }} onFollowupSaved={followup => setTeams(current => current.map(team => team.id === t.id ? { ...team, followup } : team))} onGoalSaved={cents => setTeams(current => current.map(team => team.id === t.id ? { ...team, stretch_goal_cents: cents } : team))} /></li>)}</ul></> : <p>No teams have registered yet. Real registrations will appear here.</p>}{teams.length > 0 && visible.length === 0 && <p>No teams match these filters.</p>}

      </section>
      <div hidden={view!=='planning'}><details className={styles.sectionDisclosure}><summary><strong>Industry & fundraising overview</strong><span>Industry mix and planning targets</span></summary><div className={styles.insights}>
        <section><h2>Teams by industry</h2>{industryCounts.length ? industryCounts.map(row => <div key={row.name} className={styles.barRow}><span>{row.name} <strong>{row.count}</strong></span><meter min={0} max={Math.max(1,activeTeams.length)} value={row.count} aria-label={`${row.name}: ${row.count} teams`} /></div>) : <p>No active teams yet.</p>}</section>
        <section><h2>Fundraising activity</h2><strong className={styles.phase}>{fundraisingActive ? 'Tracking enabled' : 'Not active yet'}</strong><p>{fundraisingActive ? 'Member credit appears below when approved teams are assigned. A transaction activity feed is not yet available here.' : 'Purchase integration is pending. No live fundraising activity is available in this dashboard yet.'}</p><p><strong>{money(activeTeams.length * 300000)}</strong> combined minimum goal</p><p><strong>{money(activeTeams.reduce((sum,t) => sum+(t.stretch_goal_cents ?? 300000),0))}</strong> combined team targets</p><p className={styles.caption}>Planning targets, not money raised. Includes active private test teams.</p></section>
      </div></details>
      <details id="season-plan" className={styles.sectionDisclosure}><summary><strong>Season & communications plan</strong><span>Timeline, audiences and campaign ideas</span></summary><SeasonOverview approved={activeTeams.filter(t => t.approval_status === 'approved').length} active={activeTeams.length} ready={readyCount} due={dueTeams.length} pending={activeTeams.filter(t => t.approval_status === 'pending').length} fundraisingActive={fundraisingActive} onQueue={queue => { if(queue === 'roster'){selectQueue('active');setFollowUpOnly(true);}else selectQueue(queue);requestAnimationFrame(()=>document.getElementById('team-directory')?.scrollIntoView({behavior:'smooth'}));}} /></details>
      {(memberCredit.length > 0 || creditNeedsRefresh) && <section><p className={styles.eyebrow}>PRIVATE · MEMBER FUNDRAISING CREDIT</p><h2>Member associations</h2><p>{fundraisingActive ? 'Verified team fundraising credited to associated club members.' : 'Fundraising is not active. These are planned associations and current verified ledger totals.'} Only approved, assigned teams are included. Member credit represents the same team dollars, not additional revenue.</p>{creditNeedsRefresh && <p role="status">Review or association changed. Refresh the team overview to update this summary; the figures below are from the last overview load.</p>}{memberCredit.length > 0 && <ul className={styles.creditList}>{memberCredit.map(row => <li key={row.member_id}><strong>{row.member_name}</strong><span>{row.team_count} approved {row.team_count === 1 ? 'team' : 'teams'} · {money(row.total_cents)}</span></li>)}</ul>}</section>}
      </div><div hidden={view!=='outreach'}><details id="communication-overview" className={styles.sectionDisclosure}><summary><strong>Early-access invitations & campaign groups</strong><span>Delivery status, signup progress and Mailchimp</span></summary><AudienceSync /><Communications /></details></div>
    </>}
  </main>;
}
function teamPriority(team: Team, today: string) {
 if(team.approval_status === 'declined') return 8;
 if(team.duplicate_candidates?.length || team.approval_status === 'pending') return 0;
 if(team.followup?.next_follow_up && team.followup.next_follow_up <= today && team.followup.status !== 'complete') return 1;
 if(team.approval_status === 'needs_changes') return 2;
 if(team.needs_follow_up) return 3;
 if(team.participation_history === 'unclassified') return 4;
 return 5;
}
function nextTeamAction(team: Team, today: string) {
 if(team.approval_status === 'declined') return 'Review declined team';
 if(team.duplicate_candidates?.length) return 'Check possible duplicate';
 if(team.approval_status === 'pending') return 'Review registration';
 if(team.followup?.next_follow_up && team.followup.next_follow_up <= today && team.followup.status !== 'complete') return 'Follow-up due';
 if(team.approval_status === 'needs_changes') return 'Awaiting captain changes';
 if(team.needs_follow_up) return 'Help complete roster';
 if(team.participation_history === 'unclassified') return 'Choose new / returning';
 return 'Ready for next update';
}
function TeamDisclosure({team,today,clubMembers,expanded,onToggle,onAccessDenied,onReviewSaved,onFollowupSaved,onGoalSaved}: {team:Team;today:string;clubMembers:ClubMember[];expanded:boolean;onToggle:(open:boolean)=>void;onAccessDenied:()=>void;onReviewSaved:(value:Review)=>void;onFollowupSaved:(value:Followup|null)=>void;onGoalSaved:(value:number)=>void}) {
 const [drafts,setDrafts] = useState<Set<string>>(new Set());
 const clearDraft = (key:string) => setDrafts(current => {const next=new Set(current);next.delete(key);return next;});
 return <details className={styles.teamDisclosure} open={expanded} onToggle={event => { const open=event.currentTarget.open;if(open !== expanded) onToggle(open); }} onChangeCapture={event => {const key=(event.target as HTMLElement).closest('form')?.dataset.draft;if(key)setDrafts(current=>new Set([...current,key]));}}>
  <summary className={styles.teamSummary}>
   <span className={styles.teamIdentity}><strong>{team.company}</strong><span>{team.name!==team.company && `${team.name} · `}{team.industry}</span>{drafts.size>0 && <span className={styles.draftBadge}>Unsaved changes · open team to finish</span>}{!!team.duplicate_candidates?.length && <span className={styles.warningBadge}>Possible duplicate</span>}</span>
   <span className={styles.summaryCell}><span className={styles.mobileLabel}>Captain</span><strong>{team.captain_name || 'Not recorded'}</strong></span>
   <span className={styles.summaryCell}><span className={styles.mobileLabel}>Approval</span><span className={`${styles.statusBadge} ${team.approval_status === 'approved' ? styles.approved : team.approval_status === 'declined' ? styles.declined : styles.pending}`}>{reviewLabels[team.approval_status]}</span><small>{historyLabels[team.participation_history || 'unclassified']}</small></span>
   <span className={styles.summaryCell}><span className={styles.mobileLabel}>Roster</span><strong>{team.listed} people added</strong><small>{team.complete} {team.complete===1?'profile':'profiles'} complete · {team.listed < 6 ? `${6-team.listed} more people needed` : team.needs_follow_up ? 'Details missing' : 'Ready'}</small></span>
   <span className={styles.summaryCell}><span className={styles.mobileLabel}>Next step</span><strong>{nextTeamAction(team,today)}</strong><small>{team.followup?.next_follow_up && team.followup.status !== 'complete' ? `Follow-up: ${team.followup.next_follow_up}` : team.followup?.assigned_to ? `Liaison: ${team.followup.assigned_to}` : 'No follow-up scheduled'}</small></span>
   <span className={styles.drillLabel} aria-hidden="true">{expanded ? 'Close −' : 'Open +'}</span>
  </summary>
  <div className={styles.teamDetail}>
   <details className={styles.teamPanel}><summary><strong>Team & captain</strong><span>Contact details, public visibility and logo</span></summary>
    <div className={styles.teamFacts}><p><strong>Captain:</strong> {team.captain_name || 'Not recorded'}{team.captain_email && <> · <a href={`mailto:${team.captain_email}`}>{team.captain_email}</a></>}{team.captain_phone && <> · <a href={`tel:${team.captain_phone.replace(/[^+0-9]/g,'')}`}>{team.captain_phone}</a></>}</p><p><strong>Visibility:</strong> {team.is_public ? team.approval_status === 'approved' ? 'Approved · public team page' : 'Public listing requested · hidden until approved' : 'Captain chose a private team page'}</p></div>
    <details className={styles.logoManagement}><summary>{team.logo ? 'Manage uploaded logo' : 'Add a business logo'}</summary>{team.logo && <p><a href={`/olympiad/api/logo?team_id=${team.id}`} download>Download {team.logo.filename}</a></p>}<TeamLogo chairman teamId={team.id} initialLogo={team.logo} initialPublicUrl={team.logo_url} onSaved={()=>{}} onPublicSaved={()=>{}} /></details>
   </details>
   <details className={styles.teamPanel}><summary><strong>Roster</strong><span>{team.listed} people added · {team.complete} {team.complete===1?'profile':'profiles'} complete</span></summary>
    {team.listed<6 && <p className={styles.missingDetails}>Add {6-team.listed} more people to reach six.</p>}
    {team.missing && Object.values(team.missing).some(count=>count>0) && <p className={styles.missingDetails}>Missing: {Object.entries(team.missing).filter(([,count])=>count>0).map(([field,count])=>`${count} ${field==='shirt'?'shirt preferences':field}`).join(' · ')}.</p>}
    <TeamRoster team={team} />
   </details>
   <details className={styles.teamPanel}><summary><strong>Communication & follow-up</strong><span>Share the roster link, contact the captain and keep notes{drafts.has('followup')?' · Unsaved changes':''}</span></summary>
    {team.approval_status!=='declined' && <ChairmanRosterLink teamId={team.id} teamName={team.name} captainName={team.captain_name} captainEmail={team.captain_email} onAccessDenied={onAccessDenied}/>}
    <FollowupForm team={team} onAccessDenied={onAccessDenied} onSaved={value=>{clearDraft('followup');onFollowupSaved(value);}} />
   </details>
   <details className={styles.teamPanel}><summary><strong>Approval & administration</strong><span>Review, new / returning, referring member and goals{drafts.has('review')||drafts.has('goal')?' · Unsaved changes':''}</span></summary>
    <div className={styles.teamControls}><ReviewForm team={team} clubMembers={clubMembers} onAccessDenied={onAccessDenied} onSaved={value=>{clearDraft('review');onReviewSaved(value);}} /><GoalForm team={team} onAccessDenied={onAccessDenied} onSaved={value=>{clearDraft('goal');onGoalSaved(value);}} /></div>
   </details>
  </div>
 </details>;
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
  return <form data-draft="goal" className={styles.goalForm} onSubmit={save}><label htmlFor={`goal-${team.id}`}>Team stretch goal ($)</label><input id={`goal-${team.id}`} aria-describedby={`goal-hint-${team.id}`} type="number" inputMode="decimal" min="3000" max="10000000" step="0.01" required value={value} disabled={busy} onChange={e => { setValue(e.target.value); setDirty(true); setNotice(''); }} /><p id={`goal-hint-${team.id}`}>Saved target: {money(savedCents)} · $3,000 minimum</p><button disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save goal'}</button>{dirty && <span className={styles.unsaved}>Unsaved goal</span>}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}</form>;
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
  return <form data-draft="followup" className={styles.goalForm} onSubmit={save}><h3>Private organizer follow-up</h3><label>Status<select disabled={busy} value={draft.status} onChange={e => change('status',e.target.value)}><option value="not_contacted">Not contacted</option><option value="contacted">Contacted</option><option value="waiting">Waiting for captain</option><option value="complete">Follow-up complete</option></select></label><label>Assigned liaison or organizer<input disabled={busy} maxLength={120} value={draft.assigned_to} onChange={e => change('assigned_to',e.target.value)} /></label><p>For coordination only; this does not grant account access.</p><label>Next follow-up<input disabled={busy} type="date" value={draft.next_follow_up || ''} onChange={e => change('next_follow_up',e.target.value)} /></label><label>Notes<textarea disabled={busy} maxLength={2000} rows={3} value={draft.notes} onChange={e => change('notes',e.target.value)} /></label><button disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save follow-up'}</button>{dirty && <span className={styles.unsaved}>Unsaved follow-up</span>}{error && <p role="alert">{error}</p>}{conflict && <div><p>Another session saved a newer follow-up. Copy any notes you want to keep, then load the latest saved version. This discards your unsaved changes.</p><button type="button" disabled={busy} onClick={loadLatest}>Load latest saved follow-up</button></div>}{notice && <p role="status">{notice}</p>}</form>;
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
  return <form data-draft="review" className={styles.goalForm} onSubmit={save}>
    <h3>Team review</h3><p className={styles.caption}>Saved: <strong>{reviewLabels[team.approval_status]}</strong> · {historyLabels[team.participation_history || 'unclassified']}</p>
    <details className={styles.reviewHelp}><summary>Suggested next communication</summary><p>{team.approval_status !== 'approved' ? 'Finish the team review before campaign outreach.' : team.participation_history === 'unclassified' ? 'Classify this team to choose the right welcome message.' : team.participation_history === 'returning' ? 'Welcome back: introduce the new hub and what is easier this year.' : 'New-team orientation: explain the games, community impact and next steps.'}</p>{team.approval_status === 'approved' && team.needs_follow_up && <p>Next action: a friendly roster reminder. Invite the captain to add missing participants and details.</p>}<p>Registered teams should leave recruitment campaigns. Recommendations do not enroll contacts or send email.</p></details>
    {!!team.duplicate_candidates?.length && <div className={styles.reviewWarning}><strong>Possible duplicate businesses</strong><ul>{team.duplicate_candidates.map(candidate => <li key={candidate.id}>{candidate.name} · {candidate.company}<br />{candidate.reason}</li>)}</ul><p>Review these similarities before deciding. No teams are automatically merged or declined.</p></div>}
    <label>Review decision<select disabled={busy} value={draft.status} onChange={e => { setDraft(current => ({ ...current, status: e.target.value as Review['status'] })); setDirty(true); setNotice(''); }}>{Object.entries(reviewLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>Team history · private<select disabled={busy} value={draft.participation_history} onChange={e => {setDraft(current => ({...current,participation_history:e.target.value as TeamHistory}));setDirty(true);setNotice('');}}>{Object.entries(historyLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>

    <label>Referring club member<select disabled={busy} value={draft.referring_club_member_id || ''} onChange={e => { const member = clubMembers.find(row => row.id === e.target.value); setDraft(current => ({ ...current, referring_club_member_id: member?.id || null, referring_club_member_name: member?.name || '' })); setDirty(true); setNotice(''); }}><option value="">Not assigned</option>{clubMembers.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
    <p>Private referral. Changing it reassigns the team’s entire credited fundraising total; it does not add revenue.</p>
    <label>Message to captain<textarea required={draft.status === 'needs_changes' || draft.status === 'declined'} disabled={busy} rows={3} maxLength={2000} value={draft.message} onChange={e => { setDraft(current => ({ ...current, message: e.target.value })); setDirty(true); setNotice(''); }} /></label>
    <p>Shown in the captain’s hub. Saving does not send email. Use Communication & follow-up for internal notes.</p>
<details className={styles.reviewHelp}><summary>How approval and referral tracking work</summary><p>Public listing needs chairman approval and captain opt-in. Declined teams leave the active list; use the Declined filter to review or restore them.</p><p>Team history and referring member stay private. Member choices come from the checkout list, which is not an active club roster.</p></details>
    <button disabled={busy || !dirty || conflict}>{busy ? 'Saving…' : 'Save team review'}</button>{dirty && <span className={styles.unsaved}>Unsaved team review</span>}
    {error && <p role="alert">{error}</p>}{conflict && <div><p>Another session updated this review. Copy any message you want to keep before loading the latest saved version; your unsaved review changes will be discarded.</p><button type="button" disabled={busy} onClick={loadLatest}>Load latest saved review</button></div>}{notice && <p role="status">{notice}</p>}
  </form>;
}
