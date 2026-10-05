import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { chairmanOrigin } from '../auth/chairman-proof';

const INTERNAL_PROJECT = 'qbqnbwknywkfqnblagsa';
export const SITE_URL = process.env.OLYMPIAD_SITE_URL || 'https://scottsdaleolympiad.com';

export function pilotConfiguration() {
  const url = process.env.OLYMPIAD_SUPABASE_URL || '';
  const key = process.env.OLYMPIAD_SUPABASE_PUBLISHABLE_KEY || '';
  // Public captain identities must never share the legacy internal Auth project.
  const configured = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) && !!key && !url.includes(INTERNAL_PROJECT);
  return { url, key, configured, enabled: configured && process.env.OLYMPIAD_REGISTRATION_ENABLED === 'true' };
}

export async function pilotClient() {
  const { url, key, configured } = pilotConfiguration();
  if (!configured) throw new Error('Olympiad registration is not configured.');
  const jar = await cookies();
  return createServerClient(url, key, {
    cookieOptions: { name: 'olympiad-auth', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: values => values.forEach(({ name, value, options }) => jar.set(name, value, options)),
    },
  });
}

export function allowedOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const origins = new Set([SITE_URL]);
  if (process.env.NODE_ENV !== 'production') { origins.add('http://localhost:3027'); origins.add('http://localhost:3000'); }
  return origin !== null && (origins.has(origin) || chairmanOrigin(origin, process.env.NODE_ENV !== 'production'));
}

// Server-only exact addresses; empty configuration fails closed. Keep returning
// pilot captains here even when new registrations are closed.
export function pilotEmailAllowed(email: string) {
  const allowed = (process.env.OLYMPIAD_PILOT_EMAIL_ALLOWLIST || '')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

// Chairman-issued invitations work without changing a deployment allowlist.
// Authenticated return visits rely on the existing verified captain cohort.
export async function pilotAccessAllowed(client: Awaited<ReturnType<typeof pilotClient>>, email: string) {
  if (pilotEmailAllowed(email)) return true;
  const {data:{user}}=await client.auth.getUser();
  if(user?.email_confirmed_at&&user.email?.toLowerCase()===email.trim().toLowerCase()) {
    const {data}=await client.from('pilot_captains').select('user_id').eq('user_id',user.id).maybeSingle();
    if(data)return true;
  }
  const {data:invited}=await client.rpc('recruit_email_access_allowed',{p_email:email.trim().toLowerCase()});
  if(invited===true)return true;
  const token=(await cookies()).get('olympiad-recruit-invite')?.value;
  if(!token||!/^[a-f0-9]{64}$/.test(token))return false;
  const {data,error}=await client.rpc('recruit_invitation_details',{p_token:token});
  return !error&&data?.email===email.trim().toLowerCase();
}
