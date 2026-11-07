import { describe, expect, it, vi } from 'vitest';
import { HERO_SCENE } from '@/components/motion/presets';
import {
  heroSceneConfig,
  heroSceneInlineScript,
  heroSceneMs,
  initHeroScene,
} from './hero-scene.inline';

interface FakeOptions {
  path?: string;
  now?: number;
  seen?: boolean;
  reduced?: boolean;
  storageThrows?: boolean;
  /** offsetTop of each title word. */
  tops?: number[];
  starts?: Record<string, number>;
  withRoot?: boolean;
  readyState?: DocumentReadyState;
}

function fakeWord(top: number) {
  const props = new Map<string, string>();
  return {
    offsetTop: top,
    style: { setProperty: (k: string, v: string) => props.set(k, v) },
    props,
  };
}

function fakeWindow({
  path = '/',
  now = 1000,
  seen = false,
  reduced = false,
  storageThrows = false,
  tops = [0, 0, 0, 0, 0],
  starts,
  withRoot = true,
  readyState = 'complete',
}: FakeOptions = {}) {
  let clock = now;
  const docListeners = new Map<string, () => void>();
  const store = new Map<string, string>(seen ? [[`${HERO_SCENE.storageKey}:${path}`, '1']] : []);
  const words = tops.map(fakeWord);
  const rootListeners = new Map<string, () => void>();
  const rootProps = new Map<string, string>();
  const timers: Array<{ fn: () => void; ms: number }> = [];
  const observed: unknown[] = [];
  let disconnected = false;
  const root = {
    dataset: {} as Record<string, string>,
    style: { setProperty: (k: string, v: string) => rootProps.set(k, v) },
    querySelectorAll: () => words,
    querySelector: () => ({ title: true }),
    addEventListener: (type: string, fn: () => void) => rootListeners.set(type, fn),
    removeEventListener: (type: string) => rootListeners.delete(type),
  };
  let fontsReady: () => void = () => {};
  const win = {
    __pfHeroSceneStarts: starts,
    document: {
      getElementById: (id: string) => (withRoot && id === HERO_SCENE.id ? root : null),
      fonts: { ready: { then: (fn: () => void) => (fontsReady = fn) } },
      readyState,
      addEventListener: (type: string, fn: () => void) => docListeners.set(type, fn),
    },
    location: { pathname: path },
    performance: { now: () => clock },
    sessionStorage: {
      getItem: (key: string) => {
        if (storageThrows) throw new Error('blocked');
        return store.get(key) ?? null;
      },
      setItem: (key: string, value: string) => {
        if (storageThrows) throw new Error('blocked');
        store.set(key, value);
      },
    },
    matchMedia: vi.fn(() => ({ matches: reduced })),
    setTimeout: (fn: () => void, ms: number) => timers.push({ fn, ms }),
    clearTimeout: vi.fn(),
    ResizeObserver: class {
      observe(target: unknown) {
        observed.push(target);
      }
      disconnect() {
        disconnected = true;
      }
    },
  };
  return {
    win: win as unknown as Window & { __pfHeroSceneStarts?: Record<string, number> },
    root,
    rootProps,
    words,
    store,
    timers,
    observed,
    rootListeners,
    fontsReady: () => fontsReady(),
    isDisconnected: () => disconnected,
    fireDoc: (type: string, at: number) => {
      clock = at;
      docListeners.get(type)?.();
    },
  };
}

const cfg = heroSceneConfig(5);

describe('heroSceneMs', () => {
  it('never ends before 1500 ms (HE-01)', () => {
    expect(heroSceneMs(4)).toBe(1500);
    expect(heroSceneMs(5)).toBe(1500);
  });

  it('grows with very long titles like the reference formula', () => {
    expect(heroSceneMs(10)).toBe(220 + 10 * 90 + 480);
  });
});

