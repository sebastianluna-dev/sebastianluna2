import { describe, expect, it } from 'vitest';
import { APPEAR_PRESETS, REDUCED_APPEAR, SPRING_TIMINGS } from '@/components/motion/presets';
import {
  appearInitialStyle,
  appearInitialVars,
  appearProperties,
  planAppear,
  prefersReducedMotion,
  resolveDelayMs,
} from './motion-policy';

describe('planAppear', () => {
  it('animates opacity and the individual transforms together (HE-16, decision 14)', () => {
    const plan = planAppear(APPEAR_PRESETS.popUpY6S094SpringB012046, {
      delayMs: 480,
      reducedMotion: false,
      reducedTiming: REDUCED_APPEAR,
      linearSupported: true,
    });
    expect(plan.keyframes).toEqual([
      { opacity: 0.001, translate: '0px 6px', scale: '0.94' },
      { opacity: 1, translate: '0px 0px', scale: '1' },
    ]);
    expect(plan.durationMs).toBe(500);
    expect(plan.delayMs).toBe(480);
    expect(plan.easing).toBe(SPRING_TIMINGS.popUp.easing);
  });

  it('rotates the hero objects from 0 to their final angle (HE-18)', () => {
    const plan = planAppear(APPEAR_PRESETS.popInRotateS093Rm24SpringB020028, {
      reducedMotion: false,
      reducedTiming: REDUCED_APPEAR,
    });
    expect(plan.keyframes[0]).toEqual({ opacity: 0.001, scale: '0.93', rotate: '0deg' });
    expect(plan.keyframes[1]).toEqual({ opacity: 1, scale: '1', rotate: '-24deg' });
    expect(plan.durationMs).toBe(300);
  });

  it('cardIn uses one 650 ms chain for opacity, scale and y (HO-01)', () => {
    const plan = planAppear(APPEAR_PRESETS.cardIn, {
      reducedMotion: false,
      reducedTiming: REDUCED_APPEAR,
    });
    expect(plan.keyframes).toEqual([
      { opacity: 0, translate: '0px 20px', scale: '0.5' },
      { opacity: 1, translate: '0px 0px', scale: '1' },
    ]);
    expect(plan.durationMs).toBe(650);
  });

  it('falls back to cubic-bezier without linear()', () => {
    const plan = planAppear(APPEAR_PRESETS.fadeUpY20SpringB000040, {
      reducedMotion: false,
      reducedTiming: REDUCED_APPEAR,
      linearSupported: false,
    });
    expect(plan.easing).toBe(SPRING_TIMINGS.reveal.fallbackEasing);
    expect(plan.easing.startsWith('cubic-bezier(')).toBe(true);
  });

  it('keeps tweens as cubic-bezier', () => {
    const plan = planAppear(APPEAR_PRESETS.fadeUpY7Tween030OutQuint, {
      reducedMotion: false,
      reducedTiming: REDUCED_APPEAR,
    });
    expect(plan.easing).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
    expect(plan.durationMs).toBe(300);
  });

  it('collapses to a 150 ms opacity fade without delay under reduced motion', () => {
    for (const preset of Object.values(APPEAR_PRESETS)) {
      const plan = planAppear(preset, {
        delayMs: 2000,
        reducedMotion: true,
        reducedTiming: REDUCED_APPEAR,
      });
      expect(plan.durationMs).toBe(REDUCED_APPEAR.durationMs);
      expect(plan.delayMs).toBe(0);
      for (const frame of plan.keyframes) expect(Object.keys(frame)).toEqual(['opacity']);
      expect(plan.keyframes[1].opacity).toBe(preset.animate.opacity);
    }
  });

  it('keeps the year value at opacity .4', () => {
    const plan = planAppear(APPEAR_PRESETS.fadeUpY20O040SpringB000040, {
      reducedMotion: false,
      reducedTiming: REDUCED_APPEAR,
    });
    expect(plan.keyframes[1].opacity).toBe(0.4);
  });
});

describe('initial state variables', () => {
  it('lists only the animated transforms', () => {
    expect(appearProperties(APPEAR_PRESETS.fadeInSpringB000040)).toEqual([]);
    expect(appearProperties(APPEAR_PRESETS.cardIn)).toEqual(['translate', 'scale']);
    expect(appearProperties(APPEAR_PRESETS.popInRotateS093R12SpringB020028)).toEqual([
      'scale',
      'rotate',
    ]);
  });

  it('serialises the pre-animation state as custom properties', () => {
    expect(appearInitialVars(APPEAR_PRESETS.fadeUpY20SpringB000040)).toEqual({
      '--pf-appear-opacity': '0.001',
      '--pf-appear-translate': '0px 20px',
    });
    expect(appearInitialStyle(APPEAR_PRESETS.cardIn)).toBe(
      '--pf-appear-opacity:0;--pf-appear-translate:0px 20px;--pf-appear-scale:0.5',
    );
  });
});

describe('resolveDelayMs', () => {
  it('absolute keeps each delay (CA-01, docs/decisiones.md)', () => {
    expect(resolveDelayMs(2.05, 'absolute', 2)).toBe(2050);
  });

  it('section subtracts the delay of the first element of the group', () => {
    expect(resolveDelayMs(2.05, 'section', 2)).toBe(50);
    expect(resolveDelayMs(1.95, 'section', 2)).toBe(0);
    expect(resolveDelayMs(0.5, 'section')).toBe(500);
  });
});

describe('prefersReducedMotion', () => {
  it('is false without matchMedia (SSR)', () => {
    expect(prefersReducedMotion()).toBe(false);
  });
});
