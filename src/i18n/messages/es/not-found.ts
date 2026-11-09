// 404 page, written as a terminal session (decisiones.md 27, fase7-plan §3.2).

/** One line of the 404 terminal: `prefix` appears at once (aria-hidden), `text` is typed. */
export interface NotFoundLine {
  readonly prefix?: string;
  readonly text: string;
  /** The line that is the page's `h1`. */
  readonly heading?: boolean;
}

const lines: readonly NotFoundLine[] = [
  { text: '$ cd ~/portafolio' },
  { text: 'Buscando la página...' },
  { prefix: '✓ ', text: 'Casos de estudio en orden' },
  { prefix: '✓ ', text: 'Rutas compiladas' },
  { prefix: '✓ ', text: 'Idiomas: es, en' },
  { prefix: '✕ ', text: 'Esta ruta no existe.' },
  { text: 'Error 404', heading: true },
  { text: 'La dirección que abriste' },
  { text: 'no lleva a ninguna página.' },
];

export const notFound = {
  meta: {
    title: 'Página no encontrada | Sebastian Luna',
    description: 'Esta página no existe.',
  },
  /** Nine terminal lines; their timing is NOT_FOUND_TYPER.lines[0..8]. */
  lines,
  /** Tenth line, the link home (NOT_FOUND_TYPER.lines[9]). The prefix stays out of its name. */
  back: { prefix: '> ', text: 'Volver al inicio' },
  /** Block caret of the line being typed and the blinking cursor after the link (aria-hidden). */
  caret: '█',
  cursor: '_',
};
