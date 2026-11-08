// The chat endpoint as a plain function of a `Request`, with the model and the limiter injected,
// so the whole flow runs in tests without network. `src/pages/api/chat.ts` wires the real ones.

import type { Locale } from '@/i18n/locales';
import { format, getMessages } from '@/i18n/t';
import { CONTACT_EMAILS } from '@/data/profile';
import { clientKey, resolveClientIp } from './client-ip';
import { BLUE_DEADLINE_MS, BLUE_EFFORT, BLUE_MAX_TOKENS, BLUE_MODEL } from './config';
import type { ChatModel, ModelEvent, ModelStream, ModelUsage } from './model';
import { isAllowedOrigin } from './origin';
import { buildBlueSystem } from './prompt';
import {
  CHAT_ERROR_STATUS,
  CHAT_LIMITS,
  encodeChatEvent,
  type ChatErrorCode,
  type ChatRequest,
  type ChatStreamEvent,
} from './protocol';
import type { ChatLimiter } from './rate-limit';
import { readBodyCapped } from './read-body';
import { validateChatBody } from './validate';

export interface ChatLogger {
  info(message: string, details?: Record<string, unknown>): void;
  warn(message: string): void;
  error(message: string, details?: Record<string, unknown>): void;
}

export interface ChatHandlerDeps {
  /** `null` when the server has no API key (and is not in the local demo mode). */
  model: ChatModel | null;
  limiter: ChatLimiter;
  /** Production origin allowed to call the endpoint (`SITE_URL`). */
  siteUrl: string;
  /** Secret that keys the client IP before it becomes a rate-limit key (`clientKey`). */
  ipSecret?: string;
  logger?: ChatLogger;
  deadlineMs?: number;
}

export interface ChatHandlerInput {
  request: Request;
  /** Astro's `context.clientAddress`, when the adapter provides one. */
  clientAddress?: string;
}

/** On every response: never cached, never sniffed into another type. */
const COMMON_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
} as const;

export function jsonError(
  code: ChatErrorCode,
  options: { retryAfter?: number; headers?: Record<string, string> } = {},
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    ...COMMON_HEADERS,
    ...options.headers,
  };
  if (options.retryAfter !== undefined) headers['Retry-After'] = String(options.retryAfter);
  const body =
    options.retryAfter === undefined
      ? { error: code }
      : { error: code, retryAfter: options.retryAfter };
  return new Response(JSON.stringify(body), { status: CHAT_ERROR_STATUS[code], headers });
}

/** The Messages API request for one turn. */
export function buildModelParams(request: ChatRequest) {
  return {
    model: BLUE_MODEL,
    max_tokens: BLUE_MAX_TOKENS,
    output_config: { effort: BLUE_EFFORT },
    system: buildBlueSystem(request.locale),
    messages: request.messages.map(({ role, content }) => ({ role, content })),
  };
}

/** What one answer cost, for the log: token counts and the stop reason, never any text. */
export interface AnswerSummary {
  stopReason: string;
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
}

/**
 * Model events → protocol events: every text delta in order (thinking is never forwarded), then
 * a fixed line on a refusal or an answer with no text, then `done` with the stop reason.
 */
export async function* answerEvents(
  events: AsyncIterable<ModelEvent>,
  locale: Locale,
  onFinish?: (summary: AnswerSummary) => void,
): AsyncGenerator<ChatStreamEvent> {
  let wroteText = false;
  let stopReason: string | null = null;
  const usage: ModelUsage = {};
  for await (const event of events) {
    if (
      event.type === 'content_block_delta' &&
      event.delta?.type === 'text_delta' &&
      event.delta.text
    ) {
      wroteText = true;
      yield { event: 'delta', data: { text: event.delta.text } };
    } else if (event.type === 'message_start' && event.message?.usage) {
      Object.assign(usage, event.message.usage);
    } else if (event.type === 'message_delta') {
      if (event.delta?.stop_reason) stopReason = event.delta.stop_reason;
      // Cumulative counts; a null field keeps the value from `message_start`.
      for (const [key, value] of Object.entries(event.usage ?? {})) {
        if (typeof value === 'number') usage[key as keyof ModelUsage] = value;
      }
    }
  }
  const reason = stopReason ?? 'end_turn';
  onFinish?.({
    stopReason: reason,
    inputTokens: usage.input_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
  });
  const copy = getMessages(locale).blue.server;
  if (reason === 'refusal') {
    yield { event: 'delta', data: { text: wroteText ? `\n\n${copy.refusal}` : copy.refusal } };
  } else if (!wroteText) {
    yield { event: 'delta', data: { text: format(copy.empty, { email: CONTACT_EMAILS[locale] }) } };
  }
  yield { event: 'done', data: { stopReason: reason } };
}

