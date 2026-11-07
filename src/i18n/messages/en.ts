import { blue } from './en/blue';
import { caseStudy } from './en/case';
import { common } from './en/common';
import { footer } from './en/footer';
import { hero } from './en/hero';
import { logos } from './en/logos';
import { nav } from './en/nav';
import { notFound } from './en/not-found';
import { theme } from './en/theme';
import { works } from './en/works';
import type { Messages } from './es';

/** English catalogue; must match the Spanish reference key for key. */
export const en = {
  common,
  nav,
  hero,
  logos,
  works,
  footer,
  theme,
  notFound,
  blue,
  case: caseStudy,
} satisfies Messages;
