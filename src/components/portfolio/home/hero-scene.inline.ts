/**
 * Hero "selected name" scene: timings and the render-blocking bootstrap (HE-01…HE-03, HE-10, HE-12).
 *
 * The scene is CSS keyframes (HeroSelectionScene.astro). This script only decides, before the first
 * paint, which state the scene starts in, and how far into it:
 *
 * - `enter`: plays, with every delay shifted by `--hero-scene-elapsed` (negative = extra wait, so the
 *   scene starts `startOffsetMs` after the page appears, HE-01; positive = resumes mid-scene after an
 *   SPA round trip, like the reference's `__ikHeroSceneStarts`).
 * - `done`: final state at once. Once per tab and route (`sessionStorage`), also on reload (RT-14).
 * - `reduced`: `prefers-reduced-motion: reduce` → every piece fades in 200 ms, nothing moves (HE-10).
 * - no state (no JS, or the script failed): the CSS default IS the final state (design-spec §8).
 *
 * It also places the title words on their visual lines (HE-03: delay 220 + 90·line, 440 ms on line 1),
 * again when the fonts settle or the title resizes, and ends the scene on `focusin` so a focused
 * control is never transparent (animation-inventory §4).
 *
 * `initHeroScene` must stay self-contained: HeroSelectionScene inlines its source text.
 */
import { HERO_SCENE } from '@/components/motion/presets';

/** Length of the scene for a title of `wordCount` words (the reference's `max(V, E + n·M + T)`). */
export function heroSceneMs(wordCount: number): number {
  const { minSceneMs, titleDelayMs, lineStaggerMs, wordMs } = HERO_SCENE;
  return Math.max(minSceneMs, titleDelayMs + wordCount * lineStaggerMs + wordMs);
}

export interface HeroSceneConfig {
  id: string;
  storageKey: string;
  sceneMs: number;
  startOffsetMs: number;
  pageWaitMs: number;
  titleDelayMs: number;
  lineStaggerMs: number;
  wordMs: number;
  secondLineWordMs: number;
}

export type HeroSceneState = 'enter' | 'done' | 'reduced';

type SceneWindow = Window &
  Pick<typeof globalThis, 'ResizeObserver'> & { __pfHeroSceneStarts?: Record<string, number> };

export function initHeroScene(win: Window, cfg: HeroSceneConfig): void {
  const doc = win.document;
  const root = doc.getElementById(cfg.id);
  if (!root) return;

  const setState = (state: HeroSceneState): void => {
    root.dataset.state = state;
  };

  const path = win.location.pathname;
  const scoped = win as SceneWindow;
  // Lives as long as the document: an SPA round trip resumes the scene where it is.
  const starts = (scoped.__pfHeroSceneStarts ??= {});
  const now = win.performance.now();
  let seen = false;
  try {
    const key = cfg.storageKey + ':' + path;
    seen = win.sessionStorage.getItem(key) === '1';
    win.sessionStorage.setItem(key, '1');
  } catch {
    // Storage blocked: the scene simply plays.
  }
  // While the document parses, the appears have not started yet (they bind on DOMContentLoaded,
  // after the deferred module scripts): hold the scene and let DOMContentLoaded set T0 (below).
  const waitForPage = !seen && doc.readyState === 'loading';
  const start = (starts[path] ??= seen
    ? now - cfg.sceneMs - cfg.startOffsetMs
    : now + (waitForPage ? cfg.pageWaitMs : cfg.startOffsetMs));
  const elapsed = Math.round(now - start);

  if (elapsed >= cfg.sceneMs) {
    setState('done');
    return;
  }
  if (win.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setState('reduced');
    return;
  }

  const words = Array.from(root.querySelectorAll<HTMLElement>('[data-hero-word]'));
  const placeWords = (): void => {
    let line = 0;
    let previous: number | null = null;
    for (const word of words) {
      const top = word.offsetTop;
      if (previous !== null && Math.abs(top - previous) > 1) line += 1;
      previous = top;
      word.style.setProperty(
        '--hero-word-delay',
        cfg.titleDelayMs + line * cfg.lineStaggerMs + 'ms',
      );
      word.style.setProperty(
        '--hero-word-duration',
        (line === 1 ? cfg.secondLineWordMs : cfg.wordMs) + 'ms',
      );
    }
  };

  placeWords();
  root.style.setProperty('--hero-scene-elapsed', elapsed + 'ms');
  setState('enter');

  const title = root.querySelector('[data-hero-title]');
  const resize =
    title && 'ResizeObserver' in win ? new scoped.ResizeObserver(() => placeWords()) : null;
  if (resize && title) resize.observe(title);
  doc.fonts?.ready.then(() => {
    if (root.dataset.state === 'enter') placeWords();
  });

  let timer = 0;
  const finish = (): void => {
    win.clearTimeout(timer);
    resize?.disconnect();
    root.removeEventListener('focusin', finish);
    if (root.dataset.state === 'enter') setState('done');
  };
  timer = win.setTimeout(finish, cfg.sceneMs - elapsed);
  root.addEventListener('focusin', finish);

  // The page appears start on DOMContentLoaded (appear.client.ts). On a first play, while nothing
  // of the scene shows yet, T0 becomes that moment + the offset. The running animations keep their
  // start time, so only the elapsed shift changes: elapsed' = elapsed − (start' − start).
  if (waitForPage && elapsed < 0) {
    doc.addEventListener(
      'DOMContentLoaded',
      () => {
        const t = win.performance.now();
        const current = starts[path] ?? start;
        const next = t + cfg.startOffsetMs;
        if (root.dataset.state !== 'enter' || t >= current) return;
        starts[path] = next;
        root.style.setProperty('--hero-scene-elapsed', Math.round(elapsed - (next - start)) + 'ms');
        win.clearTimeout(timer);
        timer = win.setTimeout(finish, next + cfg.sceneMs - t);
      },
      { once: true },
    );
  }
}

/** Config of the scene for a title of `wordCount` words. */
export function heroSceneConfig(wordCount: number): HeroSceneConfig {
  return {
    id: HERO_SCENE.id,
    storageKey: HERO_SCENE.storageKey,
    sceneMs: heroSceneMs(wordCount),
    startOffsetMs: HERO_SCENE.startOffsetMs,
    pageWaitMs: HERO_SCENE.pageWaitMs,
    titleDelayMs: HERO_SCENE.titleDelayMs,
    lineStaggerMs: HERO_SCENE.lineStaggerMs,
    wordMs: HERO_SCENE.wordMs,
    secondLineWordMs: HERO_SCENE.secondLineWordMs,
  };
}

/** Source text for `<script is:inline>` right after the scene: the function, called at once. */
export function heroSceneInlineScript(wordCount: number): string {
  return `(${initHeroScene.toString()})(window,${JSON.stringify(heroSceneConfig(wordCount))});`;
}
