import portrait from '@/assets/portrait/retrato-sebastian-luna.png';
import type { Locale } from '@/i18n/locales';

// Who the site is about. Names, handles and links are not translated; the copy
// around them lives in the messages.
export const PROFILE = {
  name: 'Sebastian Luna',
  linkedin: 'https://www.linkedin.com/in/sebastianlunarodriguez',
  /** Shown in the avatar tooltip. */
  linkedinHandle: 'in/sebastianlunarodriguez',
  github: 'https://github.com/sebastianluna-dev',
  githubHandle: 'sebastianluna-dev',
  /** 900×1200 PNG with a transparent background (decisiones.md, provisional content). */
  portrait,
} as const;

/** The address to write to, one per language; both reach the same inbox. */
export const CONTACT_EMAILS: Record<Locale, string> = {
  es: 'contacto@sebastianluna.dev',
  en: 'contact@sebastianluna.dev',
};

/**
 * The CV, one PDF per language, served from public/. A folder per language so
 * both downloads land with the same file name.
 */
export const CV_FILES: Record<Locale, string> = {
  es: '/cv/es/cv-sebastian-luna-senior-frontend-developer.pdf',
  en: '/cv/en/cv-sebastian-luna-senior-frontend-developer.pdf',
};

export function mailtoHref(locale: Locale): string {
  return `mailto:${CONTACT_EMAILS[locale]}`;
}

export type SocialKey = 'linkedin' | 'github' | 'email' | 'cv';

export interface SocialLink {
  key: SocialKey;
  href: string;
  /** Opens in a new tab (its accessible name gets the "opens in a new tab" suffix). */
  external: boolean;
}

/** The footer's profile buttons, in order. Labels: `footer.social.<key>`. */
export function socialLinks(locale: Locale): SocialLink[] {
  return [
    { key: 'linkedin', href: PROFILE.linkedin, external: true },
    { key: 'github', href: PROFILE.github, external: true },
    { key: 'email', href: mailtoHref(locale), external: false },
    { key: 'cv', href: CV_FILES[locale], external: true },
  ];
}
