"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import products from "./catalog.json";
import styles from "./olympiad.module.css";
import { EventGallery } from "./EventGallery";

const money = (n: number) => new Intl.NumberFormat("en-US", {style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
const categories = ["All packages", "Signature", "Brand visibility", "Event experiences", "Custom games", "Apparel & gear", "Swag bag", "Hospitality"];
const highlights = ["title-sponsor", "jumbo-screen-sponsor", "gold-banner-sponsor", "pop-a-shot-game", "t-shirt-sponsor", "hat-sponsor", "backpack-sponsor", "home-run-derby-sponsor"];

export function PackageCatalog() {
  const [category,setCategory]=useState("All packages");
  const [query,setQuery]=useState("");
  const [budget,setBudget]=useState("Any budget");
  const [sort,setSort]=useState("Featured");
  const [limit,setLimit]=useState(4);
  const [selected,setSelected]=useState<string[]>([]);
  const [showPlan,setShowPlan]=useState(false);
  const results=useMemo(()=>{
    const found=products.filter(p=>(category==="All packages"||p.category===category)&&`${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase())&&(budget==="Any budget"||p.price<=Number(budget)));
    return found.sort((a,b)=>sort==="Price: low to high"?a.price-b.price:sort==="Price: high to low"?b.price-a.price:(highlights.includes(a.id)?highlights.indexOf(a.id):99)-(highlights.includes(b.id)?highlights.indexOf(b.id):99));
  },[category,query,budget,sort]);
  const planned=products.filter(p=>selected.includes(p.id));
  const total=planned.reduce((sum,p)=>sum+p.price,0);
  const toggle=(id:string)=>setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  return <section className={`${styles.section} ${styles.expandedCatalog}`} id="fundraising">
    <div className={styles.catalogHero}><div><span className={styles.eyebrow}>YOUR BUSINESS IS THE SPONSOR</span><h2>Put your brand<br/><em>in the game.</em></h2><p>From the first welcome to the final showdown. Put your company at the heart of a day that does good.</p><div className={styles.catalogHeroFacts}><span><b>{products.length}</b>historical options</span><span><b>7</b>ways to show up</span><span><b>$500</b>screen sponsorship*</span></div><a href="https://drive.google.com/file/d/1GRxKTVPxm9sBFQghQzrnNs2lt11hlHm_/view" target="_blank" rel="noreferrer">Explore the former sales packet ↗</a></div><EventGallery/></div>
    <div className={styles.catalogNotice}><b>Plan ahead for 2027</b><span>2026 reference prices from the official store, including historical sale prices. The sales packet may show different prices. 2027 pricing, availability and benefits are pending. *Historical example.</span></div>
    <div className={styles.productFilters} aria-label="Package categories">{categories.map(item=><button key={item} aria-pressed={category===item} onClick={()=>{setCategory(item);setLimit(4);}}>{item}{item!=="All packages"&&<span> {products.filter(p=>p.category===item).length}</span>}</button>)}</div>
    <div className={styles.catalogToolbar}><label>Find your fit<input type="search" placeholder="Search games, hats, banners…" value={query} onChange={e=>{setQuery(e.target.value);setLimit(4);}}/></label><label>Reference budget<select value={budget} onChange={e=>{setBudget(e.target.value);setLimit(4);}}><option>Any budget</option><option value="1000">Up to $1,000</option><option value="3500">Up to $3,500</option><option value="5000">Up to $5,000</option><option value="10000">Up to $10,000</option></select></label><label>Sort by<select value={sort} onChange={e=>setSort(e.target.value)}><option>Featured</option><option>Price: low to high</option><option>Price: high to low</option></select></label></div>
    <div className={styles.catalogResultLine}><p aria-live="polite">{results.length} package{results.length===1?"":"s"} to explore</p><button onClick={()=>setShowPlan(!showPlan)} className={styles.textButton}>{showPlan?"Hide":"View"} your shortlist ({selected.length}) →</button></div>
    {showPlan&&<div className={styles.shortlist} id="package-shortlist"><div><span className={styles.eyebrow}>YOUR PACKAGE SHORTLIST</span><h3>{selected.length?"A starting point for your company.":"What would you like to put your name on?"}</h3><p>Save ideas while you explore. This shortlist resets on refresh; it does not reserve inventory or credit fundraising.</p></div><div>{planned.map(p=><div className={styles.shortlistRow} key={p.id}><span>{p.name}</span><b>{money(p.price)}</b><button aria-label={`Remove ${p.name} from shortlist`} onClick={()=>toggle(p.id)}>×</button></div>)}<div className={styles.shortlistTotal}><span>Historical package total</span><strong>{money(total)}</strong></div><small>Planning only · not a quote or checkout</small>{selected.length>0&&<button className={styles.textButton} onClick={()=>setSelected([])}>Clear shortlist</button>}</div></div>}
    <div className={styles.productGrid}>{results.slice(0,limit).map(p=><article className={`${styles.productCard} ${selected.includes(p.id)?styles.savedCard:""}`} key={p.id}><div className={styles.productImage}><Image src={p.image} alt={`Official 2026 ${p.name} illustration`} fill sizes="(max-width: 760px) 45vw, (max-width: 1100px) 43vw, 22vw" style={{objectFit:"contain"}}/><span className={styles.packageYear}>2026 COLLECTION</span></div><div className={styles.productBody}><span className={styles.eyebrow}>{p.category}</span><h3>{p.name}</h3><div className={styles.productPrice}><strong>{money(p.price)}</strong><small>Historical price</small></div><details className={styles.packageDetails}><summary>What’s included <span>+</span></summary><ul>{p.benefits.map((b,i)=><li key={i}>{b}</li>)}</ul><a href={p.url} target="_blank" rel="noreferrer">Full historical package ↗</a></details><button className={styles.savePackage} aria-pressed={selected.includes(p.id)} onClick={()=>toggle(p.id)}>{selected.includes(p.id)?"✓ On your shortlist":"+ Add to shortlist"}</button></div></article>)}</div>
    {results.length===0&&<div className={styles.catalogEmpty}><h3>No packages match just yet.</h3><p>Try a different category, budget or search.</p><button className={styles.outline} onClick={()=>{setCategory("All packages");setBudget("Any budget");setQuery("");}}>Reset filters</button></div>}
    {results.length>limit&&<div className={styles.loadMore}><button className={styles.outline} onClick={()=>setLimit(limit+4)}>Explore more packages ({results.length-limit} remaining) ↓</button></div>}
    <div className={styles.catalogBottom}><p>Custom games and game-event sponsorships are different packages. Explore the benefits to find the right fit for your business.</p><a href="https://www.saguaros.com/olympiad-sponsorships-tickets" target="_blank" rel="noreferrer">Official 2026 catalog ↗</a></div>
    {selected.length>0&&<div className={styles.planRibbon} aria-live="polite"><div><span>YOUR SHORTLIST</span><b>{selected.length} selected · {money(total)}</b><small>Historical prices · planning only</small></div><button className={styles.primary} onClick={()=>{setShowPlan(true);window.setTimeout(()=>document.getElementById("package-shortlist")?.scrollIntoView({behavior:"smooth",block:"center"}),0);}}>Review your ideas ↑</button></div>}
  </section>;
}
