/**
 * Blue's own mark: a glossy blue speech bubble with two eyes, drawn for this site (the reference's
 * 3D mascot is not reused, decisiones.md 4). One geometry for the launcher (`BlueLauncher.astro`)
 * and the panel header (`BluePanel.tsx`); colours are the `--pf-blue-mark-*` tokens.
 */
export const BLUE_MARK = {
  viewBox: '0 0 64 64',
  /** Bubble with its tail at the bottom left. */
  body: 'M24 7h16c11.6 0 19 7.4 19 19v4c0 11.6-7.4 19-19 19H27.5l-11 8.7c-1.5 1.2-3.6-.1-3.2-2l1.6-8.2C9 44.2 5 38.1 5 30v-4C5 14.4 12.4 7 24 7Z',
  /** The two eyes: rounded vertical pills. */
  eyes: [
    { x: 21.5, y: 19.5, width: 7, height: 14, rx: 3.5 },
    { x: 35.5, y: 19.5, width: 7, height: 14, rx: 3.5 },
  ],
  /** Soft highlight along the top edge. */
  gloss: 'M17 13.5c4-2.6 9-3.5 15-3.5s11 .9 15 3.5c1.2.8.7 2.6-.8 2.6H17.8c-1.5 0-2-1.8-.8-2.6Z',
  /** Gradient stops of the body, top to bottom (CSS custom properties). */
  stops: [
    { offset: 0, color: 'var(--pf-blue-mark-top)' },
    { offset: 0.48, color: 'var(--pf-blue-mark-mid)' },
    { offset: 1, color: 'var(--pf-blue-mark-bottom)' },
  ],
} as const;
