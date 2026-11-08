import { describe, expect, it, vi } from 'vitest';
import {
  CHAT_ENDPOINT,
  encodeChatEvent,
  type ChatRequest,
  type ChatStreamEvent,
} from '../protocol';
import { streamChat } from './stream';

const request: ChatRequest = { locale: 'es', messages: [{ role: 'user', content: 'hola' }] };

/** A streaming body that delivers `chunks` one by one (split anywhere). */
function sseResponse(chunks: string[], init: ResponseInit = {}): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' },
    ...init,
  });
}

const frames = (events: ChatStreamEvent[]) => events.map(encodeChatEvent).join('');

function run(response: Response | Promise<Response>, signal = new AbortController().signal) {
  const deltas: string[] = [];
  const fetchMock = vi.fn<typeof fetch>(async () => response);
  const outcome = streamChat(request, {
    signal,
    onDelta: (text) => deltas.push(text),
    fetch: fetchMock,
  });
  return { outcome, deltas, fetchMock };
}

describe('streamChat', () => {
  it('posts the request as JSON to the endpoint', async () => {
    const { outcome, fetchMock } = run(
      sseResponse([frames([{ event: 'done', data: { stopReason: 'end_turn' } }])]),
    );
    await outcome;
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(CHAT_ENDPOINT);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual(request);
  });

  it('reports every delta in order, with frames split mid-event', async () => {
    const text = frames([
      { event: 'delta', data: { text: 'Hola, ' } },
      { event: 'delta', data: { text: 'soy Blue.' } },
      { event: 'done', data: { stopReason: 'end_turn' } },
    ]);
    const pieces = [text.slice(0, 7), text.slice(7, 40), text.slice(40, 41), text.slice(41)];
    const { outcome, deltas } = run(sseResponse(pieces));
    expect(await outcome).toEqual({ type: 'done', stopReason: 'end_turn' });
    expect(deltas.join('')).toBe('Hola, soy Blue.');
  });

  it('keeps multibyte characters split across network chunks', async () => {
    const bytes = new TextEncoder().encode(
      frames([
        { event: 'delta', data: { text: 'Señal 🙂' } },
        { event: 'done', data: { stopReason: 'end_turn' } },
      ]),
    );
    const cut = bytes.indexOf(0xf0) + 2; // inside the emoji
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, cut));
        controller.enqueue(bytes.slice(cut));
        controller.close();
      },
    });
    const { outcome, deltas } = run(
      new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }),
    );
    await outcome;
    expect(deltas.join('')).toBe('Señal 🙂');
  });

  it('turns an error event after some text into an error outcome', async () => {
    const { outcome, deltas } = run(
      sseResponse([
        frames([
          { event: 'delta', data: { text: 'Parte' } },
          { event: 'error', data: { code: 'upstream' } },
        ]),
      ]),
    );
    expect(await outcome).toEqual({ type: 'error', error: { kind: 'upstream' } });
    expect(deltas).toEqual(['Parte']);
  });

  it('treats a body that ends without done as broken', async () => {
    const { outcome } = run(sseResponse([frames([{ event: 'delta', data: { text: 'a' } }])]));
    expect(await outcome).toEqual({ type: 'error', error: { kind: 'upstream' } });
  });

  it('reads JSON errors with their wait', async () => {
    const { outcome } = run(
      new Response(JSON.stringify({ error: 'rate_limited', retryAfter: 90 }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '90' },
      }),
    );
    expect(await outcome).toEqual({
      type: 'error',
      error: { kind: 'rate_limited', retryAfter: 90 },
    });
  });

  it('says not configured for the 503 of a server without a key', async () => {
    const { outcome } = run(
      new Response(JSON.stringify({ error: 'not_configured' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(await outcome).toEqual({ type: 'error', error: { kind: 'not_configured' } });
  });

  it('treats a 200 that is not a stream as an upstream failure', async () => {
    const { outcome } = run(new Response('<html>', { headers: { 'Content-Type': 'text/html' } }));
    expect(await outcome).toEqual({ type: 'error', error: { kind: 'upstream' } });
  });

  it('is offline when fetch cannot connect', async () => {
    const { outcome } = run(Promise.reject(new TypeError('Failed to fetch')));
    expect(await outcome).toEqual({ type: 'error', error: { kind: 'offline' } });
  });

  it('reports an abort as aborted, not as an error', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError')),
          );
        }),
    );
    const outcome = streamChat(request, {
      signal: controller.signal,
      onDelta: () => {},
      fetch: fetchMock as unknown as typeof fetch,
    });
    controller.abort();
    expect(await outcome).toEqual({ type: 'aborted' });
  });
});
