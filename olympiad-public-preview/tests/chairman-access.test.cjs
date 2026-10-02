// Offline tests: real auth/proof/route code, mocked identity/database/network.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../src/app/olympiad');
const secret = 'offline-test-secret-32-characters-minimum';
const uid = '11111111-1111-4111-8111-111111111111';
const teamId = '22222222-2222-4222-8222-222222222222';
const baseUser = { id: uid, email: 'scaldwell@saguaros.com', email_confirmed_at: '2026-10-02',
  identities: [{ provider: 'google', identity_data: { sub: 'google-subject' } }] };

function harness(options = {}) {
  const env = { NODE_ENV: 'production', OLYMPIAD_CHAIRMAN_EMAIL_ALLOWLIST: 'scaldwell@saguaros.com,cwolfe@saguaros.com',
    OLYMPIAD_CHAIRMAN_PROOF_SECRET: secret, OLYMPIAD_GOOGLE_SIGN_IN_ENABLED: 'true', ...options.env };
  const user = options.user === null ? null : { ...baseUser, ...options.user };
  const claims = { sub: uid, session_id: 'session-1', ...options.claims };
  const jar = new Map(); const writes = []; const network = []; const reads = [];
  const cookieOptions = new Map();
  const cookies = { get: key => jar.has(key) ? { value: jar.get(key) } : undefined,
    set: (key, value, settings) => { jar.set(key, value); cookieOptions.set(key, settings); }, delete: key => jar.delete(key) };
  const team = { id: teamId, event_id: 'edition-1', industry_id: 'industry-1', captain_user_id: 'other-captain',
    team_name: 'Synthetic Team', company_name: 'Synthetic Company', slug: 'synthetic-team', description: '',
    roster_participants: [], team_captain_details: { name: 'Synthetic Captain', phone: '0000000000' }, is_public: true };
  function query(table) {
    reads.push(table); let single = false;
    const builder = new Proxy({}, { get(_, key) {
      if (key === 'then') return resolve => {
        let data = table === 'event_editions' ? { id: 'edition-1', year: 2027, registration_open: true, fundraising_active: false }
          : table === 'industries' ? [{ id: 'industry-1', name: 'Technology' }]
          : table === 'organizer_memberships' ? (options.member === false ? null : { user_id: uid })
          : table === 'teams' || table === 'team_directory' ? (single ? team : [team]) : [];
        resolve({ data, error: null });
      };
      return (...args) => { if (['insert','update','upsert','delete'].includes(key)) writes.push({ table, method: key, args });
        if (key === 'maybeSingle' || key === 'single') single = true; return builder; };
    } }); return builder;
  }
  const client = { auth: {
    getUser: async () => ({ data: { user }, error: null }),
    getClaims: async () => ({ data: { claims }, error: options.claimsError || null }),
    exchangeCodeForSession: async () => ({ data: { user, session: { provider_token: options.providerToken === false ? null : 'synthetic-provider-token', access_token: 'synthetic-jwt' } }, error: null }),
    signInWithOAuth: async args => { network.push({ oauth: args }); return { data: { url: 'https://accounts.google.com/synthetic' }, error: null }; },
    signOut: async () => ({ error: null }),
  }, from: query, rpc: async name => ({ data: [], error: null }) };
  const cache = new Map();
  let stateIndex = 0;
  function load(file) {
    file = path.resolve(file); if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    const localRequire = name => {
      if (name === 'react' && options.ui) {
        const React = require('react');
        return { ...React, useState: initial => {
          const index = stateIndex++;
          return React.useState(index === 0 ? [{ ...team, name: team.team_name, company: team.company_name,
            industry: 'Technology', roster: [], listed: 0, complete: 0, needs_follow_up: true,
            approval_status: 'pending', participation_history: 'new', captain_name: 'Synthetic Captain' }]
            : index === 5 ? false : index === 6 ? 'Offline fixture' : initial);
        } };
      }
      if (name === 'server-only') return {};
      if (name === 'next/headers') return { cookies: async () => cookies, headers: async () => new Headers({ host: options.host || 'chairman.scottsdaleolympiad.com' }) };
      if (name === 'next/navigation') return { redirect: url => { throw new Error(`REDIRECT:${url}`); } };
      if (name.endsWith('/pilot/server')) return { pilotClient: async () => client,
        pilotConfiguration: () => ({ configured: true, enabled: true }), SITE_URL: 'https://scottsdaleolympiad.com',
        pilotEmailAllowed: () => true, allowedOrigin: request => ['https://scottsdaleolympiad.com','https://chairman.scottsdaleolympiad.com'].includes(request.headers.get('origin')) };
      if (name.endsWith('/sync')) return { desiredTags: () => [], syncContact: () => { throw new Error('Mailchimp writes forbidden in tests'); } };
      if (name.endsWith('.css')) return new Proxy({}, { get: (_, key) => String(key) });
      if (name.startsWith('.')) { let target = path.resolve(path.dirname(file), name);
        for (const extension of ['.ts','.tsx']) if (fs.existsSync(target + extension)) return load(target + extension);
      }
      return require(name);
    };
    vm.runInNewContext(`(function(require,module,exports){${source}\n})`, {
      Buffer, Request, Response, Headers, URL, AbortSignal, crypto: globalThis.crypto, console,
      process: { env }, fetch: async (url, init) => {
        network.push({ url, init });
        assert.equal(url, 'https://openidconnect.googleapis.com/v1/userinfo');
        return Response.json(options.googleProfile || { sub: 'google-subject', email: user?.email, email_verified: true });
      },
    }, { filename: file })(localRequire, module, module.exports);
    return module.exports;
  }
  const proof = load(path.join(root, 'auth/chairman-proof.ts'));
  if (options.proof !== false) jar.set(proof.PROOF_COOKIE, proof.signGoogleProof({ sub: uid, sid: 'session-1',
    email: user?.email || baseUser.email, exp: Math.floor(Date.now()/1000) + proof.PROOF_TTL }, secret));
  return { load: relative => load(path.join(root, relative)), client, proof, jar, writes, reads, network, cookieOptions };
}

