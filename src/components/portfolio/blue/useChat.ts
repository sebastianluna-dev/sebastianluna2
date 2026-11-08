/**
 * The Blue conversation for the panel: the reducer of `@/lib/blue/client/chat-state`, one request at
 * a time to the chat endpoint (SSE, `streamChat`), and the history in `sessionStorage`, so it
 * survives navigations and reloads within the tab. `stop()` aborts the answer in progress; the
 * panel calls it when it closes, and unmounting aborts too.
 */
import { useEffect, useReducer, useRef } from 'react';
import type { Locale } from '@/i18n/locales';
import {
  chatReducer,
  initialChatState,
  isBusy,
  type ChatAction,
  type ChatState,
} from '@/lib/blue/client/chat-state';
import {
  buildChatRequest,
  HISTORY_STORAGE_KEY,
  parseHistory,
  trimHistory,
  type BlueMessage,
} from '@/lib/blue/client/conversation';
import { streamChat } from '@/lib/blue/client/stream';

/** `useReducer` passes only (state, action); the limits stay the contract's. */
const reduce = (state: ChatState, action: ChatAction) => chatReducer(state, action);

let sequence = 0;
const newId = () => `${Date.now().toString(36)}-${(sequence++).toString(36)}`;

function readHistory(): BlueMessage[] {
  try {
    return parseHistory(sessionStorage.getItem(HISTORY_STORAGE_KEY));
  } catch {
    return [];
  }
}

function writeHistory(messages: BlueMessage[]): void {
  try {
    if (messages.length === 0) sessionStorage.removeItem(HISTORY_STORAGE_KEY);
    else sessionStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Private mode or a full quota: the conversation just does not outlive the page.
  }
}

export interface Chat {
  state: ChatState;
  busy: boolean;
  /** Asks a question; ignored while an answer is in progress or for blank text. */
  send(text: string): void;
  /** Asks the last question again after a failure. */
  retry(): void;
  /** Stops the answer in progress, keeping what arrived. */
  stop(): void;
  /** Starts over with an empty conversation. */
  reset(): void;
}

export function useChat(locale: Locale): Chat {
  const [state, dispatch] = useReducer(reduce, undefined, () => initialChatState(readHistory()));
  const controller = useRef<AbortController | null>(null);
  const busy = isBusy(state);

  // Saved once an exchange settles: a reload mid-answer just loses that answer.
  useEffect(() => {
    if (!busy) writeHistory(state.messages);
  }, [busy, state.messages]);

  useEffect(() => () => controller.current?.abort(), []);

  async function run(history: BlueMessage[]): Promise<void> {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    const request = buildChatRequest(locale, history);
    if (!request) {
      dispatch({ type: 'fail', error: { kind: 'upstream' } });
      return;
    }
    const outcome = await streamChat(request, {
      signal: current.signal,
      onDelta: (text) => {
        if (controller.current === current) dispatch({ type: 'delta', text });
      },
      isOnline: () => navigator.onLine,
    });
    if (controller.current !== current) return;
    controller.current = null;
    if (outcome.type === 'done') dispatch({ type: 'done' });
    else if (outcome.type === 'error') dispatch({ type: 'fail', error: outcome.error });
    else dispatch({ type: 'stop' });
  }

  return {
    state,
    busy,
    send(text) {
      const content = text.trim();
      if (busy || !content) return;
      const message: BlueMessage = { id: newId(), role: 'user', content };
      dispatch({ type: 'ask', message, replyId: newId() });
      void run(trimHistory([...state.messages, message]));
    },
    retry() {
      if (busy) return;
      const lastUser = state.messages.findLastIndex((m) => m.role === 'user');
      if (lastUser === -1) return;
      dispatch({ type: 'retry', replyId: newId() });
      void run(state.messages.slice(0, lastUser + 1));
    },
    stop() {
      if (!controller.current) return;
      controller.current.abort();
      controller.current = null;
      dispatch({ type: 'stop' });
    },
    reset() {
      controller.current?.abort();
      controller.current = null;
      dispatch({ type: 'reset' });
    },
  };
}
