'use client';

import { useState } from 'react';
import styles from './organizer.module.css';

export type RosterPerson = { id: string; name: string; email: string; phone: string; shirt_size: string; shirt_fit: string };
export type DirectoryTeam = { id: string; name: string; company: string; industry: string; captain_name: string; captain_email: string; captain_phone?: string; approval_status: string; participation_history: string; roster: RosterPerson[]; campaign_status?: string | null; campaign_checked_at?: string | null };
type PersonRow = RosterPerson & { team: DirectoryTeam; role: 'Captain' | 'Participant'; emailStatus: string; smsStatus: string };
const filled = (value?: string) => !!value?.trim();
const missing = (p: RosterPerson) => [!filled(p.name) && 'name', !filled(p.email) && 'email', !filled(p.phone) && 'phone', (!filled(p.shirt_size) || !filled(p.shirt_fit)) && 'shirt size / fit'].filter(Boolean) as string[];
const review = (value: string) => ({approved:'Approved',pending:'Pending review',needs_changes:'Changes requested',declined:'Declined'}[value] || value);
const history = (value: string) => value === 'new' ? 'New team' : value === 'returning' ? 'Returning team' : 'Not classified';
function captainEmailStatus(team: DirectoryTeam) {
  if (team.campaign_status === 'synced') return 'Subscribed at last Mailchimp check';
  if (team.campaign_status?.startsWith('suppressed_')) return `Excluded: ${team.campaign_status.slice(11)}`;
  if (team.campaign_status === 'missing_contact') return 'Not in Mailchimp';
  return 'Subscription not confirmed';
}
function rowsFor(team: DirectoryTeam): PersonRow[] {
  return [{ id:`captain-${team.id}`, name:team.captain_name, email:team.captain_email, phone:team.captain_phone || '', shirt_size:'', shirt_fit:'', team, role:'Captain', emailStatus:captainEmailStatus(team), smsStatus:'Permission not collected' }, ...(team.roster || []).map(person => ({ ...person, team, role:'Participant' as const, emailStatus:'Permission not collected', smsStatus:'Permission not collected' }))];
}
function csvCell(value: unknown) {
  const text = String(value ?? '');
  // Prevent spreadsheet formulas, including phone numbers beginning with +.
  return `"${(/^[\s]*[=+\-@]/.test(text) ? `'${text}` : text).replaceAll('"','""')}"`;
}
function exportRows(rows: PersonRow[]) {
  const columns=['Name','Role','Business','Team','Industry','Approval','Team history','Email','Phone','Shirt size','Shirt fit','Missing details','Email campaign status','SMS permission','Mailchimp last checked'];
  const lines=rows.map(row=>[row.name,row.role,row.team.company,row.team.name,row.team.industry,review(row.team.approval_status),history(row.team.participation_history),row.email,row.phone,row.shirt_size,row.shirt_fit,(row.role==='Captain'?['name','email','phone'].filter(field=>!filled(row[field as 'name'|'email'|'phone'])):missing(row)).join('; '),row.emailStatus,row.smsStatus,row.role==='Captain'?row.team.campaign_checked_at || '':'']);
  const url=URL.createObjectURL(new Blob(['\uFEFF'+[columns,...lines].map(line=>line.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'}));
  const link=document.createElement('a'); link.href=url; link.download='olympiad-2027-private-directory.csv'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function TeamRoster({team}: {team: DirectoryTeam}) {
  const roster=team.roster || [];
  const shirts=roster.filter(p=>filled(p.shirt_size)&&filled(p.shirt_fit));
  return <div className={styles.privateRoster}>
    <div className={styles.directoryHead}><div><h3>Saved participant roster</h3><p>{roster.length} people listed · {shirts.length} shirt sizes ready · {roster.filter(p=>!missing(p).length).length} complete profiles</p></div>{team.captain_email ? <a href={`mailto:${team.captain_email}?subject=${encodeURIComponent(`Olympiad 2027 · Finish ${team.name} roster`)}`}>Contact captain →</a> : <span>Captain email unavailable</span>}</div>
    {roster.length ? <div className={styles.peopleRows}>{roster.map((p,index)=><article key={p.id}><header><strong>{p.name || `Participant ${index+1} · name needed`}</strong><span className={styles.statusBadge}>{missing(p).length ? 'Details missing' : 'Profile complete'}</span></header><dl><div><dt>Email</dt><dd>{p.email ? <a href={`mailto:${p.email}`}>{p.email}</a> : 'Missing'}</dd></div><div><dt>Phone</dt><dd>{p.phone ? <a href={`tel:${p.phone.replace(/[^+0-9]/g,'')}`}>{p.phone}</a> : 'Missing'}</dd></div><div><dt>Shirt</dt><dd>{p.shirt_size && p.shirt_fit ? `${p.shirt_fit} fit · ${p.shirt_size}` : 'Size / fit needed'}</dd></div></dl>{missing(p).length>0 && <p className={styles.missingDetails}>Needs: {missing(p).join(', ')}</p>}</article>)}</div> : <p>No participants saved yet. Ask the captain to add at least six people, including themselves.</p>}
    <p className={styles.caption}>Roster entries are private. Email and SMS campaign permission has not been collected from participants.</p>
  </div>;
}
export default function PeopleDirectory({teams}: {teams: DirectoryTeam[]}) {
  const [search,setSearch]=useState(''),[role,setRole]=useState('all'),[industry,setIndustry]=useState(''),[approval,setApproval]=useState('active'),[teamHistory,setTeamHistory]=useState(''),[gap,setGap]=useState('all');
  const active=teams.filter(t=>t.approval_status!=='declined');
  const participants=active.flatMap(t=>t.roster || []);
  const contacts=active.flatMap(rowsFor);
  const uniqueEmails=new Set(contacts.map(p=>p.email?.trim().toLowerCase()).filter(Boolean)).size;
  const visible=teams.flatMap(rowsFor).filter(row=>(approval==='all'||(approval==='active'?row.team.approval_status!=='declined':row.team.approval_status===approval))&&(role==='all'||row.role===role)&&(!industry||row.team.industry===industry)&&(!teamHistory||row.team.participation_history===teamHistory)&&(gap==='all'||(gap==='contact'?(!filled(row.email)||!filled(row.phone)):gap==='shirt'?(row.role==='Participant'&&(!filled(row.shirt_size)||!filled(row.shirt_fit))):gap==='email_permission'?row.emailStatus!=='Subscribed at last Mailchimp check':(row.role==='Participant'&&!missing(row).length)))&&`${row.name} ${row.email} ${row.phone} ${row.team.company} ${row.team.name}`.toLowerCase().includes(search.trim().toLowerCase()));
  const shirts=new Map<string,number>(); participants.filter(p=>filled(p.shirt_size)&&filled(p.shirt_fit)).forEach(p=>{const key=`${p.shirt_fit} · ${p.shirt_size}`;shirts.set(key,(shirts.get(key)||0)+1);});
  return <section id="people-directory">
    <div className={styles.directoryHead}><div><p className={styles.eyebrow}>PRIVATE · CHAIRMAN ONLY</p><h2>Captains & participants</h2><p>Know who’s coming, what’s missing and how to reach each team.</p></div><a href="#team-directory">Open team actions ↓</a></div>
    <div className={styles.peopleStats}><div><strong>{active.length}</strong><span>Active team registrations</span><small>{active.filter(t=>t.approval_status==='approved').length} chairman approved</small></div><div><strong>{participants.length}</strong><span>Roster participants</span><small>{participants.filter(p=>!missing(p).length).length} complete profiles</small></div><div><strong>{participants.filter(p=>filled(p.shirt_size)&&filled(p.shirt_fit)).length}</strong><span>Shirts ready</span><small>{participants.filter(p=>!filled(p.shirt_size)||!filled(p.shirt_fit)).length} missing size or fit</small></div><div><strong>{uniqueEmails}</strong><span>Unique captured emails</span><small>Captains + roster · not a subscriber count</small></div></div>
    <details className={styles.shirtSummary}><summary>Shirt order breakdown · saved roster only</summary>{shirts.size ? <ul>{[...shirts].sort(([a],[b])=>a.localeCompare(b)).map(([label,count])=><li key={label}><span>{label}</span><strong>{count}</strong></li>)}</ul> : <p>No complete shirt preferences yet.</p>}<p className={styles.caption}>Includes active teams only. People missing shirt details are excluded from this breakdown.</p></details>
    <div className={styles.filters}><label>Find a person or team<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, email, phone or business"/></label><label>Person type<select value={role} onChange={e=>setRole(e.target.value)}><option value="all">Captains + participants</option><option value="Captain">Captains</option><option value="Participant">Roster participants</option></select></label><label>Industry<select value={industry} onChange={e=>setIndustry(e.target.value)}><option value="">All industries</option>{[...new Set(teams.map(t=>t.industry))].sort().map(value=><option key={value}>{value}</option>)}</select></label><label>Approval<select value={approval} onChange={e=>setApproval(e.target.value)}><option value="active">Active teams</option><option value="all">All, including declined</option>{['pending','approved','needs_changes','declined'].map(value=><option key={value} value={value}>{review(value)}</option>)}</select></label><label>Team history<select value={teamHistory} onChange={e=>setTeamHistory(e.target.value)}><option value="">All team histories</option>{['new','returning','unclassified'].map(value=><option key={value} value={value}>{history(value)}</option>)}</select></label><label>Follow-up need<select value={gap} onChange={e=>setGap(e.target.value)}><option value="all">Everyone</option><option value="contact">Missing email or phone</option><option value="shirt">Missing shirt size / fit</option><option value="complete">Complete participant profiles</option><option value="email_permission">Email subscription unconfirmed / excluded</option></select></label></div>
    <div className={styles.directoryStatus}><span role="status">{visible.length} records shown</span><button type="button" disabled={!visible.length} onClick={()=>exportRows(visible)}>Export shown records (CSV)</button></div>
    <p className={styles.caption}>A captain may also appear in their team’s roster. Records are shown by role; the email total above deduplicates addresses. Export includes current filters and permission status.</p>
    <details className={styles.peopleDisclosure}><summary>View {visible.length} matching contact records</summary><div className={styles.peopleRows}>{visible.map(row=><article key={`${row.team.id}-${row.role}-${row.id}`}><header><strong>{row.name || 'Name missing'}</strong><span className={styles.statusBadge}>{row.role}</span></header><p><strong>{row.team.company}</strong>{row.team.company!==row.team.name && ` · ${row.team.name}`} · {row.team.industry}</p><p className={styles.caption}>{review(row.team.approval_status)} · {history(row.team.participation_history)}</p><dl><div><dt>Email</dt><dd>{row.email ? <a href={`mailto:${row.email}`}>{row.email}</a> : 'Missing'}</dd></div><div><dt>Phone</dt><dd>{row.phone ? <a href={`tel:${row.phone.replace(/[^+0-9]/g,'')}`}>{row.phone}</a> : 'Missing'}</dd></div>{row.role==='Participant' && <div><dt>Shirt</dt><dd>{row.shirt_size&&row.shirt_fit?`${row.shirt_fit} fit · ${row.shirt_size}`:'Size / fit needed'}</dd></div>}</dl><p className={styles.caption}>Email: {row.emailStatus}{row.role==='Captain'&&row.team.campaign_checked_at?` · checked ${new Date(row.team.campaign_checked_at).toLocaleString()}`:''}<br/>SMS: {row.smsStatus}</p>{row.role==='Participant'&&missing(row).length>0&&<p className={styles.missingDetails}>Needs: {missing(row).join(', ')}</p>}</article>)}</div>{!visible.length&&<p>No records match these filters.</p>}</details>
    <p className={styles.caption}>Next communication step: let participants confirm their own email and SMS preferences. Capturing roster details does not subscribe them or send messages. Recheck Mailchimp status before any campaign; the status here reflects the last saved captain sync.</p>
  </section>;
}
