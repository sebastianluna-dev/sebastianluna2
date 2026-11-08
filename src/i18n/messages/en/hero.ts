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
        'Senior frontend developer, interface designer, and chess coach with six years of experience in ',
      metal: 'React',
      after: ', Next.js, and TypeScript.',
    },
    second:
      'I turn business needs into products: I design the interface, write the code, and ship it to production across health, education, music, and tourism.',
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
