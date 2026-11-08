import { describe, expect, it } from 'vitest';
import { isAllowedOrigin } from './origin';

const context = {
  requestUrl: 'https://sebastianluna2-git-feature-sebastian.vercel.app/api/chat',
  siteUrl: 'https://www.sebastianluna.dev',
};
const headers = (values: Record<string, string>) => new Headers(values);

describe('isAllowedOrigin', () => {
  it.each([
    'https://www.sebastianluna.dev',
    'https://sebastianluna2-git-feature-sebastian.vercel.app',
    'http://localhost:4321',
    'http://127.0.0.1:4442',
    'http://[::1]:3000',
  ])('allows %s', (origin) => {
    expect(isAllowedOrigin(headers({ origin, 'sec-fetch-site': 'cross-site' }), context)).toBe(
      true,
    );
  });

  it.each([
    'https://evil.example',
    'https://sebastianluna.dev',
    'http://www.sebastianluna.dev',
    'https://www.sebastianluna.dev.evil.example',
    'https://other-project.vercel.app',
    'null',
    'not a url',
    'file://localhost',
  ])('refuses %s', (origin) => {
    expect(isAllowedOrigin(headers({ origin }), context)).toBe(false);
  });

  it('without Origin, trusts only a same-origin fetch', () => {
    expect(isAllowedOrigin(headers({ 'sec-fetch-site': 'same-origin' }), context)).toBe(true);
    expect(isAllowedOrigin(headers({ 'sec-fetch-site': 'same-site' }), context)).toBe(false);
    expect(isAllowedOrigin(headers({ 'sec-fetch-site': 'cross-site' }), context)).toBe(false);
    expect(isAllowedOrigin(headers({}), context)).toBe(false);
  });
});
