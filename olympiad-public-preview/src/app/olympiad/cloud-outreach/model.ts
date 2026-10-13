export const sender='scaldwell@saguaros.com';
export function gmailHex(id:string){if(!/^\d+$/.test(id))throw Error('Invalid provider ID');return BigInt(id).toString(16);}
export function replyText(text:string){return text.split(/\r?\n(?:On .{0,250}wrote:|From:|_{5,}|>{1})/i)[0].trim().slice(0,20000);}
export function classifyReply(subject:string,text:string,automatic=false){
 const s=(subject+' '+text).toLowerCase();
 if(/unsubscribe|remove me|do not (?:email|contact)|stop (?:emailing|contacting)/.test(s))return 'opted_out';
 if(/undeliverable|delivery (?:status|failure)|recipient (?:not found|unknown)|couldn.t be delivered|address not found/.test(s))return 'bounced';
 if(automatic||/out of (?:the )?office|automatic reply|on vacation/.test(s))return 'out_of_office';
 if(/not interested|not a fit|no thanks|decline|not participating/.test(s))return 'declined';
 if(/interested|send (?:me|us|them|over)|send.{0,30}(?:details|overview|information)|learn more|tell me more|let.s (?:talk|chat)|schedule (?:a |some )?(?:call|time)|adding our|please send to them/.test(s))return 'interested';
 return 'reply';
}
