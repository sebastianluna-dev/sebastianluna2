/**
 * Touch hold and sounds of the /about books (about-spec §5.3). A finger (or pen) on a book opens it
 * for as long as it stays down (pointer capture) and closes it on release, cancel or a scroll that
 * takes the pointer. The look of mouse hover and keyboard focus is pure CSS; this script only follows
 * them to play `bookOpen` / `bookClose` when a book opens or closes under the mouse or the visible
 * focus, on fine-pointer devices (`src/lib/book-sound.ts`). Rebinds on `astro:page-load`.
 *
 * Two things the CSS knows that no hover or focus event says: the browser may update `:hover` a
 * moment after the page loads (a history back restores the scroll and then moves the hover under a
 * resting mouse), so hover changes stay silent until the mouse really moves after each bind; and a
 * book focused by a click starts matching `:focus-visible` when a key is pressed, with no focus event,
 * so the focus flag is read again after every key and before every hover or hold change.
 */
import {
  BOOK_SOUND_MEDIA,
  CLOSED_BOOK,
  nextBookState,
  type BookChange,
  type BookFlags,
} from '@/lib/book-sound';
import { playInterfaceSound } from '@/lib/sound/interface-sound';

const SHELF_SELECTOR = '[data-book-shelf]';
const BOOK_SELECTOR = '[data-book]';

const bound = new Map<HTMLElement, () => void>();
let started = false;

function bookOf(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(BOOK_SELECTOR) : null;
}

function bind(shelf: HTMLElement): () => void {
  const fine = window.matchMedia(BOOK_SOUND_MEDIA);
  const states = new Map<HTMLElement, BookFlags>();
  // Start from what is already true (a pointer resting on a book after a navigation), silently.
  for (const book of shelf.querySelectorAll<HTMLElement>(BOOK_SELECTOR)) {
    states.set(book, { ...CLOSED_BOOK, hover: book.matches(':hover') });
  }

  const change = (book: HTMLElement, next: BookChange, silent = false) => {
    const flags = states.get(book) ?? CLOSED_BOOK;
    // A focus change carries its own value; any other change first catches up with the CSS.
    const current =
      next.cause === 'focus' ? flags : { ...flags, focus: book.matches(':focus-visible') };
    const result = nextBookState(current, next, fine.matches);
    states.set(book, result.flags);
    if (result.sound && !silent) playInterfaceSound(result.sound);
  };

  // Hover changes only follow the CSS silently until the mouse moves for real after this bind.
  let armed = false;
  let silentEnter: { book: HTMLElement; at: number } | null = null;

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !(event.movementX || event.movementY)) return;
    armed = true;
    document.removeEventListener('pointermove', onMove);
    // A real move straight onto a book fires its pointerover first, in the same input event (same
    // timeStamp) but still unarmed: replay that enter now so the book sounds as it opens.
    const enter = silentEnter;
    silentEnter = null;
    if (enter && enter.at === event.timeStamp && states.get(enter.book)?.hover) {
      change(enter.book, { cause: 'hover', on: false }, true);
      change(enter.book, { cause: 'hover', on: true });
    }
  };

  /** Mouse enter / leave of one book; moves between its own children do not count. */
  const onHover = (on: boolean) => (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    const book = bookOf(event.target);
    if (!book || !shelf.contains(book)) return;
    if (event.relatedTarget instanceof Node && book.contains(event.relatedTarget)) return;
    if (!armed) silentEnter = on ? { book, at: event.timeStamp } : null;
    change(book, { cause: 'hover', on }, !armed);
  };
  const onOver = onHover(true);
  const onOut = onHover(false);

  const onFocusIn = (event: FocusEvent) => {
    const book = bookOf(event.target);
    // Only the focus that shows opens the book (CSS `:focus-visible`), not a click or a script.
    if (book && shelf.contains(book) && book.matches(':focus-visible')) {
      change(book, { cause: 'focus', on: true });
    }
  };

  const onFocusOut = (event: FocusEvent) => {
    const book = bookOf(event.target);
    if (!book || !shelf.contains(book)) return;
    if (event.relatedTarget instanceof Node && book.contains(event.relatedTarget)) return;
    change(book, { cause: 'focus', on: false });
  };

  // After a key (once its default action, such as a Tab, has run), the focused book may have started
  // or stopped showing its focus without any focus event.
  let keyFrame = 0;
  const onKey = (event: KeyboardEvent) => {
    const book = bookOf(event.target);
    if (!book || !shelf.contains(book)) return;
    cancelAnimationFrame(keyFrame);
    keyFrame = requestAnimationFrame(() => {
      const visible = book.matches(':focus-visible');
      if (visible !== states.get(book)?.focus) change(book, { cause: 'focus', on: visible });
    });
  };

  const close = (book: HTMLElement) => {
    delete book.dataset.open;
  };

  const onDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') return;
    const book =
      event.target instanceof Element ? event.target.closest<HTMLElement>(BOOK_SELECTOR) : null;
    if (!book || !shelf.contains(book)) return;
    book.dataset.open = '';
    change(book, { cause: 'held', on: true });
    try {
      book.setPointerCapture(event.pointerId);
    } catch {
      // The pointer may already be gone; the release listeners still close the book.
    }
    const end = () => {
      close(book);
      change(book, { cause: 'held', on: false });
      book.removeEventListener('pointerup', end);
      book.removeEventListener('pointercancel', end);
      book.removeEventListener('lostpointercapture', end);
    };
    book.addEventListener('pointerup', end);
    book.addEventListener('pointercancel', end);
    book.addEventListener('lostpointercapture', end);
  };

  // A long press would otherwise open the context menu over the open book.
  const onContextMenu = (event: Event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(`${BOOK_SELECTOR}[data-open]`)) event.preventDefault();
  };

  shelf.addEventListener('pointerdown', onDown);
  shelf.addEventListener('contextmenu', onContextMenu);
  shelf.addEventListener('pointerover', onOver);
  shelf.addEventListener('pointerout', onOut);
  shelf.addEventListener('focusin', onFocusIn);
  shelf.addEventListener('focusout', onFocusOut);
  shelf.addEventListener('keydown', onKey);
  document.addEventListener('pointermove', onMove);
  return () => {
    shelf.removeEventListener('pointerdown', onDown);
    shelf.removeEventListener('contextmenu', onContextMenu);
    shelf.removeEventListener('pointerover', onOver);
    shelf.removeEventListener('pointerout', onOut);
    shelf.removeEventListener('focusin', onFocusIn);
    shelf.removeEventListener('focusout', onFocusOut);
    shelf.removeEventListener('keydown', onKey);
    document.removeEventListener('pointermove', onMove);
    cancelAnimationFrame(keyFrame);
    for (const book of shelf.querySelectorAll<HTMLElement>(BOOK_SELECTOR)) close(book);
    states.clear();
  };
}

function bindAll() {
  for (const shelf of document.querySelectorAll<HTMLElement>(SHELF_SELECTOR)) {
    if (!bound.has(shelf)) bound.set(shelf, bind(shelf));
  }
}

function releaseAll() {
  for (const release of bound.values()) release();
  bound.clear();
}

/** Binds every book shelf now and after each navigation. Safe to call more than once. */
export function startBookShelves(): void {
  if (started || typeof document === 'undefined') return;
  started = true;
  document.addEventListener('astro:page-load', bindAll);
  document.addEventListener('astro:before-swap', releaseAll);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAll, { once: true });
  } else {
    bindAll();
  }
}
