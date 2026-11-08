import { describe, expect, it } from 'vitest';
import { ROUTE_TRANSITIONS } from '@/components/motion/presets';
import { pseudoElement, retimeKeyframes, routePlan } from './route-transitions';

describe('routePlan (RT-01, RT-02)', () => {
  const plan = routePlan();
  const step = (pseudo: string) => plan.replace.find((item) => item.pseudo === pseudo);

  it('names the pseudo-elements as the browser does', () => {
    expect(pseudoElement('group', 'pf-work-cover')).toBe('::view-transition-group(pf-work-cover)');
  });

  it('lifts the old page 8 px at .985 in 200 ms around 50% 40vh', () => {
    const old = step('::view-transition-old(root)');
    expect(old?.timing).toEqual({
      duration: 200,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'both',
    });
    expect(old?.keyframes.at(-1)).toMatchObject({
      opacity: 0,
      translate: '0 -8px',
      scale: '0.985',
      transformOrigin: '50% 40vh',
    });
  });

  it('raises the new page 16 px in 420 ms after 60 ms', () => {
    const entering = step('::view-transition-new(root)');
    expect(entering?.keyframes[0]).toEqual({ opacity: 0, translate: '0 16px' });
    expect(entering?.timing).toMatchObject({ duration: 420, delay: 60, fill: 'both' });
  });

  it('holds the old cover until 40 % and has the new one in by 35 %', () => {
    const name = ROUTE_TRANSITIONS.cover.name;
    expect(step(pseudoElement('old', name))?.keyframes.map((frame) => frame.offset)).toEqual([
      undefined,
      0.4,
      undefined,
    ]);
    expect(step(pseudoElement('new', name))?.keyframes[1]).toEqual({ opacity: 1, offset: 0.35 });
    expect(plan.retime[pseudoElement('group', name)]).toEqual({
      duration: 520,
      easing: 'linear',
      keyframeEasing: 'cubic-bezier(0.2, 0, 0, 1)',
    });
  });

  it('starts the group from the browser `from` frame, eased, with a linear effect', () => {
    const frames = retimeKeyframes(
      [
        { offset: 0, computedOffset: 0, easing: 'ease', width: '469px' },
        { offset: 1, computedOffset: 1, easing: 'ease', width: '720px' },
      ],
      'cubic-bezier(0.2, 0, 0, 1)',
    );
    // The end stays implicit, so the morph lands on the live box of the new cover.
    expect(frames).toEqual([{ offset: 0, easing: 'cubic-bezier(0.2, 0, 0, 1)', width: '469px' }]);
    expect(retimeKeyframes([], 'linear')).toEqual([]);
    for (const retime of Object.values(plan.retime)) expect(retime.easing).toBe('linear');
  });
});
