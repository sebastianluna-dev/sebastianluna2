import { describe, expect, it, vi } from 'vitest';
import { CONTACT_EMAILS } from '@/data/profile';
import { format, getMessages } from '@/i18n/t';
import { BLUE_EFFORT, BLUE_MAX_TOKENS, BLUE_MODEL } from './config';
import { createDemoModel } from './demo-model';
import { createChatHandler, type ChatHandlerDeps } from './handler';
import type { ChatModel, ModelCall, ModelEvent } from './model';
import { buildBlueSystem } from './prompt';
import { CHAT_LIMITS, type ChatStreamEvent } from './protocol';
import { createMemoryLimiter, type ChatLimiter } from './rate-limit';

const SERVER = { es: getMessages('es').blue.server, en: getMessages('en').blue.server };

const SITE = 'https://www.sebastianluna.dev';
const ENDPOINT = `${SITE}/api/chat`;

const textDelta = (text: string): ModelEvent => ({
  type: 'content_block_delta',
  delta: { type: 'text_delta', text },
});
const stop = (stop_reason: string): ModelEvent => ({
  type: 'message_delta',
  delta: { stop_reason },
});

type Step = ModelEvent | Error | { wait: Promise<void> };

/** A model that plays a script; an `Error` step throws there, like the SDK on a failed stream. */
function scriptedModel(steps: Step[]) {
  const calls: ModelCall[] = [];
  const abort = vi.fn();
  const model: ChatModel = {
    stream(call) {
      calls.push(call);
      async function* run(): AsyncGenerator<ModelEvent> {
        for (const step of steps) {
          if (step instanceof Error) throw step;
          if ('wait' in step) {
            await step.wait;
            continue;
          }
          yield step;
        }
      }
      const iterator = run();
      return { [Symbol.asyncIterator]: () => iterator, abort };
    },
  };
  return { model, calls, abort };
}

function apiError(status: number) {
  return Object.assign(new Error('secret upstream detail sk-ant-123'), {
    name: 'InternalServerError',
    status,
    type: 'api_error',
    requestID: 'req_1',
  });
}

const logger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

function handlerWith(overrides: Partial<ChatHandlerDeps> = {}) {
  const log = logger();
  const handler = createChatHandler({
    model: scriptedModel([textDelta('Hola'), stop('end_turn')]).model,
    limiter: createMemoryLimiter(),
    siteUrl: SITE,
    logger: log,
    ...overrides,
  });
  return { handler, log };
}

const validBody = { locale: 'es', messages: [{ role: 'user', content: '¿Qué hace Sebastian?' }] };

function post(
  body: unknown = validBody,
  headers: Record<string, string> = {},
  init: RequestInit = {},
): Request {
  return new Request(ENDPOINT, {
    method: 'POST',
    headers: { origin: SITE, 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init,
  });
}

/** Parses an SSE body into the protocol events. */
async function readEvents(response: Response): Promise<ChatStreamEvent[]> {
  const text = await response.text();
  return text
    .split('\n\n')
    .filter(Boolean)
    .map((frame) => {
      const [eventLine, dataLine] = frame.split('\n');
      return {
        event: eventLine.replace(/^event: /, ''),
        data: JSON.parse(dataLine.replace(/^data: /, '')),
      } as ChatStreamEvent;
    });
}

describe('chat handler: guards', () => {
  it.each(['GET', 'PUT', 'DELETE', 'OPTIONS'])(
    'answers %s with 405 and Allow: POST',
    async (method) => {
      const { handler } = handlerWith();
      const response = await handler({ request: new Request(ENDPOINT, { method }) });
      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('POST');
      expect(await response.json()).toEqual({ error: 'method_not_allowed' });
    },
  );

  it('refuses another site, a missing Origin and a non-JSON body', async () => {
    const { handler } = handlerWith();
    const responses = await Promise.all([
      handler({ request: post(validBody, { origin: 'https://evil.example' }) }),
      handler({
        request: new Request(ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(validBody),
        }),
      }),
      handler({ request: post(JSON.stringify(validBody), { 'content-type': 'text/plain' }) }),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(400);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(await response.json()).toEqual({ error: 'bad_request' });
    }
  });

  it('accepts a preview deployment calling itself', async () => {
    const { handler } = handlerWith();
    const preview = 'https://sebastianluna2-git-x.vercel.app';
    const request = new Request(`${preview}/api/chat`, {
      method: 'POST',
      headers: { origin: preview, 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(validBody),
    });
    expect((await handler({ request })).status).toBe(200);
  });

  it('answers 413 for a body over the byte limit and for a message over the character limit', async () => {
    const { handler } = handlerWith();
    const huge = post({ ...validBody, padding: 'x'.repeat(CHAT_LIMITS.maxBodyBytes) });
    expect((await handler({ request: huge })).status).toBe(413);
    const long = post({ locale: 'es', messages: [{ role: 'user', content: 'a'.repeat(1001) }] });
    const response = await handler({ request: long });
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'too_large' });
  });

  it('answers 400 for a malformed conversation', async () => {
    const { handler } = handlerWith();
    const response = await handler({
      request: post({ locale: 'es', messages: [{ role: 'assistant', content: 'x' }] }),
    });
    expect(response.status).toBe(400);
  });

  it('answers 503 not_configured without a model, before spending the rate limit', async () => {
    const limiter: ChatLimiter = { check: vi.fn(async () => ({ ok: true }) as const) };
    const { handler } = handlerWith({ model: null, limiter });
    const response = await handler({ request: post() });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'not_configured' });
    expect(limiter.check).not.toHaveBeenCalled();
  });

  it('answers 429 with Retry-After for the client window and the daily budget', async () => {
    for (const code of ['rate_limited', 'budget_exhausted'] as const) {
      const { model, calls } = scriptedModel([textDelta('x'), stop('end_turn')]);
      const limiter: ChatLimiter = { check: async () => ({ ok: false, code, retryAfter: 42 }) };
      const { handler } = handlerWith({ model, limiter });
      const response = await handler({ request: post() });
      expect(response.status).toBe(429);
      expect(response.headers.get('retry-after')).toBe('42');
      expect(await response.json()).toEqual({ error: code, retryAfter: 42 });
      expect(calls).toHaveLength(0);
    }
  });

  it('limits by the hashed client address', async () => {
    const check = vi.fn(async () => ({ ok: true }) as const);
    const { handler } = handlerWith({ limiter: { check } });
    await handler({ request: post(), clientAddress: '203.0.113.7' });
    await handler({ request: post(undefined, { 'x-forwarded-for': '203.0.113.7' }) });
    const [[first], [second]] = check.mock.calls as unknown as [[string], [string]];
    expect(first).toMatch(/^[0-9a-f]{32}$/);
    expect(second).toBe(first);
  });

  it('answers 500 internal when something unexpected throws, without details', async () => {
    const limiter: ChatLimiter = {
      check: async () => {
        throw new Error('boom');
      },
    };
    const { handler } = handlerWith({ limiter });
    const response = await handler({ request: post() });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'internal' });
  });
});

