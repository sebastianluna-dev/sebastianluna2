/**
 * Pure logic of the chat aside (CA-09…CA-12, case.md §3.4 and §5.1): runs of messages, emoji-only
 * bubbles, the tapback target, the calendar of the "typing… → bubble" sequence, the keyframes of the
 * bubble effects and a seeded emoji rain. `chat-aside.client.ts` only plays what these functions return.
 *
 * Timings and the rain geometry come from `CHAT_ASIDE` (presets.ts).
 *
 * Pure module: no DOM, safe to import from build code, tests and the client.
 */
import { CHAT_ASIDE } from '@/components/motion/presets';
import type { ChatEffect, ChatMessage } from '@/components/portfolio/case/types';

export type ChatTimings = typeof CHAT_ASIDE;

/** One extended pictograph with its variation selector, skin tone or ZWJ sequence. */
const EMOJI_PATTERN =
  /\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier}|‍\p{Extended_Pictographic}️?)*/gu;
/** 1 to 3 emoji and nothing else: drawn large and without a bubble (case.md §3.4). */
const EMOJI_ONLY_PATTERN =
  /^(?:\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier}|‍\p{Extended_Pictographic}️?)*\s*){1,3}$/u;

/** True when `text` is one to three emoji (with optional spaces) and nothing else. */
export function isEmojiOnly(text: string): boolean {
  return EMOJI_ONLY_PATTERN.test(text.trim());
}

/** The emoji of `text`, in order (ZWJ sequences and modifiers kept whole). */
export function extractEmoji(text: string): string[] {
  return Array.from(text.matchAll(EMOJI_PATTERN), (match) => match[0]);
}

/** Meta line split as "<b>day</b> time" ("Hoy 10:30" → Hoy / 10:30); `null` when there is no time. */
export function splitChatMeta(meta: string): { day: string; time: string } | null {
  const match = /^(.+?)\s(\d{1,2}:\d{2})$/.exec(meta.trim());
  return match ? { day: match[1]!, time: match[2]! } : null;
}

export interface ChatRowLayout {
  /** Same author as the previous message (the avatar slides instead of popping in). */
  continues: boolean;
  /** First message of a run after another author: 10 px above instead of 2. */
  groupStart: boolean;
  /** Last message of its run: carries the avatar and the tail. */
  groupEnd: boolean;
  emojiOnly: boolean;
}

/** Layout flags of every message (runs of the same author). */
export function chatRows(messages: readonly Pick<ChatMessage, 'from' | 'text'>[]): ChatRowLayout[] {
  return messages.map((message, index) => {
    const previous = messages[index - 1];
    const next = messages[index + 1];
    const continues = previous?.from === message.from;
    return {
      continues,
      groupStart: index > 0 && !continues,
      groupEnd: next?.from !== message.from,
      emojiOnly: isEmojiOnly(message.text),
    };
  });
}

/**
 * Index of the bubble that receives the tapback of `messages[index]` (CA-11): the closest earlier
 * message of the other speaker, or the previous one when there is none. -1 without a tapback.
 */
export function tapbackTarget(
  messages: readonly Pick<ChatMessage, 'from' | 'tapback'>[],
  index: number,
): number {
  const message = messages[index];
  if (!message?.tapback || index === 0) return -1;
  for (let i = index - 1; i >= 0; i--) {
    if (messages[i]!.from !== message.from) return i;
  }
  return index - 1;
}

/** Tapback emoji shown on each bubble (the first one that targets it), `undefined` when none. */
export function tapbacksByTarget(
  messages: readonly Pick<ChatMessage, 'from' | 'tapback'>[],
): (string | undefined)[] {
  const result: (string | undefined)[] = messages.map(() => undefined);
  messages.forEach((message, index) => {
    const target = tapbackTarget(messages, index);
    if (target >= 0 && result[target] === undefined) result[target] = message.tapback;
  });
  return result;
}

/** Emoji of the rain of a message (CA-12): `rain`, or the emoji of the text with `fx: 'rain'`. */
export function rainEmoji(message: Pick<ChatMessage, 'text' | 'fx' | 'rain'>): string[] {
  if (message.rain) return extractEmoji(message.rain);
  return message.fx === 'rain' ? extractEmoji(message.text) : [];
}

