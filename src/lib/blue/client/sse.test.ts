import { describe, expect, it } from 'vitest';
import { encodeChatEvent, type ChatStreamEvent } from '../protocol';
import { createSseParser, toChatEvent } from './sse';

const stream: ChatStreamEvent[] = [
  { event: 'delta', data: { text: 'Hola, ' } },
  { event: 'delta', data: { text: 'soy **Blue**.\nUna línea más: «ñ» 🙂' } },
  { event: 'done', data: { stopReason: 'end_turn' } },
];
const body = stream.map(encodeChatEvent).join('');

function feed(chunks: string[]): ChatStreamEvent[] {
  const parser = createSseParser();
  return [...chunks.flatMap((chunk) => parser.push(chunk)), ...parser.flush()];
}

describe('createSseParser', () => {
  it('reads a whole body at once', () => {
    expect(feed([body])).toEqual(stream);
  });

  it('reads the body split at every single position', () => {
    for (let cut = 1; cut < body.length; cut++) {
      expect(feed([body.slice(0, cut), body.slice(cut)])).toEqual(stream);
    }
  });

  it('reads the body one character at a time', () => {
    expect(feed([...body])).toEqual(stream);
  });

  it('accepts CRLF and CR line endings, even with the pair split across chunks', () => {
    const crlf = body.replace(/\n/g, '\r\n');
    expect(feed([crlf])).toEqual(stream);
    for (let cut = 1; cut < crlf.length; cut++) {
      expect(feed([crlf.slice(0, cut), crlf.slice(cut)])).toEqual(stream);
    }
    expect(feed([body.replace(/\n/g, '\r')])).toEqual(stream);
  });

  it('only emits an event once its blank line arrives', () => {
    const parser = createSseParser();
    expect(parser.push('event: delta\ndata: {"text":"a"}\n')).toEqual([]);
    expect(parser.push('\n')).toEqual([{ event: 'delta', data: { text: 'a' } }]);
  });

  it('completes a last frame without its blank line on flush', () => {
    const parser = createSseParser();
    expect(parser.push('event: done\ndata: {"stopReason":"max_tokens"}')).toEqual([]);
    expect(parser.flush()).toEqual([{ event: 'done', data: { stopReason: 'max_tokens' } }]);
  });

  it('skips comments, unknown fields and unknown events', () => {
    const text =
      ': keep-alive\n\nid: 7\nretry: 100\nevent: ping\ndata: {}\n\nevent: delta\ndata: {"text":"x"}\n\n';
    expect(feed([text])).toEqual([{ event: 'delta', data: { text: 'x' } }]);
  });

  it('joins several data lines with a newline', () => {
    expect(feed(['event: delta\ndata: {"text":\ndata: "y"}\n\n'])).toEqual([
      { event: 'delta', data: { text: 'y' } },
    ]);
  });

  it('turns stream errors into error events', () => {
    expect(feed([encodeChatEvent({ event: 'error', data: { code: 'upstream' } })])).toEqual([
      { event: 'error', data: { code: 'upstream' } },
    ]);
  });
});

describe('toChatEvent', () => {
  it('drops a malformed delta but keeps a malformed error as upstream', () => {
    expect(toChatEvent('delta', '{nope')).toBeNull();
    expect(toChatEvent('delta', '{"text":3}')).toBeNull();
    expect(toChatEvent('error', '{nope')).toEqual({ event: 'error', data: { code: 'upstream' } });
  });

  it('keeps known error codes and maps unknown ones to upstream', () => {
    expect(toChatEvent('error', '{"code":"rate_limited"}')).toEqual({
      event: 'error',
      data: { code: 'rate_limited' },
    });
    expect(toChatEvent('error', '{"code":"toString"}')).toEqual({
      event: 'error',
      data: { code: 'upstream' },
    });
  });

  it('defaults a done without a reason to end_turn', () => {
    expect(toChatEvent('done', '{}')).toEqual({ event: 'done', data: { stopReason: 'end_turn' } });
  });
});
