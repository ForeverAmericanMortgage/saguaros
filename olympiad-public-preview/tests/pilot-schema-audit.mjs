const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite(); let passed=0;
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('${A}'),('${B}');`);
await db.exec(readFileSync(new URL('../supabase/migrations/20260928235416_olympiad_pilot.sql',import.meta.url),'utf8'));
async function as(user,sql,params=[]){await db.exec('begin');try{await db.exec(`set local role ${user?'authenticated':'anon'}`);await db.query(`select set_config('request.jwt.claim.sub',$1,true)`,[user??'']);const r=await db.query(sql,params);await db.exec('commit');return r.rows;}catch(e){await db.exec('rollback');throw e;}}
async function ok(label,fn){await fn();console.log('PASS '+label);passed++;}
async function denied(fn,pattern){await assert.rejects(fn,pattern);}
const register=(user,name='Team Alpha',pub=true)=>as(user,`select * from public.register_team($1,'Company','technology','Captain','6023880896',$2,null,'Description')`,[name,pub]);
await ok('closed event rejects registration',()=>denied(()=>register(A),/Registration is not open/));
await db.exec('update public.event_editions set registration_open=true');
let team;
await ok('owner registers public team',async()=>{team=(await register(A))[0].team_id;assert.ok(team)});
await ok('anonymous sees directory only',async()=>{assert.equal((await as(null,'select * from public.team_directory')).length,1);await denied(()=>as(null,'select * from public.teams'),/permission denied/);await denied(()=>as(null,'select * from public.roster_participants'),/permission denied/);});
await ok('B cannot read or update A private team',async()=>{assert.equal((await as(B,'select * from public.teams')).length,0);assert.equal((await as(B,`update public.teams set description='x' where id=$1 returning id`,[team])).length,0);});
const roster=[{name:'Captain',email:'captain@example.test',phone:'6023880896',shirt_size:'L',shirt_fit:'male'}];
const save=(user,rows,version)=>as(user,'select public.save_roster($1,$2::jsonb,$3)',[team,JSON.stringify(rows),version]);
await ok('owner saves roster and version increments',async()=>{await save(A,roster,0);assert.equal((await as(A,'select roster_version from public.teams where id=$1',[team]))[0].roster_version,1);});
await ok('B cannot read or save A roster',async()=>{assert.equal((await as(B,'select * from public.roster_participants')).length,0);await denied(()=>save(B,[],1),/Team access denied/);});
await ok('null roster version rejected',()=>denied(()=>save(A,[],null),/Roster changed/));
await ok('stale roster version rejected',()=>denied(()=>save(A,[],0),/Roster changed/));
await ok('duplicate email replacement rolls back',async()=>{await denied(()=>save(A,[...roster,{...roster[0],email:'CAPTAIN@example.test'}],1),/duplicate key/);assert.equal((await as(A,'select * from public.roster_participants')).length,1);assert.equal((await as(A,'select roster_version from public.teams'))[0].roster_version,1);});
await ok('max50 rejects51 roster',()=>denied(()=>save(A,Array.from({length:51},()=>({})),1),/limited to 50/));
await ok('owner reassignment denied',()=>denied(()=>as(A,'update public.teams set captain_user_id=$1 where id=$2',[B,team]),/permission denied/));
await ok('same-event public invitation attribution succeeds',async()=>{const slug=(await as(null,'select slug from public.team_directory where id=$1',[team]))[0].slug;const invited=(await as(B,`select * from public.register_team('Invited Team','Invited Company','technology','Captain','6023880896',false,$1,'')`,[slug]))[0];assert.equal((await as(B,'select referring_team_id from public.team_referrals where team_id=$1',[invited.team_id]))[0].referring_team_id,team);});
await ok('cross-event invitation rejected by RPC and direct insert',async()=>{const edition=(await db.query("insert into public.event_editions(year,name) values(2026,'Past event') returning id")).rows[0].id;const past=(await register(B,'Past Team',false))[0].team_id;await db.query("select set_config('request.jwt.claim.sub',$1,false)",[B]);await db.query('update public.teams set event_id=$1 where id=$2',[edition,past]);await db.query("select set_config('request.jwt.claim.sub','',false)");await as(B,'update public.teams set is_public=true where id=$1',[past]);const pastSlug=(await as(null,'select slug from public.team_directory where id=$1',[past]))[0].slug;await denied(()=>as(A,`select * from public.register_team('Wrong Event','Company','technology','Captain','6023880896',false,$1,'')`,[pastSlug]),/Invitation team is unavailable/);await denied(()=>as(A,'insert into public.team_referrals(team_id,referring_team_id) values($1,$2)',[team,past]),/row-level security/);await db.query('delete from public.team_directory where id=$1',[past]);});
await ok('public opt-out removes directory',async()=>{await as(A,'update public.teams set is_public=false where id=$1',[team]);assert.equal((await as(null,'select * from public.team_directory')).length,0);});
await ok('normalized same event duplicate name denied',()=>denied(()=>register(B,'  TEAM ALPHA  '),/duplicate key/));
await ok('captain cannot self-assign organizer',()=>denied(()=>as(A,'insert into public.organizer_memberships(user_id) values($1)',[A]),/permission denied/));
await db.query('insert into public.organizer_memberships(user_id) values($1)',[B]);
await ok('organizer can assign liaison; captain cannot',async()=>{await as(B,'insert into public.liaison_assignments(event_id,industry_id,organizer_user_id) select e.id,i.id,$1 from public.event_editions e cross join public.industries i limit 1',[B]);assert.equal((await as(B,'select * from public.liaison_assignments')).length,1);assert.equal((await as(A,'select * from public.liaison_assignments')).length,0);await denied(()=>as(A,'insert into public.liaison_assignments(event_id,industry_id,organizer_user_id) select e.id,i.id,$1 from public.event_editions e cross join public.industries i offset 1 limit 1',[B]),/row-level security/);});
await ok('multiple teams allowed; RPC cap10 enforced',async()=>{for(let i=2;i<=10;i++)await register(A,'Team '+i,false);await denied(()=>register(A,'Team 11',false),/up to 10/);});
console.log(`ALL ${passed} CHECKS PASSED`);await db.close();
