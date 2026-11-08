/**
 * Lightbox of the case figures (CA-07, CA-08; design-spec §4 case/, §7.3; case.md §3.6).
 *
 * One delegated listener set on the document, bound once, so it survives <ClientRouter/> swaps
 * without rebinding or leaking; `astro:page-load` only turns the figure links of the new page into
 * buttons (`role=button`, `aria-haspopup=dialog`). The `<dialog>` of the page is looked up when a
 * figure opens it.
 *
 * - Open (CA-07): `showModal()` (the rest of the page inert, focus on the Close button, decisiones.md
 *   25), scroll locked keeping the scrollbar gutter, scrim 0 → 1 in 200 ms, and once the large
 *   source is decoded the image flies from the thumbnail rect (FLIP, 320 ms).
 * - Close (CA-08): Close button, a click anywhere (not the second click of the double click that
 *   opened it, nor one before the scrim is in), or Escape. The image flies back (200 ms, opaque until
 *   85 %), the scrim fades, then the scroll and the focus return to the thumbnail.
 * - Reduced motion, or a thumbnail out of view: opacity only (`REDUCED_LIGHTBOX_MS` when reduced).
 */
import { LIGHTBOX, REDUCED_LIGHTBOX_MS } from '@/components/motion/presets';
import { isPlainClick } from '@/lib/case-nav';
import {
  closeKeyframes,
  closesOnClick,
  flipTransform,
  isRectInView,
  openKeyframes,
  pickLightboxSource,
  type RectLike,
} from '@/lib/lightbox';
import { prefersReducedMotion } from '@/lib/motion-policy';

const TRIGGER = '[data-lightbox-trigger]';
const DIALOG = '[data-lightbox]';
const READY_ATTR = 'data-ready';

interface Session {
  dialog: HTMLDialogElement;
  trigger: HTMLElement;
  image: HTMLImageElement;
  fades: HTMLElement[];
  from: RectLike;
  scroll: { x: number; y: number };
  restoreLock: () => void;
  closing: boolean;
  /** `performance.now()` at `showModal()`, so the second click of a double click does not close. */
  openedAt: number;
}

let session: Session | null = null;

/** Without JS the frame is a link; with JS it is a button that opens a dialog (design-spec §7.3). */
function upgradeTriggers(): void {
  for (const trigger of document.querySelectorAll<HTMLElement>(TRIGGER)) {
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('aria-haspopup', 'dialog');
  }
}

/**
 * CA-07: overflow hidden on html and body. A classic scrollbar keeps its gutter
 * (`scrollbar-gutter: stable` on html), so neither the page nor the fixed chrome moves sideways.
 */
function lockScroll(): () => void {
  const { body, documentElement: html } = document;
  const previous = {
    html: html.style.overflow,
    body: body.style.overflow,
    gutter: html.style.scrollbarGutter,
  };
  html.style.scrollbarGutter = 'stable';
  html.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
  return () => {
    html.style.overflow = previous.html;
    body.style.overflow = previous.body;
    html.style.scrollbarGutter = previous.gutter;
  };
}

function fade(elements: HTMLElement[], keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  return elements.map((el) => el.animate(keyframes, options));
}

/**
 * Focus on the Close button, the dialog's only control (decisiones.md 25), where `showModal()` already
 * puts it. After a pointer open it is focused again without the ring, as the reference shows none.
 */
function focusClose(dialog: HTMLDialogElement, byPointer: boolean): void {
  const button = dialog.querySelector<HTMLElement>('[data-lightbox-close]');
  if (!button) return;
  if (byPointer) button.blur();
  button.focus({ preventScroll: true, focusVisible: !byPointer } as FocusOptions);
}

function open(trigger: HTMLElement, byPointer: boolean): void {
  const dialog = document.querySelector<HTMLDialogElement>(DIALOG);
  const stage = dialog?.querySelector<HTMLElement>('[data-lightbox-stage]');
  const thumb = trigger.querySelector('img');
  if (!dialog || !stage || !thumb || session || dialog.open) return;

  const src = pickLightboxSource(
    thumb.getAttribute('srcset'),
    window.innerWidth,
    trigger.getAttribute('href') ?? thumb.currentSrc,
  );
  if (!src) return;

  const image = document.createElement('img');
  image.className = 'lightbox__image';
  image.alt = thumb.alt;
  image.decoding = 'async';
  image.draggable = false;
  image.src = src;
  stage.replaceChildren(image);

  const scroll = { x: window.scrollX, y: window.scrollY };
  const from = trigger.getBoundingClientRect();
  const restoreLock = lockScroll();
  const fades = [...dialog.querySelectorAll<HTMLElement>('[data-lightbox-fade]')];
  session = {
    dialog,
    trigger,
    image,
    fades,
    from,
    scroll,
    restoreLock,
    closing: false,
    openedAt: performance.now(),
  };
  dialog.showModal();
  focusClose(dialog, byPointer);

  const reduced = prefersReducedMotion();
  fade(fades, [{ opacity: 0 }, { opacity: 1 }], {
    duration: reduced ? REDUCED_LIGHTBOX_MS : LIGHTBOX.open.scrimMs,
    easing: LIGHTBOX.open.scrimEasing,
  });

  const current = session;
  image
    .decode()
    .catch(() => undefined)
    .then(() => {
      if (session !== current || current.closing) return;
      image.setAttribute(READY_ATTR, '');
      const transform =
        !reduced && isRectInView(from, window.innerHeight)
          ? flipTransform(from, image.getBoundingClientRect())
          : null;
      image.animate(
        openKeyframes(transform),
        transform
          ? { duration: LIGHTBOX.open.imageMs, easing: LIGHTBOX.open.imageEasing }
          : { duration: REDUCED_LIGHTBOX_MS, easing: LIGHTBOX.close.easing },
      );
    });
}