test('allowance requires exact domain and exact invitation; empty fails closed', () => {
  const { proof } = harness();
  assert.equal(proof.chairmanEmailAllowed('CWOLFE@saguaros.com', 'cwolfe@saguaros.com'), true);
  for (const email of ['other@saguaros.com','cwolfe@saguaros.com.attacker.test','cwolfe@sub.saguaros.com','cwolfe@saguaros.co'])
    assert.equal(proof.chairmanEmailAllowed(email, 'cwolfe@saguaros.com'), false);
  assert.equal(proof.chairmanEmailAllowed(baseUser.email, ''), false);
});

test('Google userinfo must be verified, match Auth email and Google subject', () => {
  const { proof } = harness(); const profile = { sub: 'google-subject', email: baseUser.email, email_verified: true };
  assert.equal(proof.googleIdentityMatches(profile, baseUser), true);
  for (const bad of [{ ...profile, email_verified: false },{ ...profile, sub: 'other' },{ ...profile, email: 'other@saguaros.com' }])
    assert.equal(proof.googleIdentityMatches(bad, baseUser), false);
  assert.equal(proof.googleIdentityMatches(profile, { ...baseUser, identities: [], user_metadata: { provider: 'google' } }), false);
});

test('proof rejects expiry, tampering, changed session/user/email and missing secret', () => {
  const { proof } = harness(); const expected = { sub: uid, sid: 'session-1', email: baseUser.email };
  const token = proof.signGoogleProof({ ...expected, exp: 200 }, secret);
  assert.equal(proof.verifyGoogleProof(token, secret, expected, 100), true);
  assert.equal(proof.verifyGoogleProof(token, secret, expected, 200), false);
  assert.equal(proof.verifyGoogleProof(token + 'x', secret, expected, 100), false);
  for (const changed of [{ ...expected, sid: 'email-link-session' },{ ...expected, sub: 'other-user' },{ ...expected, email: 'other@saguaros.com' }])
    assert.equal(proof.verifyGoogleProof(token, secret, changed, 100), false);
  assert.equal(proof.verifyGoogleProof(token, '', expected, 100), false);
});

