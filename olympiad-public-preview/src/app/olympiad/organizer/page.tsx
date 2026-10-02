import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { pilotClient, pilotConfiguration } from '../pilot/server';
import { chairmanAccess } from '../auth/chairman-access';
import { CHAIRMAN_ORIGIN } from '../auth/chairman-proof';
import OrganizerDashboard from './OrganizerDashboard';
import ChairmanSignIn from './ChairmanSignIn';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function OrganizerPage() {
  const host = (await headers()).get('host')?.split(':')[0];
  if (host !== 'chairman.scottsdaleolympiad.com' && !(process.env.NODE_ENV !== 'production' && host === 'chairman.localhost')) redirect(CHAIRMAN_ORIGIN);
  if (pilotConfiguration().configured) {
    try { if ((await chairmanAccess(await pilotClient())).ok) return <OrganizerDashboard />; } catch { /* Fail closed. */ }
  }
  return <ChairmanSignIn />;
}
