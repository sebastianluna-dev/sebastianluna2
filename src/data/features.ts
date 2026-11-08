/**
 * Parts of the site that ship in a later phase. Off means not rendered at all, so no control promises
 * an action that does not happen yet (WCAG 3.2 / 4.1, review R-06).
 */
export const FEATURES = {
  /**
   * Blue chat (Phase 6): the launcher and its panel (`blue/BlueLauncher.astro`, rendered by
   * BaseLayout), "Ask Blue" in the hero menu (HE-12) and the ⌘ + ⌥ + / tip (HE-17). The launcher
   * takes the hero's `pf:blue-open` with `preventDefault()`.
   */
  blue: true,
} as const;
