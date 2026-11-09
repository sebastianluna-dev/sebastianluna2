/**
 * Components of a writing body: MDX articles import from here
 * (`import { ChatAside, WritingFigure } from '@/components/portfolio/writing';`). Links, tables and
 * code blocks need no import: WritingView maps `a`, `table` and `pre` onto WritingLink, WritingTable
 * and CodeBlock (and the lists onto WritingBulletList / WritingNumberedList). The chat and the side
 * notes are the case ones, unchanged.
 */
export { default as WritingFigure } from './WritingFigure.astro';
// Straight from their files, not the case barrel: the barrel would pull every case component (and
// its CSS) into the writing pages.
export { default as ChatAside } from '@/components/portfolio/case/ChatAside.astro';
export { default as SideNotes } from '@/components/portfolio/case/SideNotes.astro';
export { default as SideNote } from '@/components/portfolio/case/SideNote.astro';
