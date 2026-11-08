/**
 * Pure logic of the Works Map (design-spec §3.2, case.md §3.1): its scroll-spy (CA-02) and its
 * in-page jump (CA-03). The DOM side lives in `works-map.client.ts`; the clicks and the back pill
 * are in `case-nav.ts`.
 */
import { WORKS_MAP } from '@/components/motion/presets';

/** A case section and the viewport `top` of its box (`getBoundingClientRect().top`). */
export interface SectionTop {
  id: string;
  top: number;
}

/**
 * CA-02: the current section is the last one whose top is above `line × viewportHeight`; when none
 * is (the hero still fills the screen) it is the first. `null` only when there are no sections.
 * Sections are given in document order, so the tops grow along the list.
 */
export function currentSectionId(
  sections: readonly SectionTop[],
  viewportHeight: number,
  line: number = WORKS_MAP.activeLine,
): string | null {
  if (sections.length === 0) return null;
  const limit = viewportHeight * line;
  let current = sections[0].id;
  for (const section of sections) {
    if (section.top < limit) current = section.id;
  }
  return current;
}

/**
 * The section an in-page link points to: the decoded hash when the link stays on this page (same
 * origin, path and query), `null` otherwise or for an empty hash.
 */
export function inPageTarget(href: string, pageHref: string): string | null {
  let to: URL;
  let page: URL;
  try {
    page = new URL(pageHref);
    to = new URL(href, page);
  } catch {
    return null;
  }
  if (to.origin !== page.origin || to.pathname !== page.pathname || to.search !== page.search) {
    return null;
  }
  const hash = to.hash.slice(1);
  if (!hash) return null;
  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
}
