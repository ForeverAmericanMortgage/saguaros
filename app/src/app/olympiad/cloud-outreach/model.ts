export const sender='scaldwell@saguaros.com';
export function gmailHex(id:string){if(!/^\d+$/.test(id))throw Error('Invalid provider ID');return BigInt(id).toString(16);}
export function replyText(text:string){return text.split(/\r?\n(?:On .{0,250}wrote:|From:|_{5,}|>{1})/i)[0].trim().slice(0,20000);}
export function htmlText(html:string){return html.replace(/<br\b[^>]*>/gi,'\n').replace(/<\/(?:p|div|tr|blockquote)>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const cp=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):+n;return Number.isFinite(cp)&&cp>=0&&cp<=0x10FFFF?String.fromCodePoint(cp):'\uFFFD';}).replace(/&(nbsp|amp|lt|gt|quot|rsquo|lsquo);/gi,entity=>({'nbsp':' ','amp':'&','lt':'<','gt':'>','quot':'"','rsquo':"'",'lsquo':"'"}[entity.slice(1,-1).toLowerCase()]!));}
export function classifyReply(subject:string,text:string,automatic=false){
 // Quoted invitations may retain the footer even without email quote markers.
 const reply=text.replace(/[‘’]/g,"'").replace(/It's a fun day out of the office for a great cause\./gi,'').replace(/If it's not a fit, let me know and I won't follow up\./gi,'').replace(/If this isn't a fit, let me know and I won't follow up\./gi,'').replace(/^(?:Olympiad Chairman \| The Saguaros|Olympiad 2027 Chairman, The Saguaros|602-388-0896[^\n]*|The Saguaros \| [^\n]*)\s*$/gmi,'').replace(/Reply 'no thanks' and I'll take you off my list\./gi,'');
 const s=(subject+' '+reply).toLowerCase();
 if(/unsubscribe|remove me|take me off|no,? thanks|no thank you|do not (?:email|contact)|stop (?:emailing|contacting)/.test(s))return 'opted_out';
 if(/undeliverable|delivery (?:status|failure)|recipient (?:not found|unknown)|couldn.t be delivered|address not found/.test(s))return 'bounced';
 if(automatic||/out of (?:the )?office|automatic reply|on vacation/.test(s))return 'out_of_office';
 if(/not interested|not a fit|decline|not participating/.test(s))return 'declined';
 if(/interested|send (?:me|us|them|over)|send.{0,30}(?:details|overview|information)|learn more|tell me more|let.s (?:talk|chat)|schedule (?:a |some )?(?:call|time)|adding our|please send to them/.test(s))return 'interested';
 return 'reply';
}
// The cloud sender only sends Monday to Friday, Arizona time (no DST, so America/Phoenix is stable).
export function arizonaWeekend(now=new Date()){const day=new Intl.DateTimeFormat('en-US',{timeZone:'America/Phoenix',weekday:'short'}).format(now);return day==='Sat'||day==='Sun';}
