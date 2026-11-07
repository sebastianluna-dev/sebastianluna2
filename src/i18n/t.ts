import type { Locale } from './locales';
import { en } from './messages/en';
import { es, type Messages } from './messages/es';

const CATALOGUES: Record<Locale, Messages> = { es, en };

/** The whole catalogue of a language, for components that read nested copy directly. */
export function getMessages(locale: Locale): Messages {
  return CATALOGUES[locale];
}

/** Dotted paths to every string leaf of the catalogue (`'hero.menu.copy'`). Arrays are read whole. */
type StringPaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends readonly unknown[]
      ? never
      : T[K] extends object
        ? StringPaths<T[K], `${Prefix}${K}.`>
        : never;
}[keyof T & string];

export type MessageKey = StringPaths<Messages>;

export type FormatValues = Record<string, string | number>;

/** Replaces `{name}` placeholders; unknown placeholders stay as they are. */
export function format(template: string, values: FormatValues = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : match,
  );
}

/** Looks a dotted key up in a catalogue; throws on a key that is not a string leaf. */
export function lookup(messages: Messages, key: MessageKey): string {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    node =
      typeof node === 'object' && node !== null
        ? (node as Record<string, unknown>)[part]
        : undefined;
  }
  if (typeof node !== 'string') {
    throw new Error(`Missing message: ${key}`);
  }
  return node;
}

/** `t('nav.home')` for one language, with optional placeholder values. */
export function createT(locale: Locale): (key: MessageKey, values?: FormatValues) => string {
  const messages = getMessages(locale);
  return (key, values) => format(lookup(messages, key), values);
}
