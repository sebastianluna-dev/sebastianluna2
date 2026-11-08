/**
 * Blue's eyes (BL-13): the launcher figure turns to the pointer, its eyes look further and blink
 * every few seconds, sometimes twice. Vanilla, because it ships with every page: one passive
 * `pointermove` listener coalesced to one write per frame, and timers for the blinks. The motion
 * itself is CSS (transitions on the figure and the eyes, `blue-launcher.css`), so nothing runs while
 * the pointer rests. The pure parts are `src/lib/blue/eyes.ts`; the numbers, `BLUE_EYES`.
 *
 * Reduced motion: the eyes stay centred and open. The pointer leaving the window, or the window
 * losing focus, brings the gaze back to the centre, as on the reference.
 */
import { BLUE_EYES } from '@/components/motion/presets';
import { gazeFrom, gazeStyle, planBlink, type Point } from '@/lib/blue/eyes';
import { prefersReducedMotion, watchReducedMotion } from '@/lib/motion-policy';

const FIGURE_SELECTOR = '[data-blue-figure]';
const EYES_SELECTOR = '[data-blue-eyes]';
const BUTTON_SELECTOR = '[data-blue-launcher]';
const BLINK_ATTRIBUTE = 'data-blink';

let started = false;
let reduced = false;
let pointer: Point | null = null;
let frame = 0;
let timers: number[] = [];

const figure = () => document.querySelector<HTMLElement>(FIGURE_SELECTOR);

function render(): void {
  frame = 0;
  const body = figure();
  const eyes = document.querySelector<HTMLElement>(EYES_SELECTOR);
  const button = document.querySelector<HTMLElement>(BUTTON_SELECTOR);
  if (!body || !eyes || !button) return;
  const rect = button.getBoundingClientRect();
  if (!pointer || reduced || rect.width === 0) {
    body.style.transform = '';
    eyes.style.translate = '';
    return;
  }
  const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const style = gazeStyle(
    gazeFrom(pointer, center, viewport, BLUE_EYES.gaze.limit),
    BLUE_EYES.gaze,
  );
  body.style.transform = style.body;
  eyes.style.translate = style.eyes;
}

function requestRender(): void {
  if (!frame) frame = requestAnimationFrame(render);
}

function onPointerMove(event: PointerEvent): void {
  if (!event.isPrimary || reduced) return;
  pointer = { x: event.clientX, y: event.clientY };
  requestRender();
}

function lookAhead(): void {
  pointer = null;
  requestRender();
}

function onPointerOut(event: PointerEvent): void {
  if (!event.relatedTarget) lookAhead();
}

function setClosed(closed: boolean): void {
  figure()?.toggleAttribute(BLINK_ATTRIBUTE, closed);
}

function stopBlinking(): void {
  timers.forEach((timer) => window.clearTimeout(timer));
  timers = [];
  setClosed(false);
}

function blink(): void {
  stopBlinking();
  if (reduced) return;
  const plan = planBlink(BLUE_EYES.blink);
  // Steps alternate close, open (, close, open).
  plan.steps.forEach((at, index) => {
    timers.push(window.setTimeout(() => setClosed(index % 2 === 0 && !document.hidden), at));
  });
  timers.push(window.setTimeout(blink, plan.next));
}

/** Binds once per document; the figure persists across navigations, so nothing rebinds. */
export function startBlueEyes(): void {
  if (started || typeof document === 'undefined' || !figure()) return;
  started = true;
  reduced = prefersReducedMotion();
  watchReducedMotion((next) => {
    reduced = next;
    lookAhead();
    blink();
  });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerout', onPointerOut);
  window.addEventListener('blur', lookAhead);
  blink();
}
