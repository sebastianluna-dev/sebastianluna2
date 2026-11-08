// Wire contract between the Blue panel (client) and `src/pages/api/chat.ts` (server).
// Both sides import from here; change it only together with both ends and their tests.

import type { Locale } from '@/i18n/locales';

export const CHAT_ENDPOINT = '/api/chat';

/** Request guards, enforced by the server and mirrored by the panel before sending. */
export const CHAT_LIMITS = {
  /** Maximum JSON body size in bytes. */
  maxBodyBytes: 8 * 1024,
  /** Maximum number of messages (user + assistant turns) in one request. */
  maxMessages: 12,
  /** Maximum characters of a single message. */
  maxMessageChars: 1000,
} as const;

export type ChatRole = 'user' | 'assistant';

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

/** POST body. The conversation must start and end with a `user` turn and alternate roles. */
export interface ChatRequest {
  locale: Locale;
  messages: ChatTurn[];
}

/**
 * Error codes. Non-stream errors answer JSON `{ error: ChatErrorCode, retryAfter?: number }`
 * with the matching status; errors after the stream started arrive as an `error` event.
 */
export type ChatErrorCode =
  | 'bad_request' // 400: invalid JSON or shape
  | 'method_not_allowed' // 405
  | 'too_large' // 413: body or a message over the limits
  | 'rate_limited' // 429, with `Retry-After` (seconds) and `retryAfter`
  | 'budget_exhausted' // 429: global daily budget spent
  | 'not_configured' // 503: no ANTHROPIC_API_KEY on the server
  | 'upstream' // 502: the model API failed
  | 'internal'; // 500

export const CHAT_ERROR_STATUS: Record<ChatErrorCode, number> = {
  bad_request: 400,
  method_not_allowed: 405,
  too_large: 413,
  rate_limited: 429,
  budget_exhausted: 429,
  not_configured: 503,
  upstream: 502,
  internal: 500,
};

/**
 * Success: `200 text/event-stream`, `Cache-Control: no-store`. Events (SSE `event:` + JSON `data:`):
 * - `delta` `{ text }`: a text fragment, in order.
 * - `done` `{ stopReason }`: the answer ended (`end_turn`, `max_tokens`, `refusal`…).
 * - `error` `{ code }`: the stream failed after it started.
 */
export type ChatStreamEvent =
  | { event: 'delta'; data: { text: string } }
  | { event: 'done'; data: { stopReason: string } }
  | { event: 'error'; data: { code: ChatErrorCode } };

/** Serialises one event as an SSE frame. */
export function encodeChatEvent(e: ChatStreamEvent): string {
  return `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`;
}
