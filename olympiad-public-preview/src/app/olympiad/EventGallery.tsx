"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./olympiad.module.css";
import photos from "./event-photos.json";

export function EventGallery() {
  const [index,setIndex]=useState(0);
  const [paused,setPaused]=useState(false);
  const [hovered,setHovered]=useState(false);
  const [focused,setFocused]=useState(false);
  const [reduced,setReduced]=useState(true);
  const [visible,setVisible]=useState(false);
  const container=useRef<HTMLElement>(null);
  useEffect(()=>{
    const media=window.matchMedia("(prefers-reduced-motion: reduce)");
    const update=()=>setReduced(media.matches);update();media.addEventListener("change",update);
    const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:.25});
    if(container.current) observer.observe(container.current);
    return ()=>{media.removeEventListener("change",update);observer.disconnect();};
  },[]);
  const playing=!paused&&!hovered&&!focused&&!reduced&&visible;
  useEffect(()=>{
    if(!playing||photos.length<2)return;
    const timer=window.setInterval(()=>{if(!document.hidden)setIndex(i=>(i+1)%photos.length);},7000);
    return ()=>window.clearInterval(timer);
  },[playing]);
  const choose=(next:number)=>{setIndex((next+photos.length)%photos.length);setPaused(true);};
  const photo=photos[index];
  return <figure ref={container} className={styles.eventPhotograph} aria-roledescription="carousel" aria-label="Scenes from past Olympiads" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setFocused(false);}}>
    <div className={styles.eventPhotoFrame}><Image key={photo.src} src={photo.src} alt={photo.alt} fill sizes="(max-width: 760px) 90vw, 48vw" style={{objectFit:"cover",objectPosition:photo.position}}/><span className={styles.photoLabel}>THE PEOPLE. THE PURPOSE. THE DAY.</span></div>
    <figcaption aria-live={playing?"off":"polite"} aria-atomic="true"><div><span>FROM THE OLYMPIAD ARCHIVE</span><strong>{photo.caption}</strong></div><small>{index+1} / {photos.length}</small></figcaption>
    <a className={styles.photoCredit} href={photo.source} target="_blank" rel="noreferrer">{photo.credit} ↗</a>
    <div className={styles.galleryControls}><div><button aria-label="Previous event photo" onClick={()=>choose(index-1)}>←</button><button aria-label="Next event photo" onClick={()=>choose(index+1)}>→</button></div><div className={styles.galleryDots} aria-label="Choose a photo">{photos.map((p,i)=><button key={p.src} aria-label={`Show photo ${i+1}: ${p.caption}`} aria-current={index===i?"true":undefined} onClick={()=>choose(i)}/>)}</div><button className={styles.galleryPause} disabled={reduced} onClick={()=>setPaused(!paused)} aria-label={paused?"Start automatic photo rotation":"Pause automatic photo rotation"}>{reduced?"Manual viewing":paused?"Play slideshow":"Pause slideshow"}</button></div>
  </figure>;
}
