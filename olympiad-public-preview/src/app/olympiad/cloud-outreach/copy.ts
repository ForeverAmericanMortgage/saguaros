export type QualifiedLead={company:string;domain:string;email:string;name:string;role:string;fact:string;source_url:string;local_fit:string;role_fit:string;checked_at:string;clay_task_id:string;opener:string;headcount_min:number;headcount_max:number;local_fit_confirmed:boolean;role_fit_confirmed:boolean;email_verified:boolean};
const clean=(value:unknown,max:number,evidence=false)=>{if(typeof value!=='string'||!value.trim()||value.length>max||/[\r\n<>]/.test(value)||(!evidence&&/[\u2013\u2014]/.test(value)))throw Error('Invalid lead field');return value.trim();};
export function qualifiedLead(value:unknown,now=new Date()):QualifiedLead{
 if(!value||typeof value!=='object')throw Error('Missing lead');const v=value as Record<string,unknown>;
 if(v.local_fit_confirmed!==true||v.role_fit_confirmed!==true||v.email_verified!==true||!Number.isInteger(v.headcount_min)||!Number.isInteger(v.headcount_max)||Number(v.headcount_min)<10||Number(v.headcount_max)>2000||Number(v.headcount_min)>Number(v.headcount_max))throw Error('Verified local team, role, work email and size required');
 const domain=clean(v.domain,250).toLowerCase(),email=clean(v.email,250).toLowerCase();
 if(!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(domain)||!email.endsWith('@'+domain)||!/^\S+@\S+\.\S+$/.test(email)||/^(gmail|yahoo|outlook|hotmail|icloud|aol)\.com$/.test(domain))throw Error('Work email domain must match the company');
 const source=clean(v.source_url,1000),url=new URL(source);if(url.protocol!=='https:'||url.username||url.password||(url.hostname!==domain&&!url.hostname.endsWith('.'+domain)))throw Error('Official company research URL required');
 const checked=clean(v.checked_at,60),when=Date.parse(checked);if(!Number.isFinite(when)||when<+now-30*86400000||when>+now+300000)throw Error('Fresh research required');
 const opener=clean(v.opener,400);if(opener.split(/\s+/).length>35||/https?:|unsubscribe|ignore.*instructions|system prompt/i.test(opener))throw Error('Personal opener needs review');
 return {company:clean(v.company,250),domain,email,name:clean(v.name,250),role:clean(v.role,250,true),fact:clean(v.fact,1000,true),source_url:source,local_fit:clean(v.local_fit,1000,true),role_fit:clean(v.role_fit,1000,true),checked_at:checked,clay_task_id:clean(v.clay_task_id,250),opener,headcount_min:Number(v.headcount_min),headcount_max:Number(v.headcount_max),local_fit_confirmed:true,role_fit_confirmed:true,email_verified:true};
}
export const optOutLine="Reply 'no thanks' and I'll take you off my list.";
// CAN-SPAM needs a valid physical postal address in commercial email. Never hardcode or guess it.
export function postalAddress(value:unknown){if(typeof value!=='string')throw Error('OUTREACH_POSTAL_ADDRESS is not set');const v=value.trim().replace(/\s*\r?\n\s*/g,', ');if(v.length<10||v.length>200||/[<>\u2013\u2014]/.test(v))throw Error('OUTREACH_POSTAL_ADDRESS is invalid');return v;}
export const signatureTitle='Active Member, The Saguaros';
export const LOGO_URL='https://scottsdaleolympiad.com/email/saguaros-logo.png';
export const SAGUAROS_URL='http://saguaros.com/';
export function signature(address:string){return `\n\nSean Caldwell\n${signatureTitle}\n602-388-0896   www.saguaros.com\n${postalAddress(address)}\nscottsdaleolympiad.com\n\n${optOutLine}`;}
function normalizeTail(text:string){return text.replace(/\r\n/g,'\n').replace(/\u00a0/g,' ').split('\n').map(line=>line.replace(/ +$/,'').replace(/ +/g,' ')).join('\n').trimEnd();}
// Locate the original tail so normalization never alters the approved message above it.
function signatureStart(text:string,_address:string){
 const matches=Array.from(text.matchAll(/(?:^|\n)Sean[ \u00a0]+Caldwell\n/g));
 const last=matches.at(-1);if(!last)return -1;
 const start=last.index!+(last[0].startsWith('\n')?1:0),tail=text.slice(start);
 // Only replace the known trailing sender block; never remove message prose.
 const lines=normalizeTail(tail).split('\n').filter(Boolean);
 const allowed=/^(Sean Caldwell|Active Member, The Saguaros|Olympiad(?: 2027)? Chairman(?: \||,) The Saguaros|602-388-0896.*|(?:www\.)?saguaros\.com.*|(?:scottsdale|thescas)olympiad\.com|4400 N\. Scottsdale.*|If it's not a fit, (?:just )?let me know and I won't follow up\.|Reply 'no thanks' and I'll take you off my list\.|--|The Saguaros \| .*)$/;
 return lines.every(line=>allowed.test(line))&&tail.includes('602-388-0896')?start:-1;
}
export function withFooter(body:string,address:string){
 const fixed=body.replace(/\r\n/g,'\n').replace(/thescasolympiad\.com/gi,'scottsdaleolympiad.com');
 const start=signatureStart(fixed,address);
 if(start>=0)return fixed.slice(0,start).trimEnd()+signature(address);
 return fixed.trimEnd()+signature(address);
}
function escapeHtml(text:string){return text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
function paragraphs(text:string){return text.split(/\n{2,}/).filter(Boolean).map(p=>`<p style="margin:0 0 16px">${escapeHtml(p).replace(/\n/g,'<br>')}</p>`).join('');}
// Captured from scaldwell@saguaros.com Gmail settings on 2026-10-20.
const nativeSignature="<table cellpadding=\"0\" cellspacing=\"0\" style=\"color:rgb(0,0,0);font-size:12px;border-collapse:collapse;font-family:Verdana;line-height:1.15\"><tr><td style=\"vertical-align:top;padding:0.01px 14px 0.01px 0.01px;width:145px;text-align:center\"><a href=\"http://saguaros.com/\" style=\"display:block\"><img src=\"https://d36urhup7zbd7q.cloudfront.net/u/wDjjwvKn9vn/1657154119212.png\" height=\"112\" width=\"145\" style=\"width:145px;vertical-align:middle;border-radius:0px;height:112px\"></a></td><td style=\"padding:0.01px 0.01px 0.01px 14px;vertical-align:top;border-left:2px solid rgb(57,161,91)\"><br><table cellpadding=\"0\" cellspacing=\"0\" style=\"border-collapse:collapse\"><tr><td style=\"line-height:1.2;padding:0.01px\"><br><span style=\"font-weight:bold;line-height:1.2;font-size:14px;color:rgb(100,100,100)\">Sean Caldwell<br>Active Member, The Saguaros&nbsp;</span></td></tr><tr><td nowrap style=\"padding-top:14px\"><div style=\"margin:0.1px;line-height:1\"><span style=\"color:rgb(97,97,97)\"><a href=\"tel:6023880896\" style=\"color:rgb(97,97,97);text-decoration:none\">602-388-0896&nbsp;</a>&nbsp;\u25cf&nbsp;&nbsp;<a href=\"http://www.saguaros.com/\" style=\"color:rgb(97,97,97);text-decoration:none\">www.saguaros.com&nbsp;</a></span></div></td></tr><tr><td nowrap style=\"padding-top:8px\"><div style=\"margin:0.1px;line-height:1\"><a href=\"https://maps.google.com/?q=4400%20N.%20Scottsdale%20rd.%20STE%209-725%20Scottsdale,%20AZ%2085251\" style=\"color:rgb(97,97,97);text-decoration:none\">4400 N. Scottsdale rd. STE 9-725 Scottsdale, AZ 85251&nbsp;</a></div></td></tr><tr><td style=\"padding:14px 0.01px 0.01px\"><table border=\"0\" cellpadding=\"0\" cellspacing=\"0\"><tr><td align=\"left\" style=\"padding-right:14px;text-align:center;padding-top:0px\"><a href=\"http://facebook.com/thesaguaros\"><img width=\"31\" height=\"31\" src=\"https://cdn.gifo.wisestamp.com/s/fb/3b5998/62/0/transparent.png\" border=\"0\" style=\"float:left;border:none\"></a></td><td align=\"left\" style=\"padding-right:14px;text-align:center;padding-top:0px\"><a href=\"http://instagram.com/thesaguaros\"><img width=\"31\" height=\"31\" src=\"https://cdn.gifo.wisestamp.com/s/inst/E4405F/62/0/transparent.png\" border=\"0\" style=\"float:left;border:none\"></a></td><td align=\"left\" style=\"padding-right:14px;text-align:center;padding-top:0px\"><a href=\"http://us.linkedin.com/in/thesaguaros\"><img width=\"31\" height=\"31\" src=\"https://cdn.gifo.wisestamp.com/s/ld/0077b5/62/0/transparent.png\" border=\"0\" style=\"float:left;border:none\"></a></td><td align=\"left\" style=\"padding-right:14px;text-align:center;padding-top:0px\"><a href=\"http://twitter.com/thesaguaros\"><img width=\"31\" height=\"31\" src=\"https://cdn.gifo.wisestamp.com/s/tw/55acee/62/0/transparent.png\" border=\"0\" style=\"float:left;border:none\"></a></td><td align=\"left\" style=\"padding-right:14px;text-align:center;padding-top:0px\"><a href=\"http://youtube.com/thesaguaros\"><img width=\"31\" height=\"31\" src=\"https://cdn.gifo.wisestamp.com/s/yt/cd201f/62/0/transparent.png\" border=\"0\" style=\"float:left;border:none\"></a></td><td align=\"left\" style=\"padding-right:14px;text-align:center;padding-top:0px\"><a href=\"http://tiktok.com/@saguaros%5C.com/\"><img width=\"31\" height=\"31\" src=\"https://cdn.gifo.wisestamp.com/s/tt/000000/62/0/transparent.png\" border=\"0\" style=\"float:left;border:none\"></a></td></tr></table></td></tr></table></td></tr></table>";
function signatureHtml(address:string){
 postalAddress(address);
 return nativeSignature+`<p style="margin-top:16px;font-size:12px;color:#666">${escapeHtml(optOutLine)}</p>`;
}
export function htmlBody(text:string,address:string){
 text=withFooter(text,address);
 const start=signatureStart(text,address);
 const content=start>=0?paragraphs(text.slice(0,start).trimEnd().replace(/\r\n/g,'\n'))+signatureHtml(address):paragraphs(text.replace(/\r\n/g,'\n'));
 return `<!doctype html><html><body><div style="font-family:Arial,sans-serif;font-size:14px">${content}</div></body></html>`;
}
export function followupCopy(first:string,address:string){return `Hey ${first},\n\nJust wanted to bump this thread back up. As a business owner, I know how easily things get lost in the sauce. Even though Olympiad isn't until next year, we like to get a head start introducing it and seeing if it might be a good fit.\n\nWould you have five minutes for a quick call? I'd love to share how we help children in our community and why your team might enjoy being part of it. The event is our way of saying thank you for helping support kids who need it.`+signature(address);}
export function personalCopy(lead:QualifiedLead,address:string){
 const foot=signature(address);
 const first=lead.name.split(/\s+/)[0];
 const subject=`A spring team day for ${lead.company.length>70?'your team':lead.company}?`;
 const body=`Hi ${first},\n\n${lead.opener}\n\nI'd love to introduce you to Scottsdale Olympiad, a spring field day bringing Valley businesses together for local children's charities.\n\nI grew up here, own a business here, and this year I'm chairing the event. The Saguaros have been putting it on for over 30 years. Last year, we granted over $1 million to local children's charities, with Olympiad helping fund a large portion.\n\nOver 100 Valley businesses participated last year, and many come back every year. It's a fun day out of the office for a great cause.\n\nWould you have five minutes for a phone call or Google Meet? I'd love to hear about your team and share how it works.\n\nIf it's not a fit, let me know and I won't follow up.${foot}`;
 const followup=followupCopy(first,address);
 if(body.split(/\s+/).length>220||/[\u2013\u2014]/.test(subject+body+followup))throw Error('Copy needs review');
 return {subject,body,followup_subject:`Re: ${subject}`,followup_body:followup};
}
