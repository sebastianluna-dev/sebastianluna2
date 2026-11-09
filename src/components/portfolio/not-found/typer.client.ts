/**
 * 404 terminal engine (RT-07…RT-09, docs/analisis/404-spec.md §5.2): vanilla, no React or motion.
 *
 * - Every line ships its full text in the SSR; the engine only reveals it. It computes the schedule
 *   once (`typeSchedule`) and, on each animation frame, writes `typerStateAt(elapsed)` to the lines:
 *   `data-state` (`typing` | `done`, absent while hidden), `data-caret` and `--typed`, which the CSS
 *   turns into a width of `--typed` × 1ch. Screen readers always get the whole text.
 * - Runs only on the terminal of the document's language (the other one is `display: none`).
 * - Focus inside the terminal (Tab to the link) or any key finishes the typing at once.
 * - Reduced motion: nothing is typed and the final cursor stays still; switching to reduce midway
 *   finishes at once.
 * - When the last line is done, the final cursor blinks with WAAPI (`NOT_FOUND_TYPER`).
 * - Sets the title of the terminal's language: after a router swap into the 404 the head script
 *   has not run, so a broken `/en/…` link would keep the Spanish title.
 * - Starts on load and on `astro:page-load` (arrival through <ClientRouter/>), stops on
 *   `astro:before-swap`, and marks the scripts as ready (otherwise the theme bootstrap's rescue would
 *   drop the page to the no-JS render after 4 s).
 */
import { NOT_FOUND_TYPER } from '@/components/motion/presets';
import { prefersReducedMotion, watchReducedMotion } from '@/lib/motion-policy';
import { markScriptsReady } from '@/lib/scripts-ready';
import { typeSchedule, typerStateAt, type TyperLine, type TyperState } from '@/lib/typer';

const SCREEN = '[data-typer-screen]';
const LINE = '[data-typer-line]';
const PREFIX = '[data-typer-prefix]';
const TEXT = '[data-typer-text]';
const CURSOR = '[data-typer-cursor]';

/** The terminal of the document's language, else the first one. */
function activeScreen(): HTMLElement | null {
  const screens = [...document.querySelectorAll<HTMLElement>(SCREEN)];
  const lang = document.documentElement.lang;
  return screens.find((screen) => screen.lang === lang) ?? screens[0] ?? null;
}

function readLine(line: HTMLElement): TyperLine {
  const prefix = line.querySelector(PREFIX)?.textContent ?? '';
  const text = line.querySelector(TEXT)?.textContent ?? '';
  return prefix ? { prefix, text } : { text };
}

function blinkCursor(screen: HTMLElement): void {
  const cursor = screen.querySelector<HTMLElement>(CURSOR);
  if (!cursor || prefersReducedMotion()) return;
  const { cursorKeyframes, cursorBlinkMs, cursorEasing, cursorInitialOpacity } = NOT_FOUND_TYPER;
  cursor.style.opacity = String(cursorInitialOpacity);
  cursor.animate(
    cursorKeyframes.map((opacity) => ({ opacity })),
    { duration: cursorBlinkMs, easing: cursorEasing, iterations: Infinity, fill: 'both' },
  );
}

/** Starts the typer on `screen`; returns its teardown. */
function bind(screen: HTMLElement): () => void {
  const lineEls = [...screen.querySelectorAll<HTMLElement>(LINE)];
  const finishNow = (): void => {
    screen.dataset.typer = 'done';
    for (const line of lineEls) {
      line.dataset.state = 'done';
      line.removeAttribute('data-caret');
      line.style.removeProperty('--typed');
    }
    blinkCursor(screen);
  };

  if (prefersReducedMotion()) {
    finishNow();
    return () => {};
  }

  const schedule = typeSchedule(lineEls.map(readLine), NOT_FOUND_TYPER);
  const applied: Array<string | undefined> = [];
  let frame = 0;
  let start: number | undefined;
  let finished = false;

  const write = (state: TyperState): void => {
    state.lines.forEach((line, index) => {
      const el = lineEls[index];
      const key = `${line.visible}|${line.caret}|${line.typed}|${line.done}`;
      if (!el || applied[index] === key) return;
      applied[index] = key;
      if (line.done) el.dataset.state = 'done';
      else if (line.visible) el.dataset.state = 'typing';
      else el.removeAttribute('data-state');
      el.toggleAttribute('data-caret', line.caret);
      if (line.done) el.style.removeProperty('--typed');
      else el.style.setProperty('--typed', String(line.typed));
    });
  };

  const stop = (): void => {
    cancelAnimationFrame(frame);
    screen.removeEventListener('focusin', finish);
    document.removeEventListener('keydown', finish);
    unwatch();
  };

  function finish(): void {
    if (finished) return;
    finished = true;
    stop();
    finishNow();
  }

  const tick = (now: number): void => {
    start ??= now;
    const state = typerStateAt(schedule, lineEls.length, now - start);
    write(state);
    if (state.finished) finish();
    else frame = requestAnimationFrame(tick);
  };

  const unwatch = watchReducedMotion((reduced) => {
    if (reduced) finish();
  });
  screen.addEventListener('focusin', finish);
  document.addEventListener('keydown', finish);
  screen.dataset.typer = 'running';
  frame = requestAnimationFrame(tick);
  return stop;
}

let teardown: (() => void) | undefined;

function run(): void {
  const screen = activeScreen();
  if (!screen || screen.dataset.typer) return;
  // A router swap does not rerun the head script: the title follows the language here too.
  if (screen.dataset.typerTitle) document.title = screen.dataset.typerTitle;
  teardown?.();
  teardown = bind(screen);
}

let started = false;

export function startNotFoundTyper(): void {
  if (started) return;
  started = true;
  markScriptsReady();
  // The router copies the new document's <html> attributes, so the mark goes again on every swap.
  document.addEventListener('astro:after-swap', () => markScriptsReady());
  document.addEventListener('astro:page-load', run);
  document.addEventListener('astro:before-swap', () => {
    teardown?.();
    teardown = undefined;
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}
