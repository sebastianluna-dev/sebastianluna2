import type { footer as reference } from '../es/footer';

export const footer = {
  name: 'Sebastian Luna',
  frameLabel: 'Portrait',
  socialLabel: 'Profiles',
  social: {
    linkedin: 'LinkedIn',
    github: 'GitHub',
    email: 'Email',
    cv: 'Download CV',
  },
  copyright: '© {year}',
  locale: {
    label: 'Language',
    es: 'Español',
    en: 'English',
  },
} satisfies typeof reference;
