// Three limits in front of the model: a sliding window per visitor, a daily cap per visitor and a
// daily budget for the whole site. Upstash Redis holds them across function instances; without it
// (or while it does not answer) a memory limiter keeps them per instance. Days are UTC days.

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { BLUE_RATE_LIMIT } from './config';

export type LimitDecision =
  { ok: true } | { ok: false; code: 'rate_limited' | 'budget_exhausted'; retryAfter: number };

export interface ChatLimiter {
  /** Counts one request of `key` (a hashed client IP) and says whether it may go on. */
  check(key: string): Promise<LimitDecision>;
}

export interface LimitSettings {
  perClient: { requests: number; windowSeconds: number };
  perClientDaily: number;
  dailyBudget: number;
}

const DAY_MS = 86_400_000;

/** Whole seconds until `resetAt` (epoch ms), at least 1. */
export function retryAfterSeconds(resetAt: number, now: number): number {
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
}

/**
 * Per-instance limiter: an exact sliding log per key, a counter per key and UTC day, and one for the
 * site. A serverless platform can run several instances, each with its own counts, so this is a
 * fallback.
 */
export function createMemoryLimiter(
  settings: LimitSettings = BLUE_RATE_LIMIT,
  now: () => number = Date.now,
  maxKeys: number = BLUE_RATE_LIMIT.memoryMaxKeys,
): ChatLimiter {
  const windowMs = settings.perClient.windowSeconds * 1000;
  const log = new Map<string, { recent: number[]; day: number; dayCount: number }>();
  let day = -1;
  let dayCount = 0;

  return {
    async check(key) {
      const t = now();
      const today = Math.floor(t / DAY_MS);
      const midnight = retryAfterSeconds((today + 1) * DAY_MS, t);
      const entry = log.get(key);
      const recent = (entry?.recent ?? []).filter((at) => at > t - windowMs);
      const clientCount = entry?.day === today ? entry.dayCount : 0;
      const keep = () => log.set(key, { recent, day: today, dayCount: clientCount });

      if (recent.length >= settings.perClient.requests) {
        keep();
        return {
          ok: false,
          code: 'rate_limited',
          retryAfter: retryAfterSeconds(recent[0] + windowMs, t),
        };
      }
      if (clientCount >= settings.perClientDaily) {
        keep();
        return { ok: false, code: 'rate_limited', retryAfter: midnight };
      }

      if (today !== day) {
        day = today;
        dayCount = 0;
      }
      if (dayCount >= settings.dailyBudget) {
        return { ok: false, code: 'budget_exhausted', retryAfter: midnight };
      }

      dayCount += 1;
      recent.push(t);
      // Re-insert so the Map's order is least recently used first.
      log.delete(key);
      log.set(key, { recent, day: today, dayCount: clientCount + 1 });
      while (log.size > maxKeys) log.delete(log.keys().next().value!);
      return { ok: true };
    },
  };
}

/** What the Upstash limiter needs from `Ratelimit` (lets the tests pass a fake). */
export interface RemoteWindow {
  limit(identifier: string): Promise<{ success: boolean; reset: number; reason?: string }>;
}

export interface Logger {
  warn(message: string): void;
}

/**
 * Upstash limiter: the per-client window, then the per-client day, so a visitor over their limit
 * does not spend the daily budget. If Redis fails or times out (`Ratelimit` then lets the call
 * through with `reason: 'timeout'`), the memory limiter decides that request.
 */
export function createUpstashLimiter(options: {
  perClient: RemoteWindow;
  clientDaily: RemoteWindow;
  daily: RemoteWindow;
  fallback: ChatLimiter;
  logger?: Logger;
  now?: () => number;
}): ChatLimiter {
  const { perClient, clientDaily, daily, fallback, logger = console, now = Date.now } = options;
  return {
    async check(key) {
      try {
        for (const window of [perClient, clientDaily]) {
          const client = await window.limit(key);
          if (client.reason === 'timeout') throw new Error('timeout');
          if (!client.success) {
            return {
              ok: false,
              code: 'rate_limited',
              retryAfter: retryAfterSeconds(client.reset, now()),
            };
          }
        }
        const site = await daily.limit('site');
        if (site.reason === 'timeout') throw new Error('timeout');
        if (!site.success) {
          return {
            ok: false,
            code: 'budget_exhausted',
            retryAfter: retryAfterSeconds(site.reset, now()),
          };
        }
        return { ok: true };
      } catch {
        logger.warn('[blue] Upstash rate limit unavailable; using the per-instance limiter.');
        return fallback.check(key);
      }
    },
  };
}

/** The real `Ratelimit` windows over one Upstash Redis database. */
export function createUpstashWindows(
  url: string,
  token: string,
): { perClient: RemoteWindow; clientDaily: RemoteWindow; daily: RemoteWindow } {
  const redis = new Redis({ url, token });
  const { perClient, perClientDaily, dailyBudget, upstashTimeoutMs, prefix } = BLUE_RATE_LIMIT;
  return {
    perClient: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(perClient.requests, `${perClient.windowSeconds} s`),
      prefix: prefix.perClient,
      timeout: upstashTimeoutMs,
    }),
    clientDaily: new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(perClientDaily, '1 d'),
      prefix: prefix.clientDaily,
      timeout: upstashTimeoutMs,
    }),
    daily: new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(dailyBudget, '1 d'),
      prefix: prefix.daily,
      timeout: upstashTimeoutMs,
    }),
  };
}

/**
 * Upstash when both variables are set, else the memory limiter, with a warning: in production
 * every instance would count on its own.
 */
export function createChatLimiter(
  env: { url?: string; token?: string },
  logger: Logger = console,
): ChatLimiter {
  const memory = createMemoryLimiter();
  if (env.url && env.token) {
    return createUpstashLimiter({
      ...createUpstashWindows(env.url, env.token),
      fallback: memory,
      logger,
    });
  }
  logger.warn(
    '[blue] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set; rate limits are per instance.',
  );
  return memory;
}
