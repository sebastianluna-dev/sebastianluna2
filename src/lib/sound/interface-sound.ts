// Plays the interface sounds of `recipes.ts` with Web Audio. One AudioContext per document, created
// on the first sound: every sound answers a gesture (open, close, send, theme) or follows one (Blue's
// answer after the question), so browsers allow it. Nothing plays in a hidden tab, and a browser
// without Web Audio stays silent.

import { SOUNDS, SOUND_ATTACK, type SoundName, type SoundPart } from './recipes';

type AudioContextClass = typeof AudioContext;

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (context) return context;
  const Context: AudioContextClass | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextClass }).webkitAudioContext;
  if (!Context) return null;
  context = new Context();
  return context;
}

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noise) return noise;
  noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.1), ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return noise;
}

function envelope(ctx: AudioContext, start: number, part: SoundPart): GainNode {
  const gain = ctx.createGain();
  // Silent from creation: a gain starts at 1 until its first event, and a source that starts on
  // that same sample would click at full scale.
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(part.gain, start + SOUND_ATTACK);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + part.duration);
  gain.connect(ctx.destination);
  return gain;
}

function schedule(ctx: AudioContext, origin: number, part: SoundPart): void {
  const start = origin + part.at;
  const end = start + part.duration;
  const gain = envelope(ctx, start, part);
  if (part.kind === 'tone') {
    const oscillator = ctx.createOscillator();
    oscillator.type = part.wave;
    oscillator.frequency.setValueAtTime(part.from, start);
    oscillator.frequency.exponentialRampToValueAtTime(part.to, start + part.glide);
    oscillator.connect(gain);
    oscillator.start(start);
    oscillator.stop(end + 0.01);
    return;
  }
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = part.filter;
  filter.frequency.value = part.frequency;
  filter.Q.value = part.q;
  source.connect(filter);
  filter.connect(gain);
  source.start(start);
  source.stop(end + 0.01);
}

/** Plays one interface sound now (a random variant when it has several). */
export function playInterfaceSound(name: SoundName): void {
  if (typeof window === 'undefined' || document.hidden) return;
  try {
    const ctx = audio();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const variants = SOUNDS[name];
    const parts = variants[Math.floor(Math.random() * variants.length)] ?? [];
    const origin = ctx.currentTime + 0.005;
    for (const part of parts) schedule(ctx, origin, part);
  } catch {
    // Sound is decoration: a failure stays silent.
  }
}
