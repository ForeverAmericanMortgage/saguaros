"use client";
import { useEffect, useState } from 'react';
import results from './data/results-2026.json';
import styles from './Leaderboard.module.css';

type Entry = { id: string; name: string; category: string; totalCents: number; slug?: string };
const dollars = (cents: number) => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100);
export default function Leaderboard() {
  const [year,setYear]=useState<2026|2027>(2026);
  const [category,setCategory]=useState('All categories');
  const [search,setSearch]=useState('');
  const [limit,setLimit]=useState(15);
  const [current,setCurrent]=useState<Entry[]>([]);
  const [active,setActive]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [updated,setUpdated]=useState('');
  const [spot,setSpot]=useState(0);
  const [paused,setPaused]=useState(false);
  const [interacting,setInteracting]=useState(false);
  const [reduced,setReduced]=useState(false);
  useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>setReduced(media.matches);sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[]);
  useEffect(()=>{
    let mounted=true;let pending=false;
    async function refresh(){
      if(pending || document.hidden)return;pending=true;
      try{
        const response=await fetch('/olympiad/api/pilot?action=leaderboard',{cache:'no-store'});
        const data=await response.json();if(!response.ok)throw new Error('Standings unavailable');
        if(mounted){setCurrent(data.teams??[]);setActive(data.active===true);setError('');setLoading(false);setUpdated(new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}));}
      }catch{if(mounted){setError('2027 standings are temporarily unavailable. Please try again shortly.');setLoading(false);}}finally{pending=false;}
    }
    void refresh();const timer=window.setInterval(()=>void refresh(),60000);
    const visible=()=>{if(!document.hidden)void refresh();};document.addEventListener('visibilitychange',visible);
    return()=>{mounted=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[]);
  const entries:Entry[]=year===2026?results.teams:current;
  const ranked=year===2026 || active;
  const categories=Array.from(new Set(entries.map(t=>t.category)));
  const sorted=[...entries].sort((a,b)=>ranked?b.totalCents-a.totalCents || a.name.localeCompare(b.name):a.name.localeCompare(b.name));
  const division=sorted.filter(t=>category==='All categories' || t.category===category);
  const filtered=division.filter(t=>t.name.toLowerCase().includes(search.trim().toLowerCase()));
  const leaders=categories.map(c=>{const teams=sorted.filter(t=>t.category===c);return{category:c,team:teams[0],tied:teams.filter(t=>t.totalCents===teams[0]?.totalCents).length>1};}).filter(l=>l.team && l.team.totalCents>0);
  const spotlight=leaders[spot%Math.max(1,leaders.length)];
  useEffect(()=>{if(paused||interacting||reduced||leaders.length<2)return;const timer=window.setInterval(()=>{if(!document.hidden)setSpot(s=>s+1);},8000);return()=>window.clearInterval(timer);},[paused,interacting,reduced,leaders.length]);
  const changeYear=(value:2026|2027)=>{setYear(value);setCategory('All categories');setSearch('');setLimit(15);setSpot(0);};
  const selectCategory=(value:string)=>{setCategory(value);setLimit(15);};
  const total=entries.reduce((sum,t)=>sum+t.totalCents,0);
  return <main className={styles.page}>
    <header className={styles.intro}><span className={styles.eyebrow}>RALLY FOR THE VALLEY</span><h1>The giving games.</h1><p>Local businesses. Friendly rivalry. A lasting impact for Arizona’s children.</p></header>
    <div className={styles.years} role="group" aria-label="Leaderboard season">{([2026,2027] as const).map(y=><button key={y} aria-pressed={year===y} onClick={()=>changeYear(y)}><strong>{y}</strong><span>{y===2026?'Final results':'Teams joining'}</span></button>)}</div>
    <section className={styles.summary} aria-label={`${year} fundraising summary`}>
      <div><span>{year===2026?'2026 REPORTED SUPPORT':active?'2027 VERIFIED TEAM SUPPORT':'2027 STARTING LINE'}</span><strong>{year===2026?dollars(results.reportTotalCents):active?dollars(total):'The next chapter.'}</strong><p>{year===2026?'The foundation for an even bigger year.':active?'Verified transactions credited to publicly listed teams.':'Meet the businesses preparing to take the field.'}</p></div>
      <div className={styles.summaryAside}><strong>{year===2027&&(loading||(!current.length&&error))?'—':entries.length}</strong><span>{year===2026?'team entries in the report':'public participating teams'}</span><small>{year===2026?`${dollars(results.teamTotalCents)} credited to teams`:active?'Totals refresh every minute.':'Fundraising opens soon.'}</small></div>
    </section>
    {year===2026?<details className={styles.source}><summary>What’s included in the 2026 total?</summary><p><strong>{dollars(results.teamTotalCents)}</strong> team totals · <strong>{dollars(results.unassignedCents)}</strong> reported as “Not Specified” · <strong>{dollars(results.memberTotalCents)}</strong> active-member totals. Only the 91 named team entries appear in the standings.</p><p>Source: treasurer’s final Olympiad Team Sales report. {results.reportPeriod}. Accrual basis; generated {results.reportGenerated}. Names and categories are retained as reported; separate numbered teams stay separate.</p></details>:<p className={styles.status}>{active?`Verified totals · Updated ${updated}`:'Approved, public teams appear here as they join. No fundraising ranks are assigned before tracking opens.'}</p>}
    {year===2027&&loading&&<p role="status">Loading participating teams…</p>}
    {year===2027&&error&&<p role="alert" className={styles.error}>{error}</p>}
    {spotlight&&ranked&&<section className={styles.spotlight} aria-label="Category leader spotlight" onMouseEnter={()=>setInteracting(true)} onMouseLeave={()=>setInteracting(false)} onFocusCapture={()=>setInteracting(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setInteracting(false);}}>
      <div className={styles.spotCopy} key={`${year}-${spotlight.category}`}><span className={styles.eyebrow}>{year} · {spotlight.category}</span><h2>{spotlight.tied?'Sharing the lead':spotlight.team.name}</h2><p>{spotlight.tied?sorted.filter(t=>t.category===spotlight.category&&t.totalCents===spotlight.team.totalCents).map(t=>t.name).join(' · '):'Highest reported team total in this category.'}</p><strong>{dollars(spotlight.team.totalCents)}</strong><button onClick={()=>selectCategory(spotlight.category)}>Explore this category →</button></div>
      <div className={styles.spotControls}><span>{spot%leaders.length+1} / {leaders.length}</span><button aria-label="Previous category leader" onClick={()=>setSpot(s=>(s-1+leaders.length)%leaders.length)}>←</button><button aria-label="Next category leader" onClick={()=>setSpot(s=>(s+1)%leaders.length)}>→</button><button aria-pressed={paused} onClick={()=>setPaused(p=>!p)}>{paused?'Resume':'Pause'}</button></div>
    </section>}
    <section className={styles.standings} aria-label={`${year} team standings`}>
      <div className={styles.listIntro}><h2>{year===2026?'The 2026 standings':active?'The 2027 race':'Who’s on the starting line?'}</h2><p>{year===2026?'Explore the overall results or find your category.':active?'Compete for the fundraising cup in your industry.':'Your business could be next.'}</p></div>
      <div className={styles.filters}><label>{year===2026?'2026 category':'Industry'}<select value={category} onChange={e=>selectCategory(e.target.value)}><option>All categories</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Find a team<input type="search" placeholder="Business or team name" value={search} onChange={e=>{setSearch(e.target.value);setLimit(15);}}/></label></div>
      <p className={styles.resultCount}>{filtered.length} {filtered.length===1?'team':'teams'}{category!=='All categories'?` · ${category}`:''}{ranked?` · ${category==='All categories'?'Overall':'Category'} rankings`:''}</p>
      <ol className={styles.rows}>{filtered.slice(0,limit).map(team=>{const rank=1+division.filter(t=>t.totalCents>team.totalCents).length;return<li key={team.id}><span className={styles.rank} aria-label={ranked?`Rank ${rank}`:'Registered team'}>{ranked?String(rank).padStart(2,'0'):'—'}</span><div className={styles.team}><strong>{team.name}</strong><span>{team.category}</span>{team.slug&&<a href={`#team/${team.slug}`}>View team →</a>}</div><div className={styles.amount}><strong>{ranked?dollars(team.totalCents):'Getting ready'}</strong><span>{year===2026?'Final 2026 total':active?'Verified fundraising':'Fundraising opens soon'}</span></div></li>;})}</ol>
      {!filtered.length&&!loading&&<p className={styles.empty}>{search?'No matching teams. Try another name.':year===2026?'No teams in this category.':'Participating teams will appear as their public listings are approved.'}</p>}
      {filtered.length>limit&&<button className={styles.more} onClick={()=>setLimit(n=>n+25)}>Show more teams ({filtered.length-limit} remaining)</button>}
    </section>
    <footer className={styles.note}><strong>Cups for fundraising. Medals for the games.</strong><p>{year===2026?'These are reported fundraising standings, not an official list of cup or medal winners.':'Industry cups recognize the highest fundraising total; game results determine medals. Tied fundraising totals share a rank.'} The 2027 minimum team fundraising goal is $3,000.</p><a href="#captain">Bring your business to Olympiad →</a></footer>
  </main>;
}
