import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pilotClient, pilotConfiguration } from '../../../pilot/server';
import { chairmanOrigin, PROOF_COOKIE } from '../../chairman-proof';
import { magicHeaders } from '../../magic-link';

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (!chairmanOrigin(origin, process.env.NODE_ENV !== 'production') || request.headers.get('origin') !== origin) {
    return NextResponse.json({ error: 'Open chairman sign-in on the chairman website.' }, { status: 403, headers: magicHeaders });
  }
  if (!pilotConfiguration().configured || process.env.OLYMPIAD_GOOGLE_SIGN_IN_ENABLED !== 'true'
    || !process.env.OLYMPIAD_CHAIRMAN_EMAIL_ALLOWLIST || (process.env.OLYMPIAD_CHAIRMAN_PROOF_SECRET || '').length < 32) {
    return NextResponse.json({ error: 'Chairman sign-in is not configured yet.' }, { status: 503, headers: magicHeaders });
  }
  try {
    (await cookies()).delete(PROOF_COOKIE);
    const client = await pilotClient();
    const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: {
      redirectTo: `${origin}/olympiad/auth/chairman/callback`, skipBrowserRedirect: true,
      scopes: 'openid email profile', queryParams: { prompt: 'select_account' },
    } });
    if (error || !data.url) throw new Error('Sign-in unavailable');
    return NextResponse.json({ url: data.url }, { headers: magicHeaders });
  } catch {
    return NextResponse.json({ error: 'Google sign-in could not start. Try again.' }, { status: 503, headers: magicHeaders });
  }
}

// A chairman session is host-local; public captain sign-out cannot clear it.
export async function DELETE(request: Request) {
  const origin = new URL(request.url).origin;
  if (!chairmanOrigin(origin, process.env.NODE_ENV !== 'production') || request.headers.get('origin') !== origin) {
    return NextResponse.json({ error: 'Request not allowed.' }, { status: 403, headers: magicHeaders });
  }
  (await cookies()).delete(PROOF_COOKIE);
  try {
    if (pilotConfiguration().configured) {
      const { error } = await (await pilotClient()).auth.signOut({ scope: 'local' });
      if (error) throw error;
    }
    return NextResponse.json({ ok: true }, { headers: magicHeaders });
  } catch {
    return NextResponse.json({ error: 'Google access cleared. Sign-out could not finish; try again.' }, { status: 503, headers: magicHeaders });
  }
}
