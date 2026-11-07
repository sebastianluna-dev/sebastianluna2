import type { nav as reference } from '../es/nav';

export const nav = {
  label: 'Main',
  home: 'Home',
  works: 'Works',
  email: 'Email',
  emailCopied: '{email} copied to clipboard',
  emailWriteTo: 'Write to {email}',
} satisfies typeof reference;
