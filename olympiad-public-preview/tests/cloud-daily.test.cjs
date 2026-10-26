const test=require('node:test');const assert=require('node:assert/strict');const ts=require('typescript');const fs=require('node:fs');
const source=ts.transpileModule(fs.readFileSync('src/app/olympiad/cloud-outreach/copy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleCopy={exports:{}};new Function('module','exports',source)(moduleCopy,moduleCopy.exports);const {qualifiedLead,personalCopy,withFooter,postalAddress,optOutLine}=moduleCopy.exports;const ADDR='PO Box 0000, Scottsdale, AZ 85250 (test fixture)';
const lead={headcount_min:50,headcount_max:100,local_fit_confirmed:true,role_fit_confirmed:true,email_verified:true,company:'Sample Arizona Company',domain:'example.com',email:'person@example.com',name:'Jane Smith',role:'People leader',fact:'The company has a Scottsdale office.',source_url:'https://www.example.com/about',local_fit:'Scottsdale operating team on official office page',role_fit:'People leader in the company directory',checked_at:new Date().toISOString(),clay_task_id:'test-research',opener:'I saw your Scottsdale office on your website. Olympiad could give your local team a fun way to spend time together and support children here.'};
test('personal copy contains sourced opener, real signature, soft ask and opt-out without dashes',()=>{const copy=personalCopy(qualifiedLead(lead),ADDR);assert.match(copy.body,/Hi Jane,/);assert.match(copy.body,/Scottsdale office/);assert.match(copy.body,/602-388-0896/);assert.match(copy.body,/Over 100 Valley businesses/);assert.match(copy.body,/five minutes for a phone call or Google Meet/);assert.match(copy.body,/won't follow up/);assert.ok(copy.body.split(/\s+/).length<=200);assert.doesNotMatch(copy.body,/[\u2013\u2014]/);assert.match(copy.body,/Last year, we granted over \$1 million to local children's charities/);assert.ok(copy.body.indexOf(lead.opener)<copy.body.indexOf("I grew up here"));assert.doesNotMatch(copy.body,/10 to 20 people/);});
test('unverified company aliases and personal emails are held',()=>{for(const email of ['person@elsewhere.com','person@gmail.com'])assert.throws(()=>qualifiedLead({...lead,email}));assert.throws(()=>qualifiedLead({...lead,source_url:'https://thirdparty.com/fact'}));assert.throws(()=>qualifiedLead({...lead,source_url:'http://example.com/about'}));});
test('missing or stale research cannot enter the queue',()=>{assert.throws(()=>qualifiedLead({...lead,local_fit:''}));assert.throws(()=>qualifiedLead({...lead,email_verified:false}));assert.throws(()=>qualifiedLead({...lead,headcount_max:2001}));assert.throws(()=>qualifiedLead({...lead,clay_task_id:''}));assert.throws(()=>qualifiedLead({...lead,checked_at:'2020-01-01'}));assert.throws(()=>qualifiedLead({...lead,opener:'Personal opener — invented connection'}));});

test('source punctuation stays in evidence without leaking into outgoing copy',()=>{const v=qualifiedLead({...lead,fact:'A sourced quote — preserved as written.',local_fit:'Phoenix team – provider evidence.',role:'People leader — global',role_fit:'Current leader — official profile.'});assert.match(v.fact,/—/);assert.doesNotMatch(personalCopy(v,ADDR).body,/[\u2013\u2014]/);assert.throws(()=>qualifiedLead({...lead,opener:'A personalized opener — with a dash'}));assert.throws(()=>qualifiedLead({...lead,fact:'<script>untrusted</script>'}));});
test('footer carries real site, opt-out line and configured postal address',()=>{const c=personalCopy(qualifiedLead(lead),ADDR);for(const b of [c.body,c.followup_body]){assert.match(b,/Reply 'no thanks' and I'll take you off my list\./);assert.ok(b.includes(ADDR));assert.doesNotMatch(b,/thescasolympiad/);}assert.match(c.body,/scottsdaleolympiad\.com/);assert.throws(()=>personalCopy(qualifiedLead(lead),undefined));assert.throws(()=>postalAddress(''));});
test('legacy approved bodies are normalized once at send time',()=>{const old='Hi\n\nSean\nsaguaros.com | thescasolympiad.com';const out=withFooter(old,ADDR);assert.doesNotMatch(out,/thescasolympiad/);assert.ok(out.includes(optOutLine)&&out.includes(ADDR));assert.equal(withFooter(out,ADDR),out);});

test('long valid opener and postal address pass personal copy and draft review',()=>{
 const draftSource=ts.transpileModule(fs.readFileSync('src/app/olympiad/cloud-outreach/draft-model.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const draftModule={exports:{}};new Function('module','exports','require',draftSource)(draftModule,draftModule.exports,require);
 const opener='I saw your Scottsdale office on your website and thought your local team might enjoy a spring day together supporting children here while meeting other Valley businesses and spending time outside the office with colleagues.';
 const address='12345 '+ 'Scottsdale '.repeat(16)+'AZ 85250';
 assert.equal(opener.split(/\s+/).length,35);assert.ok(address.length>=190&&address.length<=200);
 const copy=personalCopy(qualifiedLead({...lead,opener}),address);
 assert.ok(copy.body.split(/\s+/).length>200);assert.ok(copy.body.split(/\s+/).length<=220);
 assert.equal(draftModule.exports.reviewedCopy(lead.email,copy.subject,copy.body).body,copy.body);
 assert.throws(()=>draftModule.exports.reviewedCopy(lead.email,copy.subject,Array(221).fill('word').join(' ')),/220 words/);
});

const {signature,htmlBody,signatureTitle,LOGO_URL}=moduleCopy.exports;
test('exact canonical signature shared by initial and followup',()=>{
 assert.equal(signature(ADDR),"\n\nSean Caldwell\nOlympiad Chairman, The Saguaros\n602-388-0896   www.saguaros.com\n"+ADDR+"\nscottsdaleolympiad.com\n\n"+optOutLine);
 const c=personalCopy(lead,ADDR);for(const b of [c.body,c.followup_body]){assert.ok(b.endsWith(signature(ADDR)));assert.equal(b.split(ADDR).length,2);assert.doesNotMatch(b,/\n--\n|The Saguaros \|/);}
});
test('old and T019 initial and followup tails migrate idempotently',()=>{
 const prefix='Hi Jane,\n\nPlease call.';
 for(const title of ['', '\nOlympiad Chairman | The Saguaros'])for(const footer of ['', '\n\n--\n'+optOutLine+'\nThe Saguaros | '+ADDR]){
 const b=prefix+'\n\nSean Caldwell'+title+'\n602-388-0896'+(title?'\nsaguaros.com | thescasolympiad.com':'')+footer;
 const out=withFooter(b,ADDR);assert.equal(out,prefix+signature(ADDR));assert.equal(out.split(ADDR).length,2);assert.equal(withFooter(out,ADDR),out);
 }const canonical=prefix+signature(ADDR);assert.equal(withFooter(canonical,ADDR),canonical);
});
test('unknown signature text is preserved above the required Chairman footer',()=>{
 const body='Hello\nChanged signature\n'+optOutLine;
 assert.equal(withFooter(body,ADDR),body+signature(ADDR));
 assert.equal(withFooter(withFooter(body,ADDR),ADDR),body+signature(ADDR));
});
test('canonical native HTML uses the Gmail signature and preserves invitation text',()=>{
 const address='4400 N. Scottsdale rd. STE 9-725 Scottsdale, AZ 85251';
 const body=personalCopy(lead,address).body,html=htmlBody(body,address);
 assert.match(html,/d36urhup7zbd7q\.cloudfront\.net/);
 assert.match(html,/Olympiad Chairman, The Saguaros/);
 assert.match(html,/width="145"/);
 assert.ok(html.includes(address));assert.ok(html.includes('tel:6023880896'));
 assert.ok(html.includes(lead.opener));
 assert.equal((html.match(/Sean Caldwell/g)||[]).length,1);
 assert.equal((html.match(/Reply &#39;no thanks&#39;/g)||[]).length,1);
});
test('HTML escapes untrusted message markup above the native signature',()=>{
 const html=htmlBody('<script>"Hi" & goodbye</script>',ADDR);
 assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;&quot;Hi&quot; &amp;/);
 assert.match(html,/Olympiad Chairman/);
});
test('multipart alternative contains exact footer text',async()=>{
 const text=withFooter(personalCopy(lead,ADDR).body,ADDR);
 const built=await require('nodemailer').createTransport({streamTransport:true,buffer:true}).sendMail({from:'sean@example.com',to:lead.email,subject:'Invitation',text,html:htmlBody(text,ADDR)});
 assert.match(built.message.toString(),/multipart\/alternative/);
 const parsed=await require('mailparser').simpleParser(built.message,{skipHtmlToText:true,skipTextToHtml:true});
 assert.equal(parsed.text.replace(/\r\n/g,'\n').trimEnd(),text);
});

// Regression: reviewed legacy signatures followed by a soft opt-out must not duplicate.
test('legacy trailing opt-out is replaced with one canonical footer without changing the invitation',()=>{
 const invitation=Array(170).fill('invitation').join(' ');
 for(const ending of ["If it's not a fit, just let me know and I won't follow up.","If it's not a fit, let me know and I won't follow up."]){
  const body=invitation+"\n\nSean Caldwell\nOlympiad Chairman | The Saguaros\n602-388-0896\nsaguaros.com | thescasolympiad.com\n\n"+ending;
  const result=withFooter(body,ADDR);
  assert.equal(result,invitation+moduleCopy.exports.signature(ADDR));
  assert.equal((result.match(/Sean Caldwell/g)||[]).length,1);
  assert.ok(result.split(/\s+/).length<=220);
  assert.equal(withFooter(result,ADDR),result);
 }
});
test('soft opt-out in a message without a recognized legacy signature is preserved',()=>{
 const body="Hi Alex,\n\nIf it's not a fit, just let me know and I won't follow up.";
 assert.ok(withFooter(body,ADDR).startsWith(body));
});
