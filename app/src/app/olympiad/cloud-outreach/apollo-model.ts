import {signature,followupCopy} from './copy';
type Org={id?:string;name?:string;primary_domain?:string;city?:string;state?:string;industry?:string};
export type ApolloPerson={id?:string;first_name?:string;name?:string;title?:string;organization_id?:string;organization?:Org;email?:string;email_status?:string;email_domain_catchall?:boolean;match_confidence?:string;employment_history?:{current?:boolean;organization_id?:string}[]};
const cities=new Set(['phoenix','scottsdale','tempe','mesa','chandler','glendale','peoria','gilbert','surprise','goodyear','avondale','paradise valley','fountain hills']);
const safe=(s:unknown,max=250):s is string=>typeof s==='string'&&s.trim().length>0&&s.length<=max&&!/[\r\n<>]/.test(s);
const text=(s:string)=>s.replace(/[\u2013\u2014]/g,',');
export function qualifyApollo(id:string,p:ApolloPerson|null,address:string){
 const reject=(reason:string)=>({person_id:id,qualified:false,reason,evidence:{provider:'Apollo',person_id:id}});
 if(!p||p.id!==id||p.match_confidence!=='high')return reject('Exact identity not confirmed');
 const o=p.organization;
 if(!o?.id||p.organization_id!==o.id||!p.employment_history?.some(e=>e.current===true&&e.organization_id===o.id))return reject('Current employer needs review');
 if(!safe(o.name)||!safe(p.name)||!safe(p.first_name,80)||!safe(p.title))return reject('Missing contact details');
 if(!/\b(owner|founder|president)\b|\b(human resources|people operations|hr)\b.*\b(director|head|vp|vice president)\b|\b(director|head|vp|vice president)\b.*\b(human resources|people operations|hr)\b/i.test(p.title))return reject('Team decision-maker role not confirmed');
 if(!cities.has((o.city||'').toLowerCase())||!['arizona','az'].includes((o.state||'').toLowerCase()))return reject('Valley business location not confirmed');
 const domain=(o.primary_domain||'').toLowerCase(),email=(p.email||'').toLowerCase();
 if(p.email_status!=='verified'||p.email_domain_catchall!==false)return reject('Verified non-catchall email required');
 if(!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(domain)||!/^[^\s<>@]+@[^\s<>@]+$/.test(email)||email.split('@')[1]!==domain||/^(gmail|outlook|hotmail|yahoo|icloud|aol)\.com$/.test(domain))return reject('Work email domain needs manual review');
 const company=text(o.name),name=text(p.name),role=text(p.title),city=text(o.city!);
 const opener=/human resources|people operations|\bhr\b/i.test(role)?`I'm reaching out because you lead people work at ${company}. Would a day with other Valley teams, outside the usual office routine, be something your ${city} team would enjoy?`:`I came across ${company} here in ${city} and thought your team might enjoy a day with other Valley businesses.`;
 const subject=`A spring team day for ${company}?`;
 const body=`Hi ${text(p.first_name)},\n\n${opener}\n\nI'd love to introduce you to Scottsdale Olympiad, a spring field day bringing Valley businesses together for local children's charities.\n\nI grew up here, own a business here, and this year I'm chairing the event. The Saguaros have been putting it on for over 30 years. Last year, we granted over $1 million to local children's charities, with Olympiad helping fund a large portion.\n\nOver 100 Valley businesses participated last year, and many come back every year. It's a fun day out of the office for a great cause.\n\nWould you have five minutes for a phone call or Google Meet? I'd love to hear about your team and share how it works.`+signature(address);
 return {person_id:id,qualified:true,reason:'',company,domain,email,name,role,subject,body,followup_subject:'Re: '+subject,followup_body:followupCopy(text(p.first_name),address),evidence:{provider:'Apollo',person_id:id,organization_id:o.id,local_fit:city+', Arizona',role_fit:role,email_verified:true,email_domain_catchall:false,source_url:'https://'+domain,opener}};
}
export type ApolloSummary={qualified:number;attempted:number;credits:number;uncertain:number;remaining:number|null;last_error:string;enabled:boolean};
export function apolloRecap(s?:ApolloSummary){if(!s)return 'Apollo-first usage: unavailable. Do not interpret missing usage as zero.';return `Apollo-first research: ${s.qualified} new qualified drafts today (50 sends per weekday; queue target 150); ${s.attempted} reserved email lookups today.\nConfirmed Apollo credits: ${s.credits}${s.uncertain?' (incomplete; an unresolved lookup needs review)':''}.\nCredits per qualified draft: ${s.uncertain?'unavailable until reconciled':s.qualified?(s.credits/s.qualified).toFixed(2):'not applicable, no qualified drafts'}.\nClay credits used by this flow: 0.\nLast confirmed Apollo balance: ${s.remaining??'unavailable'}.\n${s.last_error?'Research needs attention: '+s.last_error:'New initial emails use the approved weekday sending policy. Follow-ups remain held.'}\nCredit usage is not a dollar charge. Dollar cost requires the account subscription or credit-pack price.`;}
