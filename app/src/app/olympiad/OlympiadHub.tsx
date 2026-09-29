"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import PilotExperience from "./pilot/PilotExperience";
import styles from "./olympiad.module.css";
import { ProductExplorer, ImpactStories, TeamQuestions, RecipientCommunity, NewTeamGuide } from "./OlympiadStories";

type View = "home" | "register" | "team" | "leaderboard" | "admin" | "fundraising" | "impact" | "guide" | "teams" | "captain" | "invite" | "public-team" | "signin";
type Person = { name: string; email: string; phone: string; size: string; fit: string };
type Team = { id: number; name: string; company: string; industry: string; captain: string; email: string; raised: number; goal: number; roster: Person[]; liaison: string };
type Notice = { title: string; body: string; tag: string };
const industries = ["Commercial real estate", "Residential real estate", "Finance", "Healthcare", "Technology", "Other businesses", "Construction & trades", "Hospitality"];
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const person = (name: string, size = ""): Person => ({ name, email: name ? `${name.toLowerCase().replaceAll(" ", ".")}@example.com` : "", phone: name ? "480-555-0100" : "", size, fit: size ? "Male" : "" });
const initialTeams: Team[] = [
  { id: 1, name: "Desert Collective", company: "Desert Collective", industry: industries[0], captain: "Alex Morgan", email: "alex@example.com", raised: 8450, goal: 10000, roster: [person("Alex Morgan", "M"),person("Sam Lee", "L"),person("Jordan Casey", "M"),person("Taylor Quinn", "S"),person("Jamie Reed", "XL"),person("Avery Ellis", "L")], liaison: "Liaison A" },
  { id: 2, name: "Northstar Health", company: "Northstar Health", industry: industries[3], captain: "Morgan Reed", email: "morgan@example.com", raised: 6200, goal: 8000, roster: [person("Morgan Reed", "L"),person("Riley Lane", "M")], liaison: "Liaison B" },
  { id: 3, name: "Copper State Crew", company: "Copper State", industry: industries[2], captain: "Jamie Parker", email: "jamie@example.com", raised: 4250, goal: 6000, roster: [person("Jamie Parker", "M"),person("Alex Rivera", "L"),person("Taylor Lane", "S"),person("Casey Brooks")], liaison: "Liaison C" },
  { id: 4, name: "Sonoran Labs", company: "Sonoran Labs", industry: industries[4], captain: "Robin Hayes", email: "robin@example.com", raised: 2850, goal: 6000, roster: [person("Robin Hayes", "M")], liaison: "Liaison D" },
  { id: 5, name: "Good Neighbors", company: "Good Neighbors Realty", industry: industries[1], captain: "Drew Quinn", email: "drew@example.com", raised: 1650, goal: 5000, roster: [person("Drew Quinn", "L"),person("Sky Brooks", "M")], liaison: "Liaison E" },
  { id: 6, name: "Valley Makers", company: "Valley Makers", industry: industries[5], captain: "Charlie Lane", email: "charlie@example.com", raised: 750, goal: 6000, roster: [], liaison: "Unassigned" },
];
// Fictional examples informed by the variety of businesses in the 2025 team tracker.
const additionalTeams: [string, number, number, number][] = [
  ["Canyon Commercial",0,32750,40000],["Mesa Property Group",0,18200,25000],
  ["Desert Door Realty",1,24500,30000],["Desert Door Realty II",1,7350,10000],
  ["Summit Lending",2,28750,35000],["Copper Capital",2,12600,15000],
  ["Mesa Care Partners",3,15750,20000],["Sunrise Wellness",3,3100,6000],
  ["Cactus Cloud",4,22400,30000],["Copper Code",4,5600,10000],
  ["High Desert Aviation",5,9800,15000],["Valley Learning",5,3000,6000],
  ["Desert Beam Builders",6,26750,35000],["Bright Sky Energy",6,11800,15000],
  ["Copper Roof Co.",6,2750,6000],["Canyon Social",7,16900,20000],
  ["Sundown Kitchen",7,6400,10000],["Mesa Gatherings",7,0,6000],
];
initialTeams.push(...additionalTeams.map(([name, category, raised, goal], index) => ({
  id: index + 7, name, company: name, industry: industries[category],
  captain: `Demo Captain ${index + 7}`, email: `captain${index + 7}@example.com`,
  raised, goal, roster: [], liaison: "Unassigned",
})));

const initialNotices: Notice[] = [
  { tag: "GET STARTED", title: "Your team’s next chapter starts here.", body: "Choose a captain, bring together at least six teammates, and start planning your path to $3,000." },
  { tag: "EVENT NEWS", title: "The 2027 details are on their way.", body: "The event date, captain meetings and roster deadlines will be posted here when confirmed." },
];
const complete = (team: Team) => team.roster.filter(p => p.name.trim() && p.email.trim() && p.phone.trim() && p.size && p.fit).length;

const missing = (team: Team) => team.roster.length - complete(team);
const needsRoster = (team: Team) => complete(team) < 6 || missing(team) > 0;

