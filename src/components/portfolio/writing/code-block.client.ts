/**
 * Client side of the writing code blocks and tables (writings-spec §3.5–§3.6). One delegated
 * listener on `document` serves every block of every page, so it survives the router's swaps.
 *
 * - Copy: writes the code to the clipboard, swaps "Copy" for "Copied" (`data-copied`), changes the
 *   button's name and announces the copy in the block's live region; back after
 *   `CODE_BLOCK.copiedResetMs`. The button only shows where the Clipboard API exists.
 * - Scroll stops: a code scroller or a table wrapper (`data-writing-scroll`) gets a tab stop only
 *   while it overflows, so keyboard users can scroll it and nobody tabs through a still box.
 */
import { CODE_BLOCK } from '@/components/motion/presets';

const COPY_SELECTOR = '[data-code-copy]';
const SCROLLER_SELECTOR = '[data-code-scroller], [data-writing-scroll]';

const timers = new WeakMap<HTMLButtonElement, number>();

function reset(button: HTMLButtonElement): void {
  delete button.dataset.copied;
  button.setAttribute('aria-label', button.dataset.labelIdle ?? '');
}

async function copy(button: HTMLButtonElement): Promise<void> {
  const block = button.closest<HTMLElement>('[data-code-block]');
  const code = block?.querySelector('pre')?.textContent ?? '';
  const status = block?.querySelector<HTMLElement>('[data-code-status]');
  try {
    await navigator.clipboard.writeText(code.replace(/\n$/u, ''));
  } catch {
    return;
  }
  window.clearTimeout(timers.get(button));
  button.dataset.copied = '';
  button.setAttribute('aria-label', button.dataset.labelDone ?? '');
  if (status) {
    // Clear first so a second copy is announced again.
    status.textContent = '';
    window.requestAnimationFrame(() => {
      status.textContent = status.dataset.message ?? '';
    });
  }
  timers.set(
    button,
    window.setTimeout(() => {
      reset(button);
      if (status) status.textContent = '';
    }, CODE_BLOCK.copiedResetMs),
  );
}

function sync(): void {
  const canCopy = typeof navigator.clipboard?.writeText === 'function';
  for (const button of document.querySelectorAll<HTMLButtonElement>(COPY_SELECTOR)) {
    button.hidden = !canCopy;
  }
  for (const scroller of document.querySelectorAll<HTMLElement>(SCROLLER_SELECTOR)) {
    const overflows =
      scroller.scrollHeight > scroller.clientHeight + 1 ||
      scroller.scrollWidth > scroller.clientWidth + 1;
    if (overflows) scroller.tabIndex = 0;
    else scroller.removeAttribute('tabindex');
  }
}

let started = false;

export function startCodeBlocks(): void {
  if (started) return;
  started = true;
  document.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest?.<HTMLButtonElement>(COPY_SELECTOR);
    if (button) void copy(button);
  });
  document.addEventListener('astro:page-load', sync);
  window.addEventListener('resize', sync, { passive: true });
  sync();
}
