const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const research={},out={};
function load(path,exports,req=()=>({})){vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:req});}
load('src/app/olympiad/cloud-outreach/research.ts',research);load('src/app/olympiad/cloud-outreach/refill.ts',out,()=>research);
test('refill requires a complete bounded snapshot and unique plain company domains',()=>{
 const snapshot=[{company:'Example',domain:'example.com',email:'ignored@example.com'}];const parsed=out.refillPayload({operation:'refill_claim',snapshot,total_records:1,total_matched:1});assert.equal(parsed.data.snapshot[0].email,undefined);
 for(const v of [{snapshot,total_records:1,total_matched:2},{snapshot,total_records:0,total_matched:1},{snapshot:[...snapshot,...snapshot],total_records:2,total_matched:2},{snapshot:[{company:'Example',domain:'https://user:secret@example.com'}],total_records:1,total_matched:1}])assert.throws(()=>out.refillPayload({operation:'refill_claim',...v}));
});
test('local exclusions preserve proof that the original source read was complete',()=>{const p=out.refillPayload({operation:'refill_claim',snapshot:[{company:'Example',domain:'example.com'}],total_records:2,total_matched:2,observed_count:2});assert.equal(p.data.snapshot.length,1);assert.equal(p.data.total_records,2);assert.throws(()=>out.refillPayload({operation:'refill_claim',snapshot:[],total_records:50,total_matched:62,observed_count:50}));});
test('saved metadata requires a cloud claim ID and an actual Clay account receipt',()=>{
 const id='38a0667a-e6a0-49a2-bb94-1096974e1df0';assert.throws(()=>out.refillPayload({operation:'refill_complete',refill_id:'invented',saved:[],returned_count:0,scanned_count:0}));assert.throws(()=>out.refillPayload({operation:'refill_complete',refill_id:id,saved:[{company:'Example',domain:'example.com'}],returned_count:1,scanned_count:1}));
 const p=out.refillPayload({operation:'refill_complete',refill_id:id,saved:[{company:'Example',domain:'example.com',account_id:123}],returned_count:1,scanned_count:1});assert.equal(p.data.saved[0].account_id,'123');
});
test('only the approved Valley city and size partitions can generate company-search queries',()=>{
 assert.equal(out.refillQuery(0,1).organization_locations[0],'Scottsdale, Arizona, United States');assert.equal(out.refillQuery(31,500).organization_num_employees_ranges[0],'501,1000');for(const n of [-1,32,1.5])assert.throws(()=>out.refillQuery(n,1));for(const n of [0,501,1.5])assert.throws(()=>out.refillQuery(0,n));
});