const denied = [
  ['anonymous', { user: null }], ['unverified', { user: { email_confirmed_at: '' } }],
  ['uninvited Saguaros', { user: { email: 'other@saguaros.com' } }],
  ['outside domain even if listed', { user: { email: 'scaldwell@other.com' }, env: { OLYMPIAD_CHAIRMAN_EMAIL_ALLOWLIST: 'scaldwell@other.com' } }],
  ['email-link or absent Google proof', { proof: false }], ['different current session', { claims: { session_id: 'email-link-session' } }],
  ['invalid claims', { claimsError: 'invalid signature' }], ['no organizer membership', { member: false }],
  ['removed invitation', { env: { OLYMPIAD_CHAIRMAN_EMAIL_ALLOWLIST: '' } }],
];
for (const [label, options] of denied) test(`private APIs deny ${label} on both hosts without writes`, async () => {
  for (const origin of ['https://chairman.scottsdaleolympiad.com','https://scottsdaleolympiad.com']) {
    const h = harness(options);
    for (const [file, suffix] of [['api/pilot/route.ts','?action=organizer'],['api/audience/route.ts',''],['api/communications/route.ts',''],['api/logo/route.ts',`?team_id=${teamId}`]]) {
      const route = h.load(file); const response = await route.GET(new Request(`${origin}/olympiad/${file.replace('/route.ts','')}${suffix}`));
      assert.ok([401,403].includes(response.status), `${file}: ${response.status}`);
    }
    for (const action of ['review-team','save-followup','set-goal']) {
      const response = await h.load('api/pilot/route.ts').POST(new Request(`${origin}/olympiad/api/pilot`, { method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }));
      assert.ok([401,403].includes(response.status));
    }
    const response = await h.load('api/audience/route.ts').POST(new Request(`${origin}/olympiad/api/audience`, { method: 'POST', headers: { Origin: origin }, body: '{"action":"sync"}' }));
    assert.ok([401,403].includes(response.status)); assert.equal(h.writes.length, 0); assert.equal(h.network.length, 0);
  }
});

test('both explicitly invited members can read the existing organizer overview', async () => {
  for (const email of [baseUser.email, 'cwolfe@saguaros.com']) {
    const h = harness({ user: { email } });
    assert.equal((await h.load('auth/chairman-access.ts').chairmanAccess(h.client)).ok, true);
    const response = await h.load('api/pilot/route.ts').GET(new Request('https://chairman.scottsdaleolympiad.com/olympiad/api/pilot?action=organizer'));
    assert.equal(response.status, 200); const data = await response.json();
    assert.equal(data.teams[0].name, 'Synthetic Team'); assert.equal(data.teams[0].needs_follow_up, true);
    assert.equal(h.writes.length, 0); assert.equal(h.network.length, 0);
  }
});

test('Google callback issues host-only proof tied to exchanged session and returns home', async () => {
  const h = harness({ proof: false });
  const response = await h.load('auth/chairman/callback/route.ts').GET(new Request('https://chairman.scottsdaleolympiad.com/olympiad/auth/chairman/callback?code=synthetic'));
  assert.equal(response.headers.get('location'), 'https://chairman.scottsdaleolympiad.com/');
  assert.ok(h.jar.get(h.proof.PROOF_COOKIE));
  const settings = h.cookieOptions.get(h.proof.PROOF_COOKIE);
  assert.equal(settings.httpOnly, true); assert.equal(settings.secure, true); assert.equal(settings.domain, undefined);
  assert.equal(h.network[0].init.redirect, 'error'); assert.equal(h.network[0].init.cache, 'no-store');
});

test('failed Google callback cannot create proof or retain previous proof', async () => {
  for (const options of [{ providerToken: false },{ member: false },{ googleProfile: { sub: 'other', email: baseUser.email, email_verified: true } }]) {
    const h = harness(options);
    const response = await h.load('auth/chairman/callback/route.ts').GET(new Request('https://chairman.scottsdaleolympiad.com/olympiad/auth/chairman/callback?code=synthetic'));
    assert.equal(response.headers.get('location'), 'https://chairman.scottsdaleolympiad.com/?chairman_error=access');
    assert.equal(h.jar.has(h.proof.PROOF_COOKIE), false); assert.equal(h.writes.length, 0);
  }
});

