import type { ProgrammeState } from './copy';

export interface ProgrammeWork {
  title: string;
  composer: string;
}

/** One date of the bill as the window reads it (the shape of the site's `EventContent`). */
export interface ProgrammeEvent {
  title: string;
  /** ISO date, local to the venue. */
  date: string;
  /** "HH:mm", 24 h. */
  time: string;
  city: string;
  description: string;
  program: readonly ProgrammeWork[];
  venue: { name: string; address: string };
  /** Present only when the date sells tickets. */
  tickets?: { prices: readonly { amount: string; label: string }[] };
}

/** Fixed labels of the window, the site's `EVENT_DIALOG_LABELS`. */
export const EVENT_LABELS = {
  program: 'Programa',
  venue: 'Lugar',
  directions: 'Cómo llegar',
  ticketsHeading: 'Entradas',
  tickets: 'Comprar boletos',
  inquire: 'Solicitar informes',
  close: 'Cerrar',
} as const;

/** The bill behind the window. */
export const BILL_TITLE = 'Cartelera';

const BASE = {
  title: 'Concierto de temporada',
  date: '2026-12-05',
  time: '20:00',
  city: 'Boca del Río, Veracruz',
  // Sample values: the real date has no venue yet.
  venue: { name: 'Sala de conciertos', address: 'Boca del Río, Veracruz' },
} as const;

const DESCRIPTION =
  'Programa de cámara con obras del repertorio clásico y latinoamericano del cuarteto.';

const SEASON_PROGRAM: readonly ProgrammeWork[] = [
  { title: 'Cuarteto núm. 2 en Re mayor', composer: 'Aleksandr Borodín' },
  { title: 'Danzas Latinoamericanas', composer: 'José Elizondo' },
];

/** The event each state of the rail opens: the season concert, real but for venue and prices. */
export const PROGRAMME_EVENTS: Record<ProgrammeState, ProgrammeEvent> = {
  tickets: {
    ...BASE,
    description: DESCRIPTION,
    program: SEASON_PROGRAM,
    tickets: {
      prices: [
        { amount: '$250', label: 'General' },
        { amount: '$150', label: 'Estudiantes' },
      ],
    },
  },
  free: {
    ...BASE,
    description: `${DESCRIPTION} Entrada libre hasta completar aforo.`,
    program: SEASON_PROGRAM,
  },
  long: {
    ...BASE,
    description: `${DESCRIPTION} Entrada libre hasta completar aforo.`,
    program: [
      { title: 'Cuarteto núm. 2 en Re mayor', composer: 'Aleksandr Borodín' },
      { title: 'Cuarteto núm. 14 «La muerte y la doncella»', composer: 'Franz Schubert' },
      { title: 'Danzas Latinoamericanas', composer: 'José Elizondo' },
      { title: 'Fuga y Misterio', composer: 'Astor Piazzolla' },
      { title: 'Por una cabeza', composer: 'Carlos Gardel' },
      { title: 'Viva la Vida', composer: 'Coldplay' },
      { title: 'Skyfall', composer: 'Adele' },
    ],
  },
};
