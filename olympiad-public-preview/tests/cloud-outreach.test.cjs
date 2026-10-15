const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,env={}){const exports={};const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(source,{exports,require:n=>n==='server-only'?{}:require(n),Buffer,process:{env}});return exports;}
const m=load('src/app/olympiad/cloud-outreach/model.ts');
test('negative and automatic replies stop before interest classification',()=>{assert.equal(m.classifyReply('Re: Olympiad','Not interested, please do not contact me'),'opted_out');assert.equal(m.classifyReply('Re: Olympiad','Not interested'),'declined');assert.equal(m.classifyReply('Automatic reply','Send me an overview when back',true),'out_of_office');assert.equal(m.classifyReply('Undeliverable','Recipient not found'),'bounced');});
test('quoted original invitation cannot manufacture interest',()=>{const text=m.replyText('No thanks.\nFrom: Sean\nWould you be interested?');assert.equal(m.classifyReply('Re: invitation',text),'opted_out');assert.equal(m.classifyReply('Re: invitation','Please send an overview'),'interested');assert.equal(m.classifyReply('Re: invitation','Adding our office manager. Please send to them.'),'interested');});
test('Gmail decimal identifiers convert without number precision loss',()=>{const value='1234567890123456789';assert.equal(BigInt('0x'+m.gmailHex(value)).toString(),value);assert.throws(()=>m.gmailHex('invalid'));});
test('credentials are authenticated encryption and bearer matching fails closed',()=>{const s=load('src/app/olympiad/cloud-outreach/secret.ts',{OLYMPIAD_OUTREACH_WORKER_SECRET:'synthetic-worker-secret-at-least-32-characters'});const sealed=s.seal('synthetic-password');assert(!sealed.includes('synthetic-password'));assert.equal(s.unseal(sealed),'synthetic-password');const pieces=sealed.split('.');pieces[2]='A'+pieces[2].slice(1);assert.throws(()=>s.unseal(pieces.join('.')));assert.equal(s.workerAuthorized({headers:{get:()=>null}}),false);assert.equal(s.workerAuthorized({headers:{get:()=> 'Bearer synthetic-worker-secret-at-least-32-characters'}}),true);});
test("'no thanks' replies opt out",()=>{for(const t of ['no thanks','No thanks!','No, thanks.','no thank you','Please take me off your list'])assert.equal(m.classifyReply('Re: Olympiad',t),'opted_out');assert.equal(m.classifyReply('Re: Olympiad','Not a fit this year'),'declined');});
test('cloud sender skips Arizona weekends',()=>{assert.equal(m.arizonaWeekend(new Date('2026-10-17T17:00:00Z')),true);assert.equal(m.arizonaWeekend(new Date('2026-10-18T17:00:00Z')),true);assert.equal(m.arizonaWeekend(new Date('2026-10-19T17:00:00Z')),false);assert.equal(m.arizonaWeekend(new Date('2026-10-17T05:00:00Z')),false);assert.equal(m.arizonaWeekend(new Date('2026-10-20T06:30:00Z')),false);});

test('unmarked quoted opt-out footer does not override an interested reply',()=>{for(const footer of ["Reply 'no thanks' and I'll take you off my list.","REPLY 'NO THANKS' AND I'LL TAKE YOU OFF MY LIST."]){assert.equal(m.classifyReply('Re: Olympiad',`Yes, interested! Sean ... ${footer}`),'interested');assert.equal(m.classifyReply('Re: Olympiad',`No thanks! Sean ... ${footer}`),'opted_out');}});

test('new and legacy unmarked signatures preserve real reply intent',()=>{
 for(const title of ['Olympiad 2027 Chairman, The Saguaros','Olympiad Chairman | The Saguaros']){
 const sig="Sean Caldwell\n"+title+"\n602-388-0896   www.saguaros.com\nThe Saguaros | 123 Scottsdale Road\nscottsdaleolympiad.com\n\nReply 'no thanks' and I'll take you off my list.";
 for(const [reply,kind] of [['','reply'],['Yes, interested','interested'],['No thanks','opted_out']])assert.equal(m.classifyReply('',reply+'\n'+sig),kind);
 }
});
test('curly quotes and HTML-only reply entities preserve interest',()=>{
 assert.equal(m.classifyReply('',"send details\nReply ‘no thanks’ and I’ll take you off my list."),'interested');
 const text=m.htmlText("<p>Yes, interested</p><p>Reply &#39;no thanks&#39; and I&#x27;ll take you off my list.</p>");
 assert.ok(text.includes("'no thanks'"));assert.equal(m.classifyReply('',text),'interested');
 assert.equal(m.htmlText('&nbsp;&amp;&lt;&gt;&quot;&#39;&#x27;&rsquo;&lsquo;')," &<>\"''''");
});
test('quoted fit sentences are ignored but genuine declines remain',()=>{
 for(const line of ["If it's not a fit, let me know and I won't follow up.","If this isn't a fit, let me know and I won't follow up."])assert.equal(m.classifyReply('','please send an overview\n'+line),'interested');
 assert.equal(m.classifyReply('','Not a fit this year'),'declined');
});

test('decimal curly-quote entities in HTML-only invitations preserve interest',()=>{
 const text=m.htmlText('<p>Yes, interested</p><p>Reply &#8216;no thanks&#8217; and I&#8217;ll take you off my list.</p>');
 assert.ok(text.includes('Reply ‘no thanks’ and I’ll take you off my list.'));
 assert.equal(m.classifyReply('',text),'interested');
 assert.equal(m.htmlText('&#x2018;test&#X2019;'),'‘test’');
});
test('quoted fun-day invitation does not manufacture an out-of-office reply',()=>{
 for(const line of ["It's a fun day out of the office for a great cause.",'It’s a fun day out of the office for a great cause.']){
 assert.equal(m.classifyReply('','please send details\n'+line),'interested');
 }
 assert.equal(m.classifyReply('','I am out of the office until Monday'),'out_of_office');
});
