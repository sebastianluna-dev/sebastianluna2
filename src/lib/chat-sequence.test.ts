import { describe, expect, it } from 'vitest';
import { CHAT_ASIDE } from '@/components/motion/presets';
import type { ChatMessage } from '@/components/portfolio/case/types';
import {
  bubbleAnimation,
  chatRows,
  chatSchedule,
  dueEvents,
  extractEmoji,
  hashSeed,
  isEmojiOnly,
  pausableClock,
  rainEmoji,
  rainParticleCount,
  rainParticles,
  seededRandom,
  splitChatMeta,
  tapbackAnimation,
  tapbackTarget,
  tapbacksByTarget,
  typingDurationMs,
  type ChatEvent,
} from './chat-sequence';

const SPRING = CHAT_ASIDE.spring.easing;

describe('emoji helpers', () => {
  it('treats one to three emoji as a jumbo message', () => {
    expect(isEmojiOnly('🥷')).toBe(true);
    expect(isEmojiOnly('🔥🔥🔥')).toBe(true);
    expect(isEmojiOnly(' ♟️ 🏆 ')).toBe(true);
    expect(isEmojiOnly('👩‍💻')).toBe(true);
    expect(isEmojiOnly('🔥🔥🔥🔥')).toBe(false);
    expect(isEmojiOnly('Sin duplicar 🩺')).toBe(false);
    expect(isEmojiOnly('')).toBe(false);
  });

  it('keeps ZWJ sequences and variation selectors whole', () => {
    expect(extractEmoji('a ♟️b👩‍💻 c🔥')).toEqual(['♟️', '👩‍💻', '🔥']);
  });

  it('rains the `rain` emoji, or the text emoji with fx rain', () => {
    expect(rainEmoji({ text: 'ok', rain: '🎻🎶' })).toEqual(['🎻', '🎶']);
    expect(rainEmoji({ text: '😭🔥', fx: 'rain' })).toEqual(['😭', '🔥']);
    expect(rainEmoji({ text: '😭🔥', fx: 'slam' })).toEqual([]);
  });
});

describe('splitChatMeta', () => {
  it('splits the day from the time', () => {
    expect(splitChatMeta('Hoy 10:30')).toEqual({ day: 'Hoy', time: '10:30' });
    expect(splitChatMeta('Tue 9:05')).toEqual({ day: 'Tue', time: '9:05' });
    expect(splitChatMeta('Ayer')).toBeNull();
  });
});

describe('chatRows', () => {
  const messages: Pick<ChatMessage, 'from' | 'text'>[] = [
    { from: 'visitor', text: 'a' },
    { from: 'sebastian', text: 'b' },
    { from: 'sebastian', text: '🩺' },
    { from: 'visitor', text: 'c' },
  ];

  it('marks runs, their ends and jumbo emoji', () => {
    expect(chatRows(messages)).toEqual([
      { continues: false, groupStart: false, groupEnd: true, emojiOnly: false },
      { continues: false, groupStart: true, groupEnd: false, emojiOnly: false },
      { continues: true, groupStart: false, groupEnd: true, emojiOnly: true },
      { continues: false, groupStart: true, groupEnd: true, emojiOnly: false },
    ]);
  });
});

describe('tapbacks (CA-11)', () => {
  const messages: Pick<ChatMessage, 'from' | 'tapback'>[] = [
    { from: 'visitor' },
    { from: 'sebastian' },
    { from: 'sebastian', tapback: '❤️' },
    { from: 'visitor', tapback: '😂' },
    { from: 'visitor', tapback: '👍' },
  ];

  it('targets the closest earlier bubble of the other speaker', () => {
    expect(tapbackTarget(messages, 2)).toBe(0);
    expect(tapbackTarget(messages, 3)).toBe(2);
    expect(tapbackTarget(messages, 4)).toBe(2);
    expect(tapbackTarget(messages, 1)).toBe(-1);
  });

  it('falls back to the previous bubble and never targets the first message itself', () => {
    expect(tapbackTarget([{ from: 'visitor' }, { from: 'visitor', tapback: '❤️' }], 1)).toBe(0);
    expect(tapbackTarget([{ from: 'visitor', tapback: '❤️' }], 0)).toBe(-1);
  });

  it('shows the first tapback that lands on a bubble', () => {
    expect(tapbacksByTarget(messages)).toEqual(['❤️', undefined, '😂', undefined, undefined]);
  });
});

