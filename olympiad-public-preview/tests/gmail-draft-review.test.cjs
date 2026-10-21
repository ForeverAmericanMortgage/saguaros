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

test('native signature replaces historical footers once and keeps approved prose and hash intact',()=>{
 const c={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('src/app/olympiad/cloud-outreach/copy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(c,c.exports);
 const address='4400 N. Scottsdale Rd., Ste 9-725, Scottsdale, AZ 85251';
 for(const footer of ['Sean Caldwell\nOlympiad Chairman | The Saguaros\n602-388-0896\nsaguaros.com | scottsdaleolympiad.com\n\n'+address+"\nIf it's not a fit, just let me know and I won't follow up.",'Sean Caldwell\nOlympiad 2027 Chairman, The Saguaros\n602-388-0896',c.exports.signature(address).trim()]){
 const body='Hi Jane,\n\nWould you like to learn more?\n\n'+footer,hash=draftHash('j@example.com','Hi',body),html=c.exports.htmlBody(body,address);
 assert.equal((html.match(/Sean Caldwell/g)||[]).length,1);assert.match(html,/Olympiad Chairman, The Saguaros/);assert.match(html,/tel:6023880896/);assert.match(html,/1657154119212.png/);assert.match(html,/facebook.com\/thesaguaros/);assert.match(html,/Would you like to learn more/);assert.equal(draftHash('j@example.com','Hi',body),hash);
 }
});
