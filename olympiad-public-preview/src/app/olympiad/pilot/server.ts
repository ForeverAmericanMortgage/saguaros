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
