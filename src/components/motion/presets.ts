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
import type { BlinkTiming, GazeScale } from '@/lib/blue/eyes';
import type { CaseSectionId } from '@/lib/works';

export const BREAKPOINT_QUERIES: Record<Breakpoint, string> = {
  desktop: '(min-width: 1200px)',
  tablet: '(min-width: 810px) and (max-width: 1199.98px)',
  phone: '(max-width: 809.98px)',
};

/** CA-15: the side notes turn into a carousel at the reference's own threshold (not a Framer breakpoint). */
export const SIDE_NOTES_CAROUSEL_QUERY = '(max-width: 599.98px)';

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
  /** /about chip h1 (about-spec §4.2). */
  fadeUpY2Tween018OutQuint: {
    initial: { opacity: HIDDEN, y: 2 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'tween', duration: 0.18, ease: EASE_OUT_QUINT },
    timing: { durationMs: 180, easing: EASE_OUT_QUINT_CSS, fallbackEasing: EASE_OUT_QUINT_CSS },
  },
  /** /about hero paragraphs (about-spec §4.2). */
  fadeUpY8Tween024OutQuint: {
    initial: { opacity: HIDDEN, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'tween', duration: 0.24, ease: EASE_OUT_QUINT },
    timing: { durationMs: 240, easing: EASE_OUT_QUINT_CSS, fallbackEasing: EASE_OUT_QUINT_CSS },
  },
  /** /about Email button and "My toolkit" label (about-spec §4.2); not the home tip's .24 s one. */
  fadeUpY5Tween022OutQuint: {
    initial: { opacity: HIDDEN, y: 5 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'tween', duration: 0.22, ease: EASE_OUT_QUINT },
    timing: { durationMs: 220, easing: EASE_OUT_QUINT_CSS, fallbackEasing: EASE_OUT_QUINT_CSS },
  },
  /**
   * /about Experience text (about-spec §4.3): reversible in-view appear, starts at opacity 0. Played
   * by `experience-reveal.client.ts` with `ABOUT_EXPERIENCE_REVEAL`, not by the once-only engine.
   */
  inViewFadeUpY8Tween024OutQuint: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'tween', duration: 0.24, ease: EASE_OUT_QUINT },
    timing: { durationMs: 240, easing: EASE_OUT_QUINT_CSS, fallbackEasing: EASE_OUT_QUINT_CSS },
  },
  /** /about Experience dates: as above, ending at the meta dim (.4, decisiones.md 20). */
  inViewFadeUpY8O040Tween024OutQuint: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 0.4, y: 0 },
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

/**
 * Blue panel (BL-06…BL-09). The panel slide, the page push (BL-03…BL-05), the launcher hover and
 * sweep (BL-02) and the thinking loop (BL-08) are CSS and live in the `--pf-blue-*` tokens.
 */
export const BLUE = {
  /**
   * BL-04, decisions 15 and 21: where the panel is a full-screen sheet instead of the 380 px
   * sidebar (phones, and short touch screens such as a landscape phone). A sheet covers the page,
   * so the page turns inert and stops scrolling. `blue-launcher.css` and `blue-panel.css` repeat it.
   */
  sheetQuery: '(max-width: 809.98px), (hover: none) and (max-height: 500px)',
  /** BL-06: the visitor's message pops in from its bottom-right corner (ζ .83). */
  userMessage: {
    initial: { opacity: 0, y: 12, scale: 0.86 },
    spring: { type: 'spring', stiffness: 520, damping: 34, mass: 0.8 },
    origin: '100% 100%',
  },
  /** BL-07: Blue's answer rises 8 px, 40 ms later (ζ .93). */
  assistantMessage: {
    initial: { opacity: 0, y: 8 },
    spring: { type: 'spring', stiffness: 260, damping: 30, mass: 1, delay: 0.04 },
    origin: '0% 100%',
  },
  /**
   * BL-07: the answer is revealed in chunks of at most `maxChunkChars`, cut after whitespace. An
   * answer that is already whole shows one chunk every min(`maxStepMs`, `totalMs` / chunks waiting);
   * while it streams, deltas arrive every ~35 ms, so the next chunk follows `streamStepMs` after the
   * last one instead of trailing the stream. With reduced motion it shows at once.
   */
  reveal: { maxChunkChars: 220, totalMs: 700, maxStepMs: 160, streamStepMs: 40 },
  /**
   * BL-09: outline drawn around the section a link of Blue leads to, `delayMs` after the smooth
   * scroll starts. Reduced motion: opacity only, in `reducedDurationMs`.
   */
  guide: {
    delayMs: 460,
    durationMs: 920,
    reducedDurationMs: 520,
    easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
    opacity: [0, 1, 0],
    scale: [0.985, 1, 1.008],
    /** A target taller than this share of the viewport is outlined by its heading instead. */
    maxViewportShare: 0.8,
  },
} as const;

