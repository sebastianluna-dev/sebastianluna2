// /about page (fase7-plan §1). Every fact has its source in docs/analisis/fase7-plan.md §1 and
// fuentes-about.md; Sebastian approves the copy (§8, question 12). Tool names live in src/data/toolkit.ts.
export const about = {
  meta: {
    title: 'Sobre mí | Sebastian Luna',
    description:
      'Cómo empecé, con qué herramientas trabajo y por dónde he pasado: la historia de Sebastian Luna, desarrollador frontend senior en Boca del Río, Veracruz.',
  },
  hero: {
    avatarAlt: 'Foto de Sebastian Luna',
    /** The page h1, painted as a chip. */
    title: 'Sobre mí',
    paragraphs: [
      'Soy desarrollador frontend senior, diseñador de interfaces y entrenador de ajedrez en Boca del Río, Veracruz. Mi interés por la tecnología empezó de niño con los videojuegos, y en 2019 aprendí a programar por mi cuenta con cursos en línea. Esa curiosidad se volvió mi profesión.',
      'Llevo seis años convirtiendo necesidades de negocio en productos con React, Next.js y TypeScript: diseño la interfaz, escribo el código y lo llevo a producción. Hoy trabajo con Claude Code bajo mi dirección técnica, y lo que más disfruto sigue siendo hablar con el cliente.',
    ],
    email: {
      /** Accessible name of the Email button; its visible text is the address itself. */
      copyLabel: 'Copiar {email}',
      /** Bubble and live region after the copy. */
      copied: 'Copiado',
      failed: 'No se pudo copiar',
    },
  },
  toolkit: {
    /** h2, styled as the row label. */
    heading: 'Mis herramientas',
    /** Accessible name of the closed lid. */
    open: 'Abrir la carpeta de herramientas',
    /** Accessible name of the open lid. */
    close: 'Cerrar la carpeta de herramientas',
    /** Group of collection lamps. */
    collectionsLabel: 'Elige una colección',
    collections: {
      interface: 'Interfaz',
      design: 'Diseño',
      data: 'Datos',
      quality: 'Calidad',
      shipping: 'Entrega',
    },
  },
  experience: {
    /** h2, styled as the row label, above the dates of row 1. */
    heading: 'Experiencia',
    /** `id` picks the 17 px icon; titles are h3 and are proper names (the same in both languages). */
    items: [
      {
        id: 'chess',
        dates: '2026 — hoy',
        title: '365 Días de Ajedrez',
        body: 'Fundé la academia y construí su plataforma: cursos, clases con profesor, ejercicios y un modo aventura, en 111 pantallas para cinco roles y con más de 2,300 pruebas automáticas. Me encargué del producto, la arquitectura, el diseño y el código.',
      },
      {
        id: 'consulting',
        dates: '2023 — 2026',
        title: 'Page Consulting',
        body: 'Como consultor asignado a AstraZeneca, trabajé en un equipo internacional de más de 30 personas con Scrum. Participé en la definición, el diseño y el frontend de Comms App, implementé Tealium en varios sitios y formé parte del soporte de unos 500 sitios corporativos internacionales.',
      },
      {
        id: 'health',
        dates: '2021 — 2023',
        title: 'Mellow',
        body: 'Fui el desarrollador frontend de Reto MD: su sitio corporativo y una red de sitios por especialidad que unifiqué en una arquitectura multi-tenant con Next.js: seis despliegues desde un solo repositorio. También diseñé la interfaz y desarrollé el frontend del backoffice de la Sociedad Mexicana de Oftalmología.',
      },
      {
        id: 'stores',
        dates: '2020 — 2021',
        title: 'Proficient Systems',
        body: 'Entré como practicante junior a un equipo de cinco desarrolladores. Construí tiendas con Liquid y apps con Node.js sobre las APIs de Shopify, y diseñé y desarrollé de principio a fin la plataforma inmobiliaria Ocho Seis Uno y el sitio de una operadora de tours en barco en Puerto Vallarta.',
      },
    ],
  },
  readings: {
    /** h2 */
    heading: 'Lecturas',
    /** Screen readers only: the eight neutral books are decorative until there is a list. */
    placeholderNote: 'La lista de lecturas está en preparación.',
  },
};
