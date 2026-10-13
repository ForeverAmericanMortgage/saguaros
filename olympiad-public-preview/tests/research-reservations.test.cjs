const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const exportsValue={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/olympiad/cloud-outreach/research.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsValue});
test('research accepts only a company and plain domain, never credential-bearing URLs or address fields',()=>{
 const r=exportsValue.researchCompany({company:'  Company  ',domain:'EXAMPLE.COM'});assert.equal(r.company,'Company');assert.equal(r.domain,'example.com');
 for(const domain of ['https://example.com','user:secret@example.com','someone@example.com','example.com/path','-bad.example','example.com\nother'])assert.throws(()=>exportsValue.researchCompany({company:'Company',domain}));
 assert.throws(()=>exportsValue.researchCompany({company:'Company\nSecond',domain:'example.com'}));
});
test('qualified intake requires a server-issued reservation identifier',()=>{
 for(const reservation_id of [undefined,'','true','example.com'])assert.throws(()=>exportsValue.researchReservation({reservation_id}));
 assert.equal(exportsValue.researchReservation({reservation_id:'38a0667a-e6a0-49a2-bb94-1096974e1df0'}),'38a0667a-e6a0-49a2-bb94-1096974e1df0');
});
