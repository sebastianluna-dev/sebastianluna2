/**
 * Blue launcher controller (BL-01…BL-05; design-spec §7.3; decisiones.md: ⌘⌥/ and Escape).
 *
 * Vanilla and tiny, because it ships with every page. It owns the open state and opens the panel
 * from three places: the launcher, the shortcut (⌘⌥/ on Apple platforms, Ctrl+Alt+/ elsewhere,
 * ignored while typing in a field outside the panel) and the hero's cancelable `pf:blue-open`. The
 * first time, it loads `BluePanel` with `import()`, which brings React and motion with it.
 *
 * Open: `data-blue-open` on <html> (the push, `blue-launcher.css`), `aria-expanded`, the panel
 * slides in and takes the focus. Close (launcher, shortcut, Escape, the panel's Close button):
 * focus back to whoever opened it when the focus was in the panel, then the panel turns inert.
 * The launcher and the panel host persist across navigations, and so does the state.
 *
 * Where the panel is the full-screen sheet (`BLUE.sheetQuery`: phones, short touch screens) it covers
 * the page, so while it is open the rest of <body> is `inert` and the panel is `aria-modal`; the CSS
 * stops the page scrolling underneath. Next to the sidebar the page stays usable.
 */
import { BLUE } from '@/components/motion/presets';
import { BLUE_OPEN_EVENT } from '@/lib/blue/events';
import { playInterfaceSound } from '@/lib/sound/interface-sound';
import { makeSiblingsInert } from '@/lib/blue/client/page-inert';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/locales';
import {
  isApplePlatform,
  isBlueShortcut,
  platformOf,
  isEditableTarget,
  type EditableTargetLike,
} from '@/lib/blue/client/shortcut';
import type { BluePanelHandle } from './BluePanel';
import { BLUE_PANEL_ID } from './blue-dom';

const ROOT_SELECTOR = '[data-blue]';
const LAUNCHER_SELECTOR = '[data-blue-launcher]';
const LABEL_SELECTOR = '[data-blue-launcher-label]';
const HOST_SELECTOR = '[data-blue-host]';
const OPEN_ATTRIBUTE = 'data-blue-open';

let started = false;
let open = false;
let opener: HTMLElement | null = null;
let loading: Promise<BluePanelHandle> | null = null;
let panel: BluePanelHandle | null = null;
let apple = false;
let sheet: MediaQueryList | null = null;
let releasePage: (() => void) | null = null;

const launcher = () => document.querySelector<HTMLButtonElement>(LAUNCHER_SELECTOR);

function pageLocale(): Locale {
  const lang = document.documentElement.lang;
  return isLocale(lang) ? lang : DEFAULT_LOCALE;
}

function isVisible(el: Element | null): el is HTMLElement {
  return el instanceof HTMLElement && el.isConnected && el.getClientRects().length > 0;
}

function panelContains(node: EventTarget | null): boolean {
  return node instanceof Node && !!panel?.host.contains(node);
}

function syncLauncher(): void {
  const button = launcher();
  if (!button) return;
  button.setAttribute('aria-expanded', String(open));
  if (panel) button.setAttribute('aria-controls', BLUE_PANEL_ID);
}

function loadPanel(): Promise<BluePanelHandle> {
  loading ??= import('./BluePanel')
    .then(({ mountBluePanel }) => {
      const host = document.querySelector<HTMLElement>(HOST_SELECTOR);
      if (!host) throw new Error('Blue panel host is missing');
      const handle = mountBluePanel(host, {
        locale: pageLocale(),
        onClose: () => setOpen(false),
      });
      panel = handle;
      return handle;
    })
    .catch((error: unknown) => {
      loading = null;
      throw error;
    });
  return loading;
}

/** The sheet covers the page: everything else in <body> turns inert while it is open. */
function syncModal(): void {
  releasePage?.();
  releasePage = null;
  const modal = open && !!panel && !!sheet?.matches;
  panel?.setModal(modal);
  if (!modal) return;
  const root = document.querySelector<HTMLElement>(ROOT_SELECTOR);
  releasePage = makeSiblingsInert(Array.from(document.body.children) as HTMLElement[], root);
}

