import {readFileSync, readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
const dir=new URL('../supabase/migrations/',import.meta.url);
for(const file of readdirSync(dir).filter(x=>x.endsWith('.sql')).sort()) await db.exec(readFileSync(new URL(file,dir),'utf8'));
// Foundations can be reapplied without duplication or resetting activation/records.
await db.exec(readFileSync(new URL('20260929160450_tracking_foundations.sql',dir),'utf8'));
const results=await db.exec(readFileSync(new URL('./tracking-foundations-rollback.sql',import.meta.url),'utf8'));
const report=results.flatMap(r=>r.rows??[]).find(r=>r.status);
assert.equal(report?.status,'PASS',JSON.stringify(report));
assert.equal((await db.query('select count(*)::int as n from auth.users')).rows[0].n,0);
assert.equal((await db.query('select fundraising_active from public.event_editions where year=2027')).rows[0].fundraising_active,false);
console.log(report.detail); console.log('PASS migration replay and rollback cleanup; hosted Auth/PostgREST still requires independent checks.');
await db.close();
