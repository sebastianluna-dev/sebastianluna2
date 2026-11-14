import { useEffect, useRef, type RefObject } from 'react';

/** Pixels per second the text travels; a trip lasts at least this long. */
const SPEED = 40;
const MIN_SECONDS = 6;
/** How long the title rests at its start before each trip, in ms. */
const REST_MS = 2000;

/**
 * The site's one-line title that scrolls sideways when it is wider than its box
 * (cuartetofratres, hooks/use-marquee.hook.ts): it rests, travels one copy's width (the second
 * copy follows it, so the loop has no gap) and lands where it began. Adds `scrollingClass` while
 * it overflows; still under reduced motion.
 */
export function useMarquee<T extends HTMLElement>(
  text: string,
  scrollingClass: string,
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const element = ref.current;
    const box = element?.parentElement;
    if (!element || !box) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animation: Animation | null = null;
    let distance = 0;

    const stop = () => {
      animation?.cancel();
      animation = null;
    };

    const measure = () => {
      const copy = element.firstElementChild;
      if (!copy) return;
      const width = copy.getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
      if (width <= box.clientWidth + 2) {
        distance = 0;
        stop();
        element.classList.remove(scrollingClass);
        return;
      }
      element.classList.add(scrollingClass);
      const next = width + gap;
      if (still || (animation && next === distance)) return;
      distance = next;
      stop();
      const travel = Math.max(MIN_SECONDS * 1000, (distance / SPEED) * 1000);
      const total = REST_MS + travel;
      animation = element.animate(
        [
          { transform: 'translateX(0)', offset: 0 },
          { transform: 'translateX(0)', offset: REST_MS / total },
          { transform: `translateX(${-distance}px)`, offset: 1 },
        ],
        { duration: total, iterations: Infinity, easing: 'linear' },
      );
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return stop;
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => {
      observer.disconnect();
      stop();
    };
  }, [text, scrollingClass]);

  return ref;
}
