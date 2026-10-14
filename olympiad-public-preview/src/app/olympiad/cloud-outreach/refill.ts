import {researchCompany,researchReservation} from './research';
const cities=['Scottsdale','Phoenix','Tempe','Mesa','Chandler','Gilbert','Glendale','Peoria'];
const ranges=['11,50','51,200','201,500','501,1000'];
export function refillQuery(partition:number,page:number){
 if(!Number.isInteger(partition)||partition<0||partition>=32||!Number.isInteger(page)||page<1||page>500)throw Error('Invalid refill cursor');
 return {organization_locations:[`${cities[Math.floor(partition/4)]}, Arizona, United States`],organization_num_employees_ranges:[ranges[partition%4]],page,per_page:50};
}
export function refillPayload(value:unknown){
 if(!value||typeof value!=='object')throw Error('Refill data required');const v=value as Record<string,unknown>;
 if(v.operation==='refill_claim'){
  const observed=v.observed_count===undefined&&Array.isArray(v.snapshot)?v.snapshot.length:v.observed_count;
  if(!Array.isArray(v.snapshot)||v.snapshot.length>50||!Number.isInteger(v.total_records)||Number(v.total_records)<0||Number(v.total_records)>50||v.total_matched!==v.total_records||observed!==v.total_records||v.snapshot.length>Number(observed))throw Error('Complete pending snapshot required');
  const snapshot=v.snapshot.map(researchCompany);if(new Set(snapshot.map(s=>s.domain)).size!==snapshot.length)throw Error('Duplicate snapshot domain');
  return {action:'claim',data:{snapshot,total_records:observed,total_matched:observed,observed_count:observed}};
 }
 const refill_id=researchReservation({reservation_id:v.refill_id});
 if(v.operation==='refill_fail')return {action:'fail',data:{refill_id,detail:'Company refill source or save failed. Review provider access and the saved-record ledger before retrying.'}};
 if(v.operation!=='refill_complete'||!Array.isArray(v.saved)||v.saved.length>50||!Number.isInteger(v.returned_count)||Number(v.returned_count)<0||Number(v.returned_count)>50||!Number.isInteger(v.scanned_count)||Number(v.scanned_count)<0||Number(v.scanned_count)>Number(v.returned_count))throw Error('Verified refill result required');
 const saved=v.saved.map(row=>{const company=researchCompany(row);if(!row||typeof row!=='object'||!/^[1-9]\d{0,19}$/.test(String(row.account_id||'')))throw Error('Verified Clay account ID required');return {...company,account_id:String(row.account_id)};});
 if(new Set(saved.map(s=>s.domain)).size!==saved.length)throw Error('Duplicate saved domain');
 return {action:'complete',data:{refill_id,saved,returned_count:v.returned_count,scanned_count:v.scanned_count}};
}