/**
 * BL-13: Blue's eyes follow the pointer and blink (`src/lib/blue/eyes.ts`). Measured on the
 * reference at 1440 × 900: with the pointer far off (gaze clamped to ±1) the eyes travel ~17 px
 * across and ~12 px up or down and the bubble ~7 / 3.5 px of that, turning towards the pointer.
 * Blinks every 2.05–3.85 s, 125–180 ms closed, 28 % of them double (90–170 ms open, then 105–150 ms
 * closed). The CSS transitions (`--pf-blue-eyes-*` tokens) give the reference's lag: the eyes
 * snap, the bubble follows. Reduced motion: still eyes, no blinking.
 */
export const BLUE_EYES = {
  gaze: {
    limit: 1,
    body: { x: 7, y: 3.5, tiltX: 9, tiltY: 13 },
    eyes: { x: 10, y: 8.5 },
  },
  blink: {
    interval: [2050, 3850],
    closed: [125, 180],
    doubleChance: 0.28,
    doubleGap: [90, 170],
    doubleClosed: [105, 150],
  },
} as const satisfies { gaze: { limit: number } & GazeScale; blink: BlinkTiming };

/**
 * CA-01: case hero blocks. In the meta only the row, the three labels and the year value animate
 * (the Service and Tools values ride on the row). Sections continue at `CASE_SECTION_STAGGER`.
 */
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

/**
 * CA-01: kicker, h2 and body of each fixed section, with the absolute delays of the reference master
 * template (motion-json.md "Secuencia del caso"). They are `caseSectionDelay(i)` for the block index
 * i of that template (overview 0–2, challenge 3–5, approach 6–8, research 10–12, design 19–21,
 * outcome 31–33); the gaps are the optional blocks of `CASE_BLOCK_APPEAR`. `works.test.ts` checks it.
 */
export const CASE_SECTION_APPEAR = {
  overview: {
    kicker: { preset: 'fadeUpY20SpringB000040', delay: 0.45 },
    heading: { preset: 'fadeUpY20SpringB000040', delay: 0.5 },
    body: { preset: 'fadeUpY20SpringB000040', delay: 0.55 },
  },
  challenge: {
    kicker: { preset: 'fadeUpY20SpringB000040', delay: 0.6 },
    heading: { preset: 'fadeUpY20SpringB000040', delay: 0.65 },
    body: { preset: 'fadeUpY20SpringB000040', delay: 0.7 },
  },
  approach: {
    kicker: { preset: 'fadeUpY20SpringB000040', delay: 0.75 },
    heading: { preset: 'fadeUpY20SpringB000040', delay: 0.8 },
    body: { preset: 'fadeUpY20SpringB000040', delay: 0.85 },
  },
  research: {
    kicker: { preset: 'fadeUpY20SpringB000040', delay: 0.95 },
    heading: { preset: 'fadeUpY20SpringB000040', delay: 1 },
    body: { preset: 'fadeUpY20SpringB000040', delay: 1.05 },
  },
  design: {
    kicker: { preset: 'fadeUpY20SpringB000040', delay: 1.4 },
    heading: { preset: 'fadeUpY20SpringB000040', delay: 1.45 },
    body: { preset: 'fadeUpY20SpringB000040', delay: 1.5 },
  },
  outcome: {
    kicker: { preset: 'fadeUpY20SpringB000040', delay: 2 },
    heading: { preset: 'fadeUpY20SpringB000040', delay: 2.05 },
    body: { preset: 'fadeUpY20SpringB000040', delay: 2.1 },
  },
} as const satisfies Record<
  CaseSectionId,
  { kicker: AppearSlot; heading: AppearSlot; body: AppearSlot }
