import type { RailStep } from './player-logic';

export type DemoLocale = 'en' | 'es';

interface PlayerCopy {
  rail: string;
  steps: Record<RailStep, { label: string; caption: string }>;
}

/** The demo's own chrome; the player itself stays in the site's Spanish. */
export const PLAYER_DEMO_COPY: Record<DemoLocale, PlayerCopy> = {
  en: {
    rail: 'States of the player',
    steps: {
      idle: {
        label: 'Idle',
        caption:
          'Nothing starts on its own: the first work waits on the record, the list shows numbers.',
      },
      playing: {
        label: 'Playing',
        caption:
          'A real recording streams from the site: the record turns and three bars move in its row.',
      },
      paused: {
        label: 'Paused',
        caption: 'The record stops where it was and the row keeps its number in full ink.',
      },
      mini: {
        label: 'Mini player',
        caption: 'Scroll past the card while music plays and the record shrinks into the corner.',
      },
    },
  },
  es: {
    rail: 'Estados del reproductor',
    steps: {
      idle: {
        label: 'En reposo',
        caption:
          'Nada arranca solo: la primera obra espera en el disco y la lista muestra números.',
      },
      playing: {
        label: 'Sonando',
        caption:
          'Suena una grabación real del sitio: el disco gira y tres barras se mueven en su fila.',
      },
      paused: {
        label: 'En pausa',
        caption: 'El disco se detiene donde iba y la fila conserva su número en tinta plena.',
      },
      mini: {
        label: 'Mini reproductor',
        caption: 'Al pasar de largo la tarjeta mientras suena, el disco se encoge a la esquina.',
      },
    },
  },
};
