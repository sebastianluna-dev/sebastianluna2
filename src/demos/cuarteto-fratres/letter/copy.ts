export type DemoLocale = 'en' | 'es';

export type LetterState = 'empty' | 'errors' | 'sent';

/** The states of the letter in the order the reader meets them. */
export const LETTER_STATES: readonly LetterState[] = ['empty', 'errors', 'sent'];

interface LetterCopy {
  rail: string;
  states: Record<LetterState, { label: string; caption: string }>;
}

export const LETTER_COPY: Record<DemoLocale, LetterCopy> = {
  en: {
    rail: 'States of the contact letter',
    states: {
      empty: {
        label: 'Empty',
        caption: 'A sheet of ruled paper: write on it, nothing you type leaves this page.',
      },
      errors: {
        label: 'With errors',
        caption: 'Every problem is marked at once, each message tied to its own line.',
      },
      sent: {
        label: 'Sent',
        caption: 'A valid request gives way to the thanks. Here nothing was sent.',
      },
    },
  },
  es: {
    rail: 'Estados de la carta de contacto',
    states: {
      empty: {
        label: 'Vacía',
        caption:
          'Una hoja de papel rayado: escribe en ella, nada de lo que pongas sale de la página.',
      },
      errors: {
        label: 'Con errores',
        caption: 'Todos los problemas se marcan a la vez, cada mensaje atado a su renglón.',
      },
      sent: {
        label: 'Enviada',
        caption: 'Una solicitud válida da paso a las gracias. Aquí no se envió nada.',
      },
    },
  },
};
