/**
 * Page appear for React islands, with the same presets and WAAPI engine as `AppearMotion.astro`, so
 * an island that only needs a reveal does not pull `motion` (animation-inventory.md §3.3).
 *
 * Spread `props` on the element (SSR gets the `data-appear*` attributes and the custom properties the
 * `html.js` rules read) and pass `ref`. With `onMount` the appear plays when the node mounts instead
 * of waiting for the observer (BL-01). The pre-animation CSS ships with `AppearMotion.astro`, which
 * the home and case views render; a page without it shows the island's appear from its first frame.
 */
import { useCallback, useMemo, type CSSProperties, type RefCallback } from 'react';
import { appearInitialVars, appearProperties } from '@/lib/motion-policy';
import { bindAppearElement, playAppear, startAppearEngine } from './appear.client';
import { APPEAR_PRESETS, type AppearPresetName, type AppearSlot } from './presets';

export interface UseAppearOptions {
  /** Seconds from the intersection (or from the mount with `onMount`); overrides the slot's. */
  delay?: number;
  onMount?: boolean;
}

export interface AppearProps {
  'data-appear': AppearPresetName;
  'data-appear-delay'?: number;
  'data-appear-from'?: string;
  style: CSSProperties;
}

export interface UseAppearResult<T extends HTMLElement> {
  ref: RefCallback<T>;
  props: AppearProps;
}

export function useAppear<T extends HTMLElement = HTMLElement>(
  choice: AppearSlot | AppearPresetName,
  options: UseAppearOptions = {},
): UseAppearResult<T> {
  const preset = typeof choice === 'string' ? choice : choice.preset;
  const delay = options.delay ?? (typeof choice === 'string' ? 0 : choice.delay);
  const onMount = options.onMount ?? false;

  const props = useMemo<AppearProps>(() => {
    const definition = APPEAR_PRESETS[preset];
    const from = appearProperties(definition).join(' ');
    return {
      'data-appear': preset,
      ...(delay > 0 ? { 'data-appear-delay': delay } : {}),
      ...(from ? { 'data-appear-from': from } : {}),
      style: appearInitialVars(definition) as CSSProperties,
    };
  }, [preset, delay]);

  const ref = useCallback<RefCallback<T>>(
    (el) => {
      if (!el) return;
      startAppearEngine();
      if (onMount) playAppear(el, { preset, delay });
      else bindAppearElement(el);
    },
    [preset, delay, onMount],
  );

  return { ref, props };
}
