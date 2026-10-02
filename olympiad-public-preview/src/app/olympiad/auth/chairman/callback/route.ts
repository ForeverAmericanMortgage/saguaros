import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pilotClient, pilotConfiguration } from '../../../pilot/server';
import { chairmanAccess } from '../../chairman-access';
import { chairmanEmailAllowed, chairmanOrigin, googleIdentityMatches, PROOF_COOKIE, PROOF_TTL, signGoogleProof } from '../../chairman-proof';
import { magicHeaders } from '../../magic-link';

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!chairmanOrigin(url.origin, process.env.NODE_ENV !== 'production')) {
    return new NextResponse('Chairman callback origin is not allowed.', { status: 403, headers: magicHeaders });
  }
  const jar = await cookies();
  jar.delete(PROOF_COOKIE);
  const fail = () => NextResponse.redirect(new URL('/?chairman_error=access', url.origin), { headers: magicHeaders });
  if (!url.searchParams.get('code') || !pilotConfiguration().configured) return fail();
  try {
    const client = await pilotClient();
    const { data, error } = await client.auth.exchangeCodeForSession(url.searchParams.get('code')!);
    if (error || !data.session?.provider_token) return fail();
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user || !chairmanEmailAllowed(user.email, process.env.OLYMPIAD_CHAIRMAN_EMAIL_ALLOWLIST || '')) return fail();
    // Google's resource server validates the token returned by this PKCE exchange.
    // Do not log, store or forward the token to any other destination.
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${data.session.provider_token}` },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    if (!response.ok || !googleIdentityMatches(await response.json(), user)) return fail();
    const { data: claimsData, error: claimsError } = await client.auth.getClaims(data.session.access_token);
    const claims = claimsData?.claims;
    if (claimsError || claims?.sub !== user.id || typeof claims?.session_id !== 'string') return fail();
    jar.set(PROOF_COOKIE, signGoogleProof({ sub: user.id, sid: claims.session_id, email: user.email!.trim().toLowerCase(),
      exp: Math.floor(Date.now() / 1000) + PROOF_TTL }, process.env.OLYMPIAD_CHAIRMAN_PROOF_SECRET || ''), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: PROOF_TTL,
    });
    if (!(await chairmanAccess(client)).ok) { jar.delete(PROOF_COOKIE); return fail(); }
    return NextResponse.redirect(new URL('/', url.origin), { headers: magicHeaders });
  } catch { jar.delete(PROOF_COOKIE); return fail(); }
}
