// Local demo mode: `astro dev` without `ANTHROPIC_API_KEY`. It streams a fixed text that says it
// is a demo, through the same events as the model, so the panel can be built and tested
// without a key. `src/pages/api/chat.ts` never uses it outside development.

import { getMessages } from '@/i18n/t';
import { BLUE_DEMO_CHUNK_DELAY_MS } from './config';
import type { ChatModel, ModelEvent } from './model';

/** Words with their trailing whitespace, so joining the pieces gives the text back. */
export function demoChunks(text: string): string[] {
  return text.match(/\s*\S+\s*/g) ?? [];
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export function createDemoModel(delayMs: number = BLUE_DEMO_CHUNK_DELAY_MS): ChatModel {
  return {
    stream({ locale, signal }) {
      const local = new AbortController();
      const stop = AbortSignal.any([signal, local.signal]);
      async function* events(): AsyncGenerator<ModelEvent> {
        yield { type: 'message_start' };
        for (const text of demoChunks(getMessages(locale).blue.server.demo)) {
          await wait(delayMs, stop);
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text } };
        }
        yield { type: 'message_delta', delta: { stop_reason: 'end_turn' } };
        yield { type: 'message_stop' };
      }
      const iterable = events();
      return {
        [Symbol.asyncIterator]: () => iterable,
        abort: () => local.abort(),
      };
    },
  };
}
