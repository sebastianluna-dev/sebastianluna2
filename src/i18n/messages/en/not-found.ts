import type { NotFoundLine, notFound as reference } from '../es/not-found';

const lines: readonly NotFoundLine[] = [
  { text: '$ cd ~/portfolio' },
  { text: 'Looking for the page...' },
  { prefix: '✓ ', text: 'Case studies in order' },
  { prefix: '✓ ', text: 'Routes compiled' },
  { prefix: '✓ ', text: 'Languages: es, en' },
  { prefix: '✕ ', text: "This route doesn't exist." },
  { text: 'Error 404', heading: true },
  { text: 'The address you opened' },
  { text: "doesn't lead to any page." },
];

export const notFound = {
  meta: {
    title: 'Page not found | Sebastian Luna',
    description: 'This page does not exist.',
  },
  lines,
  back: { prefix: '> ', text: 'Back to the start' },
  caret: '█',
  cursor: '_',
} satisfies typeof reference;
