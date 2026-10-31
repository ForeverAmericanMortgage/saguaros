// Pure helpers for the sender safeguards. Kept free of server imports so tests can load them.
export const alertRecipient='scaldwell@saguaros.com';
export const runbookPath='olympiad-public-preview/docs/outreach-sender-runbook.md';
// Gmail search for provider abuse reports and spam complaints that are not tied to one prospect.
// Phrases are specific on purpose: charity mail about child abuse prevention must not match.
export const abuseNoticeQuery='-from:me {subject:"abuse report" subject:"abuse complaint" subject:"abuse notice" subject:"spam complaint" subject:"spam report" subject:"reported as spam" "feedback-type: abuse"}';
export type SenderAlert={reason:string;safety_paused:boolean;last_polled_at:string|null};
export function alertReason(reason:string){
 const r=reason.replace(/^Sending paused:\s*/,'').replace(/\s+/g,' ').trim().replace(/\.$/,'');
 return (r.length>100?r.slice(0,97).trimEnd()+'...':r)||'Unknown reason';
}
export function senderAlertCopy(a:SenderAlert,now=new Date()){
 const az=(d:Date)=>d.toLocaleString('en-US',{timeZone:'America/Phoenix',dateStyle:'medium',timeStyle:'short'});
 const reason=alertReason(a.reason);
 const next=a.safety_paused
  ?'This is an automatic safety pause. Review the bounces or complaint in the chairman tracker. When it is safe, resume sending under Sender safety in the chairman portal. Sending stays paused until you do.'
  :'Open Cloud reply monitor in the chairman portal and select Check monitor status. If the mailbox connection failed, reconnect it with a new Google app password. Sending restarts on its own once the monitor checks the mailbox cleanly.';
 return {subject:`Olympiad sender stopped: ${reason}`,text:`Sean,

The Olympiad cloud sender has stopped.

Reason: ${a.reason.replace(/\s+/g,' ').trim()}
Last mailbox check: ${a.last_polled_at?az(new Date(a.last_polled_at))+' Arizona time':'not recorded'}
Alert time: ${az(now)} Arizona time

No outreach emails go out while this is open.

What to do: ${next}

Step by step: ${runbookPath} in the saguaros repository.
Chairman portal: https://chairman.scottsdaleolympiad.com/#prospect-tracker

You get at most one of these per hour, between 8:00 a.m. and 6:30 p.m. Arizona time, while the problem continues.`};
}
