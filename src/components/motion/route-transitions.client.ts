/**
 * Route transitions of <ClientRouter/> (RT-01…RT-04) on the view-transition pseudo-elements.
 *
 * Once the pseudo tree exists (`viewTransition.ready`), the default animations of the browser and of
 * Astro on the root and on the shared cover are cancelled and ours are played with WAAPI
 * (`routePlan`). The cover's group morph (RT-02) starts from the browser's `from` frame, with our
 * curve on that frame, a linear effect and an implicit end, so it lands on the live cover box. Pseudo-elements that
 * are not part of this navigation (no shared cover) are left alone.
 * - RT-03: the pill nav is `transition:animate="none"` (Astro hides its old snapshot), so it never moves.
 * - RT-04: with reduced motion every pseudo-element animation is cancelled: the swap is instant.
 * - RT-06 (ours, design-spec §9.3): after a ClientRouter navigation the focus stays where Astro
 *   restored it inside a persisted element (the pill nav); otherwise it moves, without scrolling, to
 *   the heading of the hash target or to the page's `h1[tabindex=-1]` (else `main`), so it no longer
 *   falls back to `body`. The route announcer of ClientRouter still reads the title.
 */
import { prefersReducedMotion } from '@/lib/motion-policy';
import { retimeKeyframes, routePlan } from '@/lib/route-transitions';

const PREFIX = '::view-transition';

function pseudoOf(animation: Animation): string | null {
  const effect = animation.effect;
  return effect instanceof KeyframeEffect ? effect.pseudoElement : null;
}

function choreograph(): void {
  const root = document.documentElement;
  const plan = routePlan();
  const reduced = prefersReducedMotion();
  const present = new Set<string>();
  for (const animation of root.getAnimations({ subtree: true })) {
    const pseudo = pseudoOf(animation);
    if (!pseudo?.startsWith(PREFIX)) continue;
    present.add(pseudo);
    const retime = plan.retime[pseudo];
    if (reduced || !retime || !(animation.effect instanceof KeyframeEffect)) {
      animation.cancel();
      continue;
    }
    // RT-02: our own animation from the browser's `from` frame, with the curve on that frame and a
    // linear effect (one curve, not two). The browser's CSS animation is dropped: Chrome rebuilds its
    // keyframes whenever the new cover moves (its appear), which would undo a retime mid-morph.
    const from = retimeKeyframes(animation.effect.getKeyframes(), retime.keyframeEasing);
    animation.cancel();
    root.animate(from, {
      duration: retime.duration,
      easing: retime.easing,
      fill: 'both',
      pseudoElement: pseudo,
    });
  }
  if (reduced) return;
  for (const { pseudo, keyframes, timing } of plan.replace) {
    // The root pair always exists; the cover pair only when a card started the navigation.
    if (present.has(pseudo) || pseudo.endsWith('(root)')) {
      root.animate(keyframes, { ...timing, pseudoElement: pseudo });
    }
  }
}

const PERSISTED = '[data-astro-transition-persist]';
const FOCUS_TARGET = '[tabindex="-1"]';

/** RT-06: the heading of the hash target, else the page's h1, else main. */
function focusTarget(): HTMLElement | null {
  const id = decodeURIComponent(location.hash.slice(1));
  const anchor = id ? document.getElementById(id) : null;
  if (anchor) {
    if (anchor.matches(FOCUS_TARGET)) return anchor;
    const heading = anchor.querySelector<HTMLElement>(':is(h1, h2, h3)');
    if (heading) {
      // A heading that is not a focus target yet becomes one (no ring, portfolio.css), e.g. #works.
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      return heading;
    }
  }
  return (
    document.querySelector<HTMLElement>(`h1${FOCUS_TARGET}`) ??
    document.querySelector<HTMLElement>(`main${FOCUS_TARGET}`)
  );
}

function focusAfterNavigation(): void {
  const active = document.activeElement;
  if (active && active !== document.body && active.closest(PERSISTED)) return;
  focusTarget()?.focus({ preventScroll: true });
}

let started = false;

export function startRouteTransitions(): void {
  if (started) return;
  started = true;
  document.addEventListener('astro:before-swap', (event) => {
    const transition = (event as Event & { viewTransition?: ViewTransition }).viewTransition;
    transition?.ready.then(choreograph, () => {});
  });
  // astro:after-swap only fires for ClientRouter navigations, so the first page load keeps its focus.
  let navigated = false;
  document.addEventListener('astro:after-swap', () => {
    navigated = true;
  });
  document.addEventListener('astro:page-load', () => {
    if (!navigated) return;
    navigated = false;
    focusAfterNavigation();
  });
}
