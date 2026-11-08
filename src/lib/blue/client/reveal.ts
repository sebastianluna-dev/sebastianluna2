// BL-07: Blue's answer is revealed in chunks of at most `maxChunkChars`, cut after whitespace: one
// every min(`maxStepMs`, `totalMs` / chunks waiting) once the answer is whole, one every
// `streamStepMs` while it streams. With a real stream the text keeps growing, so
// while it streams a chunk only ends on whitespace (no half words or half `**` on screen); once the
// answer is final the rest may end anywhere.

import { BLUE } from '@/components/motion/presets';

export type RevealConfig = typeof BLUE.reveal;

/** Where the next chunk ends, starting from `shown` characters of `target` (`shown` if none). */
export function nextRevealEnd(
  target: string,
  shown: number,
  final: boolean,
  config: RevealConfig = BLUE.reveal,
): number {
  if (shown >= target.length) return target.length;
  const rest = target.slice(shown);
  const max = config.maxChunkChars;
  if (final && rest.length <= max) return target.length;
  // The longest prefix of at most `max` characters followed by whitespace (which it takes along).
  const chunk = longestChunk(rest, max);
  if (chunk !== null) return shown + chunk;
  // No whitespace in reach: a very long word. Cut it only when nothing else can come.
  if (final || rest.length >= max) return shown + Math.min(max, rest.length);
  return shown;
}

/** Length of the longest prefix ≤ `max` that ends right before whitespace, plus that whitespace. */
function longestChunk(rest: string, max: number): number | null {
  let end = -1;
  const limit = Math.min(max, rest.length - 1);
  for (let i = limit; i >= 1; i--) {
    if (/\s/.test(rest[i]!)) {
      end = i;
      break;
    }
  }
  if (end === -1) return null;
  while (end < rest.length && /\s/.test(rest[end]!)) end++;
  return end;
}

/** How many chunks are ready to show. */
export function pendingChunks(
  target: string,
  shown: number,
  final: boolean,
  config: RevealConfig = BLUE.reveal,
): number {
  let count = 0;
  let at = shown;
  for (;;) {
    const next = nextRevealEnd(target, at, final, config);
    if (next <= at) return count;
    count++;
    at = next;
  }
}

/**
 * Delay before the next chunk. A whole answer takes about `totalMs`, never slower per chunk; a
 * streaming one keeps pace with the deltas (`streamStepMs`), so the text does not lag the stream.
 */
export function revealStepMs(
  pending: number,
  final: boolean,
  config: RevealConfig = BLUE.reveal,
): number {
  if (!final) return config.streamStepMs;
  return Math.min(config.maxStepMs, config.totalMs / Math.max(1, pending));
}
