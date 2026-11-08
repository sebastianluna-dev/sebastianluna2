// The rate-limit key of a visitor: their IP, reduced to what one person controls, then keyed with a
// server secret (HMAC-SHA-256) so the keys in Redis cannot be turned back into addresses: a plain
// hash of an IPv4 address falls to brute force over its 2^32 values in minutes. Without a secret
// (local development, no Upstash) it is a plain hash, which only ever lives in the function's memory.

/**
 * The address Astro resolved (`context.clientAddress`, from Vercel's `x-forwarded-for`), else
 * Vercel's own headers. `null` when nothing usable is there.
 */
export function resolveClientIp(
  clientAddress: string | undefined,
  headers: Headers,
): string | null {
  const candidates = [
    clientAddress,
    headers.get('x-real-ip'),
    headers.get('x-forwarded-for')?.split(',')[0],
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) return value;
  }
  return null;
}

/** Expands an IPv6 address into its eight groups, or `null` when it is not one. */
function ipv6Groups(address: string): string[] | null {
  const halves = address.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  // An embedded IPv4 tail (`::ffff:1.2.3.4`) counts as two groups.
  const last = tail.length > 0 ? tail : head;
  if (last.length > 0 && last[last.length - 1].includes('.')) {
    const quad = last.pop()!.split('.').map(Number);
    if (quad.length !== 4 || quad.some((n) => !Number.isInteger(n) || n < 0 || n > 255))
      return null;
    last.push(((quad[0] << 8) | quad[1]).toString(16), ((quad[2] << 8) | quad[3]).toString(16));
  }
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...tail];
  if (!groups.every((g) => /^[0-9a-f]{1,4}$/i.test(g))) return null;
  return groups.map((g) => g.toLowerCase().padStart(4, '0'));
}

/**
 * IPv4 stays whole; an IPv4-mapped IPv6 address becomes its IPv4; any other IPv6 address keeps
 * its /64, the block a single connection usually owns (one host can rotate inside it).
 */
export function normalizeClientIp(ip: string): string {
  const bare = ip.replace(/^\[|\]$/g, '').replace(/%.*$/, '');
  if (!bare.includes(':')) return bare;
  const groups = ipv6Groups(bare);
  if (!groups) return bare.toLowerCase();
  if (groups.slice(0, 5).every((g) => g === '0000') && groups[5] === 'ffff') {
    const hi = parseInt(groups[6], 16);
    const lo = parseInt(groups[7], 16);
    return [hi >> 8, hi & 255, lo >> 8, lo & 255].join('.');
  }
  return `${groups.slice(0, 4).join(':')}::/64`;
}

/**
 * HMAC-SHA-256 of the normalised IP with `secret` (SHA-256 without one), first 32 hex characters;
 * `anonymous` without an IP.
 */
export async function clientKey(ip: string | null, secret?: string): Promise<string> {
  if (!ip) return 'anonymous';
  const encoder = new TextEncoder();
  const data = encoder.encode(`blue:${normalizeClientIp(ip)}`);
  let digest: ArrayBuffer;
  if (secret) {
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    digest = await crypto.subtle.sign('HMAC', key, data);
  } else {
    digest = await crypto.subtle.digest('SHA-256', data);
  }
  return Array.from(new Uint8Array(digest).subarray(0, 16), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