describe('chat handler: streaming', () => {
  it('sends the model request with the cached system prompt and the conversation', async () => {
    const { model, calls } = scriptedModel([textDelta('Hi'), stop('end_turn')]);
    const { handler } = handlerWith({ model });
    const messages = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
      { role: 'user', content: 'Projects?' },
    ];
    await (await handler({ request: post({ locale: 'en', messages }) })).text();
    expect(calls).toHaveLength(1);
    expect(calls[0].locale).toBe('en');
    expect(calls[0].params).toEqual({
      model: BLUE_MODEL,
      max_tokens: BLUE_MAX_TOKENS,
      output_config: { effort: BLUE_EFFORT },
      system: buildBlueSystem('en'),
      messages,
    });
    // No sampling parameters, thinking budget or prefill: Haiku 5.5 rejects them.
    expect(calls[0].params).not.toHaveProperty('temperature');
    expect(calls[0].params).not.toHaveProperty('thinking');
  });

  it('forwards text deltas in order, skips thinking and ends with done', async () => {
    const { model } = scriptedModel([
      { type: 'message_start' },
      { type: 'content_block_delta', delta: { type: 'thinking_delta' } },
      textDelta('Sebastian '),
      textDelta('builds **web products**.'),
      stop('end_turn'),
      { type: 'message_stop' },
    ]);
    const { handler } = handlerWith({ model });
    const response = await handler({ request: post() });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(await readEvents(response)).toEqual([
      { event: 'delta', data: { text: 'Sebastian ' } },
      { event: 'delta', data: { text: 'builds **web products**.' } },
      { event: 'done', data: { stopReason: 'end_turn' } },
    ]);
  });

  it('logs the token counts of the answer, cache reads included, and no text', async () => {
    const { model } = scriptedModel([
      {
        type: 'message_start',
        message: {
          usage: {
            input_tokens: 40,
            cache_read_input_tokens: 2900,
            cache_creation_input_tokens: 0,
            output_tokens: 1,
          },
        },
      },
      textDelta('Private answer text'),
      {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: { output_tokens: 120, input_tokens: null },
      },
    ]);
    const { handler, log } = handlerWith({ model });
    await (await handler({ request: post({ ...validBody, locale: 'en' }) })).text();
    expect(log.info).toHaveBeenCalledWith('[blue] answer', {
      locale: 'en',
      stopReason: 'end_turn',
      inputTokens: 40,
      cacheReadTokens: 2900,
      cacheWriteTokens: 0,
      outputTokens: 120,
    });
    expect(JSON.stringify(log.info.mock.calls)).not.toContain('Private');
  });

  it('passes max_tokens through as the stop reason', async () => {
    const { model } = scriptedModel([textDelta('Long'), stop('max_tokens')]);
    const { handler } = handlerWith({ model });
    const events = await readEvents(await handler({ request: post() }));
    expect(events.at(-1)).toEqual({ event: 'done', data: { stopReason: 'max_tokens' } });
  });

  it('answers a refusal with the fixed line of the locale', async () => {
    const { model } = scriptedModel([stop('refusal')]);
    const { handler } = handlerWith({ model });
    expect(
      await readEvents(await handler({ request: post({ ...validBody, locale: 'en' }) })),
    ).toEqual([
      { event: 'delta', data: { text: SERVER.en.refusal } },
      { event: 'done', data: { stopReason: 'refusal' } },
    ]);
  });

  it('appends the refusal line after text already sent', async () => {
    const { model } = scriptedModel([textDelta('Partial'), stop('refusal')]);
    const { handler } = handlerWith({ model });
    const events = await readEvents(await handler({ request: post() }));
    expect(events).toEqual([
      { event: 'delta', data: { text: 'Partial' } },
      { event: 'delta', data: { text: `\n\n${SERVER.es.refusal}` } },
      { event: 'done', data: { stopReason: 'refusal' } },
    ]);
  });

  it('answers an empty turn with the fallback line', async () => {
    const { model } = scriptedModel([{ type: 'message_start' }, stop('end_turn')]);
    const { handler } = handlerWith({ model });
    expect(await readEvents(await handler({ request: post() }))).toEqual([
      { event: 'delta', data: { text: format(SERVER.es.empty, { email: CONTACT_EMAILS.es }) } },
      { event: 'done', data: { stopReason: 'end_turn' } },
    ]);
  });

  it('answers 502 upstream when the model fails before any text, without leaking the error', async () => {
    const { model } = scriptedModel([{ type: 'message_start' }, apiError(529)]);
    const { handler, log } = handlerWith({ model });
    const response = await handler({ request: post() });
    expect(response.status).toBe(502);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ error: 'upstream' });
    expect(text).not.toMatch(/secret|sk-ant/);
    expect(log.error).toHaveBeenCalledWith('[blue] model request failed', {
      name: 'InternalServerError',
      status: 529,
      type: 'api_error',
      requestId: 'req_1',
    });
    expect(JSON.stringify(log.error.mock.calls)).not.toMatch(/secret|sk-ant/);
  });

  it('answers 502 when starting the stream throws', async () => {
    const model: ChatModel = {
      stream() {
        throw apiError(401);
      },
    };
    const { handler } = handlerWith({ model });
    expect((await handler({ request: post() })).status).toBe(502);
  });

  it('sends an error event when the stream fails after it started', async () => {
    const { model } = scriptedModel([textDelta('Half an'), apiError(500)]);
    const { handler } = handlerWith({ model });
    const response = await handler({ request: post() });
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).not.toMatch(/secret|sk-ant/);
    expect(text).toBe(
      'event: delta\ndata: {"text":"Half an"}\n\nevent: error\ndata: {"code":"upstream"}\n\n',
    );
  });

  it('aborts the model when the visitor cancels the stream', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => (release = resolve));
    const { model, calls, abort } = scriptedModel([
      textDelta('First'),
      { wait: pending },
      textDelta('Never'),
    ]);
    const { handler } = handlerWith({ model });
    const response = await handler({ request: post() });
    const reader = response.body!.getReader();
    await reader.read();
    await reader.cancel();
    expect(abort).toHaveBeenCalledOnce();
    expect(calls[0].signal.aborted).toBe(true);
    release();
  });

  it('passes the request signal on, so a closed connection aborts the call', async () => {
    const controller = new AbortController();
    const { model, calls } = scriptedModel([textDelta('x'), stop('end_turn')]);
    const { handler } = handlerWith({ model });
    await handler({ request: post(validBody, {}, { signal: controller.signal }) });
    expect(calls[0].signal.aborted).toBe(false);
    controller.abort();
    expect(calls[0].signal.aborted).toBe(true);
  });

  it('ends a slow answer at the deadline with an error event', async () => {
    const { model } = scriptedModel([
      textDelta('Slow'),
      { wait: new Promise((resolve) => setTimeout(resolve, 200)) },
      textDelta('late'),
    ]);
    // The scripted model ignores the signal, like a hung socket; the handler still has to end.
    const wrapped: ChatModel = {
      stream(call) {
        const inner = model.stream(call);
        const iterator = inner[Symbol.asyncIterator]();
        return {
          abort: inner.abort,
          [Symbol.asyncIterator]: () => ({
            next: () =>
              Promise.race([
                iterator.next(),
                new Promise<never>((_, reject) =>
                  call.signal.addEventListener('abort', () => reject(call.signal.reason), {
                    once: true,
                  }),
                ),
              ]),
          }),
        };
      },
    };
    const { handler } = handlerWith({ model: wrapped, deadlineMs: 30 });
    const events = await readEvents(await handler({ request: post() }));
    expect(events).toEqual([
      { event: 'delta', data: { text: 'Slow' } },
      { event: 'error', data: { code: 'upstream' } },
    ]);
  });

  it('streams the local demo answer over the same protocol', async () => {
    const { handler } = handlerWith({ model: createDemoModel(0) });
    const events = await readEvents(
      await handler({ request: post({ ...validBody, locale: 'en' }) }),
    );
    const text = events.flatMap((e) => (e.event === 'delta' ? [e.data.text] : [])).join('');
    expect(text).toBe(SERVER.en.demo);
    expect(events.at(-1)).toEqual({ event: 'done', data: { stopReason: 'end_turn' } });
  });
});