/** Typing time D = clamp(400, (330 for a repeat author, else 400) + 3 · length, 600) ms (CA-09). */
export function typingDurationMs(
  text: string,
  sameAuthor: boolean,
  timings: ChatTimings = CHAT_ASIDE,
): number {
  const { minMs, maxMs, baseMs, sameAuthorBaseMs, perCharMs } = timings.typing;
  const raw = (sameAuthor ? sameAuthorBaseMs : baseMs) + text.length * perCharMs;
  return Math.round(Math.min(maxMs, Math.max(minMs, raw)));
}

export type ChatEventType =
  /** Fade in the meta line. */
  | 'meta'
  /** Avatar on (pop or slide), author label, typing bubble in. */
  | 'typing'
  /** Typing bubble out; bubble in (spring or effect); text fade. */
  | 'reveal'
  /** Typing bubble removed from the layout. */
  | 'typingHide'
  | 'rain'
  /** Tapback pops on `target`. */
  | 'tapback'
  /** Status fade; the aside leaves its waiting state. */
  | 'end';

export interface ChatEvent {
  atMs: number;
  type: ChatEventType;
  /** Message index (-1 for `meta` and `end`). */
  index: number;
  /** Bubble of the tapback (only for `tapback`). */
  target?: number;
}

/** What the sequence fires at `timeMs` from event `from` on, and how long until the next one. */
export interface DueEvents {
  fired: ChatEvent[];
  /** Index of the first event still pending (`events.length` when all fired). */
  next: number;
  /** Ms until that event, `null` when none is left. */
  waitMs: number | null;
}

/** CA-09…CA-13: the events of a schedule (sorted by `atMs`) due by `timeMs`, starting at `from`. */
export function dueEvents(events: readonly ChatEvent[], from: number, timeMs: number): DueEvents {
  let next = from;
  const fired: ChatEvent[] = [];
  while (next < events.length && events[next]!.atMs <= timeMs) fired.push(events[next++]!);
  return { fired, next, waitMs: next < events.length ? events[next]!.atMs - timeMs : null };
}

/** A clock that only advances while running (the chat pauses out of view and resumes where it was). */
export interface PausableClock {
  readonly running: boolean;
  /** Ms run so far, paused stretches excluded. */
  elapsed(): number;
  resume(): void;
  pause(): void;
}

export function pausableClock(now: () => number): PausableClock {
  let banked = 0;
  let resumedAt = 0;
  let running = false;
  return {
    get running() {
      return running;
    },
    elapsed: () => (running ? banked + (now() - resumedAt) : banked),
    resume() {
      if (running) return;
      running = true;
      resumedAt = now();
    },
    pause() {
      if (!running) return;
      banked += now() - resumedAt;
      running = false;
    },
  };
}

export interface ChatSchedule {
  /** Events sorted by time (stable for equal times). */
  events: ChatEvent[];
  /** When the aside leaves its waiting state. */
  endMs: number;
}

/**
 * Calendar of the whole sequence, in ms from the trigger (CA-09…CA-12, case.md §5.1):
 * - meta fades at 0; the first message starts 220 ms later (at 0 without meta);
 * - message n: typing at s, reveal at s + D, typing removed 140 ms after the reveal, rain 120 ms after
 *   it (260 with slam), tapback 380 ms after it; the next message starts at s + D + 260;
 * - end (status, waiting state off) 120 ms before the slot after the last message.
 */
export function chatSchedule(
  messages: readonly ChatMessage[],
  options: { meta: boolean },
  timings: ChatTimings = CHAT_ASIDE,
): ChatSchedule {
  const events: ChatEvent[] = [];
  if (options.meta) events.push({ atMs: 0, type: 'meta', index: -1 });
  let start = options.meta ? timings.startAfterMetaMs : 0;
  messages.forEach((message, index) => {
    const sameAuthor = index > 0 && messages[index - 1]!.from === message.from;
    const typing = typingDurationMs(message.text, sameAuthor, timings);
    const reveal = start + typing;
    events.push({ atMs: start, type: 'typing', index });
    events.push({ atMs: reveal, type: 'reveal', index });
    events.push({ atMs: reveal + timings.typing.outMs, type: 'typingHide', index });
    if (rainEmoji(message).length) {
      const delay = message.fx === 'slam' ? timings.rain.startMs.slam : timings.rain.startMs.other;
      events.push({ atMs: reveal + delay, type: 'rain', index });
    }
    const target = tapbackTarget(messages, index);
    if (target >= 0) {
      events.push({ atMs: reveal + timings.tapback.delayMs, type: 'tapback', index, target });
    }
    start = reveal + timings.nextGapMs;
  });
  const endMs = Math.max(0, start - timings.status.leadMs);
  events.push({ atMs: endMs, type: 'end', index: -1 });
  const sorted = events
    .map((event, order) => ({ event, order }))
    .sort((a, b) => a.event.atMs - b.event.atMs || a.order - b.order)
    .map(({ event }) => event);
  return { events: sorted, endMs };
}