function Arrow() { return <span aria-hidden="true">↗</span>; }
function Progress({ team }: { team: Team }) {
  return <div className={styles.progressGroup}><div className={styles.progress} role="progressbar" aria-label={`${team.name} stretch goal progress`} aria-valuenow={Math.min(team.raised, team.goal)} aria-valuemin={0} aria-valuemax={team.goal} aria-valuetext={`${money(team.raised)} raised toward a ${money(team.goal)} stretch goal; minimum team goal ${money(3000)}`}><span style={{ width: `${Math.min(100, team.raised / team.goal * 100)}%` }} /><i style={{ left: `${Math.min(100, 3000 / team.goal * 100)}%` }} /></div><div className={styles.progressLabels}><span>{team.raised >= 3000 ? "✓ $3,000 minimum reached" : `${money(Math.max(0, 3000 - team.raised))} to minimum`}</span><span>{money(team.goal)} stretch</span></div></div>;
}

export default function OlympiadHub() {
  const pilotDirty = useRef(false);
  const acceptedHash = useRef("");
  useEffect(() => {
    const dirty = (event: Event) => { pilotDirty.current = Boolean((event as CustomEvent).detail); };
    window.addEventListener("olympiad-dirty", dirty);
    return () => window.removeEventListener("olympiad-dirty", dirty);
  }, []);
  const [publicTeamSlug, setPublicTeamSlug] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<View>("home");
  useEffect(() => {
    const sync = () => {
      if (pilotDirty.current && window.location.hash !== acceptedHash.current) {
        if (!window.confirm("You have unsaved changes. Leave without saving?")) { window.history.replaceState(null,"",window.location.pathname + window.location.search + acceptedHash.current); return; }
        pilotDirty.current = false;
      }
      acceptedHash.current = window.location.hash;
      const key = window.location.hash.slice(1);
      if (key === "olympiad-content") return;
      const aliases: Record<string, View> = {"supported-charities":"impact", "new-teams":"guide", "event-day":"guide", "questions":"guide"};
      if (key.startsWith("team/")) { setPublicTeamSlug(key.slice(5)); setView("public-team"); setMenuOpen(false); return; }
      const pilotAliases: Record<string, View> = { register:"captain", team:"captain", admin:"home" };
      const next = pilotAliases[key] ?? aliases[key] ?? key;
      if (["home","register","team","leaderboard","admin","fundraising","impact","guide","teams","captain","signin","invite"].includes(next)) setView(next as View);
      else setView("home");
      setMenuOpen(false);
    };
    sync(); window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    document.getElementById("olympiad-content")?.focus({preventScroll:true});
  }, [view]);
  const [teams, setTeams] = useState(initialTeams);
  const [teamId, setTeamId] = useState(3);
  const [industry, setIndustry] = useState("All industries");
  const [query, setQuery] = useState("");
  const [adminFilter, setAdminFilter] = useState("All teams");
  const [notices, setNotices] = useState(initialNotices);
  const [toast, setToast] = useState("");
  const [editingRoster, setEditingRoster] = useState(false);
  const [draftRoster, setDraftRoster] = useState<Person[]>([]);
  const [goalTeam, setGoalTeam] = useState<number | null>(null);
  const [showNotice, setShowNotice] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  useEffect(() => {
    if (!editingRoster && goalTeam === null && !showNotice) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]') ?? []).filter(el => !el.hasAttribute('disabled'));
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setEditingRoster(false); setGoalTeam(null); setShowNotice(false); }
      if (event.key === 'Tab') {
        const items = focusable(); const first = items[0]; const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = priorOverflow; previous?.focus(); };
  }, [editingRoster, goalTeam, showNotice]);
  const [step, setStep] = useState(1);
  const [registration, setRegistration] = useState({ company: "", name: "", industry: industries[0], captain: "", email: "", phone: "" });
  const active = teams.find(t => t.id === teamId)!;
  const ranked = [...teams].sort((a,b) => b.raised - a.raised);
  const total = teams.reduce((sum,t) => sum + t.raised, 0);
  const notify = (message: string) => setToast(message);
  const navigate = (next: View) => { if (pilotDirty.current && !window.confirm("You have unsaved changes. Leave without saving?")) return; pilotDirty.current=false; setView(next); setMenuOpen(false); window.location.hash = next; setToast(""); setEditingRoster(false); setGoalTeam(null); setShowNotice(false); setShowTransactions(false); window.scrollTo({ top: 0, behavior: "instant" }); };
  const explorePackages = () => navigate("fundraising");
  const updateTeam = (id: number, patch: Partial<Team>) => setTeams(current => current.map(t => t.id === id ? { ...t, ...patch } : t));
  const openRoster = () => { setDraftRoster([...active.roster.map(p=>({...p})), ...Array.from({length: Math.max(0,6-active.roster.length)},()=>person(""))]); setEditingRoster(true); };
  const saveRegistration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = Math.max(...teams.map(t=>t.id))+1;
    setTeams([...teams, { ...registration, company: registration.company.trim(), name: registration.name.trim(), captain: registration.captain.trim(), email: registration.email.trim(), id, raised: 0, goal: 6000, roster: [{name:registration.captain.trim(),email:registration.email.trim(),phone:registration.phone.trim(),size:"",fit:""}], liaison: "Unassigned" }]);
    setTeamId(id); navigate("team"); setStep(1); notify("Your sample team is created. You can finish your roster below. No registration was submitted.");
  };
  const nav = (label: string, next: View) => <button className={view === next ? styles.navActive : ""} aria-current={view === next ? "page" : undefined} onClick={()=>navigate(next)}>{label}</button>;
  const teamRows = (preview = false) => {
    const division = ranked.filter(t => industry === "All industries" || t.industry === industry);
    const filtered = ranked.filter(t=>(industry === "All industries" || t.industry === industry) && t.name.toLowerCase().includes(query.toLowerCase()));
    const rankLabel = !preview && industry !== "All industries" ? `${industry} rank` : "Overall rank";
    return <div className={styles.standings}>
      <div className={styles.tableHeading} aria-hidden="true"><span>{!preview && industry !== "All industries" ? "INDUSTRY RANK / TEAM" : "OVERALL RANK / TEAM"}</span><span>RAISED</span><span>PROGRESS</span></div>
      <ul className={styles.standingsList} role="list" aria-label="Sample fundraising standings">
        {(preview ? ranked.slice(0,3) : filtered).map(team => {
          const rank = (preview ? ranked : division).filter(t => t.raised > team.raised).length + 1;
          return <li className={styles.standing} key={team.id}>
            <div className={styles.teamIdentity}>
              <span className={styles.rank}><span className={styles.screenReaderOnly}>{rankLabel}: </span>{String(rank).padStart(2,"0")}</span>
              <span className={styles.avatar} aria-hidden="true">{team.name.split(" ").map(w=>w[0]).slice(0,2).join("")}</span>
              <div><strong>{team.name}</strong><small><span className={styles.screenReaderOnly}>Industry: </span>{team.industry}</small></div>
            </div>
            <strong className={styles.amount}><span className={styles.screenReaderOnly}>Sample amount raised: </span>{money(team.raised)}</strong>
            <Progress team={team}/>
          </li>;
        })}
      </ul>
      {!preview && filtered.length === 0 && <p className={styles.empty}>No teams match these filters.</p>}
    </div>;
  };

  return <div className={styles.hub}>
    <a className={styles.skipLink} href="#olympiad-content">Skip to content</a>
    <div className={styles.previewBar}><span><b>OLYMPIAD 2027</b> · Early access · Fundraising opens later</span><button onClick={()=>navigate("invite")}>Invite a business <Arrow/></button></div>
    <header className={styles.header}><button className={styles.brand} onClick={()=>navigate("home")} aria-label="Olympiad home"><Image className={styles.brandLogo} src="/olympiad/saguaros.png" alt="" width={70} height={47} /><span><small>THE SAGUAROS PRESENT</small><b>OLYMPIAD <em>2027</em></b></span></button><button className={styles.menuToggle} aria-expanded={menuOpen} aria-controls="olympiad-navigation" onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?"Close":"Menu"}</button><nav id="olympiad-navigation" className={menuOpen?styles.menuExpanded:undefined} aria-label="Main navigation">{nav("Overview", "home")}{nav("Fundraising", "fundraising")}{nav("Impact", "impact")}{nav("Team guide", "guide")}{nav("The teams", "teams")}{nav("Leaderboard", "leaderboard")}</nav><div className={styles.headerActions}><button className={styles.outline} onClick={()=>navigate("signin")}>Manage my team</button><button className={`${styles.primary} ${styles.headerRegister}`} onClick={()=>navigate("captain")}>Register team <Arrow/></button></div></header>

    <div className={styles.earlyAccessHelp}><span>You’re helping shape Olympiad 2027.</span><a href="mailto:scaldwell@saguaros.com?subject=Olympiad%202027%20early-access%20feedback">Share feedback or get help ↗</a></div><div id="olympiad-content" tabIndex={-1} className={styles.contentRoot}>
    {view === "home" && <main>
      <section className={styles.returningCaptain} aria-label="Returning captains"><div><strong>Already registered your team?</strong><p>Pick up where you left off—update your roster and team details.</p></div><a className={styles.primary} href="#signin">Manage my team <Arrow/></a></section>
      <section className={styles.hero}><div className={styles.heroPhoto}/><div className={styles.heroContent}><span className={styles.eyebrow}>ARIZONA’S CORPORATE FIELD DAY · 2027</span><h1>Good company.<br/>Great competition.<br/><em>Lasting impact.</em></h1><p>Your business. Your team. A season of giving and a day of friendly competition against other Arizona businesses. Every team plays for the kids.</p><div className={styles.actions}><button className={styles.goldButton} onClick={()=>navigate("captain")}>Bring your team <Arrow/></button><a className={styles.lightLink} href="#how-it-works">See how it works ↓</a></div><div className={styles.heroDetails}><span>SCOTTSDALE STADIUM<br/><b>2027 date to be announced</b></span><span>OPEN TO EVERY INDUSTRY<br/><b>One community. A shared purpose.</b></span></div></div><div className={styles.heroStamp}><span>PLAY FOR</span><strong>something<br/>bigger.</strong><span>THE SAGUAROS · EST. 1987</span></div></section>
      <div className={styles.statsStrip}><div><strong>Minimum 6</strong><span>participants, including your captain</span></div><div><strong>$3,000</strong><span>minimum team fundraising</span></div><div><strong>Every industry.</strong><span>Everyone has a place here.</span></div><button onClick={()=>navigate("teams")}><span>FOLLOW THE FRIENDLY RIVALRY</span><b>Meet the teams <Arrow/></b><small>Participating businesses · opt-in directory</small></button></div>

      <section className={styles.section} id="how-it-works"><div className={styles.sectionIntro}><span className={styles.eyebrow}>A LITTLE COMPETITION. A LOT OF GOOD.</span><h2>Your team. Our community.<br/><em>A bigger difference.</em></h2><p>We’ll help you get from “we’re in” to game day, with everything your team needs in one place.</p></div><div className={styles.threeCards}>{[["01","Gather your people","Choose a captain and register your business. Build a team of at least six; you can finish your roster later."],["02","Rally for Arizona’s kids","Your business is the sponsor. Choose brand packages, invite your network to give, and work toward a shared $3,000 minimum."],["03","Make a day of it","Celebrate your impact with field games, friendly rivalries and a community coming together at Scottsdale Stadium."]].map(([n,title,body])=><article className={styles.stepCard} key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
      <section className={`${styles.section} ${styles.leaderSection}`}><div className={styles.sectionTop}><div><span className={styles.eyebrow}>GOOD COMPANY ON THE FIELD</span><h2>Who will you compete with?</h2></div><button className={styles.outline} onClick={()=>navigate("teams")}>Meet the teams <Arrow/></button></div><p className={styles.muted}>Explore participating businesses, then invite a friendly rival to join you. Industry fundraising cups and game-day medals give everyone something to play for.</p><div className={styles.actions}><button className={styles.outline} onClick={()=>navigate("leaderboard")}>Explore the leaderboard <Arrow/></button><button className={styles.textButton} onClick={()=>navigate("invite")}>Invite another business →</button></div></section>
      <section className={`${styles.section} ${styles.routeSection}`}><div className={styles.sectionTop}><div><span className={styles.eyebrow}>WHAT DO YOU NEED NEXT?</span><h2>Your next step, made simple.</h2></div></div><div className={styles.routeGrid}>{([
        ["fundraising","Build your fundraising plan","Explore brand packages, team events and ways your network can give.","Explore fundraising"],
        ["guide","Get your team ready","Roster essentials, event-day plans, updates and answers for captains.","Open the team guide"],
        ["impact","See the difference you make","Meet the charities and discover the stories behind the giving.","Explore our impact"],
      ] as const).map(([destination,title,body,label])=><button className={styles.routeCard} key={destination} onClick={()=>navigate(destination)}><h3>{title}</h3><p>{body}</p><span>{label} <Arrow/></span></button>)}</div></section>
      <section className={styles.compactImpact}><span className={styles.eyebrow}>THE REASON WE PLAY</span><strong>$720,000+</strong><p>raised at the 2026 Olympiad for Arizona’s children.</p><button className={styles.lightLink} onClick={()=>navigate("impact")}>See the stories behind the impact →</button></section>
      <section className={styles.joinBanner}><span className={styles.eyebrow}>YOUR COMPANY CAN MAKE A DIFFERENCE</span><h2>See you on the field.</h2><button className={styles.goldButton} onClick={()=>navigate("captain")}>Start your team <Arrow/></button></section>
    </main>}


    {(view === "fundraising" || view === "impact" || view === "guide") && <main>
      <div className={styles.breadcrumb}><button onClick={()=>navigate("home")}>← Overview</button><span>{view==="fundraising"?"Fundraising":view==="impact"?"Our impact":"Team guide"}</span></div>
      {view === "fundraising" && <ProductExplorer/>}
      {view === "impact" && <><ImpactStories/><RecipientCommunity/></>}
      {view === "guide" && <><NewTeamGuide/>
      <section className={`${styles.section} ${styles.updatesSection}`}><div><span className={styles.eyebrow}>THE BULLETIN BOARD</span><h2>In the loop.<br/><em>Ready for the day.</em></h2><p>One place for the latest updates, deadlines and what comes next.</p></div><div>{notices.map((n,i)=><article className={styles.notice} key={`${n.title}-${i}`}><span className={styles.eyebrow}>{n.tag}</span><h3>{n.title}</h3><p>{n.body}</p></article>)}</div></section>
      <section className={styles.section} id="event-day"><div className={styles.sectionTop}><div><span className={styles.eyebrow}>WHAT TO EXPECT</span><h2>A day worth showing up for.</h2></div><p className={styles.sideNote}>Illustrative flow.<br/>2027 schedule and times to follow.</p></div><div className={styles.dayFlow}>{["Check in & connect", "Opening celebration", "Team field games", "Finals & awards"].map((text,i)=><div key={text}><span>0{i+1}</span><h3>{text}</h3></div>)}</div></section>
<TeamQuestions/></>}
    </main>}
    {(["teams","captain","signin","invite","public-team"] as View[]).includes(view) && <main><PilotExperience accessIntent={view === "signin" ? "returning" : "new"} mode={view === "public-team" ? "team" : view === "signin" ? "captain" : view as "teams" | "captain" | "invite"} slug={publicTeamSlug} onNavigate={hash=>{window.location.hash=hash;window.scrollTo({top:0,behavior:"instant"});}}/></main>}
    {view === "leaderboard" && <main className={styles.workspace}><div className={styles.pageIntro}><span className={styles.eyebrow}>EVERY DOLLAR MOVES US FORWARD</span><h1>The giving games.</h1><p>Compete for your industry’s fundraising cup. Earn medals by winning the games.</p></div><aside className={styles.leaderboardPreview}><strong>Leaderboard preview · Sample data</strong><p>Explore the industry races and fundraising goals. These teams, amounts and rankings are illustrative—not actual 2027 results. Your real registration and saved roster are separate. Fundraising opens later.</p><button className={styles.outline} onClick={()=>navigate("teams")}>See participating businesses <Arrow/></button></aside><div className={styles.metricGrid}><Metric label="SAMPLE TOTAL RAISED" value={money(total)} note="Sample fundraising data"/><Metric label="SAMPLE TEAMS" value={String(teams.length)} note="Illustrative industry competition"/><Metric label="MINIMUM REACHED" value={String(teams.filter(t=>t.raised>=3000).length)} note="Teams at $3,000 or more"/></div><details className={styles.cupSection}><summary>Explore the industry cup leaders <span>+</span></summary><p className={styles.muted}>Meet the current sample leaders. Select an industry to see its race.</p><div className={styles.cupGrid}>{industries.map(category=>{const entrants=ranked.filter(t=>t.industry===category);const leader=entrants[0];const tied=entrants.filter(t=>t.raised===leader?.raised).length>1;return <button key={category} className={styles.cupCard} aria-pressed={industry===category} onClick={()=>{setIndustry(category);setQuery("");}}><span>{category}</span><strong>{leader ? (tied ? "Tied for the lead" : leader.name) : "The race is open"}</strong><b>{money(leader?.raised??0)}</b><small>{entrants.length} teams · {tied ? "Shared lead" : "Sample leader"} →</small></button>;})}</div></details><div className={styles.toolbar}><label>Industry<select value={industry} onChange={e=>setIndustry(e.target.value)}>{["All industries",...industries].map(x=><option key={x}>{x}</option>)}</select></label><label>Find a team<input placeholder="Search team name" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>{teamRows()}<p className={styles.footnote}>Industry cups go to the highest fundraising total within each industry, regardless of stretch goal. Medals are awarded for game results separately. Tied totals share a rank; final cup tie rules are to be confirmed. Goal markers show the $3,000 minimum. This preview uses sample data; live transaction updates are not connected.</p></main>}

    {view === "register" && <main className={`${styles.workspace} ${styles.signupLayout}`}><aside className={styles.signupAside}><span className={styles.eyebrow}>YOUR TEAM STARTS HERE</span><h1>A great day.<br/><em>A greater cause.</em></h1><p>Make room for connection, competition and a little good in your company’s calendar.</p><div className={styles.commitment}><strong>The team commitment</strong><p>At least six participants, including your captain.<br/>A $3,000 fundraising minimum.<br/>A community to help you get there.</p></div><small>No deposit is collected in this preview. A registration deposit is still under consideration.</small></aside><section className={styles.formCard}><div className={styles.formSteps}><span className={step===1?styles.selectedStep:""}>01 · Your team</span><span className={step===2?styles.selectedStep:""}>02 · Your captain</span></div><h2>{step===1?"Let’s get your team together.":"Who’s leading the way?"}</h2><p className={styles.muted}>{step===1?"Start with the basics. Your roster can come later.":"Your captain will manage the roster and be your team’s main contact."}</p><form onSubmit={e=>{if(step===1){e.preventDefault();setStep(2);}else saveRegistration(e);}}>{step===1?<><Field label="Company" value={registration.company} onChange={company=>setRegistration({...registration,company})} placeholder="Company or organization"/><Field label="Team name" value={registration.name} onChange={name=>setRegistration({...registration,name})} placeholder="Give your team a name"/><label className={styles.field}>Industry<select value={registration.industry} onChange={e=>setRegistration({...registration,industry:e.target.value})}>{industries.map(x=><option key={x}>{x}</option>)}</select></label></>:<><Field label="Captain’s full name" value={registration.captain} onChange={captain=>setRegistration({...registration,captain})} placeholder="First and last name"/><Field label="Captain’s email" type="email" value={registration.email} onChange={email=>setRegistration({...registration,email})} placeholder="you@company.com"/><Field label="Captain’s phone number" type="tel" value={registration.phone} onChange={phone=>setRegistration({...registration,phone})} placeholder="(480) 555-0100"/><div className={styles.callout}><strong>{registration.name}</strong><p>{registration.company} · {registration.industry}</p><small>You can add teammates and shirt sizes after this step.</small></div></>}<p className={styles.footnote}>Prototype only. Use sample information. Nothing is sent or saved after a refresh.</p><div className={styles.actions}>{step===2&&<button type="button" className={styles.outline} onClick={()=>setStep(1)}>Back</button>}<button className={styles.primary} type="submit">{step===1?"Continue":"Create sample team"} <Arrow/></button></div></form></section></main>}

    {view === "team" && <main className={styles.workspace}><div className={styles.sectionTop}><div className={styles.pageIntro}><span className={styles.eyebrow}>YOUR TEAM HQ · {active.industry.toUpperCase()}</span><h1>{active.name}</h1><p>Welcome, {active.captain.split(" ")[0]}. Let’s make this a season to remember.</p></div><span className={styles.pill}>Captain preview</span></div><div className={styles.teamLayout}><div><section className={styles.fundCard}><div className={styles.sectionTop}><span className={styles.eyebrow}>YOUR TEAM’S IMPACT</span><span>#{ranked.findIndex(t=>t.id===active.id)+1} overall</span></div><strong className={styles.bigAmount}>{money(active.raised)}</strong><p>raised for Arizona’s children</p><Progress team={active}/><button className={styles.lightLink} onClick={()=>setShowTransactions(!showTransactions)}>{showTransactions?"Hide":"View"} credited transactions →</button>{showTransactions&&<div className={styles.transactions}>{active.id===3?<><p>Illustrative contributions · total $4,250</p>{[["Company brand packages",2000],["Charitable donations",1500],["Team fundraiser",750]].map(([label,value])=><div key={label}><span>{label}</span><b>{money(Number(value))}</b></div>)}</>:<p>{active.raised===0?"Your first contribution will appear here once purchases are connected.":"A sample total is shown above. The transaction breakdown for this sample team is not included."}</p>}<small>Live purchase attribution and missing-credit requests are planned for the next integration phase.</small></div>}</section><section className={styles.panel}><div className={styles.sectionTop}><div><span className={styles.eyebrow}>THE PEOPLE BEHIND THE IMPACT</span><h2>Your roster</h2></div><button className={styles.outline} onClick={openRoster}>Edit roster <Arrow/></button></div><p className={styles.muted}>{complete(active)} complete participants · minimum 6 · {active.roster.length} listed</p><div className={styles.rosterList}>{active.roster.length?active.roster.map((p,i)=><div key={i}><span className={styles.avatar}>{p.name[0]||"?"}</span><div><strong>{p.name||"Name needed"}</strong><small>{p.email||"Email needed"}</small><small>{p.phone||"Phone needed"}</small></div><span className={p.size&&p.fit?styles.pill:styles.warning}>{p.fit||"Fit needed"} · {p.size||"Size needed"}</span></div>):<p>Add your first teammates to get started.</p>}</div></section></div><aside><section className={styles.nextStep}><span className={styles.eyebrow}>YOUR NEXT STEP</span><h2>{needsRoster(active)?"Bring the whole team in.":active.raised<3000?"Start your fundraising push.":"Keep the momentum going."}</h2><p>{needsRoster(active)?`Complete ${missing(active)} unfinished participant record${missing(active)===1?"":"s"}${active.roster.length<6?` and add ${6-active.roster.length} more teammate${6-active.roster.length===1?"":"s"}`:""}. Each needs name, email, phone, shirt size and fit.`:active.raised<3000?`${money(3000-active.raised)} to reach your team’s minimum. Explore the playbook for ideas.`:`Your $3,000 minimum is met. Your next milestone is ${money(active.goal)}.`}</p><button className={styles.primary} onClick={()=>needsRoster(active)?openRoster():explorePackages()}>{needsRoster(active)?"Complete roster":"Explore fundraising ideas"} <Arrow/></button></section><section className={styles.panel}><span className={styles.eyebrow}>YOUR BUSINESS ON THE FIELD</span><h3>Make your brand part of the day.</h3><p className={styles.muted}>Explore screen, banner, game and gear packages from the 2026 catalog as you plan for 2027.</p><button className={styles.textButton} onClick={explorePackages}>Explore package examples →</button></section><section className={styles.panel}><span className={styles.eyebrow}>YOUR SAGUAROS SUPPORT</span><h3>{active.liaison === "Unassigned" ? "A liaison will be assigned" : active.liaison}</h3><p className={styles.muted}>Your point of contact for fundraising questions and getting ready for event day.</p><small>Contact details will appear here when your liaison is assigned in the live hub.</small></section><section className={styles.panel}><span className={styles.eyebrow}>LATEST UPDATE</span><h3>{notices[0].title}</h3><p className={styles.muted}>{notices[0].body}</p></section></aside></div></main>}

    {view === "admin" && <main className={styles.workspace}><div className={styles.sectionTop}><div className={styles.pageIntro}><span className={styles.eyebrow}>CHAIRMAN’S WORKSPACE · SEAN CALDWELL</span><h1>The whole field. One view.</h1><p>See who’s ready, who’s raising, and who could use a hand.</p></div><button className={styles.primary} onClick={()=>setShowNotice(true)}>Post an update +</button></div><div className={styles.metricGrid}><Metric label="TOTAL FUNDRAISING" value={money(total)} note="Illustrative credited transactions"/><Metric label="ROSTERS NEED ATTENTION" value={String(teams.filter(t=>needsRoster(t)).length)} note="Below six participants or missing details"/><Metric label="BELOW THE MINIMUM" value={String(teams.filter(t=>t.raised<3000).length)} note="Teams below $3,000"/></div><div className={styles.toolbar}><div className={styles.filterButtons}>{["All teams","Incomplete roster","Below minimum"].map(x=><button className={adminFilter===x?styles.filterActive:""} key={x} onClick={()=>setAdminFilter(x)}>{x}</button>)}</div><label>Industry<select value={industry} onChange={e=>setIndustry(e.target.value)}>{["All industries",...industries].map(x=><option key={x}>{x}</option>)}</select></label></div><div className={styles.adminTable}><table><thead><tr><th>Team / liaison</th><th>Roster</th><th>Raised</th><th>Stretch goal</th><th>Action</th></tr></thead><tbody>{teams.filter(t=>(industry==="All industries"||t.industry===industry)&&(adminFilter!=="Incomplete roster"||needsRoster(t))&&(adminFilter!=="Below minimum"||t.raised<3000)).map(t=><tr key={t.id}><td><strong>{t.name}</strong><small>{t.industry}</small><label className={styles.liaisonLabel}>Liaison<select aria-label={`Liaison for ${t.name}`} value={t.liaison} onChange={e=>{updateTeam(t.id,{liaison:e.target.value});notify(`Liaison updated for ${t.name} in this preview.`);}}>{["Unassigned","Liaison A","Liaison B","Liaison C","Liaison D","Liaison E"].map(x=><option key={x}>{x}</option>)}</select></label></td><td><span className={!needsRoster(t)?styles.pill:styles.warning}>{complete(t)} complete · {missing(t)} unfinished</span></td><td><strong>{money(t.raised)}</strong><small>{t.raised>=3000?"Minimum met":`${money(3000-t.raised)} remaining`}</small></td><td><button className={styles.goalButton} onClick={()=>setGoalTeam(t.id)}>{money(t.goal)} <span>Edit ↗</span></button></td><td><button className={styles.textButton} onClick={()=>{setTeamId(t.id);navigate("team");}}>View team →</button></td></tr>)}</tbody></table></div><div className={styles.adminBottom}><section className={styles.panel}><span className={styles.eyebrow}>BULLETIN BOARD</span><h2>One message. Everyone informed.</h2>{notices.map((n,i)=><article className={styles.notice} key={i}><h3>{n.title}</h3><p>{n.body}</p></article>)}</section><section className={styles.panel}><span className={styles.eyebrow}>NEXT BUILD ITERATION</span><h3>Connect the moving parts.</h3><ul><li>Confirmed 2027 packages, inventory and logo collection</li><li>Purchase sync and unmatched-credit review</li><li>Captain sign-in and participant invitations</li><li>Mailchimp and SMS audiences and preferences</li><li>Prior-year fundraising breakdowns</li><li>Decision on the proposed $100 deposit</li></ul><p className={styles.footnote}>This is a public design preview with fictional records. Live admin access will require authentication and role permissions.</p></section></div></main>}

    </div>
    <footer className={styles.footer}><div><strong>THE SAGUAROS</strong><p>Good people. Doing good for Arizona’s kids.</p></div><span>OLYMPIAD 2027<br/><small>Event details subject to confirmation.</small></span><a href="https://www.saguaros.com/" target="_blank" rel="noreferrer">Visit saguaros.com <Arrow/></a></footer>
    {toast&&<div className={styles.toast} role="status"><span>{toast}</span><button aria-label="Dismiss notification" onClick={()=>setToast("")}>×</button></div>}

    {editingRoster&&<div className={styles.modalBackdrop}><section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="roster-title"><div className={styles.sectionTop}><h2 id="roster-title">Build your roster.</h2><button className={styles.close} aria-label="Close roster editor" onClick={()=>setEditingRoster(false)}>×</button></div><p>Add each participant’s name, email, phone number, shirt size and male/female shirt fit. Save what you have; missing details stay on your checklist. Use sample information.</p><form onSubmit={e=>{e.preventDefault();updateTeam(active.id,{roster:draftRoster.filter(p=>p.name.trim()||p.email.trim()||p.phone.trim()||p.size||p.fit).map(p=>({...p,name:p.name.trim(),email:p.email.trim(),phone:p.phone.trim()}))});setEditingRoster(false);notify("Roster updated for this preview.");}}><div className={styles.rosterEditor}>{draftRoster.map((p,i)=><div className={styles.rosterFields} key={i}><span>{i+1}</span><label>Name<input autoFocus={i===0} aria-label={`Participant ${i+1} name`} value={p.name} onChange={e=>setDraftRoster(draftRoster.map((r,j)=>i===j?{...r,name:e.target.value}:r))}/></label><label>Email<input type="email" aria-label={`Participant ${i+1} email`} value={p.email} onChange={e=>setDraftRoster(draftRoster.map((r,j)=>i===j?{...r,email:e.target.value}:r))}/></label><label>Phone number<input type="tel" aria-label={`Participant ${i+1} phone number`} value={p.phone} onChange={e=>setDraftRoster(draftRoster.map((r,j)=>i===j?{...r,phone:e.target.value}:r))}/></label><label>Shirt fit<select aria-label={`Participant ${i+1} shirt fit`} value={p.fit} onChange={e=>setDraftRoster(draftRoster.map((r,j)=>i===j?{...r,fit:e.target.value}:r))}><option value="">Select</option><option>Male</option><option>Female</option></select></label><label>Shirt size<select aria-label={`Participant ${i+1} shirt size`} value={p.size} onChange={e=>setDraftRoster(draftRoster.map((r,j)=>i===j?{...r,size:e.target.value}:r))}>{["","XS","S","M","L","XL","2XL","3XL"].map(x=><option key={x} value={x}>{x||"Select"}</option>)}</select></label><button type="button" className={styles.close} aria-label={`Remove participant ${i+1}`} onClick={()=>setDraftRoster(draftRoster.filter((_,j)=>i!==j))}>×</button></div>)}</div><button type="button" className={styles.textButton} onClick={()=>setDraftRoster([...draftRoster,person("")])}>+ Add another teammate</button><div className={styles.modalActions}><button className={styles.outline} type="button" onClick={()=>setEditingRoster(false)}>Cancel</button><button className={styles.primary} type="submit">Save roster</button></div></form></section></div>}
    {goalTeam!==null&&<div className={styles.modalBackdrop}><section className={`${styles.modal} ${styles.smallModal}`} role="dialog" aria-modal="true" aria-labelledby="goal-title"><h2 id="goal-title">Set a stretch goal.</h2><p>{teams.find(t=>t.id===goalTeam)?.name}</p><form onSubmit={e=>{e.preventDefault();const value=Number(new FormData(e.currentTarget).get("goal"));if(Number.isFinite(value)&&value>=3000){updateTeam(goalTeam,{goal:value});setGoalTeam(null);notify("Stretch goal updated on the team dashboard and leaderboard.");}}}><label className={styles.field}>Stretch goal ($)<input autoFocus name="goal" type="number" min="3000" max="10000000" step="1" required defaultValue={teams.find(t=>t.id===goalTeam)?.goal}/></label><p className={styles.footnote}>The $3,000 minimum stays the same. Changes appear throughout this preview.</p><div className={styles.modalActions}><button type="button" className={styles.outline} onClick={()=>setGoalTeam(null)}>Cancel</button><button className={styles.primary}>Save goal</button></div></form></section></div>}
    {showNotice&&<div className={styles.modalBackdrop}><section className={`${styles.modal} ${styles.smallModal}`} role="dialog" aria-modal="true" aria-labelledby="notice-title"><h2 id="notice-title">Keep everyone in the loop.</h2><p>This update will appear on the preview bulletin board and team dashboard.</p><form onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);const title=String(data.get("title")).trim(),body=String(data.get("body")).trim();if(!title||!body)return;setNotices([{title,body,tag:"CHAIRMAN’S UPDATE"},...notices]);setShowNotice(false);notify("Update added to the preview. No email or SMS was sent.");}}><label className={styles.field}>Title<input autoFocus name="title" maxLength={100} required/></label><label className={styles.field}>Update<textarea name="body" maxLength={1000} rows={5} required/></label><div className={styles.modalActions}><button type="button" className={styles.outline} onClick={()=>setShowNotice(false)}>Cancel</button><button className={styles.primary}>Post to preview</button></div></form></section></div>}
  </div>;
}
function Metric({label,value,note}:{label:string;value:string;note:string}) { return <div className={styles.metric}><span className={styles.eyebrow}>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function Field({label,value,onChange,placeholder,type="text"}:{label:string;value:string;onChange:(v:string)=>void;placeholder:string;type?:string}) {return <label className={styles.field}>{label}<input required maxLength={120} type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} pattern={type==="text"?".*\\S.*":undefined}/></label>;}
