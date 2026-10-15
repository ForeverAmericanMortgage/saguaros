const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('src/app/olympiad/cloud-outreach/read-retry.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m,m.exports);
const {retryMailboxRead}=m.exports;
test('one interrupted read reconnects and succeeds',async()=>{let reads=0,connections=0;assert.equal(await retryMailboxRead(async()=>{if(++reads===1)throw Object.assign(new Error(),{code:'ECONNRESET'});return 'verified'},async()=>{connections++}),'verified');assert.equal(reads,2);assert.equal(connections,1)});
test('identity/content rejection never retries',async()=>{let connections=0;await assert.rejects(retryMailboxRead(async()=>{throw Error('Draft missing or duplicated')},async()=>{connections++}));assert.equal(connections,0)});
test('persistent network failure stops after one retry',async()=>{let reads=0;await assert.rejects(retryMailboxRead(async()=>{reads++;throw Object.assign(new Error(),{code:'ETIMEDOUT'})},async()=>{}));assert.equal(reads,2)});
