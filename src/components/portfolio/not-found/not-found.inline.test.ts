import { describe, expect, it } from 'vitest';
import { notFoundLocale } from '@/lib/not-found';
import { initNotFound, notFoundInlineScript } from './not-found.inline';

const DATA = { lang: 'en', title: 'Page not found | Sebastian Luna' };

function fakeWindow(pathname: string) {
  const doc = { documentElement: { lang: 'es' }, title: 'Página no encontrada | Sebastian Luna' };
  return { win: { location: { pathname }, document: doc } as unknown as Window, doc };
}

describe('initNotFound', () => {
  it('switches lang and title to English under /en', () => {
    for (const path of ['/en', '/en/', '/en/no-existe', '/en/works/x/']) {
      const { win, doc } = fakeWindow(path);
      initNotFound(win, DATA);
      expect(doc.documentElement.lang).toBe('en');
      expect(doc.title).toBe(DATA.title);
    }
  });

  it('keeps the Spanish document anywhere else', () => {
    for (const path of ['/', '/no-existe', '/english', '/enx', '/works/en']) {
      const { win, doc } = fakeWindow(path);
      initNotFound(win, DATA);
      expect(doc.documentElement.lang).toBe('es');
      expect(doc.title).toBe('Página no encontrada | Sebastian Luna');
    }
  });

  it('agrees with notFoundLocale (the splitLocale rule)', () => {
    for (const path of ['/', '/en', '/en/', '/en/a/b', '/english', '/enx/y', '/x/en', '/EN']) {
      const { win, doc } = fakeWindow(path);
      initNotFound(win, DATA);
      expect(doc.documentElement.lang).toBe(notFoundLocale(path));
    }
  });
});

describe('notFoundInlineScript', () => {
  it('is a self-contained call with its data', () => {
    const source = notFoundInlineScript(DATA);
    const { win, doc } = fakeWindow('/en/x');
    new Function('window', source)(win);
    expect(doc.documentElement.lang).toBe('en');
    expect(doc.title).toBe(DATA.title);
  });

  it('cannot close its script element', () => {
    const source = notFoundInlineScript({ lang: 'en', title: '</script><b>' });
    expect(source).not.toContain('</script>');
    const { win, doc } = fakeWindow('/en');
    new Function('window', source)(win);
    expect(doc.title).toBe('</script><b>');
  });
});
