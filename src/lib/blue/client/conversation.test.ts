import { describe, expect, it } from 'vitest';
import { validateChatBody } from '../validate';
import { CHAT_LIMITS } from '../protocol';
import {
  bodyBytes,
  buildChatRequest,
  charCount,
  clampText,
  parseHistory,
  toRequestTurns,
  trimHistory,
  type BlueMessage,
} from './conversation';

let n = 0;
const user = (content: string): BlueMessage => ({ id: `u${n++}`, role: 'user', content });
const blue = (content: string): BlueMessage => ({ id: `a${n++}`, role: 'assistant', content });

function conversation(pairs: number, size = 10): BlueMessage[] {
  return Array.from({ length: pairs }, (_, i) => [
    user(`q${i} ${'x'.repeat(size)}`),
    blue(`a${i} ${'y'.repeat(size)}`),
  ]).flat();
}

/** The server's own validator is the judge of what a valid request is. */
function serverAccepts(request: unknown): boolean {
  return validateChatBody(JSON.stringify(request)).ok;
}

describe('toRequestTurns', () => {
  it('alternates, starting and ending with the visitor', () => {
    const turns = toRequestTurns([...conversation(2), user('new')]);
    expect(turns.map((t) => t.role)).toEqual(['user', 'assistant', 'user', 'assistant', 'user']);
  });

  it('keeps only the last of two visitor turns in a row', () => {
    const turns = toRequestTurns([user('unanswered'), user('again')]);
    expect(turns).toEqual([{ role: 'user', content: 'again' }]);
  });

  it('drops empty turns and an answer without a question', () => {
    const turns = toRequestTurns([
      blue('greeting'),
      user('  '),
      user('hi'),
      blue(''),
      user('more'),
    ]);
    expect(turns).toEqual([{ role: 'user', content: 'more' }]);
  });

  it('never ends with an answer', () => {
    expect(toRequestTurns(conversation(1)).map((t) => t.role)).toEqual(['user']);
  });

  it('keeps at most maxMessages turns and starts with the visitor', () => {
    const turns = toRequestTurns([...conversation(10), user('last')]);
    expect(turns.length).toBeLessThanOrEqual(CHAT_LIMITS.maxMessages);
    expect(turns[0]?.role).toBe('user');
    expect(turns.at(-1)).toEqual({ role: 'user', content: 'last' });
  });

  it('clamps long answers to maxMessageChars', () => {
    const turns = toRequestTurns([user('q'), blue('z'.repeat(3000)), user('q2')]);
    expect(charCount(turns[1]!.content)).toBe(CHAT_LIMITS.maxMessageChars);
    const emoji = toRequestTurns([user('q'), blue('🙂'.repeat(900)), user('q2')]);
    expect(emoji[1]!.content.length).toBeLessThanOrEqual(CHAT_LIMITS.maxMessageChars);
    expect(turns[1]!.content.endsWith('…')).toBe(true);
  });
});

describe('buildChatRequest', () => {
  it('returns null when there is nothing to ask', () => {
    expect(buildChatRequest('es', [])).toBeNull();
    expect(buildChatRequest('es', [blue('hi')])).toBeNull();
  });

  it('drops old exchanges until the body fits maxBodyBytes', () => {
    // Accented text: two bytes per character, so 11 turns of ~1000 characters are ~22 KB.
    const history = [
      ...conversation(5, 990).map((m) => ({ ...m, content: 'é'.repeat(990) })),
      user('ñ'.repeat(990)),
    ];
    const request = buildChatRequest('es', history)!;
    expect(bodyBytes(request)).toBeLessThanOrEqual(CHAT_LIMITS.maxBodyBytes);
    expect(request.messages.at(-1)?.role).toBe('user');
    expect(request.messages[0]?.role).toBe('user');
    expect(serverAccepts(request)).toBe(true);
  });

  it('builds what the server validator accepts for messy histories', () => {
    const histories: BlueMessage[][] = [
      [user('hola')],
      [...conversation(8, 400), user('¿y ahora?')],
      [blue('saludo'), user('a'), user('b'), blue('c'), blue('d'), user('e')],
      [user('q'), { ...blue('partial'), state: 'stopped' }, user('q2')],
      [user('x'.repeat(1000)), blue('y'.repeat(2500)), user('z'.repeat(1000))],
      [user('q'), blue('🙂'.repeat(800)), user('ok')],
    ];
    for (const history of histories) {
      expect(serverAccepts(buildChatRequest('en', history))).toBe(true);
    }
  });
});

describe('history storage', () => {
  it('reads back what was stored', () => {
    const history = conversation(2);
    expect(parseHistory(JSON.stringify(history))).toEqual(history);
  });

  it('gives an empty conversation for anything unexpected', () => {
    expect(parseHistory(null)).toEqual([]);
    expect(parseHistory('{')).toEqual([]);
    expect(parseHistory('{"a":1}')).toEqual([]);
    expect(parseHistory('[{"id":"1","role":"system","content":"x"}]')).toEqual([]);
  });

  it('trims to maxMessages, starting on a visitor turn', () => {
    const trimmed = trimHistory(conversation(10));
    expect(trimmed.length).toBeLessThanOrEqual(CHAT_LIMITS.maxMessages);
    expect(trimmed[0]?.role).toBe('user');
  });
});

describe('clampText', () => {
  it('leaves short texts alone and counts UTF-16 units, like the server', () => {
    expect(clampText('hola', 10)).toBe('hola');
    expect(charCount('🙂🙂')).toBe(4);
    expect(clampText('🙂'.repeat(5), 5)).toBe('🙂🙂…');
    // Never splits a surrogate pair.
    expect(clampText('ab🙂cd', 4)).toBe('ab…');
  });
});
