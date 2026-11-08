import { describe, expect, it } from 'vitest';
import { CHAT_LIMITS, encodeChatEvent } from './protocol';
import { validateChatBody } from './validate';

const body = (value: unknown) => JSON.stringify(value);
const user = (content = 'Hola') => ({ role: 'user', content });
const assistant = (content = 'Hola, soy Blue.') => ({ role: 'assistant', content });

describe('validateChatBody', () => {
  it('accepts an alternating conversation that starts and ends with the visitor', () => {
    const result = validateChatBody(
      body({ locale: 'en', messages: [user(), assistant(), user('More')] }),
    );
    expect(result).toEqual({
      ok: true,
      value: { locale: 'en', messages: [user(), assistant(), user('More')] },
    });
  });

  it('drops unknown fields', () => {
    const result = validateChatBody(
      body({ locale: 'es', messages: [{ ...user(), id: 1 }], extra: true }),
    );
    expect(result).toEqual({ ok: true, value: { locale: 'es', messages: [user()] } });
  });

  it.each([
    ['invalid JSON', '{"locale":'],
    ['a non-object', '"hola"'],
    ['an unknown locale', body({ locale: 'fr', messages: [user()] })],
    ['a missing locale', body({ messages: [user()] })],
    ['no messages', body({ locale: 'es', messages: [] })],
    ['an unknown role', body({ locale: 'es', messages: [{ role: 'system', content: 'x' }] })],
    ['a blank message', body({ locale: 'es', messages: [user('  \n ')] })],
    ['a non-string message', body({ locale: 'es', messages: [{ role: 'user', content: 3 }] })],
    ['an assistant first', body({ locale: 'es', messages: [assistant(), user()] })],
    ['an assistant last (a prefill)', body({ locale: 'es', messages: [user(), assistant()] })],
    ['two visitor turns in a row', body({ locale: 'es', messages: [user(), user()] })],
  ])('rejects %s as bad_request', (_, text) => {
    expect(validateChatBody(text)).toEqual({ ok: false, code: 'bad_request' });
  });

  it('rejects a message over the character limit as too_large', () => {
    const long = user('a'.repeat(CHAT_LIMITS.maxMessageChars + 1));
    expect(validateChatBody(body({ locale: 'es', messages: [long] }))).toEqual({
      ok: false,
      code: 'too_large',
    });
    const exact = user('a'.repeat(CHAT_LIMITS.maxMessageChars));
    expect(validateChatBody(body({ locale: 'es', messages: [exact] })).ok).toBe(true);
  });

  it('rejects more turns than the limit as too_large', () => {
    const turns = (n: number) =>
      Array.from({ length: n }, (_, i) => (i % 2 === 0 ? user() : assistant()));
    const max =
      CHAT_LIMITS.maxMessages % 2 === 1 ? CHAT_LIMITS.maxMessages : CHAT_LIMITS.maxMessages - 1;
    expect(validateChatBody(body({ locale: 'es', messages: turns(max) })).ok).toBe(true);
    expect(
      validateChatBody(body({ locale: 'es', messages: turns(CHAT_LIMITS.maxMessages + 1) })),
    ).toEqual({
      ok: false,
      code: 'too_large',
    });
  });
});

describe('encodeChatEvent', () => {
  it('writes one SSE frame per event with a JSON data line', () => {
    expect(encodeChatEvent({ event: 'delta', data: { text: 'Hola\n"Blue"' } })).toBe(
      'event: delta\ndata: {"text":"Hola\\n\\"Blue\\""}\n\n',
    );
    expect(encodeChatEvent({ event: 'done', data: { stopReason: 'end_turn' } })).toBe(
      'event: done\ndata: {"stopReason":"end_turn"}\n\n',
    );
    expect(encodeChatEvent({ event: 'error', data: { code: 'upstream' } })).toBe(
      'event: error\ndata: {"code":"upstream"}\n\n',
    );
  });
});
