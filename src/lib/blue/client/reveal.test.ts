import { describe, expect, it } from 'vitest';
import { BLUE } from '@/components/motion/presets';
import { nextRevealEnd, pendingChunks, revealStepMs } from './reveal';

const MAX = BLUE.reveal.maxChunkChars;
const words = (count: number) => Array.from({ length: count }, (_, i) => `palabra${i}`).join(' ');

function chunksOf(target: string, final: boolean): string[] {
  const out: string[] = [];
  let at = 0;
  for (;;) {
    const next = nextRevealEnd(target, at, final);
    if (next <= at) return out;
    out.push(target.slice(at, next));
    at = next;
  }
}

describe('nextRevealEnd', () => {
  it('shows a short final answer in one chunk', () => {
    expect(nextRevealEnd('Hola.', 0, true)).toBe(5);
  });

  it('cuts a long answer into chunks of at most maxChunkChars, after whitespace', () => {
    const text = words(120);
    const chunks = chunksOf(text, true);
    expect(chunks.join('')).toBe(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks.slice(0, -1)) {
      expect(chunk.trimEnd().length).toBeLessThanOrEqual(MAX);
      expect(chunk).toMatch(/\s$/);
    }
  });

  it('never ends a chunk inside a word while the answer still streams', () => {
    const streaming = 'Sebastian trabaja con **React** y Type';
    const chunks = chunksOf(streaming, false);
    expect(chunks.join('')).toBe('Sebastian trabaja con **React** y ');
  });

  it('waits for more text when nothing ends on whitespace yet', () => {
    expect(nextRevealEnd('Hola', 0, false)).toBe(0);
    expect(nextRevealEnd('Hola mundo', 5, false)).toBe(5);
  });

  it('cuts a word longer than a chunk instead of stalling', () => {
    const long = 'x'.repeat(MAX + 30);
    expect(nextRevealEnd(long, 0, false)).toBe(MAX);
    expect(nextRevealEnd(long, MAX, true)).toBe(long.length);
  });

  it('never goes backwards', () => {
    expect(nextRevealEnd('abc', 3, false)).toBe(3);
    expect(nextRevealEnd('abc', 9, true)).toBe(3);
  });
});

describe('pace', () => {
  it('counts the chunks ready to show', () => {
    expect(pendingChunks(words(120), 0, true)).toBe(chunksOf(words(120), true).length);
    expect(pendingChunks('Hola', 0, false)).toBe(0);
  });

  it('spreads the answer over about totalMs, never slower than maxStepMs per chunk', () => {
    expect(revealStepMs(1, true)).toBe(BLUE.reveal.maxStepMs);
    expect(revealStepMs(7, true)).toBe(BLUE.reveal.totalMs / 7);
    expect(revealStepMs(0, true)).toBe(BLUE.reveal.maxStepMs);
  });

  it('keeps pace with a stream instead of spreading 700 ms over one chunk', () => {
    expect(revealStepMs(1, false)).toBe(BLUE.reveal.streamStepMs);
    expect(revealStepMs(5, false)).toBe(BLUE.reveal.streamStepMs);
    expect(BLUE.reveal.streamStepMs).toBeLessThan(BLUE.reveal.maxStepMs);
  });
});
