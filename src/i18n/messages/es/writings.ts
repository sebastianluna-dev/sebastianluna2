// Writings: index, list (also on /about) and article template (fase7-plan §2.5).
export const writings = {
  meta: {
    title: 'Escritos | Sebastian Luna',
    description: 'Artículos de Sebastian Luna sobre su trabajo de diseño y desarrollo frontend.',
  },
  /** Chip: h1 on the index, h2 on /about; also the accessible name of the section. */
  heading: 'Escritos',
  /** Empty state: no published writing in this language. */
  empty: 'Todavía no hay escritos publicados. Aparecerán aquí cuando estén listos.',
  /** Chip of a draft, dev only. */
  draft: 'Borrador',
  /** Document title of an article: `{title}` is the article title, `{site}` the site name. */
  documentTitle: '{title} | {site}',
  readingTime: '{minutes} min de lectura',
  back: 'Volver',
  backLabel: 'Volver a Sobre mí',
  backNavLabel: 'Regreso a Sobre mí',
  author: {
    writtenBy: 'Escrito por',
    /** `{handle}` is PROFILE.linkedinHandle. */
    linkLabel: '{handle} en LinkedIn (se abre en otra pestaña)',
    /** The five hero objects; the SSR paints the first one and a script picks one at random. */
    emoji: ['♟️', '🎻', '🩺', '⛵', '⌨️'],
  },
  figure: {
    placeholder: 'Imagen en preparación',
  },
  code: {
    copy: 'Copiar',
    copied: 'Copiado',
    copyLabel: 'Copiar código',
    copiedLabel: 'Código copiado',
    /** Accessible name of the code block; `{language}` is its label. */
    snippetLabel: 'Fragmento de código: {language}',
  },
};
