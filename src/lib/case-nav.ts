/**
 * Pure logic shared by the case navigation (case.md §3.1–§3.6): which clicks the case scripts take
 * over (Works Map jump CA-03, lightbox CA-07) and when the back pill hides with the phone chrome
 * (CA-05). The DOM side lives in `works-map.client.ts`, `lightbox.client.ts` and `BackPill.astro`.
 */

/** The modifier and button state of a click, as `MouseEvent` has it. */
export interface ClickLike {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/** A primary click without modifiers (Enter on a link also dispatches one): the router follows it. */
export function isPlainClick(click: ClickLike): boolean {
  return click.button === 0 && !click.metaKey && !click.ctrlKey && !click.shiftKey && !click.altKey;
}

/** What the back pill knows when it decides whether to hide. */
export interface BackPillState {
  /** Last `pf:mobile-chrome` detail (or the pill nav's `data-chrome-hidden` on bind). */
  chromeHidden: boolean;
  /** The phone breakpoint matches: on tablet and desktop the pill never hides (CA-05). */
  phone: boolean;
  /** Focus is inside the pill: it shows and stays shown, so it never leaves the Tab order (D-15). */
  focused: boolean;
}

/** CA-05: the back pill hides with the phone chrome, unless it holds the focus. */
export function backPillHidden({ chromeHidden, phone, focused }: BackPillState): boolean {
  return chromeHidden && phone && !focused;
}
