export type QualifiedLead={company:string;domain:string;email:string;name:string;role:string;fact:string;source_url:string;local_fit:string;role_fit:string;checked_at:string;clay_task_id:string;opener:string;headcount_min:number;headcount_max:number;local_fit_confirmed:boolean;role_fit_confirmed:boolean;email_verified:boolean};
const clean=(value:unknown,max:number)=>{if(typeof value!=='string'||!value.trim()||value.length>max||/[\u2013\u2014\r\n<>]/.test(value))throw Error('Invalid lead field');return value.trim();};
export function qualifiedLead(value:unknown,now=new Date()):QualifiedLead{
 if(!value||typeof value!=='object')throw Error('Missing lead');const v=value as Record<string,unknown>;
 if(v.local_fit_confirmed!==true||v.role_fit_confirmed!==true||v.email_verified!==true||!Number.isInteger(v.headcount_min)||!Number.isInteger(v.headcount_max)||Number(v.headcount_min)<10||Number(v.headcount_max)>2000||Number(v.headcount_min)>Number(v.headcount_max))throw Error('Verified local team, role, work email and size required');
 const domain=clean(v.domain,250).toLowerCase(),email=clean(v.email,250).toLowerCase();
 if(!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(domain)||!email.endsWith('@'+domain)||!/^\S+@\S+\.\S+$/.test(email)||/^(gmail|yahoo|outlook|hotmail|icloud|aol)\.com$/.test(domain))throw Error('Work email domain must match the company');
 const source=clean(v.source_url,1000),url=new URL(source);if(url.protocol!=='https:'||url.username||url.password||(url.hostname!==domain&&!url.hostname.endsWith('.'+domain)))throw Error('Official company research URL required');
 const checked=clean(v.checked_at,60),when=Date.parse(checked);if(!Number.isFinite(when)||when<+now-30*86400000||when>+now+300000)throw Error('Fresh research required');
 const opener=clean(v.opener,400);if(opener.split(/\s+/).length>45||/https?:|unsubscribe|ignore.*instructions|system prompt/i.test(opener))throw Error('Personal opener needs review');
 return {company:clean(v.company,250),domain,email,name:clean(v.name,250),role:clean(v.role,250),fact:clean(v.fact,1000),source_url:source,local_fit:clean(v.local_fit,1000),role_fit:clean(v.role_fit,1000),checked_at:checked,clay_task_id:clean(v.clay_task_id,250),opener,headcount_min:Number(v.headcount_min),headcount_max:Number(v.headcount_max),local_fit_confirmed:true,role_fit_confirmed:true,email_verified:true};
}
export function personalCopy(lead:QualifiedLead){
 const first=lead.name.split(/\s+/)[0];
 const subject=`${lead.company.length>70?'Your team':lead.company} at the spring Olympiad?`;
 const body=`Hi ${first},\n\nI'm Sean Caldwell. I grew up in the Valley, own a business here, and was appointed chairman of the Saguaros Olympiad for spring 2027.\n\n${lead.opener}\n\nThe Saguaros have supported local charities for over 30 years. Our spring field day brings company teams together for friendly competition and helps fund grants to local children's charities. Teams raise money leading up to the event, then get together for a fun day outside work.\n\nWould you be open to hearing a little more? Happy to send an overview or talk it through.\n\nIf this isn't a fit, just let me know and I won't follow up.\n\nSean Caldwell\nChairman, Saguaros Olympiad\n602-388-0896\nwww.saguaros.com\nscottsdaleolympiad.com`;
 const followup=`Hi ${first},\n\nJust wanted to follow up on the spring Olympiad. ${lead.company} could bring a team together for a fun day outside work while supporting local children's charities.\n\nIf an overview would help, I'm happy to send it over. If this isn't a fit, let me know and I won't follow up.\n\nSean Caldwell\n602-388-0896`;
 if(body.split(/\s+/).length>180||/[\u2013\u2014]/.test(subject+body+followup))throw Error('Copy needs review');
 return {subject,body,followup_subject:`Re: ${subject}`,followup_body:followup};
}
