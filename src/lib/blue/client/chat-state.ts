// State of the Blue conversation as a reducer: the panel dispatches what happened (a question, a
// fragment, the end, a failure, a stop) and renders the result. Network work lives in `stream.ts`.

import { CHAT_LIMITS } from '../protocol';
import { trimHistory, type BlueMessage, type ChatLimits } from './conversation';
import type { BlueError } from './errors';

export type ChatStatus = 'idle' | 'waiting' | 'streaming' | 'error';

export interface ChatState {
  messages: BlueMessage[];
  status: ChatStatus;
  error: BlueError | null;
  /** Id the answer in progress gets (its message appears with the first fragment). */
  replyId: string | null;
}

export type ChatAction =
  | { type: 'ask'; message: BlueMessage; replyId: string }
  | { type: 'retry'; replyId: string }
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'fail'; error: BlueError }
  | { type: 'stop' }
  | { type: 'reset' };

export function initialChatState(messages: BlueMessage[] = []): ChatState {
  return { messages, status: 'idle', error: null, replyId: null };
}

export function isBusy(state: ChatState): boolean {
  return state.status === 'waiting' || state.status === 'streaming';
}

/** Marks the answer in progress as cut short, if it got any text. */
function cutReply(state: ChatState): BlueMessage[] {
  return state.messages.map((m) =>
    m.id === state.replyId && m.role === 'assistant' ? { ...m, state: 'stopped' as const } : m,
  );
}

export function chatReducer(
  state: ChatState,
  action: ChatAction,
  limits: ChatLimits = CHAT_LIMITS,
): ChatState {
  switch (action.type) {
    case 'ask':
      if (isBusy(state)) return state;
      return {
        messages: trimHistory([...state.messages, action.message], limits),
        status: 'waiting',
        error: null,
        replyId: action.replyId,
      };
    case 'retry': {
      if (isBusy(state)) return state;
      const lastUser = state.messages.findLastIndex((m) => m.role === 'user');
      if (lastUser === -1) return state;
      return {
        messages: state.messages.slice(0, lastUser + 1),
        status: 'waiting',
        error: null,
        replyId: action.replyId,
      };
    }
    case 'delta': {
      if (!isBusy(state) || !state.replyId || !action.text) return state;
      const last = state.messages.at(-1);
      const messages =
        last?.id === state.replyId
          ? [...state.messages.slice(0, -1), { ...last, content: last.content + action.text }]
          : [
              ...state.messages,
              { id: state.replyId, role: 'assistant' as const, content: action.text },
            ];
      return { ...state, messages, status: 'streaming' };
    }
    case 'done':
      if (!isBusy(state)) return state;
      return { ...state, status: 'idle', replyId: null };
    case 'fail':
      if (!isBusy(state)) return state;
      return { messages: cutReply(state), status: 'error', error: action.error, replyId: null };
    case 'stop':
      if (!isBusy(state)) return state;
      return { messages: cutReply(state), status: 'idle', error: null, replyId: null };
    case 'reset':
      return initialChatState();
  }
}
