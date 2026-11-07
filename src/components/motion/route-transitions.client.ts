/**
 * Route transitions of <ClientRouter/> (RT-01…RT-04) on the view-transition pseudo-elements.
 *
 * Once the pseudo tree exists (`viewTransition.ready`), the default animations of the browser and of
 * Astro on the root and on the shared cover are cancelled and ours are played with WAAPI
 * (`routePlan`); the cover's group morph keeps the browser's keyframes, retimed. Pseudo-elements that
 * are not part of this navigation (no shared cover) are left alone.
 * - RT-03: the pill nav is `transition:animate="none"` (Astro hides its old snapshot), so it never moves.
 * - RT-04: with reduced motion every pseudo-element animation is cancelled: the swap is instant.
 */
import { prefersReducedMotion } from '@/lib/motion-policy';
import { routePlan } from '@/lib/route-transitions';

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
    if (reduced || !retime) animation.cancel();
    else animation.effect?.updateTiming(retime);
  }
  if (reduced) return;
  for (const { pseudo, keyframes, timing } of plan.replace) {
    // The root pair always exists; the cover pair only when a card started the navigation.
    if (present.has(pseudo) || pseudo.endsWith('(root)')) {
      root.animate(keyframes, { ...timing, pseudoElement: pseudo });
    }
  }
}

let started = false;

export function startRouteTransitions(): void {
  if (started) return;
  started = true;
  document.addEventListener('astro:before-swap', (event) => {
    const transition = (event as Event & { viewTransition?: ViewTransition }).viewTransition;
    transition?.ready.then(choreograph, () => {});
  });
}
