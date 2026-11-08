// Validates the POST body of the chat against the wire contract (`./protocol`).

import { z } from 'astro/zod';
import { LOCALES } from '@/i18n/locales';
import { CHAT_LIMITS, type ChatErrorCode, type ChatRequest } from './protocol';

const turnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  // The API rejects empty text blocks, so a turn needs something besides whitespace.
  content: z
    .string()
    .max(CHAT_LIMITS.maxMessageChars)
    .refine((text) => text.trim().length > 0),
});

const requestSchema = z.object({
  locale: z.enum(LOCALES),
  messages: z
    .array(turnSchema)
    .min(1)
    .max(CHAT_LIMITS.maxMessages)
    .refine(
      (turns) =>
        turns.at(-1)?.role === 'user' &&
        turns.every((turn, i) => turn.role === (i % 2 === 0 ? 'user' : 'assistant')),
      // Starts and ends with the visitor, alternating; an assistant turn last would be a prefill.
      { message: 'roles must alternate, starting and ending with user' },
    ),
});

export type ValidateResult =
  | { ok: true; value: ChatRequest }
  | { ok: false; code: Extract<ChatErrorCode, 'bad_request' | 'too_large'> };

/** Parses and checks a JSON body. Going over a size limit is `too_large`; anything else, `bad_request`. */
export function validateChatBody(text: string): ValidateResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, code: 'bad_request' };
  }
  const parsed = requestSchema.safeParse(json);
  if (parsed.success) return { ok: true, value: parsed.data };
  const overLimit = parsed.error.issues.some((issue) => issue.code === 'too_big');
  return { ok: false, code: overLimit ? 'too_large' : 'bad_request' };
}