/** Puts everything back: dialog, image, scroll lock, scroll position and focus. */
function finish(current: Session): void {
  if (session !== current) return;
  session = null;
  const { dialog, image, trigger, scroll, restoreLock } = current;
  for (const el of [image, ...current.fades]) {
    for (const animation of el.getAnimations()) animation.cancel();
  }
  if (dialog.open) dialog.close();
  image.remove();
  restoreLock();
  if (trigger.isConnected) trigger.focus({ preventScroll: true });
  window.scrollTo(scroll.x, scroll.y);
}

function close(): void {
  const current = session;
  if (!current || current.closing) return;
  current.closing = true;
  const { image } = current;
  for (const animation of image.getAnimations()) animation.cancel();

  const reduced = prefersReducedMotion();
  const ready = image.hasAttribute(READY_ATTR);
  const rect = current.trigger.getBoundingClientRect();
  const transform =
    !reduced && ready && isRectInView(rect, window.innerHeight)
      ? flipTransform(rect, image.getBoundingClientRect())
      : null;
  const timing: KeyframeAnimationOptions = {
    duration: reduced ? REDUCED_LIGHTBOX_MS : LIGHTBOX.close.durationMs,
    easing: LIGHTBOX.close.easing,
    fill: 'forwards',
  };
  fade(current.fades, [{ opacity: 1 }, { opacity: 0 }], timing);
  const flight = image.animate(closeKeyframes(ready ? transform : null), timing);
  const done = () => finish(current);
  flight.finished.then(done, done);
}

/** Opens only on a plain primary click; modified clicks keep the link (new tab, download). */
function onClick(event: MouseEvent): void {
  if (event.defaultPrevented) return;
  const target = event.target instanceof Element ? event.target : null;
  if (session) {
    if (target?.closest(DIALOG) !== session.dialog) return;
    event.preventDefault();
    const dismiss = {
      onClose: Boolean(target?.closest('[data-lightbox-close]')),
      detail: event.detail,
      sinceOpenMs: performance.now() - session.openedAt,
    };
    if (closesOnClick(dismiss)) close();
    return;
  }
  const trigger = target?.closest<HTMLElement>(TRIGGER);
  if (!trigger || !isPlainClick(event)) return;
  event.preventDefault();
  // `detail` is 0 for the click that Enter fires on the link.
  open(trigger, event.detail > 0);
}

/**
 * Enter (native click of the link) and Space open, as a button; Escape goes through `cancel`. While
 * open, Tab stays on the Close button, the only control (the reference blocks Tab as well).
 */
function onKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented) return;
  if (session) {
    if (event.key === 'Tab') {
      event.preventDefault();
      focusClose(session.dialog, false);
    }
    return;
  }
  if (event.key !== ' ') return;
  const trigger =
    event.target instanceof Element ? event.target.closest<HTMLElement>(TRIGGER) : null;
  if (!trigger) return;
  event.preventDefault();
  if (!event.repeat) open(trigger, false);
}

/** Escape: `cancel` is prevented so the close animates; a forced close (no activation) still cleans up. */
function onCancel(event: Event): void {
  if (!session || event.target !== session.dialog) return;
  event.preventDefault();
  close();
}

function onDialogClose(event: Event): void {
  if (session && event.target === session.dialog) finish(session);
}

/** A navigation (back button) while open: drop the lightbox at once, before the page is swapped. */
function onNavigate(): void {
  if (session) finish(session);
}

let bound = false;

export function startLightbox(): void {
  if (bound) return;
  bound = true;
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeyDown);
  // `cancel` and `close` do not bubble: capture them on the document.
  document.addEventListener('cancel', onCancel, true);
  document.addEventListener('close', onDialogClose, true);
  document.addEventListener('astro:before-preparation', onNavigate);
  document.addEventListener('astro:page-load', upgradeTriggers);
  upgradeTriggers();
}
