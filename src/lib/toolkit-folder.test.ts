import { describe, expect, it } from 'vitest';
import {
  STAMP_FANS,
  STAMP_SINK,
  designScale,
  folderPose,
  lampCenter,
  nameOffset,
  nextLampIndex,
  sceneTilt,
  stampPose,
  stampZIndex,
} from './toolkit-folder';

describe('designScale', () => {
  it('fits the 440 × 480 box into the measured slots', () => {
    expect(designScale(400, 436)).toBeCloseTo(0.908, 3);
    expect(designScale(350, 382)).toBeCloseTo(0.795, 3);
  });

  it('takes the tighter side and never exceeds 1.3', () => {
    expect(designScale(440, 240)).toBeCloseTo(0.5, 5);
    expect(designScale(2000, 2000)).toBe(1.3);
  });

  it('is 0 for an empty box', () => {
    expect(designScale(0, 436)).toBe(0);
    expect(designScale(Number.NaN, 436)).toBe(0);
  });
});

describe('stampPose', () => {
  it('opens into the reference fan of four (scale .85)', () => {
    const open = [0, 1, 2, 3].map((i) => stampPose(i, 4, 1));
    expect(open.map((pose) => pose.x)).toEqual([-124, -42, 42, 124]);
    expect(open.map((pose) => pose.y)).toEqual([99, 28, 43, 106]);
    expect(open.map((pose) => pose.rotate)).toEqual([-13, -5, 5, 14]);
    expect(open.every((pose) => pose.scale === 0.85 && pose.opacity === 1)).toBe(true);
  });

  it('opens into the reference fan of three', () => {
    const open = [0, 1, 2].map((i) => stampPose(i, 3, 1));
    expect(open.map((pose) => pose.x)).toEqual([-112, 0, 112]);
    expect(open.map((pose) => pose.y)).toEqual([79, 26, 91]);
    expect(open.map((pose) => pose.rotate)).toEqual([-12, 0, 13]);
  });

  it('rests as a stack at scale .61 when closed', () => {
    for (const count of [3, 4] as const) {
      for (let i = 0; i < count; i += 1) {
        const pose = stampPose(i, count, 0);
        expect(pose.scale).toBe(0.61);
        expect(pose.x).toBe(STAMP_FANS[count].closed.x[i]);
        expect(pose.y).toBe(STAMP_FANS[count].closed.y[i]);
      }
    }
  });

  it('interpolates linearly in between', () => {
    const half = stampPose(0, 4, 0.5);
    expect(half.x).toBeCloseTo((-36 + -124) / 2, 5);
    expect(half.scale).toBeCloseTo((0.61 + 0.85) / 2, 5);
  });

  it('sinks and fades below 0, fully at the dip', () => {
    const closed = stampPose(1, 4, 0);
    const dipped = stampPose(1, 4, -STAMP_SINK.dip);
    expect(dipped.y).toBe(closed.y + STAMP_SINK.depth);
    expect(dipped.opacity).toBe(0);
    expect(stampPose(1, 4, -STAMP_SINK.dip / 2).opacity).toBeCloseTo(0.5, 5);
    expect(stampPose(1, 4, -1).opacity).toBe(0);
  });

  it('clamps progress above 1 and out-of-range indices', () => {
    expect(stampPose(0, 4, 1.2)).toEqual(stampPose(0, 4, 1));
    expect(stampPose(9, 4, 1).x).toBe(124);
  });
});

describe('stampZIndex', () => {
  it('paints every stamp on its own layer', () => {
    for (const count of [3, 4]) {
      const layers = Array.from({ length: count }, (_, i) => stampZIndex(i, count));
      expect(new Set(layers).size).toBe(count);
    }
  });
});

describe('folderPose', () => {
  it('drops 35 px, turns from −2° to −1.25° and opens the lid to −18°', () => {
    expect(folderPose(0)).toEqual({
      y: 0,
      rotate: -2,
      lidRotateX: 0,
      pocket: 80,
      floorScaleX: 1,
    });
    expect(folderPose(1)).toEqual({
      y: 35,
      rotate: -1.25,
      lidRotateX: -18,
      pocket: 45,
      floorScaleX: 1.06,
    });
  });

  it('stays closed during a switch dip', () => {
    expect(folderPose(-0.3)).toEqual(folderPose(0));
  });
});

describe('lamps and name', () => {
  it('centres the five lamps 64 px apart from 14 px in', () => {
    expect([0, 1, 2, 3, 4].map(lampCenter)).toEqual([46, 110, 174, 238, 302]);
  });

  it('keeps the 184 px name box inside the front', () => {
    const offsets = [0, 1, 2, 3, 4].map(nameOffset);
    expect(offsets[0]).toBe(38);
    expect(offsets[1]).toBe(102);
    for (const offset of offsets) {
      expect(offset).toBeGreaterThanOrEqual(24);
      expect(offset + 184).toBeLessThanOrEqual(348 - 24);
    }
  });
});

describe('sceneTilt', () => {
  const max = { maxX: 1, maxY: 1.5 };

  it('is flat at the centre and reaches the maxima at the corners', () => {
    expect(sceneTilt(0.5, 0.5, max)).toEqual({ rotateX: 0, rotateY: 0 });
    expect(sceneTilt(1, 0, max)).toEqual({ rotateX: 1, rotateY: 1.5 });
    expect(sceneTilt(0, 1, max)).toEqual({ rotateX: -1, rotateY: -1.5 });
  });

  it('clamps a pointer outside the box', () => {
    expect(sceneTilt(3, -2, max)).toEqual(sceneTilt(1, 0, max));
  });
});

describe('nextLampIndex', () => {
  it('wraps around with the arrows', () => {
    expect(nextLampIndex(4, 'ArrowRight', 5)).toBe(0);
    expect(nextLampIndex(0, 'ArrowLeft', 5)).toBe(4);
    expect(nextLampIndex(2, 'ArrowRight', 5)).toBe(3);
  });

  it('jumps to the ends with Home and End', () => {
    expect(nextLampIndex(3, 'Home', 5)).toBe(0);
    expect(nextLampIndex(1, 'End', 5)).toBe(4);
  });

  it('ignores other keys and empty groups', () => {
    expect(nextLampIndex(1, 'ArrowUp', 5)).toBeUndefined();
    expect(nextLampIndex(0, 'ArrowRight', 0)).toBeUndefined();
  });
});
