import type { OptionGroup } from '@/lib/dev-options';

/**
 * What the dev options menu offers (`DevOptions.astro`, rendered only by `astro dev`). A choice
 * paints `data-opt-<id>` on `<html>` and may carry a text or a preset of ranges; a range paints
 * `--opt-<id>`. Labels are in Spanish: the menu is Sebastian's working tool, not part of the site.
 *
 * When a decision is final, its winning value moves into the content or the component and its
 * control is deleted from here.
 */
export const OPTION_GROUPS: readonly OptionGroup[] = [
  {
    id: 'cuarteto-title',
    label: 'Cuarteto · título',
    where: '/works/cuarteto-fratres',
    controls: [
      {
        kind: 'choice',
        id: 'title-cuarteto-fratres',
        label: 'Título del caso',
        initial: 'current',
        options: [
          {
            id: 'current',
            label: 'Actual',
            text: { en: 'Cuarteto Fratres', es: 'Cuarteto Fratres' },
          },
          {
            id: 'triad',
            label: 'Marca, tipografía, escenario',
            text: {
              en: 'Cuarteto Fratres: A brand, a typeface, a digital stage',
              es: 'Cuarteto Fratres: identidad, tipografía y un escenario digital',
            },
          },
          {
            id: 'how',
            label: 'Cómo consiguió…',
            text: {
              en: 'How Cuarteto Fratres got a brand, a typeface, and a stage',
              es: 'Cómo Cuarteto Fratres consiguió una identidad, una tipografía y un escenario digital',
            },
          },
          {
            id: 'website',
            label: 'Marca, tipografía y sitio',
            text: {
              en: 'A brand, a typeface, and a website for Cuarteto Fratres',
              es: 'Identidad visual, tipografía y sitio web para Cuarteto Fratres',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'mockup',
    label: 'Mockups · perspectiva',
    where: '/dev/mockups',
    controls: [
      {
        kind: 'choice',
        id: 'mockup-angle',
        label: 'Ángulo',
        initial: 'side',
        options: [
          {
            id: 'side',
            label: 'Lateral suave',
            sets: { 'mockup-rx': 8, 'mockup-ry': -16, 'mockup-rz': 2, 'mockup-zoom': 1.45 },
          },
          {
            id: 'vanish',
            label: 'Fuga',
            sets: { 'mockup-rx': 16, 'mockup-ry': -34, 'mockup-rz': 7, 'mockup-zoom': 2.1 },
          },
          {
            id: 'table',
            label: 'Sobre la mesa',
            sets: { 'mockup-rx': 34, 'mockup-ry': -8, 'mockup-rz': 5, 'mockup-zoom': 1.8 },
          },
          {
            id: 'mirror',
            label: 'Lateral al revés',
            sets: { 'mockup-rx': 10, 'mockup-ry': 22, 'mockup-rz': -3, 'mockup-zoom': 1.6 },
          },
          {
            id: 'front',
            label: 'De frente',
            sets: { 'mockup-rx': 0, 'mockup-ry': 0, 'mockup-rz': 0, 'mockup-zoom': 1.05 },
          },
        ],
      },
      {
        kind: 'range',
        id: 'mockup-rx',
        label: 'Inclinar (X)',
        min: -60,
        max: 60,
        step: 1,
        initial: 8,
        unit: 'deg',
      },
      {
        kind: 'range',
        id: 'mockup-ry',
        label: 'Girar (Y)',
        min: -60,
        max: 60,
        step: 1,
        initial: -16,
        unit: 'deg',
      },
      {
        kind: 'range',
        id: 'mockup-rz',
        label: 'Rotar (Z)',
        min: -30,
        max: 30,
        step: 0.5,
        initial: 2,
        unit: 'deg',
      },
      {
        kind: 'range',
        id: 'mockup-zoom',
        label: 'Acercar',
        min: 0.8,
        max: 3.5,
        step: 0.05,
        initial: 1.45,
        unit: '',
      },
      {
        kind: 'range',
        id: 'mockup-cx',
        label: 'Centro horizontal',
        min: -50,
        max: 50,
        step: 1,
        initial: 0,
        unit: '%',
      },
      {
        kind: 'range',
        id: 'mockup-cy',
        label: 'Centro vertical',
        min: -50,
        max: 50,
        step: 1,
        initial: 0,
        unit: '%',
      },
      {
        kind: 'range',
        id: 'mockup-x',
        label: 'Mover horizontal',
        min: -40,
        max: 40,
        step: 1,
        initial: 0,
        unit: '%',
      },
      {
        kind: 'range',
        id: 'mockup-y',
        label: 'Mover vertical',
        min: -40,
        max: 40,
        step: 1,
        initial: 0,
        unit: '%',
      },
      {
        kind: 'range',
        id: 'mockup-depth',
        label: 'Perspectiva',
        min: 500,
        max: 3000,
        step: 50,
        initial: 1300,
        unit: 'px',
      },
      {
        kind: 'range',
        id: 'mockup-blur',
        label: 'Desenfoque',
        min: 0,
        max: 14,
        step: 0.5,
        initial: 5,
        unit: 'px',
      },
      {
        kind: 'range',
        id: 'mockup-focus',
        label: 'Zona nítida',
        min: 15,
        max: 90,
        step: 1,
        initial: 42,
        unit: '%',
      },
      {
        kind: 'choice',
        id: 'mockup-edge',
        label: 'Bordes',
        initial: 'fade',
        options: [
          { id: 'fade', label: 'Se funden' },
          { id: 'plain', label: 'Sin efecto' },
        ],
      },
    ],
  },
];

/** Where the menu keeps its state between reloads. */
export const OPTIONS_STORAGE_KEY = 'pf-dev-options';
