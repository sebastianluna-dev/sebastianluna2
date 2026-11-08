import { describe, expect, it, vi } from 'vitest';
import { BLUE_RATE_LIMIT } from './config';
import {
  createChatLimiter,
  createMemoryLimiter,
  createUpstashLimiter,
  retryAfterSeconds,
  type ChatLimiter,
  type RemoteWindow,
} from './rate-limit';

const DAY = 86_400_000;
const settings = {
  perClient: { requests: 3, windowSeconds: 60 },
  perClientDaily: 100,
  dailyBudget: 5,
};

function clock(start: number) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe('retryAfterSeconds', () => {
  it('rounds up and never answers less than a second', () => {
    expect(retryAfterSeconds(10_500, 10_000)).toBe(1);
    expect(retryAfterSeconds(12_001, 10_000)).toBe(3);
    expect(retryAfterSeconds(9_000, 10_000)).toBe(1);
  });
});

describe('createMemoryLimiter', () => {
  it('allows the window per client, then answers when the oldest request leaves it', async () => {
    const c = clock(DAY * 100 + 1000);
    const limiter = createMemoryLimiter(settings, c.now);
    for (let i = 0; i < 3; i++) {
      expect(await limiter.check('a')).toEqual({ ok: true });
      c.advance(10_000);
    }
    // Oldest request at t0; now t0 + 30 s; it leaves the 60 s window in 30 s.
    expect(await limiter.check('a')).toEqual({ ok: false, code: 'rate_limited', retryAfter: 30 });
    expect(await limiter.check('b')).toEqual({ ok: true });
    c.advance(30_001);
    expect(await limiter.check('a')).toEqual({ ok: true });
  });

  it('a refused request does not count', async () => {
    const c = clock(DAY * 100);
    const limiter = createMemoryLimiter(settings, c.now);
    for (let i = 0; i < 3; i++) await limiter.check('a');
    for (let i = 0; i < 5; i++) expect((await limiter.check('a')).ok).toBe(false);
    c.advance(60_001);
    expect(await limiter.check('a')).toEqual({ ok: true });
  });

  it('spends the daily budget across clients and resets at UTC midnight', async () => {
    const c = clock(DAY * 100 + DAY - 3_600_000); // 23:00 UTC
    const limiter = createMemoryLimiter(settings, c.now);
    for (const key of ['a', 'b', 'c', 'd', 'e'])
      expect(await limiter.check(key)).toEqual({ ok: true });
    expect(await limiter.check('f')).toEqual({
      ok: false,
      code: 'budget_exhausted',
      retryAfter: 3600,
    });
    c.advance(3_600_000);
    expect(await limiter.check('f')).toEqual({ ok: true });
  });

  it('a client over its window does not spend the budget', async () => {
    const c = clock(DAY * 100);
    const limiter = createMemoryLimiter({ ...settings, dailyBudget: 4 }, c.now);
    for (let i = 0; i < 6; i++) await limiter.check('a'); // 3 allowed, 3 refused
    expect(await limiter.check('b')).toEqual({ ok: true });
    expect((await limiter.check('c')).ok).toBe(false);
  });

  it('forgets the least recently used clients past the key cap', async () => {
    const c = clock(DAY * 100);
    const limiter = createMemoryLimiter({ ...settings, dailyBudget: 100 }, c.now, 2);
    for (let i = 0; i < 3; i++) await limiter.check('a');
    await limiter.check('b');
    await limiter.check('c'); // drops 'a'
    expect(await limiter.check('a')).toEqual({ ok: true });
  });
});

