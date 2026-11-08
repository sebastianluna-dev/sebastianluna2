import { describe, expect, it } from 'vitest';
import {
  isApplePlatform,
  platformOf,
  isBlueShortcut,
  isEditableTarget,
  type ShortcutKeyEvent,
} from './shortcut';

const key = (over: Partial<ShortcutKeyEvent>): ShortcutKeyEvent => ({
  key: '/',
  code: 'Slash',
  metaKey: false,
  altKey: false,
  ctrlKey: false,
  shiftKey: false,
  ...over,
});

describe('isBlueShortcut', () => {
  it('is ⌘⌥/ on Apple platforms, whatever character ⌥ produces', () => {
    expect(isBlueShortcut(key({ metaKey: true, altKey: true }), true)).toBe(true);
    expect(isBlueShortcut(key({ metaKey: true, altKey: true, key: '÷' }), true)).toBe(true);
    expect(isBlueShortcut(key({ ctrlKey: true, altKey: true }), true)).toBe(false);
  });

  it('is Ctrl+Alt+/ elsewhere', () => {
    expect(isBlueShortcut(key({ ctrlKey: true, altKey: true }), false)).toBe(true);
    expect(isBlueShortcut(key({ metaKey: true, altKey: true }), false)).toBe(false);
  });

  it('accepts layouts where / needs Shift, by the character', () => {
    expect(
      isBlueShortcut(key({ metaKey: true, altKey: true, shiftKey: true, code: 'Digit7' }), true),
    ).toBe(true);
    expect(
      isBlueShortcut(key({ metaKey: true, altKey: true, shiftKey: true, key: '?' }), true),
    ).toBe(false);
  });

  it('ignores a lone slash, missing modifiers, extra modifiers, repeats and IME composition', () => {
    expect(isBlueShortcut(key({}), true)).toBe(false);
    expect(isBlueShortcut(key({ metaKey: true }), true)).toBe(false);
    expect(isBlueShortcut(key({ metaKey: true, altKey: true, ctrlKey: true }), true)).toBe(false);
    expect(isBlueShortcut(key({ metaKey: true, altKey: true, repeat: true }), true)).toBe(false);
    expect(isBlueShortcut(key({ metaKey: true, altKey: true, isComposing: true }), true)).toBe(
      false,
    );
  });
});

describe('platformOf', () => {
  it('prefers Client Hints, then the legacy platform', () => {
    expect(platformOf({ userAgentData: { platform: 'Windows' }, platform: 'Win32' })).toBe(
      'Windows',
    );
    expect(platformOf({ platform: 'MacIntel' })).toBe('MacIntel');
    expect(platformOf({})).toBe('');
  });
});

describe('isApplePlatform', () => {
  it('recognises macOS and iOS platform strings', () => {
    expect(isApplePlatform('MacIntel')).toBe(true);
    expect(isApplePlatform('macOS')).toBe(true);
    expect(isApplePlatform('iPad')).toBe(true);
    expect(isApplePlatform('Win32')).toBe(false);
    expect(isApplePlatform('Linux x86_64')).toBe(false);
  });
});

describe('isEditableTarget', () => {
  it('treats text fields, selects and contentEditable as editable', () => {
    expect(isEditableTarget({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isEditableTarget({ tagName: 'INPUT' })).toBe(true);
    expect(isEditableTarget({ tagName: 'INPUT', type: 'search' })).toBe(true);
    expect(isEditableTarget({ tagName: 'SELECT' })).toBe(true);
    expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
  });

  it('does not treat buttons, checkboxes or plain elements as editable', () => {
    expect(isEditableTarget({ tagName: 'INPUT', type: 'checkbox' })).toBe(false);
    expect(isEditableTarget({ tagName: 'BUTTON' })).toBe(false);
    expect(isEditableTarget({ tagName: 'BODY' })).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
