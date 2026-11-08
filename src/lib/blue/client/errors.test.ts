import { describe, expect, it } from 'vitest';
import {
  errorFromCode,
  errorFromException,
  errorFromResponse,
  parseRetryAfter,
  waitUnit,
} from './errors';

describe('errorFromResponse', () => {
  it('reads the contract body first', () => {
    expect(errorFromResponse(429, { error: 'rate_limited', retryAfter: 42 }, '42')).toEqual({
      kind: 'rate_limited',
      retryAfter: 42,
    });
    expect(errorFromResponse(429, { error: 'budget_exhausted' }, null)).toEqual({ kind: 'budget' });
    expect(errorFromResponse(503, { error: 'not_configured' }, null)).toEqual({
      kind: 'not_configured',
    });
    expect(errorFromResponse(413, { error: 'too_large' }, null)).toEqual({ kind: 'too_large' });
    expect(errorFromResponse(502, { error: 'upstream' }, null)).toEqual({ kind: 'upstream' });
    expect(errorFromResponse(400, { error: 'bad_request' }, null)).toEqual({ kind: 'upstream' });
  });

  it('falls back to the Retry-After header and to the status', () => {
    expect(errorFromResponse(429, null, '120')).toEqual({ kind: 'rate_limited', retryAfter: 120 });
    expect(errorFromResponse(429, 'oops', null)).toEqual({ kind: 'rate_limited' });
    expect(errorFromResponse(404, null, null)).toEqual({ kind: 'not_configured' });
    expect(errorFromResponse(500, { error: 'nonsense' }, null)).toEqual({ kind: 'upstream' });
  });
});

describe('errorFromCode', () => {
  it('maps stream error events', () => {
    expect(errorFromCode('upstream')).toEqual({ kind: 'upstream' });
    expect(errorFromCode('internal')).toEqual({ kind: 'upstream' });
    expect(errorFromCode('rate_limited')).toEqual({ kind: 'rate_limited' });
  });
});

describe('errorFromException', () => {
  it('is offline when the browser is offline or fetch failed to connect', () => {
    expect(errorFromException(new Error('x'), false)).toEqual({ kind: 'offline' });
    expect(errorFromException(new TypeError('Failed to fetch'), true)).toEqual({ kind: 'offline' });
    expect(errorFromException(new Error('boom'), true)).toEqual({ kind: 'upstream' });
  });
});

describe('waits', () => {
  it('parses Retry-After as whole positive seconds', () => {
    expect(parseRetryAfter('30')).toBe(30);
    expect(parseRetryAfter(2.2)).toBe(3);
    expect(parseRetryAfter('0')).toBeUndefined();
    expect(parseRetryAfter('soon')).toBeUndefined();
    expect(parseRetryAfter(undefined)).toBeUndefined();
  });

  it('says seconds under a minute and whole minutes above', () => {
    expect(waitUnit(12)).toEqual({ value: 12, unit: 'second' });
    expect(waitUnit(60)).toEqual({ value: 1, unit: 'minute' });
    expect(waitUnit(299)).toEqual({ value: 5, unit: 'minute' });
  });
});