>;

/** CA-01: the optional blocks of the master template that also appear (the rest never animates). */
export const CASE_BLOCK_APPEAR = {
  /** Approach › first subsection (Visual Direction in the reference): kicker and body. */
  subsectionKicker: { preset: 'fadeUpY20SpringB000040', delay: 1.25 },
  subsectionBody: { preset: 'fadeUpY20SpringB000040', delay: 1.3 },
} as const satisfies Record<string, AppearSlot>;

/**
 * CA-01: the single figures of the galleries that appear, by role (`<Figure appear="…">` in the MDX).
 * Every other figure is static, as in the reference.
 */
export const CASE_FIGURE_APPEAR = {
  /** Research › evidence gallery, first image (1.2 s). */
  researchFirst: { preset: 'fadeUpY20SpringB000040', delay: 1.2 },
  /** Approach › Visual Direction gallery, second image (1.35 s). */
  approachGallery: { preset: 'fadeUpY20SpringB000040', delay: 1.35 },
  /** Design solutions › UI gallery, lead image (1.65 s). */
  designLead: { preset: 'fadeUpY20SpringB000040', delay: 1.65 },
  /** Design solutions › UI gallery, first row, first and second image (1.8 s, 1.95 s). */
  designRowFirst: { preset: 'fadeUpY20SpringB000040', delay: 1.8 },
  designRowSecond: { preset: 'fadeUpY20SpringB000040', delay: 1.95 },
} as const satisfies Record<string, AppearSlot>;

export type CaseFigureAppear = keyof typeof CASE_FIGURE_APPEAR;

/** /about hero (about-spec §4.2): once, with the appear engine. `toolkitLabel` is the "My toolkit" h2. */
export const ABOUT_APPEAR = {
  avatar: { preset: 'fadeUpY7Tween030OutQuint', delay: 0 },
  title: { preset: 'fadeUpY2Tween018OutQuint', delay: 0.1 },
  intro: { preset: 'fadeUpY8Tween024OutQuint', delay: 0.18 },
  story: { preset: 'fadeUpY8Tween024OutQuint', delay: 0.3 },
  email: { preset: 'fadeUpY5Tween022OutQuint', delay: 0.42 },
  toolkitLabel: { preset: 'fadeUpY5Tween022OutQuint', delay: 0.5 },
} as const satisfies Record<string, AppearSlot>;

/**
 * /about Experience rows (about-spec §4.3): reversible, on every entry and exit, per element. An
 * element enters when `isIntersecting && intersectionRatio >= threshold` and leaves below it; the
 * delay applies both ways. Reduced motion or no JS: final state, never hidden.
 */
export const ABOUT_EXPERIENCE_REVEAL = {
  threshold: 0.35,
  once: false,
  slots: {
    label: { preset: 'inViewFadeUpY8Tween024OutQuint', delay: 0 },
    date: { preset: 'inViewFadeUpY8O040Tween024OutQuint', delay: 0 },
    title: { preset: 'inViewFadeUpY8Tween024OutQuint', delay: 0.08 },
    body: { preset: 'inViewFadeUpY8Tween024OutQuint', delay: 0.16 },
  },
} as const satisfies {
  threshold: number;
  once: boolean;
  slots: Record<string, AppearSlot>;
};

