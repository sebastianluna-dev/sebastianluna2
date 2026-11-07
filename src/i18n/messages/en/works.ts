import type { works as reference } from '../es/works';

export const works = {
  title: 'Works',
  cardLabel: '{title}, {year}, {role}',
} satisfies typeof reference;
