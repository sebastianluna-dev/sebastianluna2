import { describe, expect, it } from 'vitest';
import { backPillHidden, isPlainClick } from './case-nav';

describe('isPlainClick', () => {
  const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };

  it('accepts a primary click without modifiers', () => {
    expect(isPlainClick(click)).toBe(true);
  });

  it('leaves other buttons and modified clicks to the browser', () => {
    expect(isPlainClick({ ...click, button: 1 })).toBe(false);
    expect(isPlainClick({ ...click, metaKey: true })).toBe(false);
    expect(isPlainClick({ ...click, ctrlKey: true })).toBe(false);
    expect(isPlainClick({ ...click, shiftKey: true })).toBe(false);
    expect(isPlainClick({ ...click, altKey: true })).toBe(false);
  });
});

describe('backPillHidden', () => {
  it('hides with the phone chrome', () => {
    expect(backPillHidden({ chromeHidden: true, phone: true, focused: false })).toBe(true);
  });

  it('stays while the chrome shows, on tablet and desktop, and while it holds the focus', () => {
    expect(backPillHidden({ chromeHidden: false, phone: true, focused: false })).toBe(false);
    expect(backPillHidden({ chromeHidden: true, phone: false, focused: false })).toBe(false);
    expect(backPillHidden({ chromeHidden: true, phone: true, focused: true })).toBe(false);
  });
});
