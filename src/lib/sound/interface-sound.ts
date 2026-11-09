// Plays the interface sounds with Web Audio: the recipes of `recipes.ts` and the recordings of
// `samples.ts`. One AudioContext per document, created on the first sound: every sound answers a gesture (open, close, send, theme, a book under the
// mouse or the keyboard focus) or follows one (Blue's answer after the question). Before the page
// has had any user activation nothing plays, so a hover on load cannot queue sounds in a suspended
// context that would all sound on the first click. Nothing plays in a hidden tab, and a browser
// without Web Audio stays silent.
//
// Each play goes through its own gain node (unity for a recipe, so the parts sound exactly as
// designed; the sample's gain for a recording). Sounds of one channel (`SOUND_CHANNEL`) cut each
// other: a new one fades the previous one out in `CHANNEL_CUT` and stops its sources.
//
// A recording is fetched and decoded once (`preloadInterfaceSound`, or on its first play) with an
// OfflineAudioContext, which needs no user activation, so preloading never creates the live context
// early. A play that has to wait for the file still plays when it arrives, unless it comes late or a
// newer sound of its channel was asked for meanwhile (`playsWhenLoaded`).

import {
  CHANNEL_CUT,
  NOISE_LENGTH,
  SOUNDS,
  SOUND_ATTACK,
  SOUND_CHANNEL,
  type RecipeName,
  type SoundChannel,
  type SoundName,
  type SoundPart,
} from './recipes';
import { SAMPLES, SAMPLE_RATE, isSample, playsWhenLoaded, type SampleName } from './samples';

type AudioContextClass = typeof AudioContext;

/** One playing sound: its bus and its sources, so a channel cut can silence it. */
interface Voice {
  bus: GainNode;
  sources: AudioScheduledSourceNode[];
  end: number;
}

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;
const channels = new Map<SoundChannel, Voice>();
/** Decoded recordings by URL. A failed load is forgotten, so a later play tries again. */
const recordings = new Map<string, Promise<AudioBuffer | null>>();
/** The last play asked of each channel, so a recording that loads late knows it was replaced. */
const requests = new Map<SoundChannel, number>();
let requestCount = 0;

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
  noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * NOISE_LENGTH), ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return noise;
}

function envelope(ctx: AudioContext, bus: GainNode, start: number, part: SoundPart): GainNode {
  const gain = ctx.createGain();
  // Silent from creation: a gain starts at 1 until its first event, and a source that starts on
  // that same sample would click at full scale.
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(part.gain, start + SOUND_ATTACK);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + part.duration);
  gain.connect(bus);
  return gain;
}

function schedule(
  ctx: AudioContext,
  bus: GainNode,
  origin: number,
  part: SoundPart,
): AudioScheduledSourceNode {
  const start = origin + part.at;
  const end = start + part.duration;
  const gain = envelope(ctx, bus, start, part);
  if (part.kind === 'tone') {
    const oscillator = ctx.createOscillator();
    oscillator.type = part.wave;
    oscillator.frequency.setValueAtTime(part.from, start);
    oscillator.frequency.exponentialRampToValueAtTime(part.to, start + part.glide);
    oscillator.connect(gain);
    oscillator.start(start);
    oscillator.stop(end + 0.01);
    return oscillator;
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
  return source;
}

/** Fades a voice out in `CHANNEL_CUT` and stops its sources right after (no click). */
function cut(ctx: AudioContext, voice: Voice): void {
  const now = ctx.currentTime;
  if (now >= voice.end) return;
  const gain = voice.bus.gain;
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(gain.value, now);
  gain.linearRampToValueAtTime(0, now + CHANNEL_CUT);
  for (const source of voice.sources) {
    try {
      // A later stop() replaces the scheduled one; a part that has not started never plays.
      source.stop(now + CHANNEL_CUT);
    } catch {
      // Already stopped.
    }
  }
}

/** False only when the browser says the page has had no user activation yet. */
function activated(): boolean {
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
    .userActivation;
  return activation ? activation.hasBeenActive : true;
}

/** Fetches and decodes a recording once; later calls share the same promise. */
function recording(url: string): Promise<AudioBuffer | null> {
  const cached = recordings.get(url);
  if (cached) return cached;
  const loading = (async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status}`);
      const data = await response.arrayBuffer();
      // Decoding needs no running context: an offline one keeps the live context for the first
      // gesture. Decoded at the file's own rate, so a 48 kHz output (most devices) plays it as is.
      const decoder = new OfflineAudioContext(1, 1, SAMPLE_RATE);
      return await decoder.decodeAudioData(data);
    } catch {
      recordings.delete(url);
      return null;
    }
  })();
  recordings.set(url, loading);
  return loading;
}

/** Starts loading a recording ahead of its first play (the /about shelf calls it when it binds). */
export function preloadInterfaceSound(name: SampleName): void {
  if (typeof window === 'undefined' || typeof OfflineAudioContext === 'undefined') return;
  void recording(SAMPLES[name].url);
}

/** Starts a voice on a fresh bus, cutting the voice still playing on its channel. */
function start(
  ctx: AudioContext,
  channel: SoundChannel | undefined,
  gain: number,
  play: (bus: GainNode) => { sources: AudioScheduledSourceNode[]; end: number },
): void {
  const previous = channel ? channels.get(channel) : undefined;
  if (previous) cut(ctx, previous);
  const bus = ctx.createGain();
  bus.gain.value = gain;
  bus.connect(ctx.destination);
  const { sources, end } = play(bus);
  if (channel) channels.set(channel, { bus, sources, end: end + 0.01 });
}

function playRecipe(ctx: AudioContext, name: RecipeName, channel: SoundChannel | undefined): void {
  const variants = SOUNDS[name];
  const parts = variants[Math.floor(Math.random() * variants.length)] ?? [];
  const origin = ctx.currentTime + 0.005;
  start(ctx, channel, 1, (bus) => ({
    sources: parts.map((part) => schedule(ctx, bus, origin, part)),
    end: parts.reduce((last, part) => Math.max(last, origin + part.at + part.duration), 0),
  }));
}

function playBuffer(
  ctx: AudioContext,
  buffer: AudioBuffer,
  gain: number,
  channel: SoundChannel | undefined,
): void {
  const origin = ctx.currentTime + 0.005;
  start(ctx, channel, gain, (bus) => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(bus);
    source.start(origin);
    return { sources: [source], end: origin + buffer.duration };
  });
}

function playSample(
  ctx: AudioContext,
  name: SampleName,
  channel: SoundChannel | undefined,
  request: number,
): void {
  const { url, gain } = SAMPLES[name];
  const requestedAt = performance.now();
  void recording(url).then((buffer) => {
    if (!buffer || document.hidden) return;
    const latest = !channel || requests.get(channel) === request;
    if (!playsWhenLoaded(requestedAt, performance.now(), latest)) return;
    try {
      playBuffer(ctx, buffer, gain, channel);
    } catch {
      // Sound is decoration: a failure stays silent.
    }
  });
}

/** Plays one interface sound now (a random variant when it has several). */
export function playInterfaceSound(name: SoundName): void {
  if (typeof window === 'undefined' || document.hidden || !activated()) return;
  try {
    const ctx = audio();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const channel = SOUND_CHANNEL[name];
    const request = (requestCount += 1);
    if (channel) requests.set(channel, request);
    if (isSample(name)) playSample(ctx, name, channel, request);
    else playRecipe(ctx, name, channel);
  } catch {
    // Sound is decoration: a failure stays silent.
  }
}