/** Where the focus goes back to when the panel closes. */
function returnTarget(): HTMLElement | null {
  if (isVisible(opener) && !panelContains(opener)) return opener;
  const button = launcher();
  return isVisible(button) ? button : null;
}

async function setOpen(next: boolean, from: Element | null = null): Promise<void> {
  if (next === open) {
    if (next) panel?.focusInput();
    return;
  }
  open = next;
  if (next) {
    opener = from instanceof HTMLElement && from !== document.body ? from : null;
    let handle: BluePanelHandle;
    try {
      handle = await loadPanel();
    } catch (error) {
      open = false;
      console.error('[blue] the panel could not load', error);
      return;
    }
    if (!open) return;
    // The page makes room and the panel slides in on the same frame.
    document.documentElement.setAttribute(OPEN_ATTRIBUTE, '');
    syncLauncher();
    syncModal();
    handle.setOpen(true);
    playInterfaceSound('openChat');
    return;
  }
  const active = document.activeElement;
  if (panelContains(active) || active === document.body || active === null) {
    returnTarget()?.focus({ preventScroll: true });
  }
  opener = null;
  document.documentElement.removeAttribute(OPEN_ATTRIBUTE);
  syncLauncher();
  syncModal();
  panel?.setOpen(false);
  playInterfaceSound('closeChat');
}

function toggle(from: Element | null): void {
  void setOpen(!open, from);
}

function onClick(event: MouseEvent): void {
  const button = (event.target as Element | null)?.closest?.(LAUNCHER_SELECTOR);
  if (button) toggle(button);
}

/** Capture phase, like the reference, so page handlers cannot swallow it. */
function onShortcut(event: KeyboardEvent): void {
  if (!isBlueShortcut(event, apple)) return;
  const target = event.target;
  if (isEditableTarget(target as EditableTargetLike | null) && !panelContains(target)) return;
  event.preventDefault();
  toggle(document.activeElement);
}

function onKeydown(event: KeyboardEvent): void {
  if (!open || event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
  const target = event.target;
  if (panelContains(target) || target === launcher() || target === document.body) {
    event.preventDefault();
    void setOpen(false);
  }
}

/** "Ask Blue" in the hero: taking the event tells it the click did something (R-06). */
function onOpenRequest(event: Event): void {
  event.preventDefault();
  void setOpen(true, document.activeElement);
}

/** <ClientRouter/> rewrites <html> attributes and the persisted launcher keeps its old label. */
function onBeforeSwap(event: Event): void {
  const next = (event as Event & { newDocument?: Document }).newDocument;
  if (!next) return;
  if (open) next.documentElement.setAttribute(OPEN_ATTRIBUTE, '');
  const label = next.querySelector(LABEL_SELECTOR)?.textContent?.trim();
  if (label) {
    document.querySelectorAll(LABEL_SELECTOR).forEach((node) => {
      node.textContent = label;
    });
  }
}

/**
 * After a swap: follow the page language, or start over if the page came without the launcher. The
 * swap brought a new header, main and footer, so an open sheet makes them inert again.
 */
function onPageLoad(): void {
  if (panel && !panel.host.isConnected) {
    panel.unmount();
    panel = null;
    loading = null;
    open = false;
    opener = null;
    document.documentElement.removeAttribute(OPEN_ATTRIBUTE);
  }
  panel?.setLocale(pageLocale());
  syncLauncher();
  syncModal();
}

/** Binds once per document; every listener is delegated, so persisted nodes need nothing more. */
export function startBlueLauncher(): void {
  if (started || typeof document === 'undefined' || !document.querySelector(ROOT_SELECTOR)) return;
  started = true;
  apple = isApplePlatform(platformOf(navigator));
  sheet = matchMedia(BLUE.sheetQuery);
  // Rotating a phone or resizing a window turns the sheet into the sidebar and back.
  sheet.addEventListener('change', syncModal);
  document.addEventListener('click', onClick);
  window.addEventListener('keydown', onShortcut, { capture: true });
  document.addEventListener('keydown', onKeydown);
  window.addEventListener(BLUE_OPEN_EVENT, onOpenRequest);
  document.addEventListener('astro:before-swap', onBeforeSwap);
  document.addEventListener('astro:page-load', onPageLoad);
}
