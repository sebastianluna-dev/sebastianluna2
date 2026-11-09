/**
 * Contracts of the case study components (design-spec §4 "case/", case.md §2–4). Each `.astro`
 * component declares `type Props = <ItsProps>` from here, so the MDX authors and WorkView share one
 * definition. Components used inside the MDX body take no `locale`: they read it from the URL
 * (`splitLocale(Astro.url.pathname).locale`).
 */
import type { ImageMetadata } from 'astro';
import type { CollectionEntry } from 'astro:content';
import type { CaseFigureAppear } from '@/components/motion/presets';
import type { Locale } from '@/i18n/locales';
import type { CaseNeighbour, CaseSectionId } from '@/lib/works';

export type { CaseFigureAppear, CaseNeighbour, CaseSectionId };

/** Hero of the case: badge (`kicker`), the only h1 (`title`), the cover and the meta (CA-01, RT-02). */
export interface CaseHeaderProps {
  work: CollectionEntry<'works'>;
  locale: Locale;
}

/** Service / Tools / Year columns of the hero (values at `--pf-meta-dim`), plus the live site link. */
export interface CaseMetaProps {
  /** One to four items, one per line. */
  service: string[];
  /** The stack, one per line. */
  tools: string[];
  /** Display years ("2021–2023"). */
  year: string;
  /** Live site; `null` renders no link. */
  url: string | null;
  locale: Locale;
}

/**
 * One of the six fixed sections (`section#<id>` with `data-case-section` and the scroll margin; 266
 * for `design`, 196 for the rest). The slot is the body: the prose before the first case block (see
 * `CASE_BLOCK_ATTR`) is the 560 text column with its own appear; the blocks after it (DemoSlot,
 * Gallery, Figure, CaseSubsection) follow at the block gap.
 */
export interface CaseSectionProps {
  id: CaseSectionId;
  /** Chip above the h2; defaults to the section label of the catalogue (`case.sections[id]`). */
  kicker?: string;
  /** The section h2 (`tabindex=-1`, focus target of the Works Map). */
  title: string;
}

/**
 * A titled block inside a section without its own h2 (Visual Direction, Typography, Components,
 * Competitor Analysis…): kicker chip, prose, then its blocks (usually a Gallery).
 */
export interface CaseSubsectionProps {
  kicker: string;
  /**
   * Plays the CA-01 appear of the reference (`CASE_BLOCK_APPEAR`, 1.25 / 1.3 s). Only on the first
   * subsection of Approach; every other subsection is static, as in the reference.
   */
  appear?: boolean;
}

export type FigureVariant = 'hero' | 'default';

/**
 * A 4:3 image (radius 16; 20 for the hero) that opens the lightbox (CA-07). Without `src` it paints a
 * neutral placeholder of the same box with `placeholderLabel` (or `case.figure.placeholder`).
 */
export interface FigureProps {
  src?: ImageMetadata;
  /** Always required, also for a placeholder (it names the future image). */
  alt: string;
  /** Optional caption under the image, in the body style. */
  caption?: string;
  /** `hero` is the case cover: eager, high priority, destination of `pf-work-cover` (RT-02). */
  variant?: FigureVariant;
  placeholderLabel?: string;
  /** CA-01 appear of this figure by role (`CASE_FIGURE_APPEAR`); most figures have none. */
  appear?: CaseFigureAppear;
}

/**
 * Layout of a gallery row (all 4:3; gap 16, 12 on phones). Consecutive Gallery elements form one
 * gallery: they are 16 / 12 apart instead of the block gap.
 * - `lead`: one figure at 720.
 * - `pair`: rows of two at 352; stacked on phones.
 * - `pair-2col-phone`: rows of two that stay in two columns on phones (Visual Direction).
 * - `composition`: one at 2/3 plus a column of two at 1/3; stacked on phones (Outcome).
 */
export type GalleryVariant = 'lead' | 'pair' | 'pair-2col-phone' | 'composition';

export interface GalleryProps {
  variant: GalleryVariant;
}

/** The single lightbox of a case page (a `<dialog>`), mounted by WorkView. */
export interface LightboxProps {
  locale: Locale;
}

export type ChatSpeaker = 'visitor' | 'sebastian';

/** Bubble effect of CA-10. */
export type ChatEffect = 'slam' | 'loud' | 'gentle' | 'rain';

export interface ChatMessage {
  /** `visitor` asks (left, grey); `sebastian` answers (right, blue) with real facts of the project. */
  from: ChatSpeaker;
  /** One to three emoji alone render large, without a bubble (as the reference). */
  text: string;
  fx?: ChatEffect;
  /**
   * Emoji of the rain (CA-12), e.g. "♟️🏆", with any effect; with `fx: 'rain'` and no `rain`, the emoji
   * of the text rain instead.
   */
  rain?: string;
  /** Tapback emoji (CA-11) shown on the previous bubble of the other speaker. */
  tapback?: string;
}

/**
 * Messaging-style aside inside the body (560), with the typing sequence of CA-09…CA-13. The full
 * conversation is in the SSR; names come from `case.chat`, Sebastian's avatar is
 * `PROFILE.avatar` (the 384 × 384 photo), served at the displayed size.
 */
export interface ChatAsideProps {
  /** Centred line above the messages ("Mar 20:15"). */
  meta?: string;
  messages: ChatMessage[];
  /** Shows the "Delivered" status after the last message, only when that one is Sebastian's. */
  delivered?: boolean;
}

/** Row of 2–3 notes with a mini illustration, 720 wide inside the body (CA-14, CA-15). */
export interface SideNotesProps {
  /** Accessible name of the group (and of the scrollable region on phones). */
  label: string;
  cols?: 2 | 3;
}

/** The fixed set of mini illustrations of the side notes (drawn in CSS/SVG by `SideNote`). */
export const SIDE_NOTE_ARTS = [
  'board',
  'trophy',
  'calendar',
  'ticket',
  'music',
  'stethoscope',
  'palette',
  'globe',
  'roles',
  'shield',
  'gauge',
  'blocks',
  'phone',
  'compass',
] as const;

export type SideNoteArt = (typeof SIDE_NOTE_ARTS)[number];

/** One note: illustration, title and the slot text (one short sentence). */
export interface SideNoteProps {
  title: string;
  art: SideNoteArt;
}

/**
 * Where a live demo goes (phase 5). Today it renders nothing visible; it marks the block position
 * so the demo agent swaps it for `<DemoFrame>`.
 */
export interface DemoSlotProps {
  /** Demo key, also listed in the frontmatter `demos`. */
  name: string;
  /** Caption under the demo, in the body style. */
  caption?: string;
}

/** Fixed section index on the left with scroll-spy (CA-02, CA-03); desktop only. */
export interface WorksMapProps {
  locale: Locale;
}

/** Fixed "Back" pill to `/#works` (CA-04…CA-06). */
export interface BackPillProps {
  locale: Locale;
  /** Destination; defaults to the works list of the home (`/#works`, localised). */
  href?: string;
  /** Visible label; defaults to `case.back`. */
  label?: string;
  /** Accessible name of the link; defaults to `case.backLabel`. */
  accessibleLabel?: string;
  /** Accessible name of the wrapping `nav`; defaults to `case.backNavLabel`. */
  navLabel?: string;
}

/** Previous / next case by `order`, without wrapping (CA-16). Renders nothing when both are null. */
export interface PrevNextProps {
  previous: CaseNeighbour | null;
  next: CaseNeighbour | null;
  locale: Locale;
}
