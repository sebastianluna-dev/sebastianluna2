import type { Letter } from './monogram';

export type DemoLocale = 'en' | 'es';

export type BrandStep = 'outline' | 'fill' | 'lockup' | 'typeface';

export type LockupGround = 'ink' | 'cream';

/** The pieces of the identity in the order they are shown, each with the line read under the rail. */
export const BRAND_STEPS: readonly BrandStep[] = ['outline', 'fill', 'lockup', 'typeface'];

interface BrandCopy {
  rail: string;
  steps: Record<BrandStep, { label: string; caption: string }>;
  /** Accessible name of the editor scene: a recreation, not a recording. */
  editor: string;
  layers: string;
  layer: (letter: Letter) => string;
  ground: string;
  grounds: Record<LockupGround, string>;
  testerLabel: string;
  defaultText: string;
}

export const BRAND_COPY: Record<DemoLocale, BrandCopy> = {
  en: {
    rail: 'Pieces of the identity',
    steps: {
      outline: {
        label: 'Outline',
        caption: 'Two closed paths, the C and the F, drawn point by point with the pen.',
      },
      fill: {
        label: 'Fill',
        caption: 'Filled, the two letters lock into one monogram.',
      },
      lockup: {
        label: 'Lockup',
        caption: 'The monogram beside the name, set in the quartet’s own face.',
      },
      typeface: {
        label: 'Typeface',
        caption: 'Fratres Display has capitals only, so whatever you write is set in upper case.',
      },
    },
    editor: 'Recreation of a vector editor with the CF monogram on its canvas',
    layers: 'Layers',
    layer: (letter) => `Highlight the letter ${letter}`,
    ground: 'Ground',
    grounds: { ink: 'Ink', cream: 'Cream' },
    testerLabel: 'Write something',
    defaultText: 'Cuarteto Fratres',
  },
  es: {
    rail: 'Piezas de la identidad',
    steps: {
      outline: {
        label: 'Trazo',
        caption: 'Dos trazados cerrados, la C y la F, dibujados punto a punto con la pluma.',
      },
      fill: {
        label: 'Relleno',
        caption: 'Rellenas, las dos letras encajan en un solo monograma.',
      },
      lockup: {
        label: 'Firma',
        caption: 'El monograma junto al nombre, compuesto en la letra propia del cuarteto.',
      },
      typeface: {
        label: 'Tipografía',
        caption: 'Fratres Display solo tiene mayúsculas: lo que escribas se compone en mayúsculas.',
      },
    },
    editor: 'Recreación de un editor vectorial con el monograma CF en su lienzo',
    layers: 'Capas',
    layer: (letter) => `Resaltar la letra ${letter}`,
    ground: 'Fondo',
    grounds: { ink: 'Tinta', cream: 'Crema' },
    testerLabel: 'Escribe algo',
    defaultText: 'Cuarteto Fratres',
  },
};
