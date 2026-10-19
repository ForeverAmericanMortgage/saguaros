import { NextResponse } from 'next/server';
import { pilotClient, pilotConfiguration, pilotAccessAllowed, SITE_URL } from '../../pilot/server';
import { cookies } from 'next/headers';
import { magicHeaders } from '../magic-link';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const redirect = (path:string) => NextResponse.redirect(new URL(path,SITE_URL),{headers:magicHeaders});
  const params = new URL(request.url).searchParams;
  const code = params.get('code');
  const jar = await cookies();
  const microsoft = jar.get('olympiad-sign-in-provider')?.value === 'microsoft';
  jar.delete('olympiad-sign-in-provider');
  const failure = microsoft ? 'microsoft_failed' : 'google_failed';
  if (params.has('error')) return redirect(`/?auth_error=${microsoft ? 'microsoft_blocked' : failure}#signin`);
  try {
    if (code && pilotConfiguration().enabled) {
      const client = await pilotClient();
      const { data,error } = await client.auth.exchangeCodeForSession(code);
      if (!error && data.user?.email_confirmed_at && data.user.email && (await pilotAccessAllowed(client,data.user.email))) return redirect('/#captain');
      if(data.session) {
        await client.auth.signOut({scope:'local'});
        if (data.user?.email && !(await pilotAccessAllowed(client,data.user.email))) return redirect('/?auth_error=verified_email_required#signin');
      }
    }
  } catch { /* Never log credentials or provider payloads. */ }
  return redirect(`/?auth_error=${failure}#signin`);
}
