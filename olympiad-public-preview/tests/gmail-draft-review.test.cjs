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

test('HTML rendering does not change reviewed copy or draft hash',()=>{
 const c={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('src/app/olympiad/cloud-outreach/copy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(c,c.exports);
 const address='4400 N. Scottsdale Rd., Ste 9-725, Scottsdale, AZ 85251',body='Hello Jane'+c.exports.signature(address);
 const before=reviewedCopy('person@example.com','Invitation',body),hash=draftHash('person@example.com','Invitation',body);
 assert.match(c.exports.htmlBody(body,address),/<img/);
 assert.deepEqual(reviewedCopy('person@example.com','Invitation',body),before);assert.equal(draftHash('person@example.com','Invitation',body),hash);
});
