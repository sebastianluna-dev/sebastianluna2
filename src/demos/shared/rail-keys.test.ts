import { describe, expect, it } from 'vitest';
import { railIndexForKey } from './rail-keys';

describe('railIndexForKey', () => {
  it('moves to the neighbour and wraps at the ends', () => {
    expect(railIndexForKey(0, 'ArrowRight', 3)).toBe(1);
    expect(railIndexForKey(2, 'ArrowRight', 3)).toBe(0);
    expect(railIndexForKey(0, 'ArrowLeft', 3)).toBe(2);
    expect(railIndexForKey(1, 'ArrowDown', 3)).toBe(2);
    expect(railIndexForKey(1, 'ArrowUp', 3)).toBe(0);
  });

  it('jumps to the ends with Home and End', () => {
    expect(railIndexForKey(1, 'Home', 4)).toBe(0);
    expect(railIndexForKey(1, 'End', 4)).toBe(3);
  });

  it('leaves every other key alone, and an empty rail too', () => {
    expect(railIndexForKey(1, 'Enter', 4)).toBeNull();
    expect(railIndexForKey(1, 'a', 4)).toBeNull();
    expect(railIndexForKey(0, 'ArrowRight', 0)).toBeNull();
  });
});
