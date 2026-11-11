import { describe, expect, it } from 'vitest';
import { notFoundLocale } from '@/lib/not-found';
import { initNotFound, notFoundInlineScript } from './not-found.inline';

const DATA = { prefix: 'es', lang: 'es', title: 'Página no encontrada | Sebastian Luna' };

function fakeWindow(pathname: string) {
  const doc = { documentElement: { lang: 'en' }, title: 'Page not found | Sebastian Luna' };
  return { win: { location: { pathname }, document: doc } as unknown as Window, doc };
}

describe('initNotFound', () => {
  it('switches lang and title to Spanish under /es', () => {
    for (const path of ['/es', '/es/', '/es/no-existe', '/es/works/x/']) {
      const { win, doc } = fakeWindow(path);
      initNotFound(win, DATA);
      expect(doc.documentElement.lang).toBe('es');
      expect(doc.title).toBe(DATA.title);
    }
  });

  it('keeps the English document anywhere else', () => {
    for (const path of ['/', '/not-found', '/espanol', '/esx', '/works/es']) {
      const { win, doc } = fakeWindow(path);
      initNotFound(win, DATA);
      expect(doc.documentElement.lang).toBe('en');
      expect(doc.title).toBe('Page not found | Sebastian Luna');
    }
  });

  it('agrees with notFoundLocale (the splitLocale rule)', () => {
    for (const path of ['/', '/es', '/es/', '/es/a/b', '/espanol', '/esx/y', '/x/es', '/ES']) {
      const { win, doc } = fakeWindow(path);
      initNotFound(win, DATA);
      expect(doc.documentElement.lang).toBe(notFoundLocale(path));
    }
  });
});

describe('notFoundInlineScript', () => {
  it('is a self-contained call with its data', () => {
    const source = notFoundInlineScript(DATA);
    const { win, doc } = fakeWindow('/es/x');
    new Function('window', source)(win);
    expect(doc.documentElement.lang).toBe('es');
    expect(doc.title).toBe(DATA.title);
  });

  it('cannot close its script element', () => {
    const source = notFoundInlineScript({ prefix: 'es', lang: 'es', title: '</script><b>' });
    expect(source).not.toContain('</script>');
    const { win, doc } = fakeWindow('/es');
    new Function('window', source)(win);
    expect(doc.title).toBe('</script><b>');
  });
});
