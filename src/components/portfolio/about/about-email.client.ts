/**
 * /about Email copy (about-spec §5.1, fase7-plan §1.2). A click on the wrapper reaches it before the
 * pill nav's document listener: with the async clipboard it prevents the `mailto:`, copies the address,
 * writes "Copied" (or the failure) in the polite live region and shows the speech bubble for
 * `ABOUT_EMAIL_BUBBLE.visibleMs`. Without the clipboard API it does nothing and the mail app opens.
 *
 * The bubble rides one spring (k480 c22) from `enter` to `rest`, then another run from `rest` to
 * `exit`. With reduced motion it only fades its opacity.
 */
import { ABOUT_EMAIL_BUBBLE, REDUCED_APPEAR } from '@/components/motion/presets';
import { prefersReducedMotion } from '@/lib/motion-policy';
import { createSpring, type Spring } from '@/lib/spring';

const ROOT_SELECTOR = '[data-about-email]';

interface Pose {
  opacity: number;
  y: number;
  scale: number;
  rotate: number;
}

const ENTER: Pose = { ...ABOUT_EMAIL_BUBBLE.enter };
const REST: Pose = { ...ABOUT_EMAIL_BUBBLE.rest };
const EXIT: Pose = { ...ABOUT_EMAIL_BUBBLE.exit, rotate: ABOUT_EMAIL_BUBBLE.rest.rotate };

const bound = new Map<HTMLElement, () => void>();
let started = false;

function mix(from: Pose, to: Pose, t: number): Pose {
  const at = (a: number, b: number) => a + (b - a) * t;
  return {
    opacity: Math.min(Math.max(at(from.opacity, to.opacity), 0), 1),
    y: at(from.y, to.y),
    scale: at(from.scale, to.scale),
    rotate: at(from.rotate, to.rotate),
  };
}

function paint(bubble: HTMLElement, pose: Pose) {
  bubble.style.opacity = String(pose.opacity);
  bubble.style.translate = `0 ${pose.y}px`;
  bubble.style.scale = String(pose.scale);
  bubble.style.rotate = `${pose.rotate}deg`;
}

function bind(root: HTMLElement): () => void {
  const email = root.dataset.aboutEmail ?? '';
  const bubble = root.querySelector<HTMLElement>('[data-about-email-bubble]');
  const text = root.querySelector<HTMLElement>('[data-about-email-text]');
  const status = root.querySelector<HTMLElement>('[data-about-email-status]');
  if (!email || !bubble || !text || !status) return () => {};

  let phase: 'enter' | 'exit' = 'enter';
  let hideTimer = 0;
  let fade: Animation | undefined;
  const spring: Spring = createSpring(
    0,
    ABOUT_EMAIL_BUBBLE.spring,
    (t) => {
      paint(bubble, phase === 'enter' ? mix(ENTER, REST, t) : mix(REST, EXIT, t));
    },
    // The bubble's own reduced path is a fade, so the spring always runs when it is used.
    { reducedMotion: () => false },
  );

  const hide = () => {
    if (prefersReducedMotion()) {
      fade?.cancel();
      fade = bubble.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: REDUCED_APPEAR.durationMs,
        easing: REDUCED_APPEAR.easing,
        fill: 'forwards',
      });
      fade.onfinish = () => {
        bubble.hidden = true;
      };
      return;
    }
    phase = 'exit';
    spring.set(0, { jump: true });
    spring.set(1);
    void spring.finished().then(() => {
      if (phase === 'exit') bubble.hidden = true;
    });
  };

  const show = (message: string) => {
    text.textContent = message;
    // Clear first so the same message is announced again on a second copy.
    status.textContent = '';
    window.setTimeout(() => {
      status.textContent = message;
    });
    window.clearTimeout(hideTimer);
    fade?.cancel();
    bubble.hidden = false;
    if (prefersReducedMotion()) {
      paint(bubble, { ...REST, y: 0, rotate: 0, opacity: 1 });
      fade = bubble.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: REDUCED_APPEAR.durationMs,
        easing: REDUCED_APPEAR.easing,
      });
    } else {
      phase = 'enter';
      spring.set(0, { jump: true });
      spring.set(1);
    }
    hideTimer = window.setTimeout(hide, ABOUT_EMAIL_BUBBLE.visibleMs);
  };

  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('a[href^="mailto:"]') || !navigator.clipboard?.writeText) return;
    event.preventDefault();
    navigator.clipboard
      .writeText(email)
      .then(() => show(root.dataset.copied ?? ''))
      .catch(() => show(root.dataset.failed ?? ''));
  };

  root.addEventListener('click', onClick);
  return () => {
    root.removeEventListener('click', onClick);
    window.clearTimeout(hideTimer);
    spring.stop();
    fade?.cancel();
  };
}

function bindAll() {
  for (const root of document.querySelectorAll<HTMLElement>(ROOT_SELECTOR)) {
    if (!bound.has(root)) bound.set(root, bind(root));
  }
}

function releaseAll() {
  for (const release of bound.values()) release();
  bound.clear();
}

/** Binds every /about Email wrapper now and after each navigation. Safe to call more than once. */
export function startAboutEmail(): void {
  if (started || typeof document === 'undefined') return;
  started = true;
  document.addEventListener('astro:page-load', bindAll);
  document.addEventListener('astro:before-swap', releaseAll);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAll, { once: true });
  } else {
    bindAll();
  }
}
