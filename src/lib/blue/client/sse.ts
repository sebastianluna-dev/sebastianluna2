// Incremental parser of the chat's `text/event-stream` (contract in `../protocol`). The network
// hands the body over in arbitrary pieces, so a frame, a line or even a `\r\n` pair can arrive
// split across chunks: the parser keeps whatever is incomplete until the next `push`.

import { CHAT_ERROR_STATUS, type ChatErrorCode, type ChatStreamEvent } from '../protocol';

export interface SseParser {
  /** Feeds a decoded piece of the body; returns the events it completed, in order. */
  push(chunk: string): ChatStreamEvent[];
  /** The body ended: completes a last frame that lacked its blank line, if any. */
  flush(): ChatStreamEvent[];
}

function isErrorCode(value: unknown): value is ChatErrorCode {
  return typeof value === 'string' && Object.hasOwn(CHAT_ERROR_STATUS, value);
}

/** Turns one frame into a contract event; unknown events and malformed payloads are skipped. */
export function toChatEvent(name: string, data: string): ChatStreamEvent | null {
  let payload: unknown;
  try {
    payload = JSON.parse(data);
  } catch {
    // A broken `error` frame still means the stream failed.
    return name === 'error' ? { event: 'error', data: { code: 'upstream' } } : null;
  }
  const record = (typeof payload === 'object' && payload !== null ? payload : {}) as Record<
    string,
    unknown
  >;
  switch (name) {
    case 'delta':
      return typeof record.text === 'string'
        ? { event: 'delta', data: { text: record.text } }
        : null;
    case 'done':
      return {
        event: 'done',
        data: {
          stopReason: typeof record.stopReason === 'string' ? record.stopReason : 'end_turn',
        },
      };
    case 'error':
      return {
        event: 'error',
        data: { code: isErrorCode(record.code) ? record.code : 'upstream' },
      };
    default:
      return null;
  }
}

export function createSseParser(): SseParser {
  let buffer = '';
  let eventName = '';
  let dataLines: string[] = [];

  function dispatch(out: ChatStreamEvent[]): void {
    if (dataLines.length > 0) {
      const event = toChatEvent(eventName || 'message', dataLines.join('\n'));
      if (event) out.push(event);
    }
    eventName = '';
    dataLines = [];
  }

  function readLine(line: string, out: ChatStreamEvent[]): void {
    if (line === '') return dispatch(out);
    if (line.startsWith(':')) return; // comment / keep-alive
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') eventName = value;
    else if (field === 'data') dataLines.push(value);
  }

  return {
    push(chunk) {
      buffer += chunk;
      const out: ChatStreamEvent[] = [];
      for (;;) {
        const match = /\r\n|\r|\n/.exec(buffer);
        if (!match) break;
        // A lone `\r` at the very end may be the first half of a `\r\n` still in flight.
        if (match[0] === '\r' && match.index === buffer.length - 1) break;
        readLine(buffer.slice(0, match.index), out);
        buffer = buffer.slice(match.index + match[0].length);
      }
      return out;
    },
    flush() {
      const out: ChatStreamEvent[] = [];
      if (buffer !== '') {
        readLine(buffer.replace(/\r$/, ''), out);
        buffer = '';
      }
      dispatch(out);
      return out;
    },
  };
}
