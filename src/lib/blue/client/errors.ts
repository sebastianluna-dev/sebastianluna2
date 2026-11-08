// What went wrong with a question, as the panel explains it: the contract's error codes (JSON body
// before the stream, `error` event after it) folded into the few situations a visitor can act on.

import { CHAT_ERROR_STATUS, type ChatErrorCode } from '../protocol';

export type BlueErrorKind =
  | 'rate_limited' // wait `retryAfter` seconds
  | 'budget' // the daily budget is spent: write to Sebastian instead
  | 'not_configured' // the chat is not available on this deployment
  | 'offline' // the request never reached the server
  | 'too_large' // the conversation no longer fits: start a new one
  | 'upstream'; // anything else: try again

export interface BlueError {
  kind: BlueErrorKind;
  /** Seconds to wait (only `rate_limited`). */
  retryAfter?: number;
}

function isErrorCode(value: unknown): value is ChatErrorCode {
  return typeof value === 'string' && Object.hasOwn(CHAT_ERROR_STATUS, value);
}

/** Positive whole seconds, or undefined. */
export function parseRetryAfter(value: unknown): number | undefined {
  const seconds = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined;
}

export function errorFromCode(code: ChatErrorCode, retryAfter?: number): BlueError {
  switch (code) {
    case 'rate_limited':
      return retryAfter === undefined
        ? { kind: 'rate_limited' }
        : { kind: 'rate_limited', retryAfter };
    case 'budget_exhausted':
      return { kind: 'budget' };
    case 'not_configured':
      return { kind: 'not_configured' };
    case 'too_large':
      return { kind: 'too_large' };
    default:
      return { kind: 'upstream' };
  }
}

/**
 * A response that is not the stream. Uses the JSON `error` when there is one, else the status
 * (a 404 means the function is not deployed, as in a static preview).
 */
export function errorFromResponse(
  status: number,
  body: unknown,
  retryAfterHeader: string | null,
): BlueError {
  const record = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const retryAfter = parseRetryAfter(record.retryAfter) ?? parseRetryAfter(retryAfterHeader);
  if (isErrorCode(record.error)) return errorFromCode(record.error, retryAfter);
  if (status === 429) return errorFromCode('rate_limited', retryAfter);
  if (status === 404 || status === 503) return { kind: 'not_configured' };
  if (status === 413) return { kind: 'too_large' };
  return { kind: 'upstream' };
}

/** A `fetch` or read that threw: offline when the browser says so or the request never left. */
export function errorFromException(error: unknown, online: boolean): BlueError {
  if (!online || (error instanceof TypeError && !/abort/i.test(error.message))) {
    return { kind: 'offline' };
  }
  return { kind: 'upstream' };
}

/** How long to wait, in the unit a person would say it: seconds under a minute, else minutes. */
export function waitUnit(seconds: number): { value: number; unit: 'second' | 'minute' } {
  return seconds < 60
    ? { value: Math.max(1, Math.ceil(seconds)), unit: 'second' }
    : { value: Math.ceil(seconds / 60), unit: 'minute' };
}
