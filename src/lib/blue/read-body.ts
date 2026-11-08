// Reads a request body as UTF-8 text without ever holding more than `maxBytes` of it, whatever
// `Content-Length` claims (it can be missing, or lie, with chunked uploads).

export type ReadBodyResult =
  { ok: true; text: string } | { ok: false; code: 'too_large' | 'bad_request' };

export async function readBodyCapped(request: Request, maxBytes: number): Promise<ReadBodyResult> {
  const declared = request.headers.get('content-length');
  if (declared !== null && Number(declared) > maxBytes) return { ok: false, code: 'too_large' };
  if (!request.body) return { ok: false, code: 'bad_request' };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        // Stop the upload; nothing past the cap is buffered.
        await reader.cancel().catch(() => {});
        return { ok: false, code: 'too_large' };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, code: 'bad_request' };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, code: 'bad_request' };
  }
}
