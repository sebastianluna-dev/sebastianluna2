/**
 * Language bootstrap of the static 404, inlined render-blocking in its <head> right after the theme
 * bootstrap (fase7-plan §3.1, 404-spec §8.3).
 *
 * The one `404.html` serves every missing URL of both languages and ships `lang="es"` with the
 * Spanish title. Under `/en` this switches `lang` and the title to English before the first paint, so
 * the CSS shows only the English terminal (`:lang()`). The rule is the one of `splitLocale`
 * (`notFoundLocale` in `@/lib/not-found`), repeated here because the function must stay
 * self-contained: NotFoundView inlines its source text.
 */
export interface NotFoundInlineData {
  /** `lang` of <html> for English. */
  lang: string;
  /** English document title. */
  title: string;
}

export function initNotFound(win: Window, data: NotFoundInlineData): void {
  if (!/^\/en(?:\/|$)/.test(win.location.pathname)) return;
  win.document.documentElement.lang = data.lang;
  win.document.title = data.title;
}

/** Source text for `<script is:inline>`: the compiled function, called at once with its data. */
export function notFoundInlineScript(data: NotFoundInlineData): string {
  // `<` escaped so no copy can close the script element.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `(${initNotFound.toString()})(window, ${json});`;
}
