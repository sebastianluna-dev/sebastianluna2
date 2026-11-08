import { describe, expect, it } from 'vitest';
import { readBodyCapped } from './read-body';

const post = (body: BodyInit | null, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/chat', {
    method: 'POST',
    body,
    headers,
    duplex: 'half',
  } as RequestInit);

/** A body that arrives in chunks, without a Content-Length. */
function chunked(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(chunks[i++]);
      else controller.close();
    },
  });
}

describe('readBodyCapped', () => {
  it('returns the text of a body within the cap', async () => {
    expect(await readBodyCapped(post('{"a":"ñ"}'), 100)).toEqual({ ok: true, text: '{"a":"ñ"}' });
  });

  it('accepts a body of exactly the cap', async () => {
    expect(await readBodyCapped(post('x'.repeat(10)), 10)).toEqual({
      ok: true,
      text: 'x'.repeat(10),
    });
  });

  it('refuses a declared Content-Length over the cap before reading', async () => {
    const request = post('x', { 'content-length': '9999' });
    expect(await readBodyCapped(request, 100)).toEqual({ ok: false, code: 'too_large' });
  });

  it('counts the real bytes when Content-Length is missing or lies', async () => {
    const big = new Uint8Array(60).fill(120);
    let pulled = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        controller.enqueue(big);
      },
    });
    expect(await readBodyCapped(post(stream, { 'content-length': '10' }), 100)).toEqual({
      ok: false,
      code: 'too_large',
    });
    // It stopped right after the chunk that crossed the cap, not at the end of an endless body.
    expect(pulled).toBeLessThanOrEqual(3);
  });

  it('counts bytes, not characters', async () => {
    const encoded = new TextEncoder().encode('ñ'.repeat(6)); // 12 bytes
    expect(await readBodyCapped(post(chunked([encoded])), 11)).toEqual({
      ok: false,
      code: 'too_large',
    });
  });

  it('joins chunks and decodes characters split across them', async () => {
    const bytes = new TextEncoder().encode('añb');
    const result = await readBodyCapped(post(chunked([bytes.slice(0, 2), bytes.slice(2)])), 100);
    expect(result).toEqual({ ok: true, text: 'añb' });
  });

  it('refuses invalid UTF-8 and a missing body', async () => {
    expect(await readBodyCapped(post(chunked([new Uint8Array([0xff, 0xfe])])), 100)).toEqual({
      ok: false,
      code: 'bad_request',
    });
    expect(await readBodyCapped(post(null), 100)).toEqual({ ok: false, code: 'bad_request' });
  });
});
