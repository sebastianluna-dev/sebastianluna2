import type { hero as reference } from '../es/hero';

export const hero = {
  avatar: {
    label: 'Sebastian Luna’s LinkedIn profile (opens in a new tab)',
  },
  intro: 'I’m',
  name: 'Sebastian Luna',
  title: 'I design and build web products',
  menu: {
    label: 'Actions on the name',
    copy: 'Copy',
    copyName: 'Copy email',
    openCv: 'Open CV',
    askBlue: 'Ask Blue',
    copied: 'Email copied',
  },
  bio: {
    first: {
      before:
        'AI Product Engineer and founder of 365 Días de Ajedrez. 6+ years building full-stack products with ',
      metal: 'React',
      after: ', Next.js, Node.js, and PostgreSQL.',
    },
    second:
      'I take products from idea to production: I talk with the people who will use them, design the interface, and build backend and frontend, with AI agents under my direction.',
  },
  ctas: {
    contact: 'Contact',
    works: 'Works',
  },
  tip: {
    before: 'Press',
    after: 'to chat with Blue',
    keys: {
      command: 'Command',
      option: 'Option',
      ctrl: 'Control',
      alt: 'Alt',
      plus: 'plus',
      slash: 'slash',
    },
    caps: {
      ctrl: 'Ctrl',
      alt: 'Alt',
    },
  },
} satisfies typeof reference;
