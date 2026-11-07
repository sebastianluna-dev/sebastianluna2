import type { notFound as reference } from '../es/not-found';

export const notFound = {
  meta: {
    title: 'Page not found | Sebastian Luna',
    description: 'This page does not exist.',
  },
  lines: [
    '$ open {path}',
    'error 404: this page does not exist',
    '$ ls /',
    'home  works',
    '$ echo "Shall we go back?"',
    'Shall we go back?',
  ],
  back: 'Back to the start',
} satisfies typeof reference;
