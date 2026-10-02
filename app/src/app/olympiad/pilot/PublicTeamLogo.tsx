"use client";
import {useEffect,useState} from 'react';
import s from './pilot.module.css';
export default function PublicTeamLogo({url,name,large=false}:{url?:string;name:string;large?:boolean}) {
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[url]);
 return <div className={`${s.publicLogo} ${large?s.publicLogoLarge:''}`}>
 {url&&!failed ? <img src={url} alt={`${name} logo`} loading="lazy" onError={()=>setFailed(true)} /> : <span aria-hidden="true">{name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase()}</span>}
 </div>;
}
