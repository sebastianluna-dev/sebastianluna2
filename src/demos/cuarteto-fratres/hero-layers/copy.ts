export type DemoLocale = 'en' | 'es';

export type HeroStep = 'hall' | 'staves' | 'music' | 'musicians' | 'final';

/** The steps in the order the hero was built up, each with the line read under the rail. */
export const HERO_STEPS: readonly HeroStep[] = ['hall', 'staves', 'music', 'musicians', 'final'];

interface HeroLayersCopy {
  rail: string;
  steps: Record<HeroStep, { label: string; caption: string }>;
}

export const HERO_LAYERS_COPY: Record<DemoLocale, HeroLayersCopy> = {
  en: {
    rail: 'Layers of the hero',
    steps: {
      hall: {
        label: 'Hall',
        caption: 'A near-black ground and one soft light: the hall a minute before the concert.',
      },
      staves: {
        label: 'Staves',
        caption: 'Three staves of five curved lines that sway slowly, so they never look printed.',
      },
      music: {
        label: 'Music',
        caption: 'Real bars of Borodin and Pachelbel, every note placed on its line or space.',
      },
      musicians: {
        label: 'Musicians',
        caption: 'Four cut-out portraits, scaled so the heads read the same size.',
      },
      final: {
        label: 'As on the site',
        caption: 'The ink thins over each face and everything dims to its final weight.',
      },
    },
  },
  es: {
    rail: 'Capas de la portada',
    steps: {
      hall: {
        label: 'Sala',
        caption: 'Un fondo casi negro y una luz suave: la sala un minuto antes del concierto.',
      },
      staves: {
        label: 'Pentagramas',
        caption:
          'Tres pentagramas de cinco líneas curvas que se mecen despacio, para que no parezcan impresos.',
      },
      music: {
        label: 'Música',
        caption: 'Compases reales de Borodín y Pachelbel, cada nota en su línea o su espacio.',
      },
      musicians: {
        label: 'Músicos',
        caption:
          'Cuatro retratos recortados, a escala para que las cabezas tengan el mismo tamaño.',
      },
      final: {
        label: 'Como en el sitio',
        caption: 'La tinta se adelgaza sobre cada cara y todo baja a su peso final.',
      },
    },
  },
};
