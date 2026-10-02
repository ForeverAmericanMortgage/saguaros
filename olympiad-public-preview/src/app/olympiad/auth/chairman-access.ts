import 'server-only';
import { cookies } from 'next/headers';
import { pilotClient } from '../pilot/server';
import { chairmanEmailAllowed, PROOF_COOKIE, verifyGoogleProof } from './chairman-proof';

export async function chairmanAccess(client: Awaited<ReturnType<typeof pilotClient>>) {
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user?.email_confirmed_at || !user.email) return { ok: false, status: 401 };
  if (!chairmanEmailAllowed(user.email, process.env.OLYMPIAD_CHAIRMAN_EMAIL_ALLOWLIST || '')) return { ok: false, status: 403 };
  const { data, error: claimsError } = await client.auth.getClaims();
  const claims = data?.claims;
  if (claimsError || claims?.sub !== user.id || typeof claims?.session_id !== 'string') return { ok: false, status: 401 };
  const proof = (await cookies()).get(PROOF_COOKIE)?.value;
  if (!verifyGoogleProof(proof, process.env.OLYMPIAD_CHAIRMAN_PROOF_SECRET || '', {
    sub: user.id, sid: claims.session_id, email: user.email.trim().toLowerCase(),
  })) return { ok: false, status: 401 };
  const { data: membership, error: membershipError } = await client.from('organizer_memberships').select('user_id').eq('user_id', user.id).maybeSingle();
  if (membershipError) throw membershipError;
  return { ok: !!membership, status: membership ? 200 : 403 };
}
