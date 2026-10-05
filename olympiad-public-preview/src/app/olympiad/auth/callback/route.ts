import { NextResponse } from 'next/server';
import { pilotClient, pilotConfiguration, pilotAccessAllowed, SITE_URL } from '../../pilot/server';
import { magicHeaders } from '../magic-link';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const redirect = (path:string) => NextResponse.redirect(new URL(path,SITE_URL),{headers:magicHeaders});
  const params = new URL(request.url).searchParams;
  const code = params.get('code');
  try {
    if (code && pilotConfiguration().enabled) {
      const client = await pilotClient();
      const { data,error } = await client.auth.exchangeCodeForSession(code);
      if (!error && data.user?.email_confirmed_at && data.user.email && (await pilotAccessAllowed(client,data.user.email))) return redirect('/#captain');
      if(data.session) {
        await client.auth.signOut({scope:'local'});
        if (data.user?.email && !(await pilotAccessAllowed(client,data.user.email))) return redirect('/?auth_error=google_not_invited#signin');
      }
    }
  } catch { /* Never log credentials or provider payloads. */ }
  return redirect('/?auth_error=google_failed#signin');
}
