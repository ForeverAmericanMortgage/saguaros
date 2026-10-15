export const sender='scaldwell@saguaros.com';
export function gmailHex(id:string){if(!/^\d+$/.test(id))throw Error('Invalid provider ID');return BigInt(id).toString(16);}
export function replyText(text:string){return text.split(/\r?\n(?:On .{0,250}wrote:|From:|_{5,}|>{1})/i)[0].trim().slice(0,20000);}
export function classifyReply(subject:string,text:string,automatic=false){
 // Quoted invitations may retain the footer even without email quote markers.
 const reply=text.replace(/Reply 'no thanks' and I'll take you off my list\./gi,'');
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
