import { NextResponse } from 'next/server';
import { pilotClient, pilotConfiguration, pilotEmailAllowed, SITE_URL } from '../../pilot/server';
import { magicHeaders } from '../magic-link';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const redirect = (path:string) => NextResponse.redirect(new URL(path,SITE_URL),{headers:magicHeaders});
  const code = new URL(request.url).searchParams.get('code');
  try {
    if (code && pilotConfiguration().enabled) {
      const client = await pilotClient();
      const { data,error } = await client.auth.exchangeCodeForSession(code);
      if (!error && data.user?.email_confirmed_at && data.user.email && pilotEmailAllowed(data.user.email)) return redirect('/#captain');
      if(data.session)await client.auth.signOut({scope:'local'});
    }
  } catch { /* Never log credentials or provider payloads. */ }
  return redirect('/?auth_error=link_expired#captain');
}
