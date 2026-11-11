import { describe, expect, it } from 'vitest';
import {
  absoluteUrl,
  alternates,
  canonicalUrl,
  localizePath,
  normalizePath,
  splitLocale,
  switchLocalePath,
} from './i18n-paths';

describe('normalizePath', () => {
  it('drops trailing slashes but keeps the root', () => {
    expect(normalizePath('/works/reto-md/')).toBe('/works/reto-md');
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('es')).toBe('/es');
  });
});

describe('splitLocale', () => {
  it('reads English from unprefixed paths', () => {
    expect(splitLocale('/')).toEqual({ locale: 'en', path: '/' });
    expect(splitLocale('/works/reto-md')).toEqual({ locale: 'en', path: '/works/reto-md' });
  });

  it('reads Spanish from /es', () => {
    expect(splitLocale('/es')).toEqual({ locale: 'es', path: '/' });
    expect(splitLocale('/es/')).toEqual({ locale: 'es', path: '/' });
    expect(splitLocale('/es/works/reto-md')).toEqual({ locale: 'es', path: '/works/reto-md' });
  });

  it('does not take /espanol for /es', () => {
    expect(splitLocale('/espanol')).toEqual({ locale: 'en', path: '/espanol' });
  });
});

describe('localizePath', () => {
  it('leaves English paths unprefixed', () => {
    expect(localizePath('/works/reto-md', 'en')).toBe('/works/reto-md');
    expect(localizePath('/', 'en')).toBe('/');
  });

  it('prefixes Spanish paths without a trailing slash', () => {
    expect(localizePath('/', 'es')).toBe('/es');
    expect(localizePath('/works/reto-md', 'es')).toBe('/es/works/reto-md');
  });

  it('keeps hash and query', () => {
    expect(localizePath('/#works', 'es')).toBe('/es#works');
    expect(localizePath('/#works', 'en')).toBe('/#works');
    expect(localizePath('/works/x?a=1#outcome', 'es')).toBe('/es/works/x?a=1#outcome');
  });
});

describe('switchLocalePath', () => {
  it('maps a page to its twin', () => {
    expect(switchLocalePath('/works/vallarta-tours', 'es')).toBe('/es/works/vallarta-tours');
    expect(switchLocalePath('/es/works/vallarta-tours', 'en')).toBe('/works/vallarta-tours');
    expect(switchLocalePath('/es', 'en')).toBe('/');
  });
});

describe('canonical and alternates', () => {
  it('use the www host without trailing slashes', () => {
    expect(canonicalUrl('/')).toBe('https://www.sebastianluna.dev/');
    expect(canonicalUrl('/es/')).toBe('https://www.sebastianluna.dev/es');
    expect(canonicalUrl('/works/reto-md/')).toBe('https://www.sebastianluna.dev/works/reto-md');
    expect(absoluteUrl('/cv/es/cv.pdf')).toBe('https://www.sebastianluna.dev/cv/es/cv.pdf');
  });

  it('list es, en and x-default (English) for any page of either language', () => {
    const expected = [
      { hreflang: 'es-MX', href: 'https://www.sebastianluna.dev/es/works/reto-md' },
      { hreflang: 'en', href: 'https://www.sebastianluna.dev/works/reto-md' },
      { hreflang: 'x-default', href: 'https://www.sebastianluna.dev/works/reto-md' },
    ];
    expect(alternates('/works/reto-md')).toEqual(expected);
    expect(alternates('/es/works/reto-md')).toEqual(expected);
    expect(alternates('/es')).toEqual([
      { hreflang: 'es-MX', href: 'https://www.sebastianluna.dev/es' },
      { hreflang: 'en', href: 'https://www.sebastianluna.dev/' },
      { hreflang: 'x-default', href: 'https://www.sebastianluna.dev/' },
    ]);
  });
});
