import type { writings as reference } from '../es/writings';

export const writings = {
  meta: {
    title: 'Writings | Sebastian Luna',
    description: 'Articles by Sebastian Luna about how he designs and builds products.',
  },
  heading: 'Writings',
  empty: 'No writings published yet. They will show up here once they are ready.',
  draft: 'Draft',
  documentTitle: '{title} | {site}',
  readingTime: '{minutes} min read',
  back: 'Back',
  backLabel: 'Back to About',
  backNavLabel: 'Back to About',
  author: {
    writtenBy: 'Written by',
    linkLabel: '{handle} on LinkedIn (opens in a new tab)',
    emoji: ['♟️', '🎻', '🩺', '⛵', '⌨️'],
  },
  figure: {
    placeholder: 'Image in preparation',
  },
  code: {
    copy: 'Copy',
    copied: 'Copied',
    copyLabel: 'Copy code',
    copiedLabel: 'Code copied',
    snippetLabel: 'Code snippet: {language}',
  },
} satisfies typeof reference;
