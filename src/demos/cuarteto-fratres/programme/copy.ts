export type DemoLocale = 'en' | 'es';

export type ProgrammeState = 'tickets' | 'free' | 'long';

/** The states of the rail, in the order the reader walks them. */
export const PROGRAMME_STATES: readonly ProgrammeState[] = ['tickets', 'free', 'long'];

interface ProgrammeCopy {
  rail: string;
  states: Record<ProgrammeState, { label: string; caption: string }>;
}

/** The demo's own chrome; the window itself stays in Spanish, as on the site. */
export const PROGRAMME_COPY: Record<DemoLocale, ProgrammeCopy> = {
  en: {
    rail: 'States of the event window',
    states: {
      tickets: {
        label: 'With tickets',
        caption: 'Prices beside the venue and a buy button. Hall and prices are samples.',
      },
      free: {
        label: 'No tickets',
        caption:
          'No link and no prices: the tickets block is gone and the button asks for details.',
      },
      long: {
        label: 'Long programme',
        caption: 'Seven works: the text scrolls inside the sheet, which keeps its size.',
      },
    },
  },
  es: {
    rail: 'Estados de la ventana de una fecha',
    states: {
      tickets: {
        label: 'Con boletos',
        caption: 'Precios junto al lugar y botón de compra. Sala y precios son de muestra.',
      },
      free: {
        label: 'Sin boletos',
        caption:
          'Sin enlace ni precios: el bloque de entradas desaparece y el botón pide informes.',
      },
      long: {
        label: 'Programa largo',
        caption: 'Siete obras: el texto se desplaza dentro de la hoja, que no cambia de tamaño.',
      },
    },
  },
};
