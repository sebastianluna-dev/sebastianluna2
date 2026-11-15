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
    id: 'cuarteto-sections',
    label: 'Cuarteto · títulos de sección',
    where: '/works/cuarteto-fratres',
    controls: [
      {
        kind: 'choice',
        id: 'section-cuarteto-fratres-overview',
        label: 'Overview',
        initial: 'draft',
        options: [
          {
            id: 'draft',
            label: 'Sin lugar en internet',
            text: {
              en: 'A string quartet with no place online',
              es: 'Un cuarteto de cuerdas sin lugar en internet',
            },
          },
          {
            id: 'brief',
            label: 'El cuarteto y el encargo',
            text: {
              en: 'The quartet and the brief',
              es: 'El cuarteto y el encargo',
            },
          },
          {
            id: 'start',
            label: 'Empezar sin presencia',
            text: {
              en: 'Starting without a web presence',
              es: 'Empezar sin presencia en línea',
            },
          },
          {
            id: 'who',
            label: 'Quién es',
            text: {
              en: 'Who Cuarteto Fratres is',
              es: 'Quién es Cuarteto Fratres',
            },
          },
        ],
      },
      {
        kind: 'choice',
        id: 'section-cuarteto-fratres-challenge',
        label: 'Challenge',
        initial: 'draft',
        options: [
          {
            id: 'draft',
            label: 'Dos públicos, un tono',
            text: {
              en: 'Two audiences, one tone',
              es: 'Dos públicos, un mismo tono',
            },
          },
          {
            id: 'visitors',
            label: 'Visitantes y músicos',
            text: {
              en: 'Visitors and musicians',
              es: 'Visitantes y músicos',
            },
          },
          {
            id: 'booking',
            label: 'Contratar y publicar',
            text: {
              en: 'Booking and publishing',
              es: 'Contratar y publicar',
            },
          },
          {
            id: 'jobs',
            label: 'Dos trabajos',
            text: {
              en: 'Two jobs for one site',
              es: 'Dos trabajos para un solo sitio',
            },
          },
        ],
      },
      {
        kind: 'choice',
        id: 'section-cuarteto-fratres-approach',
        label: 'Approach',
        initial: 'draft',
        options: [
          {
            id: 'draft',
            label: 'Primero la marca',
            text: {
              en: 'A brand before a website',
              es: 'Primero la marca, después el sitio',
            },
          },
          {
            id: 'building',
            label: 'Construir la identidad',
            text: {
              en: 'Building the visual identity',
              es: 'Construir la identidad visual',
            },
          },
          {
            id: 'triad',
            label: 'Identidad, tipo y foto',
            text: {
              en: 'Identity, type and photography',
              es: 'Identidad, tipografía y fotografía',
            },
          },
          {
            id: 'hero',
            label: 'Del monograma al hero',
            text: {
              en: 'From monogram to hero',
              es: 'Del monograma a la portada',
            },
          },
        ],
      },
      {
        kind: 'choice',
        id: 'section-cuarteto-fratres-research',
        label: 'Research',
        initial: 'draft',
        options: [
          {
            id: 'draft',
            label: 'Cómo tomé las decisiones',
            text: {
              en: 'How I made decisions',
              es: 'Cómo tomé las decisiones',
            },
          },
          {
            id: 'eye',
            label: 'IA y decidir a ojo',
            text: {
              en: 'Working with AI, deciding by eye',
              es: 'Trabajar con IA, decidir a ojo',
            },
          },
          {
            id: 'assisted',
            label: 'Desarrollo asistido',
            text: {
              en: 'AI-assisted build and review',
              es: 'Desarrollo y revisión asistidos por IA',
            },
          },
          {
            id: 'checks',
            label: 'Iteraciones y pruebas',
            text: {
              en: 'Iterations and checks',
              es: 'Iteraciones y comprobaciones',
            },
          },
        ],
      },
      {
        kind: 'choice',
        id: 'section-cuarteto-fratres-design',
        label: 'Design',
        initial: 'draft',
        options: [
          {
            id: 'draft',
            label: 'Como sus objetos',
            text: {
              en: 'Pieces that behave like their objects',
              es: 'Piezas que se comportan como sus objetos',
            },
          },
          {
            id: 'interactions',
            label: 'Diseñar las interacciones',
            text: {
              en: 'Designing the interactions',
              es: 'Diseñar las interacciones',
            },
          },
          {
            id: 'triad',
            label: 'Repertorio, eventos, contacto',
            text: {
              en: 'Repertoire, events and contact',
              es: 'Repertorio, eventos y contacto',
            },
          },
          {
            id: 'core',
            label: 'Secciones centrales',
            text: {
              en: 'The site’s core sections',
              es: 'Las secciones centrales del sitio',
            },
          },
        ],
      },
      {
        kind: 'choice',
        id: 'section-cuarteto-fratres-outcome',
        label: 'Outcome',
        initial: 'draft',
        options: [
          {
            id: 'draft',
            label: 'El cuarteto la maneja',
            text: {
              en: 'A brand the quartet runs itself',
              es: 'Una marca que el cuarteto maneja solo',
            },
          },
          {
            id: 'update',
            label: 'Un sitio que actualizan',
            text: {
              en: 'A site the quartet can update',
              es: 'Un sitio que el cuarteto puede actualizar',
            },
          },
          {
            id: 'cms',
            label: 'CMS y rendimiento',
            text: {
              en: 'CMS and performance',
              es: 'CMS y rendimiento',
            },
          },
          {
            id: 'shipped',
            label: 'Qué se entregó',
            text: {
              en: 'What shipped and what changed',
              es: 'Qué se entregó y qué cambió',
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
  {
    id: 'demos',
    label: 'Demos · indicador de clic',
    where: '/works/cuarteto-fratres',
    controls: [
      {
        kind: 'choice',
        id: 'demo-hint',
        label: 'Indicador',
        initial: 'cursor',
        options: [
          { id: 'tag', label: 'A · Etiqueta arriba' },
          { id: 'badge', label: 'B · Insignia en la esquina' },
          { id: 'cursor', label: 'C · Cursor que late' },
          { id: 'none', label: 'Sin indicador' },
        ],
      },
    ],
  },
];

/** Where the menu keeps its state between reloads. */
export const OPTIONS_STORAGE_KEY = 'pf-dev-options';