export interface ChatKeyframe {
  transform?: string;
  opacity?: number;
  offset?: number;
}

export interface ChatAnimation {
  keyframes: ChatKeyframe[];
  durationMs: number;
  easing: string;
}

type BubbleEffect = Exclude<ChatEffect, 'rain'>;

const isBubbleEffect = (fx: ChatEffect | undefined): fx is BubbleEffect =>
  fx === 'slam' || fx === 'loud' || fx === 'gentle';

function effectTransform(frame: { y?: number; scale: number; rotate?: number }): string {
  const parts: string[] = [];
  if (frame.y !== undefined) parts.push(`translateY(${frame.y}px)`);
  parts.push(`scale(${frame.scale})`);
  if (frame.rotate !== undefined) parts.push(`rotate(${frame.rotate}deg)`);
  return parts.join(' ');
}

/**
 * Entrance of a bubble (CA-09, CA-10): the effect's multi-step keyframes (opacity 0 → 1 at the second
 * frame, ending at `none`), or the default spring from translateY(10) scale(.82).
 */
export function bubbleAnimation(
  fx: ChatEffect | undefined,
  springEasing: string,
  timings: ChatTimings = CHAT_ASIDE,
): ChatAnimation {
  if (isBubbleEffect(fx)) {
    const effect = timings.fx[fx];
    const keyframes: ChatKeyframe[] = effect.frames.map((frame, i) => ({
      transform: effectTransform(frame),
      ...(i === 0 ? { opacity: 0 } : i === 1 ? { opacity: 1 } : {}),
      offset: frame.offset,
    }));
    keyframes.push({ transform: 'none', opacity: 1 });
    return { keyframes, durationMs: effect.durationMs, easing: effect.easing };
  }
  const { from, durationMs } = timings.bubble;
  return {
    keyframes: [
      { transform: `translateY(${from.y}px) scale(${from.scale})` },
      { transform: 'none' },
    ],
    durationMs,
    easing: springEasing,
  };
}

/** Tapback pop (CA-11): scale 0 rotate(−25°) → 1.35 rotate(8°) at 60 % → none. */
export function tapbackAnimation(timings: ChatTimings = CHAT_ASIDE): ChatAnimation {
  const { from, peak, durationMs, easing } = timings.tapback;
  return {
    keyframes: [
      { transform: `scale(${from.scale}) rotate(${from.rotate}deg)`, opacity: 0 },
      {
        transform: `scale(${peak.scale}) rotate(${peak.rotate}deg)`,
        opacity: 1,
        offset: peak.offset,
      },
      { transform: 'none', opacity: 1 },
    ],
    durationMs,
    easing,
  };
}

/** Geometry of the emoji rain (CA-12), from `CHAT_ASIDE.rain.geometry`. */
export const RAIN_GEOMETRY = CHAT_ASIDE.rain.geometry;

/**
 * Avatar of Sebastian in the chat: `--pf-chat-avatar`, 28 px (24 on phones). At that size the whole
 * head leaves ~10 px of face, so the photo is drawn `zoom` times larger inside the circle
 * (`--pf-chat-photo-zoom`) and asked at 1x/2x/3x of that drawn size (`avatarWidths`), never blurrier.
 * `tokens.test.ts` keeps it in sync with the CSS.
 */
export const CHAT_AVATAR = { px: 28, phonePx: 24, phoneMax: 809.98, zoom: 1.3 } as const;

/** CSS px the photo is drawn at inside the avatar, on desktop/tablet and on phones. */
export const CHAT_PHOTO_PX = {
  px: Math.ceil(CHAT_AVATAR.px * CHAT_AVATAR.zoom),
  phonePx: Math.ceil(CHAT_AVATAR.phonePx * CHAT_AVATAR.zoom),
} as const;

