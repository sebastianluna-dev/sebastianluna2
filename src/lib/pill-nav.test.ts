import { describe, expect, it } from 'vitest';
import {
  activeNavKey,
  ariaCurrentFor,
  initialScrollChromeState,
  MOBILE_CHROME,
  projectPill,
  shouldShowAfterDelay,
  stepScrollChrome,
  type ScrollChromeAction,
  type ScrollChromeState,
} from './pill-nav';

describe('activeNavKey', () => {
  it('marks Inicio on the home of both languages', () => {
    expect(activeNavKey('/')).toBe('home');
    expect(activeNavKey('/en')).toBe('home');
    expect(activeNavKey('/en/')).toBe('home');
  });

  it('marks Trabajos on /#works and on case studies', () => {
    expect(activeNavKey('/', '#works')).toBe('works');
    expect(activeNavKey('/en', '#works')).toBe('works');
    expect(activeNavKey('/works/reto-md')).toBe('works');
    expect(activeNavKey('/en/works/reto-md', '#outcome')).toBe('works');
  });

  it('ignores other hashes on the home and marks nothing elsewhere', () => {
    expect(activeNavKey('/', '#main')).toBe('home');
    expect(activeNavKey('/404')).toBeUndefined();
    expect(activeNavKey('/en/worksx')).toBeUndefined();
  });
});

describe('ariaCurrentFor', () => {
  it('uses location for in-page targets', () => {
    expect(ariaCurrentFor('/#works')).toBe('location');
    expect(ariaCurrentFor('/en#works')).toBe('location');
    expect(ariaCurrentFor('/')).toBe('page');
  });
});

/** Feeds a list of scrollY values and returns the actions. */
function run(
  start: number,
  ys: number[],
): { actions: ScrollChromeAction[]; state: ScrollChromeState } {
  let state = initialScrollChromeState(start);
  const actions: ScrollChromeAction[] = [];
  for (const y of ys) {
    const next = stepScrollChrome(state, y);
    state = next.state;
    actions.push(next.action);
  }
  return { actions, state };
}

describe('stepScrollChrome (SH-08)', () => {
  it('hides after 14 px accumulated downwards', () => {
    const { actions } = run(100, [105, 110, 113, 114]);
    expect(actions).toEqual(['none', 'none', 'none', 'hide']);
  });

  it('schedules the show after 14 px upwards and restarts the count', () => {
    const { actions, state } = run(400, [390, 386, 380, 370]);
    expect(actions).toEqual(['none', 'schedule-show', 'none', 'schedule-show']);
    expect(state.direction).toBe(-1);
  });

  it('resets the distance when the direction changes', () => {
    const { actions } = run(200, [210, 205, 215, 224]);
    // +10 down, -5 up (reset), +10 down (reset), +9 → 19 ≥ 14
    expect(actions).toEqual(['none', 'none', 'none', 'hide']);
  });

  it('always shows near the top', () => {
    const { actions, state } = run(40, [8, 0]);
    expect(actions).toEqual(['show', 'show']);
    expect(state).toEqual({ lastY: 0, distance: 0, direction: 0 });
  });

  it('ignores sub-pixel deltas but keeps the last position', () => {
    const { actions, state } = run(100, [100.5]);
    expect(actions).toEqual(['none']);
    expect(state.lastY).toBe(100.5);
  });

  it('clamps negative scroll (rubber band) to the top', () => {
    expect(stepScrollChrome(initialScrollChromeState(50), -30).action).toBe('show');
  });

  it('shows after the delay only when still going up or near the top', () => {
    const up = run(400, [380]).state;
    const down = run(400, [420]).state;
    expect(shouldShowAfterDelay(up, 380)).toBe(true);
    expect(shouldShowAfterDelay(down, 420)).toBe(false);
    expect(shouldShowAfterDelay(down, MOBILE_CHROME.topZonePx)).toBe(true);
  });
});

describe('projectPill (SH-01, SH-02)', () => {
  it('is the spring box while the link keeps its size', () => {
    expect(projectPill({ x: 40, w: 70, base: 100, measuredW: 85, liveW: 85 })).toEqual({
      left: -60,
      width: 70,
    });
  });

  it('scales the live link box like motion when the link grows during the slide', () => {
    // Reference, Works → Email Me 17 ms in: spring width 68.47 of 85.53, link already 91.67.
    const { width } = projectPill({ x: 70, w: 68.47, base: 207, measuredW: 85.53, liveW: 91.67 });
    expect(width).toBeCloseTo(73.39, 2);
  });

  it('fills the live link once the spring arrives', () => {
    expect(projectPill({ x: 207, w: 85.53, base: 207, measuredW: 85.53, liveW: 101.53 })).toEqual({
      left: 0,
      width: 101.53,
    });
  });
});
