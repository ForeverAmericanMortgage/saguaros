import { createHmac, timingSafeEqual } from 'node:crypto';

export const CHAIRMAN_ORIGIN = 'https://chairman.scottsdaleolympiad.com';
export const PROOF_COOKIE = 'olympiad-chairman-google';
export const PROOF_TTL = 4 * 60 * 60;
export type GoogleProof = { sub: string; sid: string; email: string; exp: number };

export function chairmanEmailAllowed(email: string | undefined, allowance: string) {
  const normalized = email?.trim().toLowerCase();
  return !!normalized && /^[^@\s]+@saguaros\.com$/.test(normalized)
    && allowance.split(',').map(value => value.trim().toLowerCase()).includes(normalized);
}

export function chairmanOrigin(origin: string, development = false) {
  return origin === CHAIRMAN_ORIGIN || (development && origin === 'http://chairman.localhost:3037');
}

function validProof(value: unknown): value is GoogleProof {
  if (!value || typeof value !== 'object') return false;
  const proof = value as GoogleProof;
  return typeof proof.sub === 'string' && !!proof.sub && typeof proof.sid === 'string' && !!proof.sid
    && typeof proof.email === 'string' && Number.isSafeInteger(proof.exp);
}

export function signGoogleProof(proof: GoogleProof, secret: string) {
  if (secret.length < 32 || !validProof(proof)) throw new Error('Chairman sign-in is not configured.');
  const payload = Buffer.from(JSON.stringify(proof)).toString('base64url');
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}

export function verifyGoogleProof(token: string | undefined, secret: string, expected: Omit<GoogleProof, 'exp'>, now = Math.floor(Date.now() / 1000)) {
  if (!token || token.length > 2048 || secret.length < 32) return false;
  const parts = token.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return false;
  const signature = Buffer.from(parts[1], 'base64url');
  const actual = createHmac('sha256', secret).update(parts[0]).digest();
  if (signature.length !== actual.length || !timingSafeEqual(signature, actual)) return false;
  try {
    const proof = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    return validProof(proof) && proof.exp > now && proof.exp <= now + PROOF_TTL
      && proof.sub === expected.sub && proof.sid === expected.sid && proof.email === expected.email;
  } catch { return false; }
}

// This receives Google's HTTPS userinfo response and Supabase's getUser() result,
// never browser input or user_metadata. A linked account alone is insufficient.
export function googleIdentityMatches(profile: Record<string, unknown>, user: {
  email?: string; email_confirmed_at?: string; identities?: { provider: string; identity_data?: Record<string, unknown> }[];
}) {
  return profile.email_verified === true && typeof profile.sub === 'string' && !!profile.sub
    && typeof profile.email === 'string' && !!user.email_confirmed_at
    && profile.email.trim().toLowerCase() === user.email?.trim().toLowerCase()
    && user.identities?.some(identity => identity.provider === 'google' && identity.identity_data?.sub === profile.sub) === true;
}