describe('typingDurationMs (CA-09)', () => {
  it('is clamp(400, base + 3 · length, 600)', () => {
    expect(typingDurationMs('', false)).toBe(400);
    expect(typingDurationMs('x'.repeat(10), false)).toBe(430);
    expect(typingDurationMs('x'.repeat(10), true)).toBe(400);
    expect(typingDurationMs('x'.repeat(30), true)).toBe(420);
    expect(typingDurationMs('x'.repeat(100), false)).toBe(600);
  });
});

describe('chatSchedule (CA-09…CA-12)', () => {
  const messages: ChatMessage[] = [
    { from: 'visitor', text: 'x'.repeat(20) },
    { from: 'sebastian', text: 'x'.repeat(10), tapback: '❤️' },
    { from: 'sebastian', text: '🔥🔥🔥', fx: 'slam', rain: '🔥' },
  ];

  it('chains the messages at D + 260 after the meta line', () => {
    const { events, endMs } = chatSchedule(messages, { meta: true });
    const at = (type: string, index: number) =>
      events.find((e) => e.type === type && e.index === index)?.atMs;
    // D0 = 400 + 60 = 460; D1 = 400 + 30 = 430; D2 = clamp(330 + 18) = 400.
    expect(at('meta', -1)).toBe(0);
    expect(at('typing', 0)).toBe(220);
    expect(at('reveal', 0)).toBe(680);
    expect(at('typingHide', 0)).toBe(820);
    expect(at('typing', 1)).toBe(940);
    expect(at('reveal', 1)).toBe(1370);
    expect(at('tapback', 1)).toBe(1750);
    expect(at('typing', 2)).toBe(1630);
    expect(at('reveal', 2)).toBe(2030);
    expect(at('rain', 2)).toBe(2290);
    expect(endMs).toBe(2030 + 260 - 120);
    expect(events.at(-1)?.type).toBe('rain');
    expect(events.find((e) => e.type === 'tapback')?.target).toBe(0);
  });

  it('starts at 0 without a meta line and keeps events sorted', () => {
    const { events } = chatSchedule(messages, { meta: false });
    expect(events[0]).toEqual({ atMs: 0, type: 'typing', index: 0 });
    const times = events.map((e) => e.atMs);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('rains 120 ms after a non-slam bubble', () => {
    const { events } = chatSchedule([{ from: 'visitor', text: '😭🔥', fx: 'rain' }], {
      meta: false,
    });
    expect(events.find((e) => e.type === 'rain')?.atMs).toBe(412 + 120); // 4 UTF-16 units: D = 412
  });
});

describe('bubble keyframes (CA-09, CA-10)', () => {
  it('springs from translateY(10) scale(.82) by default', () => {
    expect(bubbleAnimation(undefined, SPRING)).toEqual({
      keyframes: [{ transform: 'translateY(10px) scale(0.82)' }, { transform: 'none' }],
      durationMs: 640,
      easing: SPRING,
    });
    expect(bubbleAnimation('rain', SPRING).durationMs).toBe(640);
  });

  it('slams from 2.1 at −26 px in 620 ms', () => {
    const { keyframes, durationMs } = bubbleAnimation('slam', SPRING);
    expect(durationMs).toBe(620);
    expect(keyframes).toEqual([
      { transform: 'translateY(-26px) scale(2.1)', opacity: 0, offset: 0 },
      { transform: 'translateY(2px) scale(0.9)', opacity: 1, offset: 0.55 },
      { transform: 'translateY(0px) scale(1.03)', offset: 0.78 },
      { transform: 'none', opacity: 1 },
    ]);
  });

  it('shakes loud in 820 ms and grows gentle in 1300 ms', () => {
    const loud = bubbleAnimation('loud', SPRING);
    expect(loud.durationMs).toBe(820);
    expect(loud.keyframes[2]).toEqual({ transform: 'scale(1.38) rotate(-3deg)', offset: 0.5 });
    const gentle = bubbleAnimation('gentle', SPRING);
    expect(gentle.durationMs).toBe(1300);
    expect(gentle.easing).toBe('cubic-bezier(0.2, 0.8, 0.2, 1)');
    expect(gentle.keyframes[1]).toEqual({ transform: 'scale(1.06)', opacity: 1, offset: 0.7 });
  });

  it('pops the tapback through 1.35 at 60 %', () => {
    const { keyframes, durationMs } = tapbackAnimation();
    expect(durationMs).toBe(420);
    expect(keyframes[0]).toEqual({ transform: 'scale(0) rotate(-25deg)', opacity: 0 });
    expect(keyframes[1]?.offset).toBe(0.6);
  });
});

describe('emoji rain (CA-12)', () => {
  const box = { width: 560, height: 300, originX: 400, originY: 200 };

  it('uses one particle per 40 px, between 10 and 18', () => {
    expect(rainParticleCount(560)).toBe(14);
    expect(rainParticleCount(350)).toBe(10);
    expect(rainParticleCount(2000)).toBe(18);
  });

  it('is deterministic for a seed', () => {
    const seed = hashSeed('🔥🔥🔥|2');
    expect(rainParticles(['🔥'], box, seed)).toEqual(rainParticles(['🔥'], box, seed));
    expect(rainParticles(['🔥'], box, seed)).not.toEqual(rainParticles(['🔥'], box, seed + 1));
    const a = seededRandom(7);
    const b = seededRandom(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('bursts one in three from the bubble and keeps every value in range', () => {
    const particles = rainParticles(['🎻', '🎶'], box, 42);
    expect(particles).toHaveLength(14);
    particles.forEach((p, i) => {
      expect(p.source).toBe(i % 3 === 0);
      expect(p.glyph).toBe(i % 2 === 0 ? '🎻' : '🎶');
      const [minMs, maxMs] = p.source ? CHAT_ASIDE.rain.sourceMs : CHAT_ASIDE.rain.fallMs;
      const [minDelay, maxDelay] = p.source
        ? CHAT_ASIDE.rain.sourceDelayMs
        : CHAT_ASIDE.rain.fallDelayMs;
      expect(p.durationMs).toBeGreaterThanOrEqual(minMs);
      expect(p.durationMs).toBeLessThanOrEqual(maxMs);
      expect(p.delayMs).toBeGreaterThanOrEqual(minDelay);
      expect(p.delayMs).toBeLessThanOrEqual(maxDelay);
      const last = p.keyframes.at(-1)!;
      const rotate = Number(/rotate\((-?[\d.]+)deg\)/.exec(last.transform!)![1]);
      expect(Math.abs(rotate)).toBeLessThanOrEqual(70);
      expect(last.opacity).toBe(0);
    });
    expect(particles[0]!.keyframes[0]!.transform).toBe('translate(400px, 200px) scale(0.3)');
  });

  it('returns nothing without glyphs', () => {
    expect(rainParticles([], box, 1)).toEqual([]);
  });
});

describe('dueEvents', () => {
  const events = [
    { atMs: 0, type: 'meta', index: -1 },
    { atMs: 300, type: 'typing', index: 0 },
    { atMs: 300, type: 'rain', index: 0 },
    { atMs: 900, type: 'reveal', index: 0 },
    { atMs: 1200, type: 'end', index: -1 },
  ] satisfies ChatEvent[];

  it('fires every event due by now, those sharing an atMs together', () => {
    const due = dueEvents(events, 0, 300);
    expect(due.fired.map((event) => event.type)).toEqual(['meta', 'typing', 'rain']);
    expect(due).toMatchObject({ next: 3, waitMs: 600 });
  });

  it('resumes from where it stopped without firing anything twice', () => {
    expect(dueEvents(events, 3, 500)).toEqual({ fired: [], next: 3, waitMs: 400 });
    expect(dueEvents(events, 3, 950).fired.map((event) => event.type)).toEqual(['reveal']);
  });

  it('ends with nothing left to wait for', () => {
    expect(dueEvents(events, 4, 5000)).toMatchObject({ next: 5, waitMs: null });
    expect(dueEvents(events, 5, 6000)).toEqual({ fired: [], next: 5, waitMs: null });
  });
});

describe('pausableClock', () => {
  it('only counts running time, paused in the middle of a message', () => {
    let time = 1000;
    const clock = pausableClock(() => time);
    expect(clock.elapsed()).toBe(0);
    clock.resume();
    time += 250;
    expect(clock.elapsed()).toBe(250);
    clock.pause();
    time += 5000;
    expect(clock.running).toBe(false);
    expect(clock.elapsed()).toBe(250);
    clock.resume();
    time += 100;
    expect(clock.elapsed()).toBe(350);
  });

  it('ignores a second resume or pause', () => {
    let time = 0;
    const clock = pausableClock(() => time);
    clock.resume();
    time = 100;
    clock.resume();
    time = 200;
    clock.pause();
    clock.pause();
    expect(clock.elapsed()).toBe(200);
  });
});
