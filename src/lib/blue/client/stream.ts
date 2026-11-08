// One question to the chat endpoint: POST the request, read the SSE answer and report each text
// fragment as it arrives. `fetch` is injected so the whole flow is tested with a fake response.

import { CHAT_ENDPOINT, type ChatRequest } from '../protocol';
import { errorFromCode, errorFromException, errorFromResponse, type BlueError } from './errors';
import { createSseParser } from './sse';

export type StreamOutcome =
  { type: 'done'; stopReason: string } | { type: 'error'; error: BlueError } | { type: 'aborted' };

export interface StreamOptions {
  signal: AbortSignal;
  onDelta: (text: string) => void;
  fetch?: typeof fetch;
  /** `navigator.onLine` at the moment of a failure. */
  isOnline?: () => boolean;
  endpoint?: string;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function streamChat(
  request: ChatRequest,
  options: StreamOptions,
): Promise<StreamOutcome> {
  const { signal, onDelta } = options;
  const doFetch = options.fetch ?? fetch;
  const online = () => options.isOnline?.() ?? true;
  try {
    const response = await doFetch(options.endpoint ?? CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(request),
      cache: 'no-store',
      credentials: 'same-origin',
      signal,
    });
    const type = response.headers.get('Content-Type') ?? '';
    if (!response.ok || !response.body || !type.includes('text/event-stream')) {
      const body = await readJson(response);
      const status = response.ok ? 502 : response.status;
      return {
        type: 'error',
        error: errorFromResponse(status, body, response.headers.get('Retry-After')),
      };
    }
    const parser = createSseParser();
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    // A holder, not a `let`: the closure below assigns it and TS would not see that.
    const end: { outcome: StreamOutcome | null } = { outcome: null };
    const handle = (events: ReturnType<typeof parser.push>) => {
      for (const event of events) {
        if (end.outcome) return;
        if (event.event === 'delta') {
          if (event.data.text) onDelta(event.data.text);
        } else if (event.event === 'done') {
          end.outcome = { type: 'done', stopReason: event.data.stopReason };
        } else {
          end.outcome = { type: 'error', error: errorFromCode(event.data.code) };
        }
      }
    };
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      handle(parser.push(value));
      if (end.outcome) {
        await reader.cancel().catch(() => {});
        return end.outcome;
      }
    }
    handle(parser.flush());
    // A body that ends without `done` broke on the way (the panel keeps what arrived).
    return end.outcome ?? { type: 'error', error: { kind: 'upstream' } };
  } catch (error) {
    if (signal.aborted) return { type: 'aborted' };
    return { type: 'error', error: errorFromException(error, online()) };
  }
}
