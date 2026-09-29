export const magicHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};

export function validMagicPayload(value: unknown): value is { token_hash: string; type: 'email' } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return data.type === 'email' && typeof data.token_hash === 'string' && /^[a-zA-Z0-9_-]{32,256}$/.test(data.token_hash);
}
