/**
 * Motion presets: every appear, spring and timing the site uses (AGENTS.md "Motion").
 *
 * Source: docs/analisis/presets.draft.ts (page-motion of the reference, measured), plus `cardIn`
 * (HO-01) and the stagger mode (CA-01, docs/decisiones.md). Spring easings are precomputed with
 * `src/lib/spring-to-linear.ts` and pasted as data so the generator never ships to the client;
 * `spring-to-linear.test.ts` regenerates each one and fails on any drift.
 */
import type {
  AppearPreset,
  AppearTiming,
  Breakpoint,
  DurationSpringTransition,
  PhysicalSpringTransition,
  ResponsivePreset,
  StaggerMode,
} from './types';

export const BREAKPOINT_QUERIES: Record<Breakpoint, string> = {
  desktop: '(min-width: 1200px)',
  tablet: '(min-width: 810px) and (max-width: 1199.98px)',
  phone: '(max-width: 809.98px)',
};

// ------------------------------------------------------------------ springs and tweens

/** Case reveal, CA-01: k 532.85 · c 46.17 · ζ 1, no overshoot. */
export const SPRING_REVEAL = {
  type: 'spring',
  bounce: 0,
  duration: 0.4,
} as const satisfies DurationSpringTransition;
/** S1, hero CTAs (HE-16): k 345.51 · c 32.72 · ζ .88, overshoot .3 %. */
export const SPRING_POP_UP = {
  type: 'spring',
  bounce: 0.12,
  duration: 0.46,
} as const satisfies DurationSpringTransition;
/** S2, hero objects and Blue launcher (HE-18, BL-01): k 1031.85 · c 51.40 · ζ .80, overshoot 1.5 %. */
export const SPRING_POP_IN = {
  type: 'spring',
  bounce: 0.2,
  duration: 0.28,
} as const satisfies DurationSpringTransition;
/** Work cards (HO-01): ζ 1.342, 650 ms on [0,100] with restSpeed 2 and restDelta .5 (hueco-1). */
export const SPRING_CARD_IN = {
  type: 'spring',
  stiffness: 500,
  damping: 60,
  mass: 1,
} as const satisfies PhysicalSpringTransition;

