/**
 * Theme bootstrap, inlined render-blocking at the top of <head> (TE-01, design-spec §1 and §8.1).
 *
 * - Reads the single key `pf-theme` ("light" | "dark"; absent = follow the system).
 * - Sets `data-theme` on <html> to the resolved theme before the first paint, and
 *   swaps `no-js` for `js` (the pre-animation states live under `html.js`).
 * - Stamps the incoming document on `astro:before-swap`: <ClientRouter/> replaces every attribute of
 *   <html> with the new document's ones, so `data-theme` never goes missing between the swap and
 *   `astro:after-swap` (observers such as Stellar would read it as "light" and tear down). It runs
 *   again on `astro:after-swap` as a safety net.
 * - Without a stored choice, follows live changes of the system scheme.
 * - Rescue (design-spec §8.1, review R-03): if no page module has marked <html> with `pf-ready`
 *   (`markScriptsReady` in `@/lib/scripts-ready`) within `RESCUE_MS` of the first load (network,
 *   CSP, an extension or a stale chunk after a deploy), `js` goes back to `no-js`, so every
 *   pre-animation state under `html.js` and every JS-only control drop to the no-JS render.
 *
 * `initTheme` must stay self-contained: BaseLayout inlines its source text.
 */
export const THEME_STORAGE_KEY = 'pf-theme';

export type ThemeName = 'light' | 'dark';

export function initTheme(win: Window = window): void {
  const KEY = 'pf-theme';
  const READY = 'pf-ready'; // SCRIPTS_READY_CLASS of @/lib/scripts-ready
  /** Time the page modules get to start before the no-JS render is restored (R-03). */
  const RESCUE_MS = 4000;
  const root = win.document.documentElement;
  const query = win.matchMedia('(prefers-color-scheme: dark)');

  const stored = (): ThemeName | null => {
    try {
      const value = win.localStorage.getItem(KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  };

  const setTheme = (target: HTMLElement): void => {
    target.dataset.theme = stored() ?? (query.matches ? 'dark' : 'light');
  };
  const stamp = (target: HTMLElement): void => {
    setTheme(target);
    target.classList.remove('no-js');
    target.classList.add('js');
  };
  const apply = (): void => stamp(root);

  apply();

  const flags = win as Window & { __pfThemeBound?: boolean };
  if (flags.__pfThemeBound) return;
  flags.__pfThemeBound = true;
  win.setTimeout(() => {
    if (root.classList.contains(READY)) return;
    root.classList.remove('js');
    root.classList.add('no-js');
  }, RESCUE_MS);
  win.document.addEventListener('astro:before-swap', (event: Event) => {
    const incoming = (event as Event & { newDocument?: Document }).newDocument;
    if (incoming) stamp(incoming.documentElement);
  });
  win.document.addEventListener('astro:after-swap', apply);
  // Theme only: a scheme change must not undo the rescue.
  query.addEventListener('change', () => {
    if (!stored()) setTheme(root);
  });
}

/** Source text for `<script is:inline>`: the compiled function, called at once. */
export const themeInlineScript = `(${initTheme.toString()})(window);`;