test('chairman login rejects hostile origins and selects Google with chairman callback', async () => {
  const h = harness(); const route = h.load('auth/chairman/start/route.ts');
  assert.equal((await route.POST(new Request('https://chairman.scottsdaleolympiad.com/olympiad/auth/chairman/start', { method: 'POST', headers: { Origin: 'https://evil.example' } }))).status, 403);
  assert.equal(h.network.length, 0);
  assert.equal((await route.POST(new Request('https://chairman.scottsdaleolympiad.com/olympiad/auth/chairman/start', { method: 'POST', headers: { Origin: 'https://chairman.scottsdaleolympiad.com' } }))).status, 200);
  assert.equal(h.network[0].oauth.provider, 'google');
  assert.equal(h.network[0].oauth.options.redirectTo, 'https://chairman.scottsdaleolympiad.com/olympiad/auth/chairman/callback');
});

test('public captain Google flow and public directory remain independent of chairman proof', async () => {
  const h = harness({ proof: false }); const route = h.load('api/pilot/route.ts');
  const response = await route.POST(new Request('https://scottsdaleolympiad.com/olympiad/api/pilot', { method: 'POST',
    headers: { Origin: 'https://scottsdaleolympiad.com', 'Content-Type': 'application/json' }, body: '{"action":"google-sign-in"}' }));
  assert.equal(response.status, 200);
  assert.equal(h.network[0].oauth.options.redirectTo, 'https://scottsdaleolympiad.com/olympiad/auth/callback');
  assert.equal((await route.GET(new Request('https://scottsdaleolympiad.com/olympiad/api/pilot?action=directory'))).status, 200);
  assert.equal(h.writes.length, 0);
});

test('old organizer page redirects to the chairman home; chairman page gates before mounting tools', async () => {
  const old = harness({ host: 'scottsdaleolympiad.com' });
  await assert.rejects(old.load('organizer/page.tsx').default(), /REDIRECT:https:\/\/chairman.scottsdaleolympiad.com/);
  const denied = harness({ proof: false });
  const signIn = await denied.load('organizer/page.tsx').default();
  assert.equal(signIn.type.name, 'ChairmanSignIn'); assert.equal(denied.network.length, 0);
  const allowed = harness(); const tools = await allowed.load('organizer/page.tsx').default();
  assert.equal(tools.type.name, 'OrganizerPage'); assert.equal(allowed.network.length, 0);
});

test('existing organizer views render with synthetic data and no effects or sends', () => {
  const h = harness({ ui: true }); const React = require('react');
  const html = require('react-dom/server').renderToStaticMarkup(React.createElement(h.load('organizer/OrganizerDashboard.tsx').default));
  for (const text of ['Chairman dashboard','Businesses &amp; teams','Captains &amp; participants','Season plan','Early-access invitations','Synthetic Team','Sign out']) assert.ok(html.includes(text), text);
  assert.equal(h.network.length, 0); assert.equal(h.writes.length, 0);
});

test('same-host sign-out clears proof, including expired/absent proof, without registration dependency', async () => {
  const h = harness(); const route = h.load('auth/chairman/start/route.ts');
  assert.equal((await route.DELETE(new Request('https://chairman.scottsdaleolympiad.com/olympiad/auth/chairman/start', {
    method: 'DELETE', headers: { Origin: 'https://evil.example' } }))).status, 403);
  assert.ok(h.jar.has(h.proof.PROOF_COOKIE));
  assert.equal((await route.DELETE(new Request('https://chairman.scottsdaleolympiad.com/olympiad/auth/chairman/start', {
    method: 'DELETE', headers: { Origin: 'https://chairman.scottsdaleolympiad.com' } }))).status, 200);
  assert.equal(h.jar.has(h.proof.PROOF_COOKIE), false); assert.equal(h.writes.length, 0);
});
