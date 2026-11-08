// While Blue's full-screen sheet covers the page, the page behind it must not take the focus or the
// screen reader's cursor (WCAG 2.4.3, 2.4.11): every sibling of Blue's root turns `inert`. Only the
// nodes this call changed are restored, so an element that was already inert stays that way.

export interface InertTarget {
  inert: boolean;
}

/** Makes every child of `parent` except `keep` inert; returns the function that undoes it. */
export function makeSiblingsInert<T extends InertTarget>(
  children: Iterable<T>,
  keep: T | null,
): () => void {
  const changed: T[] = [];
  for (const child of children) {
    if (child === keep || child.inert) continue;
    child.inert = true;
    changed.push(child);
  }
  return () => {
    for (const child of changed) child.inert = false;
  };
}
