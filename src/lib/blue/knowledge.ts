// What Blue knows about Sebastian, per locale: the profile in `src/data/blue/profile.<locale>.md`
// plus the contact section, built from `src/data/profile.ts` so the links have one source.
// The text is the same on every request, which keeps it a stable, cacheable prefix.

import profileEn from '@/data/blue/profile.en.md?raw';
import profileEs from '@/data/blue/profile.es.md?raw';
import { CONTACT_EMAILS, CV_FILES, PROFILE } from '@/data/profile';
import type { Locale } from '@/i18n/locales';

const PROFILES: Record<Locale, string> = { es: profileEs, en: profileEn };

const CONTACT_HEADINGS: Record<
  Locale,
  { title: string; email: string; cv: string; cvLink: string }
> = {
  es: { title: 'Contacto', email: 'Email', cv: 'CV (PDF)', cvLink: 'Descargar CV (PDF)' },
  en: { title: 'Contact', email: 'Email', cv: 'CV (PDF)', cvLink: 'Download CV (PDF)' },
};

function contactSection(locale: Locale): string {
  const label = CONTACT_HEADINGS[locale];
  return [
    `## ${label.title}`,
    '',
    `- ${label.email}: ${CONTACT_EMAILS[locale]}`,
    `- LinkedIn: ${PROFILE.linkedin}`,
    `- GitHub: ${PROFILE.github}`,
    // A link text Blue can repeat; the panel opens the PDF in a new tab (markdown.ts, files).
    `- ${label.cv}: [${label.cvLink}](${CV_FILES[locale]})`,
  ].join('\n');
}

const KNOWLEDGE: Record<Locale, string> = {
  es: `${PROFILES.es.trim()}\n\n${contactSection('es')}\n`,
  en: `${PROFILES.en.trim()}\n\n${contactSection('en')}\n`,
};

export function blueKnowledge(locale: Locale): string {
  return KNOWLEDGE[locale];
}
