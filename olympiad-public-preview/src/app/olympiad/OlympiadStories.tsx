"use client";

import Image from "next/image";
import styles from "./olympiad.module.css";
import { PackageCatalog } from "./PackageCatalog";

export function ProductExplorer() {
 return <><PackageCatalog/><section className={styles.section}>
    <div className={styles.givingHeading}><span className={styles.eyebrow}>BUILD YOUR TEAM’S TOTAL</span><h3>One team. More ways to give.</h3><p>All transactions attributed to your team count toward its $3,000 minimum. Your team’s stretch goal gives you the next milestone to chase.</p></div>
    <div className={styles.resourceGrid}>{[
      ["01", "Invite your network to give", "Share the charitable giving program with colleagues, clients and friends. The current guide explains tax-credit eligibility and donation instructions.", "https://www.saguaros.tax/", "Explore charitable giving"],
      ["02", "Host something of your own", "Bring people together around your business: a happy hour, golf outing or another team fundraiser. Past team events offer a starting point.", "https://www.saguaros.com/2026-olympiad-team-sponsorships-tickets", "See past team fundraisers"],
      ["03", "Take the cause on the road", "Explore the Arizona specialty license plate program. Team-credit instructions for plate purchases will be confirmed before the 2027 campaign.", "https://www.blackplateaz.com/", "Explore the plate program"],
    ].map(([n,title,body,url,label])=><details className={styles.resource} key={n}><summary><span>{n}</span><h3>{title}</h3><b>+</b></summary><p>{body}</p><a href={url} target="_blank" rel="noreferrer">{label} ↗</a></details>)}</div>
 </section></>;
}

export function ImpactStories() {
  return <section className={`${styles.section} ${styles.impactSection}`} id="impact">
    <div className={styles.impactLead}><div><span className={styles.eyebrow}>THE REASON WE PLAY</span><h2>The competition ends.<br/><em>The good keeps going.</em></h2><p>Every business brings something to the field. Together, that energy supports a bigger mission: helping Arizona’s children.</p></div><div className={styles.impactNumber}><span>2026 OLYMPIAD · REPORTED RESULT</span><strong>$720,000+</strong><p>raised in one season of giving and competition</p><a href="https://frontdoorsmedia.com/community/the-saguaros-olympiad-sets-new-fundraising-record/" target="_blank" rel="noreferrer">Read the 2026 recap · Frontdoors ↗</a></div></div>
    <details className={styles.storyDisclosure}><summary>Giving in action · explore four grant stories <span>+</span></summary><div className={styles.impactContext}><span className={styles.eyebrow}>GIVING IN ACTION</span><h3>Real support. Beyond the field.</h3><p>Published examples of broader Saguaros giving across different years and grant cycles. These figures are not additive and do not represent confirmed Olympiad 2027 allocations.</p></div>
    <div className={styles.impactCards}>{[
      ["2025 GRANT CYCLE", "$750,000", "29 charities. A wider circle of care.", "The announced giving cycle supported Arizona nonprofits working with children and families—extending well beyond the eight partners featured below.", "https://arizonadigitalfreepress.com/the-saguaros-give-750k-to-29-childrens-charities-this-giving-cycle/", "Read the grant announcement"],
      ["CHILDREN’S HEALTH · NOVEMBER 2025", "$250,000", "Care closer to home.", "Banner Health Foundation reported a Saguaros grant supporting children’s community clinics in Mesa and Tolleson and the Healthmobile, providing free primary care for uninsured children.", "https://www.bannerhealthfoundation.org/news-information/articles/scottsdale-saguaros-gives-to-banner-childrens-community-clinics", "Read Banner’s story"],
      ["FAMILY STABILITY · JUNE 2023", "$49,791", "Helping families stay home.", "Care Fund reported a grant for mortgage and rent assistance for families caring for seriously ill or injured children, helping them focus on their child’s care.", "https://www.thecarefund.org/post/saguaros-award-49-791-to-care-fund", "Read Care Fund’s story"],
      ["2024 GRANT ANNOUNCEMENT", "$866,000", "More opportunity. More support.", "The announced grants to 29 charities included $200,000 for SARRC, $150,000 for Boys & Girls Clubs of Greater Scottsdale and $70,000 for Boys Hope Girls Hope of Arizona, now Hope Ignites Phoenix.", "https://arizonadigitalfreepress.com/the-saguaros-announce-866k-in-grants-to-help-childrens-charities-of-arizona/", "Explore the 2024 grants"],
    ].map(([tag,amount,title,body,url,label])=><article key={title}><span className={styles.eyebrow}>{tag}</span><strong className={styles.grantAmount}>{amount}</strong><h3>{title}</h3><p>{body}</p><a href={url} target="_blank" rel="noreferrer">{label} ↗</a></article>)}</div>
    </details><details className={styles.storyDisclosure}><summary>Our history &amp; event coverage <span>+</span></summary><div className={styles.historyRow}><div><strong>1987</strong><span>The Saguaros are founded.</span></div><div><strong>1999</strong><span>Brokers for Kids begins.</span></div><div><strong>2026</strong><span>Olympiad welcomes every industry.</span></div><div><strong>2027</strong><span>Your business writes the next chapter.</span></div></div>
    <div className={styles.historyLinks}><a href="https://www.saguaros.com/about" target="_blank" rel="noreferrer">Meet the Saguaros ↗</a><a href="https://drive.google.com/file/d/1GRxKTVPxm9sBFQghQzrnNs2lt11hlHm_/view" target="_blank" rel="noreferrer">Explore the event’s roots ↗</a><a href="https://www.fox10phoenix.com/news/scottsdale-saguaros-host-26th-annual-saguaro-olympiad-event" target="_blank" rel="noreferrer">Watch 2025 event coverage ↗</a></div></details>
  </section>;
}

