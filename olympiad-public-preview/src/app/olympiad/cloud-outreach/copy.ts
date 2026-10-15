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
export const signatureTitle='Olympiad 2027 Chairman, The Saguaros';
export const LOGO_URL='https://scottsdaleolympiad.com/email/saguaros-logo.png';
export const SAGUAROS_URL='http://saguaros.com/';
export function signature(address:string){return `\n\nSean Caldwell\n${signatureTitle}\n602-388-0896   www.saguaros.com\n${postalAddress(address)}\nscottsdaleolympiad.com\n\n${optOutLine}`;}
function normalizeTail(text:string){return text.replace(/\r\n/g,'\n').replace(/\u00a0/g,' ').split('\n').map(line=>line.replace(/ +$/,'').replace(/ +/g,' ')).join('\n').trimEnd();}
// Locate the original tail so normalization never alters the approved message above it.
function signatureStart(text:string,address:string){const matches=Array.from(text.matchAll(/Sean[ \u00a0]+Caldwell/g));const start=matches.length?matches[matches.length-1].index!:-1;return start>=0&&normalizeTail(text.slice(start))===normalizeTail(signature(address).trimStart())?start:-1;}
export function withFooter(body:string,address:string){
 const fixed=body.replace(/thescasolympiad\.com/gi,'scottsdaleolympiad.com');
 const legacy=/Sean Caldwell\n(Olympiad Chairman \| The Saguaros\n)?602-388-0896(\nsaguaros\.com \| (scottsdale|thescas)olympiad\.com)?(\n+--\nReply 'no thanks' and I'll take you off my list\.\nThe Saguaros \| [^\n]+)?\s*$/;
 // Older reviewed drafts put their soft opt-out after the legacy signature.
 // Treat that complete trailing block as one footer, not another message body.
 const softOptOut=/\n+If it's not a fit, (?:just )?let me know and I won't follow up\.\s*$/;
 const withoutSoftOptOut=fixed.replace(softOptOut,'');
 const match=legacy.exec(withoutSoftOptOut);
 if(match)return fixed.slice(0,match.index).trimEnd()+signature(address);
 if(signatureStart(fixed,address)>=0||fixed.includes(optOutLine))return fixed;
 return fixed.trimEnd()+signature(address);
}
function escapeHtml(text:string){return text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
function paragraphs(text:string){return text.split(/\n{2,}/).filter(Boolean).map(p=>`<p style="margin:0 0 16px">${escapeHtml(p).replace(/\n/g,'<br>')}</p>`).join('');}
function signatureHtml(address:string){
 const addr=postalAddress(address);
 return `<p style="margin:0 0 16px"><a href="${SAGUAROS_URL}"><img src="${LOGO_URL}" width="144" height="111" alt="The Saguaros" style="display:block;border:0"></a></p><p style="margin:0 0 16px"><span style="color:#666;font-weight:bold">Sean Caldwell<br>${signatureTitle}</span><br>602-388-0896&nbsp;&nbsp;&nbsp;<a href="http://www.saguaros.com">www.saguaros.com</a><br><a href="${escapeHtml('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(addr))}">${escapeHtml(addr)}</a><br><a href="https://scottsdaleolympiad.com">scottsdaleolympiad.com</a></p><p style="margin:0;font-size:12px;color:#666">${escapeHtml(optOutLine)}</p>`;
}
export function htmlBody(text:string,address:string){
 const start=signatureStart(text,address);
 const content=start>=0?paragraphs(text.slice(0,start).trimEnd().replace(/\r\n/g,'\n'))+signatureHtml(address):paragraphs(text.replace(/\r\n/g,'\n'));
 return `<!doctype html><html><body><div style="font-family:Arial,sans-serif;font-size:14px">${content}</div></body></html>`;
}
export function personalCopy(lead:QualifiedLead,address:string){
 const foot=signature(address);
 const first=lead.name.split(/\s+/)[0];
 const subject=`A spring team day for ${lead.company.length>70?'your team':lead.company}?`;
 const body=`Hi ${first},\n\n${lead.opener}\n\nI'd love to introduce you to Scottsdale Olympiad, a spring field day bringing Valley businesses together for local children's charities.\n\nI grew up here, own a business here, and this year I'm chairing the event. The Saguaros have been putting it on for over 30 years. Last year, we granted over $1 million to local children's charities, with Olympiad helping fund a large portion.\n\nOver 100 Valley businesses participated last year, and many come back every year. It's a fun day out of the office for a great cause.\n\nWould you have five minutes for a phone call or Google Meet? I'd love to hear about your team and share how it works.\n\nIf it's not a fit, let me know and I won't follow up.${foot}`;
 const followup=`Hi ${first},\n\nJust wanted to follow up on the spring Olympiad. ${lead.company} could bring a team together for a fun day outside work while supporting local children's charities.\n\nIf an overview would help, I'm happy to send it over. If this isn't a fit, let me know and I won't follow up.${foot}`;
 if(body.split(/\s+/).length>220||/[\u2013\u2014]/.test(subject+body+followup))throw Error('Copy needs review');
 return {subject,body,followup_subject:`Re: ${subject}`,followup_body:followup};
}