/** `sizes` of the chat photo (its drawn size, zoom included). */
export const CHAT_AVATAR_SIZES = `(max-width: ${CHAT_AVATAR.phoneMax}px) ${CHAT_PHOTO_PX.phonePx}px, ${CHAT_PHOTO_PX.px}px`;

/** Particles of a rain over an aside `width` px wide: clamp(10, round(width / 40), 18). */
export function rainParticleCount(width: number, timings: ChatTimings = CHAT_ASIDE): number {
  const [min, max] = timings.rain.particles;
  return Math.min(max, Math.max(min, Math.round(width / RAIN_GEOMETRY.pxPerParticle)));
}

/** FNV-1a hash of a string: the seed of a message's rain, so it is the same on every run. */
export function hashSeed(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Mulberry32: a small seeded generator in [0, 1). */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RainParticle {
  glyph: string;
  /** One in three bursts from the bubble; the rest fall from above the aside. */
  source: boolean;
  keyframes: ChatKeyframe[];
  durationMs: number;
  delayMs: number;
  easing: string;
}

export interface RainBox {
  /** Aside size in px. */
  width: number;
  height: number;
  /** Centre x and top y of the bubble, relative to the aside. */
  originX: number;
  originY: number;
}

const between = (random: () => number, [min, max]: readonly [number, number]) =>
  min + random() * (max - min);
const round1 = (value: number) => Math.round(value * 10) / 10;

/** The particles of one rain (CA-12), deterministic for a given `seed`. */
export function rainParticles(
  glyphs: readonly string[],
  box: RainBox,
  seed: number,
  timings: ChatTimings = CHAT_ASIDE,
): RainParticle[] {
  if (!glyphs.length) return [];
  const random = seededRandom(seed);
  const g = RAIN_GEOMETRY;
  const { rain } = timings;
  const count = rainParticleCount(box.width, timings);
  const sourceEvery = Math.round(1 / rain.sourceShare);
  const fallBottom = box.height + g.fallBelow;
  return Array.from({ length: count }, (_, i): RainParticle => {
    const source = i % sourceEvery === 0;
    const rotate = round1((random() - 0.5) * 2 * rain.rotateDeg);
    const scale = round1(between(random, rain.scale) * 100) / 100;
    const glyph = glyphs[i % glyphs.length]!;
    if (source) {
      const x = box.originX;
      const y = box.originY;
      const endX = round1(x + (random() - 0.5) * box.width * g.sourceSpread);
      const top = round1(y - between(random, g.sourceRise));
      return {
        glyph,
        source,
        keyframes: [
          {
            transform: `translate(${round1(x)}px, ${round1(y)}px) scale(${g.sourceStartScale})`,
            opacity: 0,
          },
          {
            transform: `translate(${round1((x + endX) / 2)}px, ${round1(top - g.sourcePeakLift)}px) scale(${scale})`,
            opacity: 1,
            offset: g.sourcePeakOffset,
          },
          {
            transform: `translate(${endX}px, ${round1(top + g.sourceDrop)}px) rotate(${rotate}deg) scale(${scale})`,
            opacity: 0,
          },
        ],
        durationMs: Math.round(between(random, rain.sourceMs)),
        delayMs: Math.round(between(random, rain.sourceDelayMs)),
        easing: rain.sourceEasing,
      };
    }
    const x = round1(random() * Math.max(0, box.width - g.glyphPx));
    const y = round1(-between(random, g.fallStart));
    const endX = round1(x + (random() - 0.5) * g.fallDrift);
    return {
      glyph,
      source,
      keyframes: [
        { transform: `translate(${x}px, ${y}px) rotate(0deg) scale(${scale})`, opacity: 0 },
        { opacity: 1, offset: g.fallOpaque[0] },
        { opacity: 1, offset: g.fallOpaque[1] },
        {
          transform: `translate(${endX}px, ${round1(fallBottom)}px) rotate(${rotate}deg) scale(${scale})`,
          opacity: 0,
        },
      ],
      durationMs: Math.round(between(random, rain.fallMs)),
      delayMs: Math.round(between(random, rain.fallDelayMs)),
      easing: rain.fallEasing,
    };
  });
}
