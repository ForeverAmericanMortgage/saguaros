const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const m={exports:{}};new Function('module','exports','require',ts.transpileModule(fs.readFileSync('src/app/olympiad/cloud-outreach/draft-model.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m,m.exports,require);
const {draftHash,reviewedCopy}=m.exports;
test('recipient, subject and body edits each invalidate approval; newline normalization does not',()=>{
 const h=draftHash('person@example.com','Invitation','Hello\nSean');
 assert.notEqual(h,draftHash('another@example.com','Invitation','Hello\nSean'));
 assert.notEqual(h,draftHash('person@example.com','New invitation','Hello\nSean'));
 assert.notEqual(h,draftHash('person@example.com','Invitation','Hi\nSean'));
 assert.equal(h,draftHash('PERSON@example.com','Invitation','Hello\r\nSean\n'));
});
test('edited copies reject empty content, header injection, excessive length and em dashes',()=>{
 for(const [s,b] of [['','Hi'],['Invite\nBcc: x@example.com','Hi'],['Invite',''],['Invite','word '.repeat(221)],['Invite','Hello — Sean']])assert.throws(()=>reviewedCopy('person@example.com',s,b));
 assert.equal(reviewedCopy('person@example.com','Invite','Hello Sean').body,'Hello Sean');
});
