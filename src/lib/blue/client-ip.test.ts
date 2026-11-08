import { describe, expect, it } from 'vitest';
import { clientKey, normalizeClientIp, resolveClientIp } from './client-ip';

describe('resolveClientIp', () => {
  it('prefers the address Astro resolved, then Vercel headers', () => {
    const headers = new Headers({ 'x-real-ip': '2.2.2.2', 'x-forwarded-for': '3.3.3.3, 10.0.0.1' });
    expect(resolveClientIp('1.1.1.1', headers)).toBe('1.1.1.1');
    expect(resolveClientIp(undefined, headers)).toBe('2.2.2.2');
    expect(resolveClientIp('', new Headers({ 'x-forwarded-for': ' 3.3.3.3 , 10.0.0.1' }))).toBe(
      '3.3.3.3',
    );
    expect(resolveClientIp(undefined, new Headers())).toBeNull();
  });
});

describe('normalizeClientIp', () => {
  it.each([
    ['203.0.113.7', '203.0.113.7'],
    ['::ffff:203.0.113.7', '203.0.113.7'],
    ['::ffff:cb00:7107', '203.0.113.7'],
    ['[2001:db8::1]', '2001:0db8:0000:0000::/64'],
    ['2001:DB8:0:0:1:2:3:4', '2001:0db8:0000:0000::/64'],
    ['2001:db8:aaaa:bbbb:cccc::1', '2001:0db8:aaaa:bbbb::/64'],
    ['fe80::1%en0', 'fe80:0000:0000:0000::/64'],
    ['::1', '0000:0000:0000:0000::/64'],
  ])('%s → %s', (ip, expected) => {
    expect(normalizeClientIp(ip)).toBe(expected);
  });

  it('keeps an unparseable address as is (lower case)', () => {
    expect(normalizeClientIp('1:2:3::4::5')).toBe('1:2:3::4::5');
  });

  it('gives every address of one IPv6 /64 the same key', () => {
    expect(normalizeClientIp('2001:db8:1:2::a')).toBe(normalizeClientIp('2001:db8:1:2:ffff::b'));
    expect(normalizeClientIp('2001:db8:1:2::a')).not.toBe(normalizeClientIp('2001:db8:1:3::a'));
  });
});

describe('clientKey', () => {
  it('hashes the normalised IP so the raw address never leaves the function', async () => {
    const key = await clientKey('203.0.113.7');
    expect(key).toMatch(/^[0-9a-f]{32}$/);
    expect(key).not.toContain('203');
    expect(await clientKey('::ffff:203.0.113.7')).toBe(key);
    expect(await clientKey('203.0.113.8')).not.toBe(key);
    expect(await clientKey(null)).toBe('anonymous');
  });

  it('keys the address with the server secret, so Redis keys cannot be brute-forced back', async () => {
    const plain = await clientKey('203.0.113.7');
    const keyed = await clientKey('203.0.113.7', 'secret-a');
    expect(keyed).toMatch(/^[0-9a-f]{32}$/);
    expect(keyed).not.toBe(plain);
    expect(await clientKey('203.0.113.7', 'secret-a')).toBe(keyed);
    expect(await clientKey('203.0.113.7', 'secret-b')).not.toBe(keyed);
    expect(await clientKey('::ffff:203.0.113.7', 'secret-a')).toBe(keyed);
  });
});
