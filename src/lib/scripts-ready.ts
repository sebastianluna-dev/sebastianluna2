/**
 * Handshake between the inline theme bootstrap and the page modules (design-spec §8.1, review R-03).
 * The bootstrap puts `js` on <html> before the first paint and, if no module adds `pf-ready` in time,
 * restores `no-js` (theme.inline.ts keeps its own copy of the class name: it must stay self-contained).
 */
export const SCRIPTS_READY_CLASS = 'pf-ready';

/** Marks <html> as driven by the page modules, which cancels the no-JS rescue. */
export function markScriptsReady(root: Element = document.documentElement): void {
  root.classList.add(SCRIPTS_READY_CLASS);
}

/** True while <html> is in the JS render (not `no-js`, and not rescued back to it). */
export function scriptsActive(root: Element = document.documentElement): boolean {
  return root.classList.contains('js');
}
