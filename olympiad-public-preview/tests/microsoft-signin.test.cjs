const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'../src/app/olympiad');
function harness(options={}) {
 const calls=[], filters=[], jar=new Map();
 const user={id:'existing-captain',email:'captain@example.test',email_confirmed_at:'2026-10-19',identities:[{provider:'email'},{provider:'azure'}],...options.user};
 const team={id:'existing-team',team_name:'Existing team',company_name:'Existing company',captain_user_id:user.id,industry_id:'industry',roster_participants:[]};
 const client={auth:{
  getUser:async()=>({data:{user},error:null}),
  signInWithOAuth:async args=>{calls.push(args);return {data:{url:'https://example.supabase.co/auth/v1/authorize'},error:null};},
  exchangeCodeForSession:async()=>({data:{user,session:{}},error:options.exchangeError?new Error('exchange failed'):null}),
  signOut:async()=>{calls.push('signOut');return {error:null};},
 },from(table){
  const q=new Proxy({}, {get(_,key){if(key==='then')return resolve=>resolve({data:table==='event_editions'?{id:'event',year:2027,registration_open:true}:table==='industries'?[{id:'industry',name:'Technology'}]:table==='teams'?[team]:table==='pilot_captains'?{user_id:user.id}:table==='organizer_memberships'?null:[],error:null});return (...args)=>{if(key==='eq')filters.push([table,...args]);if(['insert','update','delete','upsert'].includes(key))throw new Error('No identity or team mutations allowed');return q;};}});return q;
 }};
 const cache=new Map();
 function load(file){if(cache.has(file))return cache.get(file);const mod={exports:{}};cache.set(file,mod.exports);
 const req=name=>{
  if(name==='next/headers')return {cookies:async()=>({get:k=>jar.has(k)?{value:jar.get(k)}:undefined,set:(k,v)=>jar.set(k,v),delete:k=>jar.delete(k)})};
  if(name==='next/server')return {NextResponse:{json:(v,i)=>Response.json(v,i),redirect:(url,i)=>new Response(null,{status:307,headers:{...i?.headers,Location:String(url)}})}};
  if(name.endsWith('/pilot/server'))return {pilotClient:async()=>client,pilotConfiguration:()=>({configured:true,enabled:true}),pilotAccessAllowed:async()=>true,SITE_URL:'https://scottsdaleolympiad.com',allowedOrigin:r=>r.headers.get('origin')==='https://scottsdaleolympiad.com'};
  if(name.endsWith('/chairman-access'))return {chairmanAccess:async()=>({ok:false,status:403})};
  if(name.endsWith('/chairman-proof'))return {PROOF_COOKIE:'chairman-proof'};
  if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name)+'.ts');
  return require(name);
 };
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(`(function(require,module,exports){${code}\n})`,{Buffer,URL,Request,Response,Headers,console,process:{env:{NODE_ENV:'production',OLYMPIAD_GOOGLE_SIGN_IN_ENABLED:'true',OLYMPIAD_MICROSOFT_SIGN_IN_ENABLED:options.enabled===false?'false':'true'}}})(req,mod,mod.exports);return mod.exports;
 }
 return {api:load(path.join(root,'api/pilot/route.ts')),callback:load(path.join(root,'auth/callback/route.ts')),calls,filters,jar};
}
function post(action,origin='https://scottsdaleolympiad.com'){return new Request('https://scottsdaleolympiad.com/olympiad/api/pilot',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({action})});}
test('Microsoft requests identity scopes only and uses shared callback',async()=>{const h=harness();assert.equal((await h.api.POST(post('microsoft-sign-in'))).status,200);const c=h.calls[0];assert.equal(c.provider,'azure');assert.deepEqual(c.options.scopes.split(' ').sort(),['email','openid','profile']);assert.equal(c.options.redirectTo,'https://scottsdaleolympiad.com/olympiad/auth/callback');assert.equal(c.options.queryParams.prompt,'select_account');assert.equal(h.jar.get('olympiad-sign-in-provider'),'microsoft');});
test('Unconfigured Microsoft stays unavailable and cross-origin start is blocked',async()=>{const h=harness({enabled:false});assert.equal((await h.api.POST(post('microsoft-sign-in'))).status,503);assert.equal((await h.api.POST(post('microsoft-sign-in','https://other.example'))).status,403);assert.equal(h.calls.length,0);});
test('Google sign-in remains unchanged',async()=>{const h=harness();await h.api.POST(post('google-sign-in'));assert.equal(h.calls[0].provider,'google');assert.equal(h.calls[0].options.scopes,undefined);});
test('Existing verified captain returns to same team without reassignment',async()=>{const h=harness();h.jar.set('olympiad-sign-in-provider','microsoft');const r=await h.callback.GET(new Request('https://scottsdaleolympiad.com/olympiad/auth/callback?code=synthetic'));assert.equal(r.headers.get('location'),'https://scottsdaleolympiad.com/#captain');const body=await (await h.api.GET(new Request('https://scottsdaleolympiad.com/olympiad/api/pilot?action=mine'))).json();assert.equal(body.teams[0].id,'existing-team');assert.ok(h.filters.some(f=>f[0]==='teams'&&f[1]==='captain_user_id'&&f[2]==='existing-captain'));assert.equal(h.jar.has('olympiad-sign-in-provider'),false);});
test('Microsoft approval/cancellation errors return useful fallback without provider details',async()=>{const h=harness();h.jar.set('olympiad-sign-in-provider','microsoft');const r=await h.callback.GET(new Request('https://scottsdaleolympiad.com/olympiad/auth/callback?error=access_denied&error_description=private-details'));assert.equal(r.headers.get('location'),'https://scottsdaleolympiad.com/?auth_error=microsoft_blocked#signin');});
test('Unverified Microsoft identity cannot enter captain hub',async()=>{const h=harness({user:{email_confirmed_at:null}});h.jar.set('olympiad-sign-in-provider','microsoft');const r=await h.callback.GET(new Request('https://scottsdaleolympiad.com/olympiad/auth/callback?code=synthetic'));assert.match(r.headers.get('location'),/microsoft_failed/);assert.ok(h.calls.includes('signOut'));});
