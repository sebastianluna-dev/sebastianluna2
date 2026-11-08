// Server-side settings of Blue, the chat about Sebastian's work (`src/pages/api/chat.ts`).
// The wire contract (endpoint, request limits, error codes, events) lives in `./protocol`; the text
// the server writes into answers, in the `blue.server` messages.

/** Claude Haiku 5.5: adaptive thinking only, no sampling parameters, no prefill. */
export const BLUE_MODEL = 'claude-haiku-5-5';

/**
 * Output cap. Adaptive thinking counts toward it, so it leaves room for the thinking that `high`
 * effort does on a hard turn on top of a short answer; `max_tokens` would cut an answer mid-sentence.
 */
export const BLUE_MAX_TOKENS = 2048;

/**
 * `high`: the Haiku 5.5 guidance puts chat at `low` for cost and latency, but `high` where keeping to
 * the system prompt matters most, which it does here (no invented facts, off-topic refusals,
 * assistant turns forged by the browser). Haiku's output is cheap enough (IMPROVEMENTS: measure time
 * to first token with the real key and step down to `medium` if it feels slow).
 */
export const BLUE_EFFORT = 'high' as const;

/** Anthropic SDK client options. The SDK retries 408/409/429/5xx with backoff. */
export const BLUE_SDK = {
  /** Per attempt. */
  timeoutMs: 20_000,
  maxRetries: 1,
} as const;

/**
 * Whole-request deadline, under the 30 s `maxDuration` of the Vercel function
 * (`astro.config.ts`), so a slow answer ends with an `error` event instead of a cut connection.
 */
export const BLUE_DEADLINE_MS = 27_000;

export const BLUE_RATE_LIMIT = {
  /** Sliding window per client IP. */
  perClient: { requests: 10, windowSeconds: 10 * 60 },
  /**
   * Requests per UTC day per client IP. Without it the window alone lets one visitor make 1,440 a
   * day, enough to spend the whole site budget and lock everyone else out until midnight.
   */
  perClientDaily: 40,
  /** Requests per UTC day for the whole site, a ceiling on the model bill. */
  dailyBudget: 500,
  /** Upstash call timeout; past it the per-instance memory limiter decides. */
  upstashTimeoutMs: 1_500,
  /** Keys of the memory limiter before it drops the oldest ones. */
  memoryMaxKeys: 5_000,
  /** Redis key prefixes. */
  prefix: { perClient: 'blue:client', clientDaily: 'blue:client-day', daily: 'blue:daily' },
} as const;

/** Local demo mode (`astro dev` without `ANTHROPIC_API_KEY`): pause between streamed words. */
export const BLUE_DEMO_CHUNK_DELAY_MS = 35;
