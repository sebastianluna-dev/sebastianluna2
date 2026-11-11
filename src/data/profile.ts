import avatar from '@/assets/portrait/avatar-sebastian-luna.jpg';
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
  /** 384×384 JPEG headshot, face centred; always served through `AVATAR_IMAGE`. */
  avatar,
} as const;

/**
 * How every round avatar of Sebastian is served (the home HeroAvatar and the case ChatAside): a
 * square crop (a no-op on the square source; `attention` keeps the face if a taller photo replaces
 * it), AVIF with a WebP `<img>` fallback (`formats`, the last one is the fallback) and only the
 * 1x/2x/3x of the size it is drawn at. Astro components pass these to `getImage`.
 */
export const AVATAR_IMAGE = {
  src: avatar,
  formats: ['avif', 'webp'],
  densities: [1, 2, 3],
  fit: 'cover',
  position: 'attention',
} as const;

/** CSS px of the home avatar (HE-13): `--pf-hero-avatar`, kept in sync by `tokens.test.ts`. */
export const HERO_AVATAR_PX = 60;

/** Widths to generate for an avatar drawn at each of `cssPx`: every density, ascending, unique. */
export function avatarWidths(...cssPx: number[]): number[] {
  const widths = cssPx.flatMap((px) =>
    AVATAR_IMAGE.densities.map((density) => Math.ceil(px * density)),
  );
  return [...new Set(widths)].filter((width) => width <= avatar.width).sort((a, b) => a - b);
}

/** The one address Sebastian is written to, everywhere on the site. */
export const CONTACT_EMAIL = 'sebastian.luna.developer@gmail.com';

/** The address per language: the same in both (kept per locale for every caller). */
export const CONTACT_EMAILS: Record<Locale, string> = {
  es: CONTACT_EMAIL,
  en: CONTACT_EMAIL,
};

/**
 * The CV, one PDF per language, served from public/. A folder per language so
 * both downloads land with the same file name.
 */
export const CV_FILES: Record<Locale, string> = {
  es: '/cv/es/cv-sebastian-luna-ai-product-engineer.pdf',
  en: '/cv/en/cv-sebastian-luna-ai-product-engineer.pdf',
};

/** The name the CV is saved under when a link downloads it (`download`): the file's own, per language. */
export function cvDownloadName(locale: Locale): string {
  return CV_FILES[locale].split('/').pop() ?? 'cv-sebastian-luna.pdf';
}

export function mailtoHref(locale: Locale): string {
  return `mailto:${CONTACT_EMAILS[locale]}`;
}

export type SocialKey = 'linkedin' | 'github' | 'email' | 'cv';

export interface SocialLink {
  key: SocialKey;
  href: string;
  /** Opens in a new tab (its accessible name gets the "opens in a new tab" suffix). */
  external: boolean;
  /** Saves the file under this name instead of opening it: the CV. */
  download?: string;
}

/** The footer's profile buttons, in order. Labels: `footer.social.<key>`. */
export function socialLinks(locale: Locale): SocialLink[] {
  return [
    { key: 'linkedin', href: PROFILE.linkedin, external: true },
    { key: 'github', href: PROFILE.github, external: true },
    { key: 'email', href: mailtoHref(locale), external: false },
    { key: 'cv', href: CV_FILES[locale], external: true, download: cvDownloadName(locale) },
  ];
}