/** easeOutQuint used by the hero avatar, bio and tip (HE-13, HE-15, HE-17). */
export const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const;
// Literal (not built from the array) so the module stays side-effect free and tree-shakes.
const EASE_OUT_QUINT_CSS = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** Precomputed spring timings (`springToLinear` / `springToCubicBezier`; drift-tested). */
const TIMING_REVEAL = {
  durationMs: 400,
  easing:
    'linear(0, 0.024, 0.0823, 0.1594, 0.2448, 0.3315, 0.4152, 0.4934, 0.5646, 0.6282, 0.6844, 0.7334, 0.7758, 0.8122, 0.8432, 0.8694, 0.8916, 0.9102, 0.9258, 0.9388, 0.9496, 0.9586, 0.966, 0.9722, 0.9772, 0.9814, 0.9848, 0.9876, 0.9899, 0.9918, 0.9933, 0.9946, 0.9956, 0.9964, 0.9971, 0.9977, 0.9981, 0.9985, 0.9988, 1)',
  fallbackEasing: 'cubic-bezier(0.263, 0.451, 0.089, 1.068)',
} as const satisfies AppearTiming;
const TIMING_POP_UP = {
  durationMs: 500,
  easing:
    'linear(0, 0.0161, 0.0576, 0.1161, 0.1849, 0.2591, 0.3348, 0.4093, 0.4807, 0.5476, 0.6094, 0.6655, 0.7159, 0.7607, 0.8, 0.8343, 0.8639, 0.8893, 0.9108, 0.9289, 0.9441, 0.9567, 0.967, 0.9754, 0.9821, 0.9875, 0.9918, 0.9951, 0.9976, 0.9994, 1.0008, 1.0017, 1.0024, 1.0027, 1.0029, 1.003, 1.0029, 1.0028, 1.0026, 1.0024, 1.0022, 1.0019, 1.0017, 1.0015, 1.0013, 1.0011, 1, 1, 1, 1)',
  fallbackEasing: 'cubic-bezier(0.306, 0.627, 0.068, 1.099)',
} as const satisfies AppearTiming;
const TIMING_POP_IN = {
  durationMs: 300,
  easing:
    'linear(0, 0.0462, 0.1543, 0.2896, 0.4294, 0.5599, 0.674, 0.7687, 0.844, 0.9014, 0.9436, 0.9731, 0.9928, 1.0049, 1.0117, 1.0146, 1.0151, 1.0141, 1.0123, 1.0103, 1.0082, 1.0062, 1.0046, 1.0032, 1.0021, 1.0013, 1.0007, 1.0003, 1, 1)',
  fallbackEasing: 'cubic-bezier(0.348, 0.858, 0.051, 1.089)',
} as const satisfies AppearTiming;
const TIMING_CARD_IN = {
  durationMs: 650,
  easing:
    'linear(0, 0.0212, 0.0703, 0.1328, 0.2001, 0.2675, 0.3323, 0.3932, 0.4496, 0.5015, 0.5488, 0.5919, 0.6311, 0.6665, 0.6986, 0.7277, 0.7539, 0.7777, 0.7991, 0.8185, 0.836, 0.8519, 0.8662, 0.8791, 0.8908, 0.9013, 0.9109, 0.9195, 0.9272, 0.9343, 0.9406, 0.9464, 0.9515, 0.9562, 0.9604, 0.9643, 0.9677, 0.9708, 0.9736, 0.9762, 0.9785, 0.9806, 0.9824, 0.9841, 0.9857, 0.9871, 0.9883, 0.9894, 0.9905, 0.9914, 0.9922, 0.993, 0.9936, 0.9943, 0.9948, 0.9953, 0.9958, 0.9962, 0.9965, 0.9969, 0.9972, 0.9975, 0.9977, 0.9979, 1)',
  fallbackEasing: 'cubic-bezier(0.215, 0.613, 0.089, 1.032)',
} as const satisfies AppearTiming;

// Separate constants, not `SPRING_TIMINGS.x` reads, so bundlers can drop unused presets.
export const SPRING_TIMINGS = {
  reveal: TIMING_REVEAL,
  popUp: TIMING_POP_UP,
  popIn: TIMING_POP_IN,
  cardIn: TIMING_CARD_IN,
} as const;

/** The spring each timing was generated from (used by the drift test). */
export const SPRING_TIMING_SOURCES = {
  reveal: SPRING_REVEAL,
  popUp: SPRING_POP_UP,
  popIn: SPRING_POP_IN,
  cardIn: SPRING_CARD_IN,
} as const;

// ------------------------------------------------------------------ appear presets

/** Initial opacity of the reference appears (Framer starts at .001, not 0). */
const HIDDEN = 0.001;

/**
 * Appear presets. Names follow presets.draft.ts / animation-inventory.md so rows stay traceable.
 * The final rotate of the hero objects lives in the preset because it is the end state.
 * Plain data only (no spreads, calls or member reads) so bundlers drop what a page does not use.
 */
