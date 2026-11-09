import type { about as reference } from '../es/about';

export const about = {
  meta: {
    title: 'About | Sebastian Luna',
    description:
      "How I started, the tools I work with, and where I've worked: the story of Sebastian Luna, senior frontend developer in Boca del Río, Veracruz.",
  },
  hero: {
    avatarAlt: 'Photo of Sebastian Luna',
    title: 'About',
    paragraphs: [
      "I'm a senior frontend developer, interface designer, and chess coach based in Boca del Río, Veracruz. My interest in technology started as a kid with video games, and in 2019 I taught myself to code through online courses. That curiosity became my career.",
      "For six years I've turned business needs into products with React, Next.js, and TypeScript: I design the interface, write the code, and ship it to production. Today I build with Claude Code under my own technical direction, and my favorite part is still the client conversation.",
    ],
    email: {
      copyLabel: 'Copy {email}',
      copied: 'Copied',
      failed: "Couldn't copy",
    },
  },
  toolkit: {
    heading: 'My toolkit',
    open: 'Open the toolkit folder',
    close: 'Close the toolkit folder',
    collectionsLabel: 'Choose a collection',
    collections: {
      interface: 'Interface',
      design: 'Design',
      data: 'Data',
      quality: 'Quality',
      shipping: 'Shipping',
    },
  },
  experience: {
    heading: 'Experience',
    items: [
      {
        id: 'chess',
        dates: '2026 — now',
        title: '365 Días de Ajedrez',
        body: 'I founded the academy and built its platform: courses, classes with a coach, puzzles, and an adventure mode, across 111 screens for five roles and backed by more than 2,300 automated tests. I owned product, architecture, design, and code.',
      },
      {
        id: 'consulting',
        dates: '2023 — 2026',
        title: 'Page Consulting',
        body: 'As a consultant assigned to AstraZeneca, I worked in an international team of more than 30 people using Scrum. I helped define, design, and build the frontend of Comms App, rolled out Tealium across several sites, and was part of the support team for about 500 international corporate websites.',
      },
      {
        id: 'health',
        dates: '2021 — 2023',
        title: 'Mellow',
        body: 'I was the frontend developer behind Reto MD: its corporate site and a network of specialty sites that I unified into a multi-tenant Next.js architecture, with six deployments from a single repository. I also designed the interface and built the frontend of the Sociedad Mexicana de Oftalmología backoffice.',
      },
      {
        id: 'stores',
        dates: '2020 — 2021',
        title: 'Proficient Systems',
        body: "I joined a team of five developers as a junior intern. I built Liquid storefronts and Node.js apps on Shopify's APIs, and designed and developed the Ocho Seis Uno real estate platform end to end and the site of a boat tour operator in Puerto Vallarta.",
      },
    ],
  },
  readings: {
    heading: 'Readings',
    placeholderNote: 'The reading list is in preparation.',
  },
} satisfies typeof reference;
