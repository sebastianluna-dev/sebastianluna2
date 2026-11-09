import { about } from './es/about';
import { blue, blueServer } from './es/blue';
import { caseStudy } from './es/case';
import { common } from './es/common';
import { footer } from './es/footer';
import { hero } from './es/hero';
import { logos } from './es/logos';
import { nav } from './es/nav';
import { notFound } from './es/not-found';
import { theme } from './es/theme';
import { works } from './es/works';
import { writings } from './es/writings';

/**
 * Spanish catalogue: the typed reference. Each namespace lives in its own file
 * (es/<namespace>.ts) and its English twin (en/<namespace>.ts) `satisfies` it,
 * so a missing or extra key fails `npm run check`.
 */
export const es = {
  common,
  nav,
  hero,
  logos,
  works,
  footer,
  theme,
  notFound,
  blue: { ...blue, server: blueServer },
  case: caseStudy,
  about,
  writings,
};

export type Messages = typeof es;
