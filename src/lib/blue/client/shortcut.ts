// The Blue shortcut, ⌘⌥/ on Apple platforms and Ctrl+Alt+/ elsewhere (docs/decisiones.md), and
// what counts as a field where typing must win over it (design-spec §7: ignored in editable fields).

export interface ShortcutKeyEvent {
  key: string;
  code: string;
  metaKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  repeat?: boolean;
  isComposing?: boolean;
}

/** Apple platforms use ⌘ as the primary modifier. */
export function isApplePlatform(platform: string): boolean {
  return /mac|iphone|ipad|ipod/i.test(platform);
}

export interface NavigatorLike {
  platform?: string;
  userAgentData?: { platform?: string };
}

/** The platform name the browser reports: Client Hints first, else the legacy `platform`. */
export function platformOf(nav: NavigatorLike): string {
  return nav.userAgentData?.platform || nav.platform || '';
}

/**
 * Primary modifier + Alt + the slash key, nothing else. With ⌥ held a Mac reports another `key`
 * (÷), so the physical key (`code`) counts too; layouts where `/` needs Shift report `key: '/'`.
 */
export function isBlueShortcut(event: ShortcutKeyEvent, apple: boolean): boolean {
  if (event.repeat || event.isComposing) return false;
  const primary = apple ? event.metaKey : event.ctrlKey;
  const other = apple ? event.ctrlKey : event.metaKey;
  if (!primary || !event.altKey || other) return false;
  return (event.code === 'Slash' && !event.shiftKey) || event.key === '/';
}

/** Input types where keys do not type text. */
const NON_TEXT_INPUTS = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

export interface EditableTargetLike {
  tagName?: string;
  type?: string;
  isContentEditable?: boolean;
  readOnly?: boolean;
}

/** Text inputs, textareas, selects and contentEditable hosts. */
export function isEditableTarget(target: EditableTargetLike | null | undefined): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  switch (target.tagName?.toUpperCase()) {
    case 'TEXTAREA':
    case 'SELECT':
      return true;
    case 'INPUT':
      return !NON_TEXT_INPUTS.has((target.type ?? 'text').toLowerCase());
    default:
      return false;
  }
}
