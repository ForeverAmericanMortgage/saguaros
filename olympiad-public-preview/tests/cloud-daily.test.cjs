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
 assert.equal(signature(ADDR),"\n\nSean Caldwell\nOlympiad 2027 Chairman, The Saguaros\n602-388-0896   www.saguaros.com\n"+ADDR+"\nscottsdaleolympiad.com\n\n"+optOutLine);
 const c=personalCopy(lead,ADDR);for(const b of [c.body,c.followup_body]){assert.ok(b.endsWith(signature(ADDR)));assert.equal(b.split(ADDR).length,2);assert.doesNotMatch(b,/\n--\n|The Saguaros \|/);}
});
test('old and T019 initial and followup tails migrate idempotently',()=>{
 const prefix='Hi Jane,\n\nPlease call.';
 for(const title of ['', '\nOlympiad Chairman | The Saguaros'])for(const footer of ['', '\n\n--\n'+optOutLine+'\nThe Saguaros | '+ADDR]){
 const b=prefix+'\n\nSean Caldwell'+title+'\n602-388-0896'+(title?'\nsaguaros.com | thescasolympiad.com':'')+footer;
 const out=withFooter(b,ADDR);assert.equal(out,prefix+signature(ADDR));assert.equal(out.split(ADDR).length,2);assert.equal(withFooter(out,ADDR),out);
 }const canonical=prefix+signature(ADDR);assert.equal(withFooter(canonical,ADDR),canonical);
});
test('edited and whitespace-mangled tails preserve approved text',()=>{
 const edited='Hello\nChanged signature\n'+optOutLine;assert.equal(withFooter(edited,ADDR),edited);
 assert.equal(withFooter('Hello',ADDR),'Hello'+signature(ADDR));
 for(const tail of [signature(ADDR).replace(/   /g,' '),signature(ADDR).replace(/ /g,'\u00a0'),signature(ADDR).replace(/\n/g,'  \r\n')]){
 const body='Hello'+tail;assert.equal(withFooter(body,ADDR),body);assert.match(htmlBody(body,ADDR),/<img/);
 }
});
function visible(html){return html.replace(/<br>/g,'\n').replace(/<\/p>/g,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');}
test('canonical HTML links, logo, address and text parity',()=>{
 const body=personalCopy(lead,ADDR).body,html=htmlBody(body,ADDR),text=visible(html);
 assert.ok(html.includes(LOGO_URL));assert.match(html,/width="144" height="111" alt="The Saguaros"/);
 for(const url of ['http://saguaros.com/','http://www.saguaros.com','https://www.google.com/maps/search/?api=1&amp;query='+encodeURIComponent(ADDR)])assert.ok(html.includes(url));
 assert.ok(text.includes(signatureTitle));assert.ok(text.includes(optOutLine));assert.equal(text.split(ADDR).length,2);
 const hosts=[...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m=>new URL(m[1].replace(/&amp;/g,'&')).hostname.replace(/^www\./,''));
 assert.deepEqual([...new Set(hosts)].sort(),['google.com','saguaros.com','scottsdaleolympiad.com']);
 for(const line of body.split('\n').filter(Boolean))assert.ok(text.includes(line),line);
});
test('noncanonical HTML escapes markup and retains all text without a logo',()=>{
 const body='<script>"Hi" & goodbye</script>\nEdited signature\n'+optOutLine,html=htmlBody(body,ADDR);
 assert.doesNotMatch(html,/<img|<script>/);assert.match(html,/&lt;script&gt;&quot;Hi&quot; &amp;/);assert.equal(visible(html).trim(),body);
});
test('multipart alternative contains exact footer text',async()=>{
 const text=withFooter(personalCopy(lead,ADDR).body,ADDR);
 const built=await require('nodemailer').createTransport({streamTransport:true,buffer:true}).sendMail({from:'sean@example.com',to:lead.email,subject:'Invitation',text,html:htmlBody(text,ADDR)});
 assert.match(built.message.toString(),/multipart\/alternative/);
 const parsed=await require('mailparser').simpleParser(built.message,{skipHtmlToText:true,skipTextToHtml:true});
 assert.equal(parsed.text.replace(/\r\n/g,'\n').trimEnd(),text);
});