function isJsonContentType(value: string | null): boolean {
  return value !== null && value.split(';')[0].trim().toLowerCase() === 'application/json';
}

/** Status, type and request id of an SDK error; never its message or the request. */
function describeModelError(error: unknown): Record<string, unknown> {
  const e = error as { name?: unknown; status?: unknown; type?: unknown; requestID?: unknown };
  return { name: e?.name, status: e?.status, type: e?.type, requestId: e?.requestID };
}

export function createChatHandler(
  deps: ChatHandlerDeps,
): (input: ChatHandlerInput) => Promise<Response> {
  const {
    model,
    limiter,
    siteUrl,
    ipSecret,
    logger = console,
    deadlineMs = BLUE_DEADLINE_MS,
  } = deps;
  const encoder = new TextEncoder();

  async function stream(
    chat: ChatRequest,
    request: Request,
    chatModel: ChatModel,
  ): Promise<Response> {
    const cancel = new AbortController();
    const signal = AbortSignal.any([
      request.signal,
      cancel.signal,
      AbortSignal.timeout(deadlineMs),
    ]);
    let modelStream: ModelStream;
    let events: AsyncGenerator<ChatStreamEvent>;
    let first: IteratorResult<ChatStreamEvent>;
    try {
      modelStream = chatModel.stream({
        params: buildModelParams(chat),
        locale: chat.locale,
        signal,
      });
      // One line per answer: `cacheReadTokens` > 0 from the second request on shows the cache works.
      events = answerEvents(modelStream, chat.locale, (summary) =>
        logger.info('[blue] answer', { locale: chat.locale, ...summary }),
      );
      // Wait for the first event, so a failure before any text still answers with a status.
      first = await events.next();
    } catch (error) {
      cancel.abort();
      if (!request.signal.aborted)
        logger.error('[blue] model request failed', describeModelError(error));
      return jsonError('upstream');
    }

    let closed = false;
    const send = (
      controller: ReadableStreamDefaultController<Uint8Array>,
      event: ChatStreamEvent,
    ) => {
      if (!closed) controller.enqueue(encoder.encode(encodeChatEvent(event)));
    };
    const finish = (controller: ReadableStreamDefaultController<Uint8Array>) => {
      if (closed) return;
      closed = true;
      controller.close();
    };

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        if (first.done) finish(controller);
        else send(controller, first.value);
      },
      async pull(controller) {
        try {
          const next = await events.next();
          if (next.done) finish(controller);
          else send(controller, next.value);
        } catch (error) {
          if (closed) return;
          if (!request.signal.aborted) {
            logger.error('[blue] model stream failed', describeModelError(error));
            send(controller, { event: 'error', data: { code: 'upstream' } });
          }
          finish(controller);
        }
      },
      cancel() {
        // The visitor closed the panel or left: stop paying for tokens nobody reads.
        closed = true;
        cancel.abort();
        modelStream.abort();
      },
    });

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        ...COMMON_HEADERS,
        'X-Accel-Buffering': 'no',
      },
    });
  }

  return async ({ request, clientAddress }) => {
    try {
      if (request.method !== 'POST')
        return jsonError('method_not_allowed', { headers: { Allow: 'POST' } });
      if (!isAllowedOrigin(request.headers, { requestUrl: request.url, siteUrl }))
        return jsonError('bad_request');
      if (!isJsonContentType(request.headers.get('content-type'))) return jsonError('bad_request');

      const body = await readBodyCapped(request, CHAT_LIMITS.maxBodyBytes);
      if (!body.ok) return jsonError(body.code);
      const chat = validateChatBody(body.text);
      if (!chat.ok) return jsonError(chat.code);

      if (!model) return jsonError('not_configured');

      const decision = await limiter.check(
        await clientKey(resolveClientIp(clientAddress, request.headers), ipSecret),
      );
      if (!decision.ok) return jsonError(decision.code, { retryAfter: decision.retryAfter });

      return await stream(chat.value, request, model);
    } catch (error) {
      logger.error('[blue] chat handler failed', { name: (error as { name?: unknown })?.name });
      return jsonError('internal');
    }
  };
}
