import { describe, expect, it } from 'vitest';
import { CHAT_LIMITS } from '../protocol';
import {
  chatReducer,
  initialChatState,
  isBusy,
  type ChatAction,
  type ChatState,
} from './chat-state';

const ask = (content: string, n: number): ChatAction => ({
  type: 'ask',
  message: { id: `u${n}`, role: 'user', content },
  replyId: `a${n}`,
});

const play = (actions: ChatAction[], from: ChatState = initialChatState()) =>
  actions.reduce((state, action) => chatReducer(state, action), from);

describe('chatReducer', () => {
  it('asks, streams fragments into one answer and finishes', () => {
    const state = play([
      ask('hola', 1),
      { type: 'delta', text: 'Hola, ' },
      { type: 'delta', text: 'soy Blue.' },
      { type: 'done' },
    ]);
    expect(state.status).toBe('idle');
    expect(state.messages).toEqual([
      { id: 'u1', role: 'user', content: 'hola' },
      { id: 'a1', role: 'assistant', content: 'Hola, soy Blue.' },
    ]);
  });

  it('waits until the first fragment, then streams', () => {
    const waiting = play([ask('hola', 1)]);
    expect(waiting.status).toBe('waiting');
    expect(waiting.messages).toHaveLength(1);
    expect(play([{ type: 'delta', text: 'x' }], waiting).status).toBe('streaming');
  });

  it('ignores a new question while busy and fragments while idle', () => {
    const busy = play([ask('a', 1)]);
    expect(chatReducer(busy, ask('b', 2))).toBe(busy);
    const idle = initialChatState();
    expect(chatReducer(idle, { type: 'delta', text: 'x' })).toBe(idle);
  });

  it('keeps a stopped answer, marked, and goes idle', () => {
    const state = play([ask('a', 1), { type: 'delta', text: 'parte' }, { type: 'stop' }]);
    expect(state.status).toBe('idle');
    expect(state.messages.at(-1)).toEqual({
      id: 'a1',
      role: 'assistant',
      content: 'parte',
      state: 'stopped',
    });
  });

  it('records a failure and retries the same question without the partial answer', () => {
    const failed = play([
      ask('a', 1),
      { type: 'delta', text: 'parte' },
      { type: 'fail', error: { kind: 'upstream' } },
    ]);
    expect(failed.status).toBe('error');
    expect(failed.error).toEqual({ kind: 'upstream' });
    const retried = chatReducer(failed, { type: 'retry', replyId: 'a1b' });
    expect(retried.status).toBe('waiting');
    expect(retried.error).toBeNull();
    expect(retried.messages).toEqual([{ id: 'u1', role: 'user', content: 'a' }]);
    expect(isBusy(retried)).toBe(true);
  });

  it('trims the history to maxMessages when asking', () => {
    const actions: ChatAction[] = [];
    for (let i = 0; i < CHAT_LIMITS.maxMessages; i++) {
      actions.push(ask(`q${i}`, i), { type: 'delta', text: `a${i}` }, { type: 'done' });
    }
    const state = play(actions);
    expect(state.messages.length).toBeLessThanOrEqual(CHAT_LIMITS.maxMessages);
    expect(state.messages[0]?.role).toBe('user');
    expect(state.messages.at(-2)?.content).toBe(`q${CHAT_LIMITS.maxMessages - 1}`);
  });

  it('resets to an empty conversation', () => {
    expect(play([ask('a', 1), { type: 'done' }, { type: 'reset' }])).toEqual(initialChatState());
  });
});
