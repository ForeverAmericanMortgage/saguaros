import Image from 'next/image';
import Link from 'next/link';
import brand from '../olympiad.module.css';
import s from '../join/join.module.css';
import l from './legal.module.css';

export type LegalSection = { heading: string; body: React.ReactNode };

// Shared layout for the Olympiad privacy policy and terms of use.
export default function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: React.ReactNode; sections: LegalSection[] }) {
  return <div className={`${brand.hub} ${s.page}`}>
    <header className={s.header}><Link href="/"><Image src="/olympiad/saguaros.png" alt="The Saguaros" width={36} height={50} /><span><small>THE SAGUAROS PRESENT</small><strong>OLYMPIAD <em>2027</em></strong></span></Link></header>
    <main className={`${s.main} ${l.main}`}>
      <article className={s.card}>
        <span className={s.eyebrow}>SCOTTSDALE OLYMPIAD</span>
        <h1>{title}</h1>
        <p className={l.updated}>Last updated {updated}</p>
        <div className={l.intro}>{intro}</div>
        <nav aria-label="On this page" className={l.toc}><ol>{sections.map((section, i) => <li key={section.heading}><a href={`#section-${i + 1}`}>{section.heading}</a></li>)}</ol></nav>
        {sections.map((section, i) => <section key={section.heading} id={`section-${i + 1}`} className={l.section}><h2>{i + 1}. {section.heading}</h2>{section.body}</section>)}
      </article>
      <p className={l.links}><Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms of Use</Link> · <Link href="/">scottsdaleolympiad.com</Link></p>
    </main>
    <footer className={s.footer}>Good people. Doing good for Arizona’s kids.</footer>
  </div>;
}
