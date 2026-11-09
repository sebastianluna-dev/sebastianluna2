/**
 * Touch hold of the /about books (about-spec §5.3): a finger (or pen) on a book opens it for as long
 * as it stays down (pointer capture) and closes it on release, cancel or a scroll that takes the
 * pointer. Mouse hover and keyboard focus are pure CSS. Rebinds on `astro:page-load`.
 */
const SHELF_SELECTOR = '[data-book-shelf]';
const BOOK_SELECTOR = '[data-book]';

const bound = new Map<HTMLElement, () => void>();
let started = false;

function bind(shelf: HTMLElement): () => void {
  const close = (book: HTMLElement) => {
    delete book.dataset.open;
  };

  const onDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') return;
    const book =
      event.target instanceof Element ? event.target.closest<HTMLElement>(BOOK_SELECTOR) : null;
    if (!book || !shelf.contains(book)) return;
    book.dataset.open = '';
    try {
      book.setPointerCapture(event.pointerId);
    } catch {
      // The pointer may already be gone; the release listeners still close the book.
    }
    const end = () => {
      close(book);
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
  return () => {
    shelf.removeEventListener('pointerdown', onDown);
    shelf.removeEventListener('contextmenu', onContextMenu);
    for (const book of shelf.querySelectorAll<HTMLElement>(BOOK_SELECTOR)) close(book);
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
