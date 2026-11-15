import borodinSchubert from '../assets/programme-borodin-schubert.webp';
import temporada from '../assets/event-temporada.webp';

export interface ProgrammeWork {
  title: string;
  composer: string;
}

/** One date of the bill, as its poster and its window read it (the site's `EventContent`). */
export interface ProgrammeEvent {
  id: string;
  title: string;
  /** The title as the poster sets it: the last word big and broken by syllables, the rest above. */
  poster: { kicker: string; lines: readonly string[] };
  /** The line under the poster's title: the surnames of the composers. */
  composers: string;
  /** ISO date, local to the venue. */
  date: string;
  /** "HH:mm", 24 h. */
  time: string;
  city: string;
  photo: { src: string; position: string };
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

/** Fixed copy of the bill, the site's `SHOWS_COPY`: its title, a poster's button, the invitation. */
export const BILL_COPY = {
  title: 'Cartelera',
  program: 'Ver programa',
  invitation: {
    top: 'Tu',
    topNote: 'Fecha · Tu lugar',
    side: 'Programa a la medida',
    title: { kicker: 'Bodas, ceremonias y', lines: ['even', 'tos'] },
    where: 'Conciertos · Bodas · Eventos privados',
    note: 'Te respondemos con una propuesta de programa.',
    action: 'Solicitar informes',
  },
} as const;

const DESCRIPTION =
  'Programa de cámara con obras del repertorio clásico y latinoamericano del cuarteto.';

/**
 * The two dates of the bill. Titles, dates, cities and photos are the site's; halls, prices and the
 * long programme of the second date are samples, so the window shows both of its shapes: a date
 * that sells tickets, and one without them whose programme outgrows the sheet.
 */
export const PROGRAMME_EVENTS: readonly ProgrammeEvent[] = [
  {
    id: 'temporada',
    title: 'Concierto de temporada',
    poster: { kicker: 'Concierto de', lines: ['tempo', 'rada'] },
    composers: 'Borodín · Elizondo',
    date: '2026-12-05',
    time: '20:00',
    city: 'Boca del Río, Veracruz',
    photo: { src: temporada.src, position: '46% 42%' },
    description: DESCRIPTION,
    program: [
      { title: 'Cuarteto núm. 2 en Re mayor', composer: 'Aleksandr Borodín' },
      { title: 'Danzas Latinoamericanas', composer: 'José Elizondo' },
    ],
    venue: { name: 'Sala de conciertos', address: 'Boca del Río, Veracruz' },
    tickets: {
      prices: [
        { amount: '$250', label: 'General' },
        { amount: '$150', label: 'Estudiantes' },
      ],
    },
  },
  {
    id: 'borodin-schubert',
    title: 'Borodin y Schubert',
    poster: { kicker: 'Borodin y', lines: ['Schu', 'bert'] },
    composers: 'Borodín · Schubert',
    date: '2026-12-20',
    time: '19:30',
    city: 'Xalapa, Veracruz',
    photo: { src: borodinSchubert.src, position: '64% 50%' },
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
    venue: { name: 'Sala de conciertos', address: 'Xalapa, Veracruz' },
  },
];
