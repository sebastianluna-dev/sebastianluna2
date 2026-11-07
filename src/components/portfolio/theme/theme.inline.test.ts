import { describe, expect, it, vi } from 'vitest';
import { initTheme, themeInlineScript } from './theme.inline';

interface FakeOptions {
  stored?: string | null;
  systemDark?: boolean;
  storageThrows?: boolean;
}

function fakeWindow({
  stored = null,
  systemDark = false,
  storageThrows = false,
}: FakeOptions = {}) {
  const classes = new Set(['no-js']);
  const docListeners = new Map<string, (event?: unknown) => void>();
  const mediaListeners: Array<() => void> = [];
  const media = {
    matches: systemDark,
    addEventListener: (_: string, fn: () => void) => mediaListeners.push(fn),
  };
  let value = stored;
  const timers: Array<() => void> = [];
  const win = {
    setTimeout: (fn: () => void) => timers.push(fn),
    document: {
      documentElement: {
        dataset: {} as Record<string, string>,
        classList: {
          add: (name: string) => classes.add(name),
          remove: (name: string) => classes.delete(name),
          contains: (name: string) => classes.has(name),
        },
      },
      addEventListener: (type: string, fn: (event?: unknown) => void) => docListeners.set(type, fn),
    },
    matchMedia: vi.fn(() => media),
    localStorage: {
      getItem: () => {
        if (storageThrows) throw new Error('blocked');
        return value;
      },
    },
  };
  return {
    win: win as unknown as Window,
    root: win.document.documentElement,
    classes,
    media,
    setStored: (next: string | null) => (value = next),
    fire: (type: string, event?: unknown) => docListeners.get(type)?.(event),
    runTimers: () => timers.splice(0).forEach((fn) => fn()),
    changeSystem: (dark: boolean) => {
      media.matches = dark;
      mediaListeners.forEach((fn) => fn());
    },
  };
}

describe('initTheme', () => {
  it('follows the system when nothing is stored', () => {
    const fake = fakeWindow({ systemDark: true });
    initTheme(fake.win);
    expect(fake.root.dataset.theme).toBe('dark');
  });

  it('prefers the stored choice', () => {
    const fake = fakeWindow({ stored: 'light', systemDark: true });
    initTheme(fake.win);
    expect(fake.root.dataset.theme).toBe('light');
  });

  it('ignores unknown stored values and blocked storage', () => {
    const junk = fakeWindow({ stored: 'sepia' });
    initTheme(junk.win);
    expect(junk.root.dataset.theme).toBe('light');
    const blocked = fakeWindow({ storageThrows: true, systemDark: true });
    initTheme(blocked.win);
    expect(blocked.root.dataset.theme).toBe('dark');
  });

  it('swaps no-js for js', () => {
    const fake = fakeWindow();
    initTheme(fake.win);
    expect([...fake.classes]).toEqual(['js']);
  });

  it('applies again after a ClientRouter swap', () => {
    const fake = fakeWindow();
    initTheme(fake.win);
    fake.root.dataset.theme = '';
    fake.classes.add('no-js');
    fake.setStored('dark');
    fake.fire('astro:after-swap');
    expect(fake.root.dataset.theme).toBe('dark');
    expect(fake.classes.has('no-js')).toBe(false);
  });

  it('stamps the incoming document before the swap, so data-theme never goes missing', () => {
    const fake = fakeWindow({ stored: 'dark' });
    initTheme(fake.win);
    const incomingClasses = new Set(['no-js']);
    const incoming = {
      dataset: {} as Record<string, string>,
      classList: {
        add: (name: string) => incomingClasses.add(name),
        remove: (name: string) => incomingClasses.delete(name),
      },
    };
    fake.fire('astro:before-swap', { newDocument: { documentElement: incoming } });
    expect(incoming.dataset.theme).toBe('dark');
    expect([...incomingClasses]).toEqual(['js']);
    expect(() => fake.fire('astro:before-swap', {})).not.toThrow();
  });

  it('restores the no-JS render when no page module marked itself ready (R-03)', () => {
    const fake = fakeWindow();
    initTheme(fake.win);
    fake.runTimers();
    expect([...fake.classes]).toEqual(['no-js']);
  });

  it('keeps the JS render once a page module is ready', () => {
    const fake = fakeWindow();
    initTheme(fake.win);
    fake.classes.add('pf-ready');
    fake.runTimers();
    expect(fake.classes.has('js')).toBe(true);
    expect(fake.classes.has('no-js')).toBe(false);
  });

  it('tracks the system only while there is no stored choice', () => {
    const fake = fakeWindow();
    initTheme(fake.win);
    fake.changeSystem(true);
    expect(fake.root.dataset.theme).toBe('dark');
    fake.setStored('light');
    fake.changeSystem(false);
    fake.changeSystem(true);
    expect(fake.root.dataset.theme).toBe('dark');
  });

  it('binds its listeners once per window', () => {
    const fake = fakeWindow();
    initTheme(fake.win);
    initTheme(fake.win);
    expect(fake.win.matchMedia).toHaveBeenCalledTimes(2);
  });
});

describe('themeInlineScript', () => {
  it('is a self-invoking expression that runs on the real window', () => {
    expect(themeInlineScript.startsWith('(')).toBe(true);
    expect(themeInlineScript.endsWith(')(window);')).toBe(true);
    expect(themeInlineScript).not.toMatch(/\b(import|export)\b/);
  });
});