export function TeamQuestions() {
  return <section className={styles.section} id="questions"><div className={styles.sectionTop}><div><span className={styles.eyebrow}>NEW TO THE FIELD?</span><h2>A few things to know.</h2></div><p className={styles.sideNote}>Less guesswork.<br/>More getting your team together.</p></div><div className={styles.faqList}>{[
    ["Is our business the sponsor?", "Yes. Your company participates as a sponsor team, competing with other businesses. You can choose a brand sponsorship package and invite your network to support your fundraising."],
    ["Is $3,000 per person or per team?", "Per team. Your team needs at least six people, and the fundraising minimum remains $3,000 even if you add more participants. A stretch goal is an additional team milestone."],
    ["Do we need the whole roster to sign up?", "No. Your captain can start with the company and team details, then add participants, email addresses, phone numbers, shirt sizes and male/female shirt fit. Incomplete roster details remain visible for follow-up."],
    ["How will we know where we stand?", "For this registration phase, the public directory shows businesses that opt in. Live fundraising totals and industry cup standings will follow when purchase attribution is connected. No fundraising is collected in this pilot."],
    ["Can we purchase a 2027 package now?", "The packages shown here are historical examples. Confirmed 2027 pricing, availability, purchase links and team-credit instructions will be added before sales open."],
    ["When is the event?", "The 2027 date and final schedule are still to be announced. This hub will bring together event-day details, captain updates and important deadlines."],
  ].map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>;
}


export function RecipientCommunity() {
  const charities = [
    ["Amanda Hope Rainbow Angels", "amanda-hope", "Counseling, adaptive apparel and practical financial help for families facing childhood cancer and other life-threatening illnesses.", "https://amandahope.org/"],
    ["Arizona Cancer Foundation for Children", "az-cancer", "Social, emotional and financial support for children with cancer and their families.", "https://azcancerfoundation.org/family-inquiry/"],
    ["Banner Health", "banner", "Children’s community clinics and mobile care help uninsured children access primary care—the focus of the documented Saguaros gift above.", "https://www.bannerhealthfoundation.org/news-information/articles/scottsdale-saguaros-gives-to-banner-childrens-community-clinics"],
    ["Foundation for Blind Children", "blind-children", "Education, resources and support for people with vision loss, including services for young children.", "https://seeitourway.org/"],
    ["Hope Ignites Phoenix", "hope-ignites", "Academic support and mentoring that help young people prepare for college and careers. Formerly Boys Hope Girls Hope of Arizona.", "https://bhghaz.org/about/"],
    ["Make-A-Wish Arizona", "make-a-wish", "Wishes that bring hope to children facing critical illnesses and their families.", "https://wish.org/arizona"],
    ["Phoenix Children’s Foundation", "phoenix-childrens", "Philanthropic support for pediatric care and the children and families served by Phoenix Children’s.", "https://phoenixchildrensfoundation.org/"],
    ["The Foster Alliance", "foster-alliance", "Programs supporting children in foster care and the community caring for them.", "https://thefosteralliance.org/"],
  ];
  return <section className={`${styles.section} ${styles.recipientSection}`} id="supported-charities">
    <div className={styles.sectionTop}><div><span className={styles.eyebrow}>WHO YOUR SUPPORT REACHES</span><h2>Behind every dollar,<br/><em>a child worth showing up for.</em></h2></div><p className={styles.catalogIntro}>The Saguaros support organizations serving Arizona’s children and families. These are the supported charities featured on our website.</p></div>
    <div className={styles.recipientGrid}>{charities.map(([name,asset,description,url])=><article key={asset}><div className={styles.recipientLogo}><Image src={`/olympiad/${asset}.png`} alt={`${name} logo`} fill sizes="(max-width: 760px) 80vw, 40vw" style={{objectFit:"contain", transform:"scale(2)"}}/></div><h3>{name}</h3><details className={styles.partnerDetails}><summary>About this charity</summary><p className={styles.partnerDescription}>{description}</p><a className={styles.partnerLink} href={url} target="_blank" rel="noreferrer" aria-label={`Learn about ${name}`}>Meet the organization ↗</a></details></article>)}</div>
    <div className={styles.catalogBottom}><p>These profiles describe each organization’s work, not a promise that a particular grant funds every service. Specific Olympiad 2027 recipients and allocations will be shared when confirmed.</p><a href="https://www.saguaros.com/" target="_blank" rel="noreferrer">Meet our supported charities ↗</a></div>
  </section>;
}

export function NewTeamGuide() {
  return <section className={`${styles.section} ${styles.newTeamSection}`} id="new-teams">
    <div className={styles.sectionTop}><div><span className={styles.eyebrow}>YOUR FIRST OLYMPIAD</span><h2>Come for the competition.<br/><em>Know what comes next.</em></h2></div><p className={styles.catalogIntro}>A season of fundraising brings your team together before a day on the field. Here’s a practical starting point for your captain.</p></div>
    <div className={styles.captainChecklist}>{[
      ["01", "Bring your business together", "Choose a captain and gather at least six people. Collect everyone’s name, email, phone, shirt size and shirt fit. You can start with a partial roster."],
      ["02", "Choose your path to $3,000", "Explore company packages, invite your network to give, or plan a team fundraiser. The minimum is per team; a stretch goal gives you the next milestone."],
      ["03", "Get ready for the field", "Watch the bulletin board for the confirmed date, captain meetings, roster and artwork deadlines, arrival instructions and game rules."],
    ].map(([n,title,body])=><article key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
    <div className={styles.gameNote}><div><span className={styles.eyebrow}>TWO WAYS TO COMPETE</span><h3>Raise together. Play together.</h3><p>Past Olympiads have featured games such as cornhole, Pop-a-Shot and dodgeball. The highest-fundraising team in each industry wins its industry cup. Teams that win the games earn medals. These are two separate competitions. Fundraising standings will open in a later phase; the current directory shows participating businesses.</p><a href="https://www.saguaros.com/olympiad" target="_blank" rel="noreferrer">How the Olympiad works ↗</a></div><div><span className={styles.eyebrow}>2027 DETAILS TO FOLLOW</span><p>Final game format, parking and check-in, guest options, accessibility arrangements and deadlines will be published here once confirmed.</p><p>Your team’s liaison contact details will appear in the live hub.</p></div></div>
    <details className={styles.guideDisclosure}><summary>Articles &amp; stories from past Olympiads <span>+</span></summary><div className={styles.readingIntro}><span className={styles.eyebrow}>STORIES FROM THE FIELD</span><h3>Get to know the day—and the why.</h3><p>A few useful reads before you bring your business to the field.</p></div>
    <div className={styles.readingGrid}><article><span className={styles.readingType}>2026 RECAP · FRONTDOORS</span><h3>What a season of giving can do.</h3><p>A look back at the 2026 Olympiad, the business community behind it and more than $720,000 raised.</p><a href="https://frontdoorsmedia.com/community/the-saguaros-olympiad-sets-new-fundraising-record/" target="_blank" rel="noreferrer">Read the event recap ↗</a></article><article><span className={styles.readingType}>2025 COVERAGE · FOX 10 PHOENIX</span><h3>See the event in action.</h3><p>Local coverage of the 26th annual event offers a feel for the atmosphere and the purpose behind the competition.</p><a href="https://www.fox10phoenix.com/news/scottsdale-saguaros-host-26th-annual-saguaro-olympiad-event" target="_blank" rel="noreferrer">Watch the event coverage ↗</a></article><article><span className={styles.readingType}>OUR ROOTS · THE SAGUAROS</span><h3>A tradition of showing up.</h3><p>Meet the organization founded in 1987. The Olympiad’s Brokers for Kids roots began in 1999; today the field welcomes businesses across industries.</p><a href="https://www.saguaros.com/about" target="_blank" rel="noreferrer">Meet the organization ↗</a><a href="https://drive.google.com/file/d/1GRxKTVPxm9sBFQghQzrnNs2lt11hlHm_/view" target="_blank" rel="noreferrer">History in the 2026 sales packet ↗</a></article></div></details>
  </section>;
}
