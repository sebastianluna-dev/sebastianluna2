export type DemoLocale = 'en' | 'es';

export type PerfState = 'paint' | 'weight' | 'lighthouse' | 'discarded';

/** The states in the order the story is told: the gain, its cause, the audit, what was dropped. */
export const PERF_STATES: readonly PerfState[] = ['paint', 'weight', 'lighthouse', 'discarded'];

interface PerformanceCopy {
  rail: string;
  /** The fixed line in the scene: how the timings and weights were measured. */
  method: string;
  states: Record<PerfState, { label: string; title: string; caption: string }>;
  before: string;
  after: string;
  firstPaint: string;
  largestPaint: string;
  music: string;
  gzipped: string;
  fontFiles: string;
  scores: { performance: string; accessibility: string; bestPractices: string; seo: string };
  lighthouseNote: string;
  shipped: string;
  inlined: string;
  better: string;
  worse: string;
  reverted: string;
  /** What a screen reader hears instead of each chart. */
  alt: Record<PerfState, string>;
}

export const PERFORMANCE_COPY: Record<DemoLocale, PerformanceCopy> = {
  en: {
    rail: 'Speed of the first load',
    method:
      'Timings and weights: production build served locally, Chrome with Lighthouse mobile throttling (1.6 Mbps, 150 ms latency, CPU ×4), median of 3 to 5 loads.',
    states: {
      paint: {
        label: 'Largest paint',
        title: 'Largest contentful paint on a phone',
        caption:
          'The largest paint now lands in 1.32 s instead of 2.61 s; the first paint in 0.79 s.',
      },
      weight: {
        label: 'Page weight',
        title: 'Home page HTML',
        caption:
          'Most of the old page was engraved music, inlined twice; as static SVG files it left the HTML.',
      },
      lighthouse: {
        label: 'Lighthouse',
        title: 'Lighthouse after the work',
        caption: 'The audit of the live site after the work; no comparable earlier run exists.',
      },
      discarded: {
        label: 'Discarded',
        title: 'Tried and removed: inlining the CSS',
        caption:
          'Inlined CSS painted sooner but finished later, copied into HTML and payload; it was reverted.',
      },
    },
    before: 'Before',
    after: 'After',
    firstPaint: 'First paint',
    largestPaint: 'Largest paint',
    music: 'engraved music, inlined twice (HTML and hydration payload)',
    gzipped: 'Gzipped',
    fontFiles: 'Font files on first load',
    scores: {
      performance: 'Performance',
      accessibility: 'Accessibility',
      bestPractices: 'Best Practices',
      seo: 'SEO',
    },
    lighthouseNote: 'Production site, mobile. A result, not a comparison.',
    shipped: 'Shipped',
    inlined: 'CSS inlined',
    better: 'better',
    worse: 'worse',
    reverted: 'Reverted',
    alt: {
      paint:
        'Largest contentful paint on a phone went from 2.61 seconds before to 1.32 seconds after. First contentful paint went from 1.42 to 0.79 seconds.',
      weight:
        'The home page HTML went from 463 KB to 139 KB; about 375 KB of the 463 was the engraved music, inlined twice. Gzipped, 94 KB to 26 KB. Font files on first load, 14 to 8.',
      lighthouse:
        'Lighthouse on the production site, mobile, after the work: Performance 98, Accessibility 100, Best Practices 100, SEO 100.',
      discarded:
        'With the CSS inlined, first contentful paint went from 0.79 to 0.56 seconds, better, but largest contentful paint went from 1.32 to 2.05 seconds, worse, so it was reverted.',
    },
  },
  es: {
    rail: 'Velocidad de la primera carga',
    method:
      'Tiempos y pesos: build de producción servido en local, Chrome con la limitación móvil de Lighthouse (1.6 Mbps, 150 ms de latencia, CPU ×4), mediana de 3 a 5 cargas.',
    states: {
      paint: {
        label: 'Contenido principal',
        title: 'Contenido principal en un teléfono (LCP)',
        caption:
          'El contenido principal aparece en 1.32 s en vez de 2.61 s; el primer pintado, en 0.79 s.',
      },
      weight: {
        label: 'Peso',
        title: 'HTML de la página de inicio',
        caption:
          'Casi todo el peso era la partitura, incrustada dos veces; como archivos SVG estáticos salió del HTML.',
      },
      lighthouse: {
        label: 'Lighthouse',
        title: 'Lighthouse después del trabajo',
        caption:
          'La auditoría del sitio en producción tras el trabajo; no hay una previa comparable.',
      },
      discarded: {
        label: 'Descartado',
        title: 'Probado y retirado: CSS incrustado',
        caption:
          'El CSS incrustado pintaba antes pero terminaba después, copiado en HTML y payload; se revirtió.',
      },
    },
    before: 'Antes',
    after: 'Después',
    firstPaint: 'Primer pintado',
    largestPaint: 'Contenido principal',
    music: 'partitura en SVG, incrustada dos veces (HTML y payload de hidratación)',
    gzipped: 'Con gzip',
    fontFiles: 'Archivos de fuente en la primera carga',
    scores: {
      performance: 'Rendimiento',
      accessibility: 'Accesibilidad',
      bestPractices: 'Buenas prácticas',
      seo: 'SEO',
    },
    lighthouseNote: 'Sitio en producción, móvil. Un resultado, no una comparación.',
    shipped: 'Publicado',
    inlined: 'CSS incrustado',
    better: 'mejor',
    worse: 'peor',
    reverted: 'Revertido',
    alt: {
      paint:
        'El contenido principal en un teléfono pasó de 2.61 segundos antes a 1.32 segundos después. El primer pintado pasó de 1.42 a 0.79 segundos.',
      weight:
        'El HTML de la página de inicio pasó de 463 KB a 139 KB; unos 375 KB de los 463 eran la partitura en SVG, incrustada dos veces. Con gzip, de 94 KB a 26 KB. Archivos de fuente en la primera carga, de 14 a 8.',
      lighthouse:
        'Lighthouse en el sitio en producción, móvil, después del trabajo: Rendimiento 98, Accesibilidad 100, Buenas prácticas 100, SEO 100.',
      discarded:
        'Con el CSS incrustado, el primer pintado pasó de 0.79 a 0.56 segundos, mejor, pero el contenido principal pasó de 1.32 a 2.05 segundos, peor, así que se revirtió.',
    },
  },
};
