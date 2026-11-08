// The conversation as the panel keeps it, and how it becomes a valid request of the contract:
// the server only takes turns that start and end with the visitor and alternate, each under
// `maxMessageChars`, at most `maxMessages` of them, in a body under `maxBodyBytes`.

import type { Locale } from '@/i18n/locales';
import { CHAT_LIMITS, type ChatRequest, type ChatRole, type ChatTurn } from '../protocol';

export type ChatLimits = typeof CHAT_LIMITS;

export interface BlueMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** `stopped`: the visitor stopped the answer (or it broke) part way. */
  state?: 'stopped';
}

/** `sessionStorage` key of the history: it survives navigations and reloads within the tab. */
export const HISTORY_STORAGE_KEY = 'pf-blue-history';

/** Ellipsis appended to an answer cut to fit `maxMessageChars`. */
const CUT_MARK = '…';

function isMessage(value: unknown): value is BlueMessage {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    (m.role === 'user' || m.role === 'assistant') &&
    typeof m.content === 'string' &&
    (m.state === undefined || m.state === 'stopped')
  );
}

/** Reads a stored history; anything unexpected gives an empty conversation. */
export function parseHistory(raw: string | null | undefined, limits: ChatLimits = CHAT_LIMITS) {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || !value.every(isMessage)) return [];
    return trimHistory(value, limits);
  } catch {
    return [];
  }
}

/** Keeps the last `maxMessages` messages, starting on a visitor's turn. */
export function trimHistory(messages: BlueMessage[], limits: ChatLimits = CHAT_LIMITS) {
  const kept = messages.slice(-limits.maxMessages);
  const firstUser = kept.findIndex((m) => m.role === 'user');
  return firstUser === -1 ? [] : kept.slice(firstUser);
}

/**
 * Cuts a text to `max` UTF-16 units, the unit the server's limit (and `maxlength`) counts, without
 * splitting a surrogate pair, and marks the cut.
 */
export function clampText(text: string, max: number): string {
  if (text.length <= max) return text;
  let end = max - CUT_MARK.length;
  const code = text.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end -= 1;
  return text.slice(0, end).trimEnd() + CUT_MARK;
}

/** Length as the server counts it (UTF-16 units), shown by the textarea counter. */
export function charCount(text: string): number {
  return text.length;
}

/**
 * Turns the panel's history into contract turns: drops empty turns, keeps only the last of two
 * visitor turns in a row (the first one never got an answer), drops answers with no question,
 * clamps each text and keeps the last `maxMessages`, starting with the visitor.
 */
export function toRequestTurns(messages: BlueMessage[], limits: ChatLimits = CHAT_LIMITS) {
  const turns: ChatTurn[] = [];
  for (const message of messages) {
    const content = message.content.trim();
    if (!content) continue;
    const turn: ChatTurn = {
      role: message.role,
      content: clampText(content, limits.maxMessageChars),
    };
    const last = turns.at(-1);
    if (turn.role === 'user') {
      if (last?.role === 'user') turns[turns.length - 1] = turn;
      else turns.push(turn);
    } else if (last?.role === 'user') {
      turns.push(turn);
    }
  }
  if (turns.at(-1)?.role === 'assistant') turns.pop();
  let kept = turns.slice(-limits.maxMessages);
  if (kept[0]?.role === 'assistant') kept = kept.slice(1);
  return kept;
}

/** UTF-8 size of the JSON body. */
export function bodyBytes(request: ChatRequest): number {
  return new TextEncoder().encode(JSON.stringify(request)).length;
}

/**
 * The request for a history that ends with the visitor's new question, or `null` when there is
 * nothing to ask. Older exchanges are dropped two by two until the body fits `maxBodyBytes`.
 */
export function buildChatRequest(
  locale: Locale,
  messages: BlueMessage[],
  limits: ChatLimits = CHAT_LIMITS,
): ChatRequest | null {
  let turns = toRequestTurns(messages, limits);
  if (turns.length === 0) return null;
  while (turns.length > 1 && bodyBytes({ locale, messages: turns }) > limits.maxBodyBytes) {
    turns = turns.slice(2);
  }
  return { locale, messages: turns };
}