export const APPEAR_PRESETS = {
  /** CA-01: case blocks. */
  fadeUpY20SpringB000040: {
    initial: { opacity: HIDDEN, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: SPRING_REVEAL,
    timing: TIMING_REVEAL,
  },
  /** HE-18 (5th object), BL-01 (Blue launcher, on mount). */
  popInS093SpringB020028: {
    initial: { opacity: HIDDEN, scale: 0.93 },
    animate: { opacity: 1, scale: 1 },
    transition: SPRING_POP_IN,
    timing: TIMING_POP_IN,
  },
  /** CA-01: case h1 inside the title block (opacity only). */
  fadeInSpringB000040: {
    initial: { opacity: HIDDEN },
    animate: { opacity: 1 },
    transition: SPRING_REVEAL,
    timing: TIMING_REVEAL,
  },
  /** CA-01: case year value, ends at opacity .4 (contrast decision 20 pending). */
  fadeUpY20O040SpringB000040: {
    initial: { opacity: HIDDEN, y: 20 },
    animate: { opacity: 0.4, y: 0 },
    transition: SPRING_REVEAL,
    timing: TIMING_REVEAL,
  },
  /** HE-16: hero CTAs. */
  popUpY6S094SpringB012046: {
    initial: { opacity: HIDDEN, scale: 0.94, y: 6 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: SPRING_POP_UP,
    timing: TIMING_POP_UP,
  },
  /** HE-13: hero avatar. */
  fadeUpY7Tween030OutQuint: {
    initial: { opacity: HIDDEN, y: 7 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'tween', duration: 0.3, ease: EASE_OUT_QUINT },
    timing: { durationMs: 300, easing: EASE_OUT_QUINT_CSS, fallbackEasing: EASE_OUT_QUINT_CSS },
  },
  /** HE-15: hero bio. */
  fadeUpY6Tween028OutQuint: {
    initial: { opacity: HIDDEN, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'tween', duration: 0.28, ease: EASE_OUT_QUINT },
    timing: { durationMs: 280, easing: EASE_OUT_QUINT_CSS, fallbackEasing: EASE_OUT_QUINT_CSS },
  },
  /** HE-17: shortcut tip. */
  fadeUpY5Tween024OutQuint: {
    initial: { opacity: HIDDEN, y: 5 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'tween', duration: 0.24, ease: EASE_OUT_QUINT },
    timing: { durationMs: 240, easing: EASE_OUT_QUINT_CSS, fallbackEasing: EASE_OUT_QUINT_CSS },
  },
  /** HE-18: hero object ending at 12°. */
  popInRotateS093R12SpringB020028: {
    initial: { opacity: HIDDEN, scale: 0.93, rotate: 0 },
    animate: { opacity: 1, scale: 1, rotate: 12 },
    transition: SPRING_POP_IN,
    timing: TIMING_POP_IN,
  },
  /** HE-18: hero object ending at −17°. */
  popInRotateS093Rm17SpringB020028: {
    initial: { opacity: HIDDEN, scale: 0.93, rotate: 0 },
    animate: { opacity: 1, scale: 1, rotate: -17 },
    transition: SPRING_POP_IN,
    timing: TIMING_POP_IN,
  },
  /** HE-18: hero object ending at 8°. */
  popInRotateS093R8SpringB020028: {
    initial: { opacity: HIDDEN, scale: 0.93, rotate: 0 },
    animate: { opacity: 1, scale: 1, rotate: 8 },
    transition: SPRING_POP_IN,
    timing: TIMING_POP_IN,
  },
  /** HE-18: hero object ending at −24°. */
  popInRotateS093Rm24SpringB020028: {
    initial: { opacity: HIDDEN, scale: 0.93, rotate: 0 },
    animate: { opacity: 1, scale: 1, rotate: -24 },
    transition: SPRING_POP_IN,
    timing: TIMING_POP_IN,
  },
  /** HO-01: work cards, one 650 ms `linear()` for opacity, scale and y; starts at opacity 0. */
  cardIn: {
    initial: { opacity: 0, scale: 0.5, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: SPRING_CARD_IN,
    timing: TIMING_CARD_IN,
  },
} as const satisfies Record<string, AppearPreset>;

export type AppearPresetName = keyof typeof APPEAR_PRESETS;

export function isAppearPresetName(name: string): name is AppearPresetName {
  return Object.hasOwn(APPEAR_PRESETS, name);
}

/**
 * Per-breakpoint overrides. Every override of the reference equals its default (68/68), so this is
 * empty and the three breakpoints share the preset; the type stays so a preset of ours can differ.
 */
export const APPEAR_PRESET_OVERRIDES: Partial<Record<AppearPresetName, Partial<ResponsivePreset>>> =
  {};

/** The preset of `name` at breakpoint `bp` (resolved when the appear fires). */
export function presetFor(name: AppearPresetName, bp: Breakpoint): AppearPreset {
  return APPEAR_PRESET_OVERRIDES[name]?.[bp] ?? APPEAR_PRESETS[name];
}

// ------------------------------------------------------------------ element slots (preset + delay)

export interface AppearSlot {
  preset: AppearPresetName;
  /** Seconds, counted from the element's intersection. */
  delay: number;
}

/** Home appears (HE-13…HE-18, HO-01), in document order. */
export const HOME_APPEAR = {
  /** HE-13 */
  avatar: { preset: 'fadeUpY7Tween030OutQuint', delay: 0 },
  /** HE-15 */
  bio: { preset: 'fadeUpY6Tween028OutQuint', delay: 0.4 },
  /** HE-16 */
  ctaPrimary: { preset: 'popUpY6S094SpringB012046', delay: 0.48 },
  /** HE-16 */
  ctaSecondary: { preset: 'popUpY6S094SpringB012046', delay: 0.55 },
  /** HE-17 (hidden in P) */
  shortcutTip: { preset: 'fadeUpY5Tween024OutQuint', delay: 0.6 },
  /** HE-18: the five objects, 120 ms apart. */
  objects: [
    { preset: 'popInRotateS093Rm24SpringB020028', delay: 1.5 },
    { preset: 'popInRotateS093R12SpringB020028', delay: 1.62 },
    { preset: 'popInRotateS093R8SpringB020028', delay: 1.74 },
    { preset: 'popInRotateS093Rm17SpringB020028', delay: 1.86 },
    { preset: 'popInS093SpringB020028', delay: 1.98 },
  ],
  /** HO-01: no stagger; cards entering together start together. */
  workCard: { preset: 'cardIn', delay: 0 },
} as const satisfies Record<string, AppearSlot | readonly AppearSlot[]>;

/** BL-01: the launcher plays S2 on mount, without the reference's .8 s delay (docs/decisiones.md). */
export const BLUE_LAUNCHER_APPEAR = {
  preset: 'popInS093SpringB020028',
  delay: 0,
} as const satisfies AppearSlot;

/** CA-01: case hero blocks. Sections continue at `CASE_SECTION_STAGGER`. */
export const CASE_APPEAR = {
  title: { preset: 'fadeUpY20SpringB000040', delay: 0 },
  heading: { preset: 'fadeInSpringB000040', delay: 0.05 },
  cover: { preset: 'fadeUpY20SpringB000040', delay: 0.1 },
  meta: { preset: 'fadeUpY20SpringB000040', delay: 0.15 },
  metaServices: { preset: 'fadeUpY20SpringB000040', delay: 0.2 },
  metaTools: { preset: 'fadeUpY20SpringB000040', delay: 0.3 },
  metaYear: { preset: 'fadeUpY20SpringB000040', delay: 0.4 },
  metaYearValue: { preset: 'fadeUpY20O040SpringB000040', delay: 0.45 },
} as const satisfies Record<string, AppearSlot>;

/** CA-01: section blocks start at .45 s and add .05 s per block in template order (up to 2.1 s). */
export const CASE_SECTION_STAGGER = { start: 0.45, step: 0.05 } as const;

/** Delay (s) of the n-th section block of the case template, rounded to the ms. */
export function caseSectionDelay(index: number): number {
  return Math.round((CASE_SECTION_STAGGER.start + index * CASE_SECTION_STAGGER.step) * 1000) / 1000;
}

/** CA-01 stagger mode: `absolute`, identical to the reference (docs/decisiones.md). */
export const APPEAR_STAGGER: StaggerMode = 'absolute';

// ------------------------------------------------------------------ reduced motion

/** Presets collapse to an opacity fade (plan, animation-inventory §4). */
export const REDUCED_APPEAR = {
  durationMs: 150,
  easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
} as const;
/** HE-10: hero scene fallback fade. */
export const REDUCED_HERO_FADE = {
  durationMs: 200,
  easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
} as const;
/** CA-07: lightbox with reduced motion. */
export const REDUCED_LIGHTBOX_MS = 160;

// ------------------------------------------------------------------ chrome springs (lib/spring.ts)

/** Physical springs of the global chrome, run with `createSpring` (rAF/spring rows). */
export const CHROME_SPRINGS = {
  /** SH-01: active pill background (ζ 1.06). */
  navActive: { stiffness: 800, damping: 60, mass: 1 },
  /** SH-02: hover pill background (ζ .97). */
  navHover: { stiffness: 520, damping: 44, mass: 1 },
  // SH-03 has no spring: measured live, the nav width follows the CSS padding transition.
  /** TE-02: rope hover y 0→4 px (ζ .78). */
  ropeHover: { stiffness: 420, damping: 32, mass: 1 },
  /** TE-04: rope release, y (ζ .65). */
  ropeY: { stiffness: 280, damping: 20, mass: 0.85, restDelta: 0.05, restSpeed: 0.05 },
  /** TE-04: rope release, x (ζ .58). */
  ropeX: { stiffness: 106.4, damping: 11, mass: 0.85 },
} as const;

/** SH-02: hover pill opacity when entering from outside (ms, easeOut). */
export const NAV_HOVER_FADE_MS = 120;
/** TE-05: tap tug before the release spring (ms, easeOut). */
export const ROPE_TUG_MS = 140;

// ------------------------------------------------------------------ component timings
/** HE-01 / HE-03: values of the reference SelectedNameMenu (hero.md §2). */
export const HERO_SCENE = {
  /** `sessionStorage` key prefix; the route is appended (`pf-hero-seen:/en`). */
  storageKey: 'pf-hero-seen',
  /** DOM id of the scene root. */
  id: 'hero-scene',
  /** Shortest scene; `done` never comes earlier (V). */
  minSceneMs: 1500,
  /** T0 = start of the page appears + 150 ms (hero.md §2, HE-01). */
  startOffsetMs: 150,
  /**
   * First play while the document still parses: the scene waits for DOMContentLoaded (when the
   * appears start, after the deferred module scripts) at most this long, then starts on its own.
   */
  pageWaitMs: 3000,
  /** First title line (E). */
  titleDelayMs: 220,
  /** Extra delay per visual line (M). */
  lineStaggerMs: 90,
  /** Word duration on every line but the second (T). */
  wordMs: 480,
  /** Word duration on the second line (X). */
  secondLineWordMs: 440,
} as const;

/** HE-12: icon rail of the menu actions, and what the actions wait for. */
export const HERO_MENU = {
  /** Phase 2 (icon back in from below) after the click. */
  railReturnMs: 680,
  /** Instant reset to phase 0. */
  railResetMs: 980,
  /** Transition stays off this long after the reset. */
  railInstantMs: 50,
  /** "Open CV" waits so the check is seen before the new tab. */
  cvOpenDelayMs: 500,
  /** How long the "copied" status stays in the live region. */
  statusMs: 1600,
} as const;

/** HE-20: inertial bump on a fast pointer enter. */
export const HERO_OBJECT_BUMP = {
  /** Peak translation (px) at full strength. */
  distance: 8,
  /** Peak rotation (deg) at full strength. */
  rotate: 2.5,
  /** Peak scale at full strength. */
  scale: 1.025,
  sensitivity: 5,
  inertia: 0.75,
  /** First gate (px/s). On its own it never decides: see `minStrength`. */
  minSpeed: 260,
  /** Second gate: M ≥ .055 ⇔ u ≥ 812 px/s (hueco-2: 806 without bump, 813 with bump). */
  minStrength: 0.055,
  strengthExponent: 1.7,
  /** The last `pointermove` must be this recent (ms). */
  staleMs: 140,
  /** Shortest Δt (ms) the speed estimate accepts. */
  minStepMs: 8,
  /** EMA weight of the previous speed (the new sample weighs 1 − .35). */
  smoothing: 0.35,
  /** Offset of the peak keyframe. */
  peakOffset: 0.36,
  /**
   * Keyframe easings exactly as the reference writes them. A WAAPI keyframe easing applies from that
   * keyframe to the next, so the rise to the peak is linear and the settle uses (.22,.8,.36,1); the
   * last one never applies. Kept as is: it is what the measured bump looks like.
   */
  peakEasing: 'cubic-bezier(0.22, 0.8, 0.36, 1)',
  settleEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Pointer leave while a bump runs: back to identity (ms, easing). */
  leaveMs: 180,
  leaveEasing: 'cubic-bezier(0.77, 0, 0.175, 1)',
} as const;

/** HE-21: crossfade when an object is clicked. */
export const HERO_OBJECT_SWAP = {
  durationMs: 160,
  /** With reduced motion the swap only fades its opacity, in 120 ms. */
  reducedDurationMs: 120,
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  exit: { opacity: 0, rotate: 5, scale: 1.08 },
  enter: { opacity: 0, rotate: -5, scale: 0.9 },
  /** Candidates preloaded on pointer enter / down. */
  preload: 2,
} as const;

/** EF-01…EF-03: springs of the Aqua buttons (`useSpring` of motion/react). */
export const AQUA_SPRINGS = {
  /** EF-01/EF-02: variant spring of the reference buttons (ζ .40, 25 % overshoot). */
  variants: { stiffness: 1000, damping: 40, mass: 2.5 },
  /** EF-03: magnetic pull, `useSpring` with smoothing 60 → stiffness 2000 − 1950·.6 (ζ 1.74). */
  magnetic: { stiffness: 830, damping: 100, mass: 1 },
} as const;

/** EF-03: pull at the edge (px), extra hit area per side (px), the children's share and the gate. */
export const AQUA_MAGNETIC = {
  distance: 5,
  hoverArea: 20,
  childDistance: 3,
  /** Only with a fine hovering pointer from the tablet breakpoint up. */
  query: '(min-width: 810px) and (hover: hover) and (pointer: fine)',
} as const;

const FOOTER_EASE_OUT_EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
const FOOTER_EASE_OUT_QUINT = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** Framer's `easeInOut`. */
const FOOTER_EASE_IN_OUT = 'cubic-bezier(0.42, 0, 0.58, 1)';

/** SH-09…SH-17: every timing of the footer scene, in ms from its start (componentes-js §8). */
export const FOOTER_SCENE = {
  /** SH-09 */
  trigger: {
    rootMarginPx: 240,
    shareOfHeight: 0.55,
    shareOfViewport: 0.35,
    stableMs: 240,
    pollMs: 60,
    /** Movement (px of document position) that restarts the stability window. */
    toleratePx: 2,
  },
  /** SH-10: half edges grow from their corners; the frame settles with a small overshoot. */
  edges: { durationMs: 460, easing: FOOTER_EASE_OUT_EXPO },
  frame: { delayMs: 400, durationMs: 250, easing: FOOTER_EASE_OUT_EXPO, scale: [0.997, 1.002, 1] },
  /** SH-11 */
  label: { delayMs: 140, durationMs: 300, easing: FOOTER_EASE_OUT_QUINT, y: 5, scale: 0.98 },
  /** SH-12 */
  reveal: { delayMs: 250, durationMs: 500, easing: FOOTER_EASE_OUT_QUINT },
  nameRise: { delayMs: 250, durationMs: 650, easing: FOOTER_EASE_OUT_EXPO, y: 26 },
  nameScale: {
    delayMs: 250,
    durationMs: 720,
    easing: FOOTER_EASE_OUT_QUINT,
    scale: [0.985, 1.002, 1],
    offsets: [0, 0.76, 1],
  },
  /** SH-14: y in shares of the head height (N .95, Q .58), then −4 px and rest. */
  head: {
    delayMs: 650,
    durationMs: 1150,
    rise: { shares: [0.95, 0.58, 0.58], overshootPx: -4, offsets: [0, 0.22, 0.38, 0.72, 1] },
    riseEasings: [FOOTER_EASE_OUT_EXPO, 'linear', FOOTER_EASE_OUT_EXPO, FOOTER_EASE_OUT_QUINT],
    sway: {
      x: [0, -3, 3, -1, 0],
      rotate: [-2.5, -2.5, 2, -0.8, 0],
      offsets: [0, 0.38, 0.68, 0.87, 1],
    },
    swayEasing: FOOTER_EASE_IN_OUT,
    scale: { from: 0.985, durationMs: 900, easing: FOOTER_EASE_OUT_EXPO },
  },
  /**
   * SH-15: each hand grips the edge (rises 16 px with a 2 px overshoot, fading in during the first
   * 35 % of it), then gives a small pull (3 px down, 1.5 px up). The second hand 60 / 30 ms later.
   */
  hands: {
    grip: {
      delaysMs: [420, 480],
      durationMs: 480,
      easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
      fadeShare: 0.35,
      y: [16, -2, 0],
      offsets: [0, 0.7, 1],
    },
    pull: {
      delaysMs: [1000, 1030],
      durationMs: 700,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      y: [0, 3, -1.5, 0],
      offsets: [0, 0.16, 0.62, 1],
    },
  },
  /** SH-16: button i starts at 1950 + i·100 ms. */
  socials: {
    startMs: 1950,
    stepMs: 100,
    durationMs: 500,
    easing: FOOTER_EASE_OUT_EXPO,
    peakOffset: 0.72,
  },
  /** SH-17 */
  duck: {
    enableAfterMs: 2000,
    minRadiusPx: 110,
    radiusShare: 0.55,
    anchorShare: 0.6,
    depthShare: 0.13,
    downMs: 240,
    downEasing: 'cubic-bezier(0.4, 0, 0.6, 1)',
    holdMs: 420,
    upMs: 520,
    upEasing: FOOTER_EASE_OUT_EXPO,
    overshootPx: -3,
    overshootOffset: 0.7,
  },
} as const;

/** SH-07: how long the nav toast stays (ms). */
export const NAV_TOAST_VISIBLE_MS = 2400;

// ------------------------------------------------------------------ route transitions

/**
 * RT-01…RT-04: route transitions of <ClientRouter/>, played with WAAPI on the view-transition
 * pseudo-elements by `route-transitions.client.ts` (plan in `@/lib/route-transitions`).
 */
export const ROUTE_TRANSITIONS = {
  /** RT-01: the old page leaves 8 px up at .985, pivoting 40vh below its top. */
  leave: {
    durationMs: 200,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    y: -8,
    scale: 0.985,
    origin: '50% 40vh',
  },
  /** RT-01: the new page rises 16 px, 60 ms later. */
  enter: { durationMs: 420, delayMs: 60, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', y: 16 },
  /**
   * RT-02: card cover → case cover (`view-transition-name` set by WorkCard on the fly). The box morphs
   * in 520 ms; the old image is held until 40 % of it, the new one is fully in at 35 %.
   */
  cover: {
    name: 'pf-work-cover',
    durationMs: 520,
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
    oldHoldUntil: 0.4,
    newInBy: 0.35,
  },
} as const;