function remote(
  result: { success: boolean; reset: number; reason?: string } | Error,
): RemoteWindow & {
  calls: string[];
} {
  const calls: string[] = [];
  return {
    calls,
    async limit(identifier) {
      calls.push(identifier);
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

describe('createMemoryLimiter per-client day', () => {
  it('caps one client per UTC day, so a single visitor cannot spend the site budget', async () => {
    const c = clock(10 * DAY);
    const limiter = createMemoryLimiter(
      { perClient: { requests: 2, windowSeconds: 60 }, perClientDaily: 3, dailyBudget: 100 },
      c.now,
    );
    for (let i = 0; i < 3; i++) {
      expect(await limiter.check('a')).toEqual({ ok: true });
      c.advance(61_000);
    }
    expect(await limiter.check('a')).toMatchObject({ ok: false, code: 'rate_limited' });
    // Someone else still gets in, and the same client again after midnight.
    expect(await limiter.check('b')).toEqual({ ok: true });
    c.advance(DAY);
    expect(await limiter.check('a')).toEqual({ ok: true });
  });

  it('answers with the seconds left until UTC midnight', async () => {
    const c = clock(10 * DAY + DAY - 90_000);
    const limiter = createMemoryLimiter(
      { perClient: { requests: 5, windowSeconds: 60 }, perClientDaily: 1, dailyBudget: 100 },
      c.now,
    );
    await limiter.check('a');
    expect(await limiter.check('a')).toEqual({ ok: false, code: 'rate_limited', retryAfter: 90 });
  });

  it('keeps the per-client day under the site budget', () => {
    expect(BLUE_RATE_LIMIT.perClientDaily).toBeLessThan(BLUE_RATE_LIMIT.dailyBudget / 10);
  });
});

describe('createUpstashLimiter', () => {
  const now = () => 1_000_000;
  const fallback = (): ChatLimiter & { check: ReturnType<typeof vi.fn> } => ({
    check: vi.fn(async () => ({ ok: true }) as const),
  });

  it('checks the client window, then the site budget', async () => {
    const perClient = remote({ success: true, reset: 0 });
    const clientDaily = remote({ success: true, reset: 0 });
    const daily = remote({ success: true, reset: 0 });
    const limiter = createUpstashLimiter({
      perClient,
      clientDaily,
      daily,
      fallback: fallback(),
      now,
    });
    expect(await limiter.check('k')).toEqual({ ok: true });
    expect(perClient.calls).toEqual(['k']);
    expect(clientDaily.calls).toEqual(['k']);
    expect(daily.calls).toEqual(['site']);
  });

  it('answers rate_limited from the per-client day without touching the budget', async () => {
    const daily = remote({ success: true, reset: 0 });
    const limiter = createUpstashLimiter({
      perClient: remote({ success: true, reset: 0 }),
      clientDaily: remote({ success: false, reset: 1_000_000 + 7_200_000 }),
      daily,
      fallback: fallback(),
      now,
    });
    expect(await limiter.check('k')).toEqual({
      ok: false,
      code: 'rate_limited',
      retryAfter: 7200,
    });
    expect(daily.calls).toEqual([]);
  });

  it('answers rate_limited without touching the budget', async () => {
    const daily = remote({ success: true, reset: 0 });
    const limiter = createUpstashLimiter({
      perClient: remote({ success: false, reset: 1_042_000 }),
      clientDaily: remote({ success: true, reset: 0 }),
      daily,
      fallback: fallback(),
      now,
    });
    expect(await limiter.check('k')).toEqual({ ok: false, code: 'rate_limited', retryAfter: 42 });
    expect(daily.calls).toEqual([]);
  });

  it('answers budget_exhausted from the daily window', async () => {
    const limiter = createUpstashLimiter({
      perClient: remote({ success: true, reset: 0 }),
      clientDaily: remote({ success: true, reset: 0 }),
      daily: remote({ success: false, reset: 1_000_000 + 3_600_000 }),
      fallback: fallback(),
      now,
    });
    expect(await limiter.check('k')).toEqual({
      ok: false,
      code: 'budget_exhausted',
      retryAfter: 3600,
    });
  });

  it.each([
    ['throws', new Error('network')],
    ['times out', { success: true, reset: 0, reason: 'timeout' }],
  ])('falls back to the memory limiter when Redis %s', async (_, result) => {
    const memory = fallback();
    const warn = vi.fn();
    const limiter = createUpstashLimiter({
      perClient: remote(result),
      clientDaily: remote({ success: true, reset: 0 }),
      daily: remote({ success: true, reset: 0 }),
      fallback: memory,
      logger: { warn },
      now,
    });
    expect(await limiter.check('k')).toEqual({ ok: true });
    expect(memory.check).toHaveBeenCalledWith('k');
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe('createChatLimiter', () => {
  it('warns and limits in memory without the Upstash variables', async () => {
    const warn = vi.fn();
    const limiter = createChatLimiter({}, { warn });
    expect(warn).toHaveBeenCalledOnce();
    for (let i = 0; i < BLUE_RATE_LIMIT.perClient.requests; i++) {
      expect(await limiter.check('k')).toEqual({ ok: true });
    }
    expect(await limiter.check('k')).toMatchObject({ ok: false, code: 'rate_limited' });
  });

  it('uses Upstash when both variables are set', () => {
    const warn = vi.fn();
    createChatLimiter({ url: 'https://example.upstash.io', token: 'token' }, { warn });
    expect(warn).not.toHaveBeenCalled();
  });
});
