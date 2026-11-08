/**
 * Case study components, the only barrel of the project (AGENTS.md "Files"): MDX bodies import from
 * here (`import { CaseSection, Figure } from '@/components/portfolio/case';`). Contracts in `types.ts`.
 */

// Used by the MDX body.
export { default as CaseSection } from './CaseSection.astro';
export { default as CaseSubsection } from './CaseSubsection.astro';
export { default as Figure } from './Figure.astro';
export { default as Gallery } from './Gallery.astro';
export { default as ChatAside } from './ChatAside.astro';
export { default as SideNotes } from './SideNotes.astro';
export { default as SideNote } from './SideNote.astro';
export { default as DemoSlot } from './DemoSlot.astro';

// Mounted by WorkView.
export { default as CaseHeader } from './CaseHeader.astro';
export { default as CaseMeta } from './CaseMeta.astro';
export { default as WorksMap } from './WorksMap.astro';
export { default as BackPill } from './BackPill.astro';
export { default as PrevNext } from './PrevNext.astro';
export { default as Lightbox } from './Lightbox.astro';

export { SIDE_NOTE_ARTS } from './types';
export type * from './types';