/** Writing article (writings-spec §4.1): nested blocks (hero > h1, meta, body), absolute delays like CA-01. */
export const WRITING_APPEAR = {
  hero: { preset: 'fadeUpY20SpringB000040', delay: 0 },
  heading: { preset: 'fadeInSpringB000040', delay: 0.05 },
  meta: { preset: 'fadeUpY20SpringB000040', delay: 0.1 },
  body: { preset: 'fadeUpY20SpringB000040', delay: 0.15 },
} as const satisfies Record<string, AppearSlot>;

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

/**
 * SH-09…SH-13, SH-16: every timing of the footer scene, in ms from its start (componentes-js §8).
 * The reference's head, hands and duck (SH-14, SH-15, SH-17) are left out on purpose.
 */
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
  /**
   * SH-16: button i starts at 1000 + i·100 ms. The reference starts them at 1950, after the head that
   * peeks over the name (SH-14, until ~1.8 s); without the head they follow the name (done at 970 ms)
   * instead of leaving a second with nothing under the divider.
   */
  socials: {
    startMs: 1000,
    stepMs: 100,
    durationMs: 500,
    easing: FOOTER_EASE_OUT_EXPO,
    peakOffset: 0.72,
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

// ------------------------------------------------------------------ case study components

/** CA-02: Works Map scroll-spy. CSS fades are tokens (`--pf-map-spy-duration`, `--pf-map-hover-duration`). */
export const WORKS_MAP = {
  /** The current section is the last whose top is above this share of `innerHeight`, else the first. */
  activeLine: 0.4,
  /** Opacity of the inactive items: CSS `--pf-map-inactive` (contrast decision 20). */
} as const;

/**
 * CA-07 / CA-08: lightbox FLIP with WAAPI. The image animates from the rect of its thumbnail ("cover"
 * scale + translate) to none; the scrim is `--pf-lightbox-scrim`. Reduced motion: `REDUCED_LIGHTBOX_MS`
 * of opacity only.
 */
export const LIGHTBOX = {
  open: {
    imageMs: 320,
    imageEasing: 'cubic-bezier(0.2, 0, 0, 1)',
    /** Opacity 0 → 1 during the first 12 % of the image animation. */
    imageFadeUntil: 0.12,
    scrimMs: 200,
    scrimEasing: 'ease-out',
  },
  close: {
    durationMs: 200,
    easing: 'ease-out',
    /** Opacity stays 1 until 85 % of the way back, then fades to 0. */
    imageHoldUntil: 0.85,
  },
  /** Source width of the enlarged image: clamp(minWidth, vwFactor · innerWidth, maxWidth) px. */
  source: { minWidth: 960, vwFactor: 1.25, maxWidth: 1600 },
} as const;

/** CA-09 spring of bubbles, typing bubble and avatar (ζ .6155, ωn 10.915 per unit of duration, peak 1.0855). */
const CHAT_SPRING_EASING =
  'linear(0, 0.0332, 0.1177, 0.2335, 0.3645, 0.498, 0.625, 0.7393, 0.8374, 0.9178, 0.9803, 1.0263, 1.0575, 1.0762, 1.0847, 1.0855, 1.0807, 1.0722, 1.0616, 1.0501, 1.0388, 1.0282, 1.0189, 1.0111, 1.0048, 1, 0.9965, 0.9943, 0.9931, 0.9926, 0.9928, 0.9933, 0.9941, 0.9951, 0.9961, 0.997, 0.9979, 0.9987, 0.9993, 0.9998, 1)';
const CHAT_POP_EASING = 'cubic-bezier(0.3, 1.2, 0.5, 1)';

/**
 * CA-09…CA-12: the "typing… → bubble" sequence of `ChatAside` (WAAPI + timers), in ms. The dots loop
 * (CA-13) is CSS: `--pf-chat-dots-*`. Reduced motion or no JS: the whole conversation, static.
 */
export const CHAT_ASIDE = {
  /** Starts once, when the aside enters this observer margin; paused while out of view. */
  rootMargin: '0px 0px -22% 0px',
  meta: { durationMs: 280, easing: 'ease-out' },
  /** CA-09: fade of the author label when its run starts (measured `ease-out`, as the meta). */
  who: { durationMs: 180, easing: 'ease-out' },
  /** First message after the meta line (0 when there is no meta). */
  startAfterMetaMs: 220,
  avatar: { popMs: 320, slideMs: 340, fromScale: 0.5 },
  typing: {
    inMs: 420,
    outMs: 140,
    outEasing: 'cubic-bezier(0.4, 0, 1, 1)',
    outScale: 1.06,
    from: { y: 6, scale: 0.5 },
    /** Typing time D = clamp(minMs, base + perCharMs · length, maxMs); base is lower for a repeat author. */
    minMs: 400,
    maxMs: 600,
    baseMs: 400,
    sameAuthorBaseMs: 330,
    perCharMs: 3,
  },
  bubble: { durationMs: 640, from: { y: 10, scale: 0.82 } },
  text: { durationMs: 220, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
  /** Next message starts D + this after the current one. */
  nextGapMs: 260,
  /** The status ("Delivered") fades in this long before the end of the last message slot. */
  status: { durationMs: 240, leadMs: 120, easing: 'ease-out' },
  spring: { easing: CHAT_SPRING_EASING, fallbackEasing: 'cubic-bezier(0.3, 1.4, 0.55, 1)' },
  /** CA-10: bubble effects, keyframes as [transform, offset] pairs ending at none (opacity 0 → 1 at the 2nd). */
  fx: {
    slam: {
      durationMs: 620,
      easing: CHAT_POP_EASING,
      frames: [
        { y: -26, scale: 2.1, offset: 0 },
        { y: 2, scale: 0.9, offset: 0.55 },
        { y: 0, scale: 1.03, offset: 0.78 },
      ],
    },
    loud: {
      durationMs: 820,
      easing: CHAT_POP_EASING,
      frames: [
        { scale: 0.8, rotate: 0, offset: 0 },
        { scale: 1.5, rotate: 0, offset: 0.35 },
        { scale: 1.38, rotate: -3, offset: 0.5 },
        { scale: 1.42, rotate: 3, offset: 0.62 },
      ],
    },
    gentle: {
      durationMs: 1300,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      frames: [
        { scale: 0.35, offset: 0 },
        { scale: 1.06, offset: 0.7 },
      ],
    },
  },
  /** CA-11: tapback on an earlier bubble, after the bubble. */
  tapback: {
    delayMs: 380,
    durationMs: 420,
    easing: 'cubic-bezier(0.3, 1.4, 0.55, 1)',
    from: { scale: 0, rotate: -25 },
    peak: { scale: 1.35, rotate: 8, offset: 0.6 },
  },
  /** CA-12: emoji rain of a bubble with `rain`; random values inside these ranges. */
  rain: {
    /** After the bubble: slam waits for its impact. */
    startMs: { slam: 260, other: 120 },
    particles: [10, 18],
    /** Share of particles that burst from the bubble; the rest fall from above. */
    sourceShare: 1 / 3,
    sourceMs: [1100, 1400],
    sourceDelayMs: [0, 120],
    sourceEasing: 'cubic-bezier(0.2, 0.7, 0.4, 1)',
    fallMs: [1500, 2200],
    fallDelayMs: [0, 500],
    fallEasing: 'cubic-bezier(0.45, 0, 0.75, 0.9)',
    rotateDeg: 70,
    scale: [0.7, 1.3],
    /**
     * Geometry in px: one particle per 40 px of width; burst particles start at scale .3 over 70 % of
     * the bubble, rise 30–110, peak 20 higher at 40 % and end 140 below; falling ones start 30–90
     * above the aside, drift ±25 and end 16 below it, opaque from 15 % to 80 %.
     */
    geometry: {
      pxPerParticle: 40,
      glyphPx: 24,
      sourceStartScale: 0.3,
      sourceSpread: 0.7,
      sourceRise: [30, 110],
      sourcePeakLift: 20,
      sourcePeakOffset: 0.4,
      sourceDrop: 140,
      fallStart: [30, 90],
      fallDrift: 50,
      fallBelow: 16,
      fallOpaque: [0.15, 0.8],
    },
  },
} as const;

// ------------------------------------------------------------------ /about components

/**
 * /about "My toolkit" folder (about-spec §5.2), springs and timings only; the geometry lives in
 * `src/lib/toolkit-folder.ts`. Springs are `motion/react` physical springs (stiffness k, damping c).
 */
export const TOOLKIT_FOLDER = {
  /** One progress value drives open / close (0 closed, 1 open). */
  progress: { type: 'spring', stiffness: 145, damping: 25, mass: 1 },
  /** Whole scene follows the pointer over the closed folder, up to `maxX` / `maxY` degrees. */
  tilt: { type: 'spring', stiffness: 180, damping: 28, mass: 1, maxX: 1, maxY: 1.5 },
  /** Hover or visible focus on the lid: it turns `rotateX` degrees. */
  peek: { type: 'spring', stiffness: 230, damping: 31, mass: 1, rotateX: -3 },
  /** A stamp under a fine pointer (open folder only): rises `lift` px and tilts up to these degrees. */
  stampHover: {
    type: 'spring',
    stiffness: 230,
    damping: 31,
    mass: 1,
    lift: 6,
    tiltX: 2.5,
    tiltY: 3,
  },
  /** Collection name sliding to the active tab. */
  labelSlide: { type: 'spring', stiffness: 300, damping: 35, mass: 1 },
  /** Collection switch: progress dips to `dip` and the content swaps when it crosses `swapAt`. */
  switch: { dip: -0.3, swapAt: -0.28 },
  /** Floating tool name fade (ms). */
  tagFadeMs: 120,
} as const;

/**
 * /about Email "copied" bubble (about-spec §5.1): spring k480 c22 m1, shown `visibleMs`.
 * Reduced motion: opacity only.
 */
export const ABOUT_EMAIL_BUBBLE = {
  spring: { type: 'spring', stiffness: 480, damping: 22, mass: 1 },
  visibleMs: 1600,
  enter: { opacity: 0, y: 8, scale: 0.6, rotate: 8 },
  rest: { opacity: 1, y: -10, scale: 1, rotate: -5 },
  exit: { opacity: 0, y: -28, scale: 0.9 },
} as const;

// ------------------------------------------------------------------ writings components

/** Writing code block (writings-spec §3.6): "Copied" goes back to "Copy" after this (ms). */
export const CODE_BLOCK = {
  copiedResetMs: 1400,
} as const;

// ------------------------------------------------------------------ 404

/**
 * RT-07…RT-09: the 404 terminal (404-spec §3, §5.2). Delays in seconds, by line index (the tenth
 * line is the link). The pause after each typed character is
 * `(1000 / charsPerSecond) · (jitter[0] + random · (jitter[1] − jitter[0])) · factor`.
 */
export const NOT_FOUND_TYPER = {
  charsPerSecond: 80,
  jitter: [0.6, 1.4],
  pauseFactor: { punctuation: 2.6, space: 1.8, other: 1 },
  /** Characters that take the punctuation factor. */
  punctuation: '.,:;!?',
  lines: [
    { delay: 0 },
    { delay: 0.2 },
    { delay: 1, prefixDelay: 0 },
    { delay: 0.15, prefixDelay: 0 },
    { delay: 0.15, prefixDelay: 0 },
    { delay: 0.6, prefixDelay: 0.15 },
    { delay: 0.5 },
    { delay: 0.5 },
    { delay: 0.15 },
    { delay: 0.6, prefixDelay: 0.2 },
  ],
  /** RT-09: final cursor, opacity keyframes over one `ease-in-out` iteration. */
  cursorBlinkMs: 800,
  cursorKeyframes: [0.2, 1, 0.2],
  cursorEasing: 'ease-in-out',
  cursorInitialOpacity: 0.25,
} as const;