describe('initHeroScene', () => {
  it('plays on the first visit, starting 150 ms later (negative elapsed)', () => {
    const fake = fakeWindow();
    initHeroScene(fake.win, cfg);
    expect(fake.root.dataset.state).toBe('enter');
    expect(fake.rootProps.get('--hero-scene-elapsed')).toBe('-150ms');
    expect(fake.store.get('pf-hero-seen:/')).toBe('1');
    expect(fake.timers.at(-1)?.ms).toBe(1650);
  });

  it('is done at once when this tab already saw the route (reload)', () => {
    const fake = fakeWindow({ seen: true });
    initHeroScene(fake.win, cfg);
    expect(fake.root.dataset.state).toBe('done');
    expect(fake.timers).toHaveLength(0);
  });

  it('keeps one memory per route', () => {
    const fake = fakeWindow({ path: '/en', seen: false });
    fake.store.set('pf-hero-seen:/', '1');
    initHeroScene(fake.win, cfg);
    expect(fake.root.dataset.state).toBe('enter');
  });

  it('resumes mid-scene after an SPA round trip in the same document', () => {
    const fake = fakeWindow({ seen: true, now: 1600, starts: { '/': 1000 } });
    initHeroScene(fake.win, cfg);
    expect(fake.root.dataset.state).toBe('enter');
    expect(fake.rootProps.get('--hero-scene-elapsed')).toBe('600ms');
    expect(fake.timers.at(-1)?.ms).toBe(900);
  });

  it('is done when the remembered start is older than the scene', () => {
    const fake = fakeWindow({ now: 9000, starts: { '/': 1000 } });
    initHeroScene(fake.win, cfg);
    expect(fake.root.dataset.state).toBe('done');
  });

  it('fades instead of playing with reduced motion (HE-10)', () => {
    const fake = fakeWindow({ reduced: true });
    initHeroScene(fake.win, cfg);
    expect(fake.root.dataset.state).toBe('reduced');
    expect(fake.rootProps.size).toBe(0);
  });

  it('plays when storage is blocked', () => {
    const fake = fakeWindow({ storageThrows: true });
    initHeroScene(fake.win, cfg);
    expect(fake.root.dataset.state).toBe('enter');
  });

  it('does nothing without the scene', () => {
    const fake = fakeWindow({ withRoot: false });
    expect(() => initHeroScene(fake.win, cfg)).not.toThrow();
  });

  it('places words on visual lines: 220 + 90·line, 440 ms on line 1 (HE-03)', () => {
    const fake = fakeWindow({ tops: [0, 0, 29, 29, 58] });
    initHeroScene(fake.win, cfg);
    const timing = fake.words.map((w) => [
      w.props.get('--hero-word-delay'),
      w.props.get('--hero-word-duration'),
    ]);
    expect(timing).toEqual([
      ['220ms', '480ms'],
      ['220ms', '480ms'],
      ['310ms', '440ms'],
      ['310ms', '440ms'],
      ['400ms', '480ms'],
    ]);
  });

  it('re-places the words when the fonts settle and watches the title size', () => {
    const fake = fakeWindow();
    initHeroScene(fake.win, cfg);
    expect(fake.observed).toHaveLength(1);
    fake.words[1]!.offsetTop = 29;
    fake.fontsReady();
    expect(fake.words[1]!.props.get('--hero-word-delay')).toBe('310ms');
  });

  it('ends at the scene timer and stops watching', () => {
    const fake = fakeWindow();
    initHeroScene(fake.win, cfg);
    fake.timers.at(-1)!.fn();
    expect(fake.root.dataset.state).toBe('done');
    expect(fake.isDisconnected()).toBe(true);
  });

  it('ends at once when focus enters the scene', () => {
    const fake = fakeWindow();
    initHeroScene(fake.win, cfg);
    fake.rootListeners.get('focusin')!();
    expect(fake.root.dataset.state).toBe('done');
    expect(fake.rootListeners.has('focusin')).toBe(false);
  });
});

describe('initHeroScene, start aligned with the page appears', () => {
  it('moves T0 to DOMContentLoaded + 150 ms while nothing shows yet', () => {
    const fake = fakeWindow({ now: 1000, readyState: 'loading' });
    initHeroScene(fake.win, cfg);
    // Held until the page appears start (at most pageWaitMs).
    expect(fake.rootProps.get('--hero-scene-elapsed')).toBe(`-${cfg.pageWaitMs}ms`);
    fake.fireDoc('DOMContentLoaded', 1060);
    // start 4000 → 1210, counted from the same animation start.
    expect(fake.rootProps.get('--hero-scene-elapsed')).toBe('-210ms');
    expect(fake.win.__pfHeroSceneStarts?.['/']).toBe(1210);
    expect(fake.timers.at(-1)?.ms).toBe(1210 + 1500 - 1060);
  });

  it('waits for a late DOMContentLoaded (deferred modules) before T0', () => {
    const fake = fakeWindow({ now: 1000, readyState: 'loading' });
    initHeroScene(fake.win, cfg);
    fake.fireDoc('DOMContentLoaded', 1400);
    expect(fake.rootProps.get('--hero-scene-elapsed')).toBe('-550ms');
    expect(fake.win.__pfHeroSceneStarts?.['/']).toBe(1550);
  });

  it('leaves a scene that already started on its own alone', () => {
    const fake = fakeWindow({ now: 1000, readyState: 'loading' });
    initHeroScene(fake.win, cfg);
    fake.fireDoc('DOMContentLoaded', 1000 + cfg.pageWaitMs + 100);
    expect(fake.rootProps.get('--hero-scene-elapsed')).toBe(`-${cfg.pageWaitMs}ms`);
  });

  it('does not wait when the document is already parsed', () => {
    const fake = fakeWindow({ now: 1000 });
    initHeroScene(fake.win, cfg);
    fake.fireDoc('DOMContentLoaded', 1060);
    expect(fake.rootProps.get('--hero-scene-elapsed')).toBe('-150ms');
  });
});

describe('heroSceneInlineScript', () => {
  it('is the function called with its config', () => {
    const source = heroSceneInlineScript(5);
    expect(source.startsWith('(')).toBe(true);
    expect(source).toContain(JSON.stringify(cfg));
    expect(source).not.toMatch(/\bimport\b|\brequire\(/);
  });
});
