/**
 * Behaviour of the hero menu (HE-12; hero.md §6): one delegated click listener for the whole
 * document, so it keeps working after <ClientRouter/> swaps the page.
 *
 * - Every action plays its icon rail: check in, icon back from below, instant reset. Keyboard
 *   activation animates too (decisiones.md, HE-12), unlike the reference.
 * - Copy: writes the email to the clipboard; only then the rail plays its check and the scene's live
 *   region announces it. On failure the pill nav shows where to write instead (R-05).
 * - Open CV: waits for the check, then opens the PDF in a new tab. Modified clicks (new tab, new
 *   window, download) are left to the browser.
 * - Ask Blue (only rendered with `FEATURES.blue`): dispatches a cancelable `pf:blue-open` on window;
 *   the check plays only when the Blue launcher took it (`preventDefault()`, R-06).
 */
import { HERO_MENU } from '@/components/motion/presets';
import { EMAIL_FALLBACK_EVENT } from '@/lib/pill-nav';

export const BLUE_OPEN_EVENT = 'pf:blue-open';

const ACTION_SELECTOR = '[data-hero-action]';
const busyRails = new WeakSet<HTMLElement>();
const statusTimers = new WeakMap<HTMLElement, number>();
let bound = false;

/** HE-12: phase 1 (check) now, phase 2 at +680 ms, instant reset at +980 ms. Ignores re-entry. */
function playRail(action: HTMLElement): void {
  const rail = action.querySelector<HTMLElement>('[data-hero-rail]');
  if (!rail || busyRails.has(rail)) return;
  busyRails.add(rail);
  rail.dataset.phase = '1';
  window.setTimeout(() => {
    rail.dataset.phase = '2';
  }, HERO_MENU.railReturnMs);
  window.setTimeout(() => {
    rail.dataset.instant = 'true';
    rail.dataset.phase = '0';
    window.setTimeout(() => {
      delete rail.dataset.instant;
      busyRails.delete(rail);
    }, HERO_MENU.railInstantMs);
  }, HERO_MENU.railResetMs);
}

function announce(action: HTMLElement): void {
  const status = action.closest('.hero-scene')?.querySelector<HTMLElement>('[data-hero-status]');
  if (!status) return;
  status.textContent = status.dataset.copied ?? '';
  window.clearTimeout(statusTimers.get(status));
  statusTimers.set(
    status,
    window.setTimeout(() => {
      status.textContent = '';
    }, HERO_MENU.statusMs),
  );
}

async function copyText(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function isPlainActivation(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function onClick(event: MouseEvent): void {
  if (event.defaultPrevented || !(event.target instanceof Element)) return;
  const action = event.target.closest<HTMLElement>(ACTION_SELECTOR);
  if (!action) return;

  switch (action.dataset.heroAction) {
    case 'copy': {
      const value = action.dataset.copyValue;
      if (!value) break;
      void copyText(value).then((copied) => {
        if (copied) {
          playRail(action);
          announce(action);
        } else {
          window.dispatchEvent(new CustomEvent(EMAIL_FALLBACK_EVENT, { detail: { email: value } }));
        }
      });
      break;
    }
    case 'cv': {
      if (!isPlainActivation(event) || !(action instanceof HTMLAnchorElement)) return;
      event.preventDefault();
      playRail(action);
      const href = action.href;
      window.setTimeout(() => {
        window.open(href, '_blank', 'noopener,noreferrer');
      }, HERO_MENU.cvOpenDelayMs);
      break;
    }
    case 'blue': {
      const taken = !window.dispatchEvent(new CustomEvent(BLUE_OPEN_EVENT, { cancelable: true }));
      if (taken) playRail(action);
      break;
    }
  }
}

/** Installs the listener once per document. */
export function bindHeroSelection(): void {
  if (bound || typeof document === 'undefined') return;
  bound = true;
  document.addEventListener('click', onClick);
}
