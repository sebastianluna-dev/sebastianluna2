// 404 page, written as a terminal session (decisiones.md 27).
export const notFound = {
  meta: {
    title: 'Página no encontrada | Sebastian Luna',
    description: 'Esta página no existe.',
  },
  /** Typed one character at a time; `{path}` is the requested path. */
  lines: [
    '$ open {path}',
    'error 404: esta página no existe',
    '$ ls /',
    'inicio  trabajos',
    '$ echo "¿Volvemos?"',
    '¿Volvemos?',
  ],
  back: 'Volver al inicio',
};
