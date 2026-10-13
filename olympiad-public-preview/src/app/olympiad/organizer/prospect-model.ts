export const prospectStatuses = { researching:'Researching',ready:'Ready for outreach',held:'On hold',sent:'Sent · waiting for reply',replied:'Reply received',interested:'Interested',conversation:'Conversation',registered:'Registered team',declined:'Not interested',opted_out:'Do not contact',bounced:'Delivery issue' } as const;
export type ProspectStatus = keyof typeof prospectStatuses;
export type ProspectMessage={id:string;direction:'outbound'|'inbound';step:string;provider_message_id:string;gmail_thread_id:string;subject:string;body:string;occurred_at:string};
export type Prospect = {id:string;organizer_prospect_messages?:ProspectMessage[];event_year:number;company_name:string;company_domain:string;contact_name:string;contact_email:string;contact_title:string;status:ProspectStatus;assigned_to:string;next_follow_up:string|null;notes:string;fit_reason:string;evidence_url:string;draft_subject:string;draft_body:string;source:string;channel:string;last_contact_at:string|null;outreach_subject:string;outreach_body:string;gmail_thread_id:string|null;last_reply_at:string|null;last_reply_summary:string;opted_out:boolean;linked_team_id:string|null;version:number;updated_at:string};
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validDate(value:unknown){return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value+'T12:00:00Z')) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
export function validateProspectEdit(body:Record<string,unknown>):string|null{
 if(!uuid.test(String(body.id||''))||!Number.isSafeInteger(body.version)||Number(body.version)<1)return 'Refresh this prospect before saving.';
 if(typeof body.status!=='string'||!Object.hasOwn(prospectStatuses,body.status))return 'Choose an outreach status.';
 for(const [field,max] of Object.entries({assigned_to:250,notes:5000,fit_reason:1500,evidence_url:2000,draft_subject:200,draft_body:5000}))if(typeof body[field]!=='string'||String(body[field]).length>max)return 'Check the owner, notes and draft length.';
 if(body.evidence_url){try{if(!['http:','https:'].includes(new URL(String(body.evidence_url)).protocol))return 'Use a public http or https evidence link.';}catch{return 'Use a valid evidence link.';}}
 if(body.next_follow_up && !validDate(body.next_follow_up))return 'Choose a valid follow-up date.';
 if(body.linked_team_id && !uuid.test(String(body.linked_team_id)))return 'Choose a registered team.';
 if(body.status==='registered'&&!body.linked_team_id)return 'Link an actual registered team first.';
 return null;
}
export function prospectDue(p:Pick<Prospect,'next_follow_up'|'status'|'opted_out'|'linked_team_id'>,today:string){return !!p.next_follow_up&&p.next_follow_up<=today&&!p.opted_out&&!p.linked_team_id&&!['declined','bounced','held'].includes(p.status);}
export function gmailThreadUrl(thread:string){return 'https://mail.google.com/mail/u/?authuser=scaldwell%40saguaros.com#all/'+encodeURIComponent(thread);}
