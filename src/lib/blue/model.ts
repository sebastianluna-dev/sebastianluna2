// The seam between the chat handler and the model. The handler only needs a stream of events it
// can abort, so tests and the local demo mode pass their own `ChatModel`.

import Anthropic from '@anthropic-ai/sdk';
import type { MessageStreamParams } from '@anthropic-ai/sdk/resources/messages/messages';
import type { Locale } from '@/i18n/locales';
import { BLUE_SDK } from './config';

/** Token counts of a turn as the API reports them (`message_start` and `message_delta`). */
export interface ModelUsage {
  input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  output_tokens?: number | null;
}

/** The part of a Messages API stream event the handler reads. */
export interface ModelEvent {
  type: string;
  delta?: { type?: string; text?: string; stop_reason?: string | null };
  /** `message_start`. */
  message?: { usage?: ModelUsage };
  /** `message_delta`: cumulative counts. */
  usage?: ModelUsage;
}

export interface ModelStream extends AsyncIterable<ModelEvent> {
  abort(): void;
}

export interface ModelCall {
  params: MessageStreamParams;
  locale: Locale;
  /** Aborts the call: the visitor left, or the deadline passed. */
  signal: AbortSignal;
}

export interface ChatModel {
  stream(call: ModelCall): ModelStream;
}

/** Claude through the Anthropic SDK (`messages.stream`), cancelled with the call's signal. */
export function createAnthropicModel(apiKey: string): ChatModel {
  const client = new Anthropic({
    apiKey,
    timeout: BLUE_SDK.timeoutMs,
    maxRetries: BLUE_SDK.maxRetries,
  });
  return {
    stream: ({ params, signal }) => client.messages.stream(params, { signal }),
  };
}
