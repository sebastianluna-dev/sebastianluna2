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
    expect(normalizePath('en')).toBe('/en');
  });
});

describe('splitLocale', () => {
  it('reads Spanish from unprefixed paths', () => {
    expect(splitLocale('/')).toEqual({ locale: 'es', path: '/' });
    expect(splitLocale('/works/reto-md')).toEqual({ locale: 'es', path: '/works/reto-md' });
  });

  it('reads English from /en', () => {
    expect(splitLocale('/en')).toEqual({ locale: 'en', path: '/' });
    expect(splitLocale('/en/')).toEqual({ locale: 'en', path: '/' });
    expect(splitLocale('/en/works/reto-md')).toEqual({ locale: 'en', path: '/works/reto-md' });
  });

  it('does not take /english for /en', () => {
    expect(splitLocale('/english')).toEqual({ locale: 'es', path: '/english' });
  });
});

describe('localizePath', () => {
  it('leaves Spanish paths unprefixed', () => {
    expect(localizePath('/works/reto-md', 'es')).toBe('/works/reto-md');
    expect(localizePath('/', 'es')).toBe('/');
  });

  it('prefixes English paths without a trailing slash', () => {
    expect(localizePath('/', 'en')).toBe('/en');
    expect(localizePath('/works/reto-md', 'en')).toBe('/en/works/reto-md');
  });

  it('keeps hash and query', () => {
    expect(localizePath('/#works', 'en')).toBe('/en#works');
    expect(localizePath('/#works', 'es')).toBe('/#works');
    expect(localizePath('/works/x?a=1#outcome', 'en')).toBe('/en/works/x?a=1#outcome');
  });
});

describe('switchLocalePath', () => {
  it('maps a page to its twin', () => {
    expect(switchLocalePath('/works/vallarta-tours', 'en')).toBe('/en/works/vallarta-tours');
    expect(switchLocalePath('/en/works/vallarta-tours', 'es')).toBe('/works/vallarta-tours');
    expect(switchLocalePath('/en', 'es')).toBe('/');
  });
});

describe('canonical and alternates', () => {
  it('use the www host without trailing slashes', () => {
    expect(canonicalUrl('/')).toBe('https://www.sebastianluna.dev/');
    expect(canonicalUrl('/en/')).toBe('https://www.sebastianluna.dev/en');
    expect(canonicalUrl('/works/reto-md/')).toBe('https://www.sebastianluna.dev/works/reto-md');
    expect(absoluteUrl('/cv/es/cv.pdf')).toBe('https://www.sebastianluna.dev/cv/es/cv.pdf');
  });

  it('list es, en and x-default for any page of either language', () => {
    const expected = [
      { hreflang: 'es-MX', href: 'https://www.sebastianluna.dev/works/reto-md' },
      { hreflang: 'en', href: 'https://www.sebastianluna.dev/en/works/reto-md' },
      { hreflang: 'x-default', href: 'https://www.sebastianluna.dev/works/reto-md' },
    ];
    expect(alternates('/works/reto-md')).toEqual(expected);
    expect(alternates('/en/works/reto-md')).toEqual(expected);
    expect(alternates('/en')).toEqual([
      { hreflang: 'es-MX', href: 'https://www.sebastianluna.dev/' },
      { hreflang: 'en', href: 'https://www.sebastianluna.dev/en' },
      { hreflang: 'x-default', href: 'https://www.sebastianluna.dev/' },
    ]);
  });
});
