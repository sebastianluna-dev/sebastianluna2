/**
 * The programme of the quartet's «Repertorio» section, as the production site serves it. The audio
 * is streamed from the site itself and never copied into the portfolio.
 */

export type CategoryId = 'clasico' | 'latam' | 'bodas' | 'pop';

export interface Category {
  id: CategoryId;
  /** What the record's card reads under the disc. */
  label: string;
  /** What the filter chip reads. */
  shortLabel: string;
}

export interface Track {
  id: string;
  title: string;
  composer: string;
  categoryId: CategoryId;
  /** Length of the recording, in seconds. */
  durationSeconds: number;
  /** Name of the file in the site's audio store. */
  file: string;
}

/** Where the production site serves its recordings. */
export const AUDIO_BASE = 'https://cuartetofratres.vercel.app/api/audio/file/';

// In the order of the site's filter chips (cuartetofratres, constants/repertoire.const.ts).
export const CATEGORIES: readonly Category[] = [
  { id: 'clasico', label: 'Clásico y cámara', shortLabel: 'Cámara' },
  { id: 'latam', label: 'Mexicana y latinoamericana', shortLabel: 'Latinoamericana' },
  { id: 'bodas', label: 'Bodas y ceremonias', shortLabel: 'Bodas' },
  { id: 'pop', label: 'Pop y contemporáneo', shortLabel: 'Pop' },
];

/** Label of the chip that shows every work. */
export const ALL_LABEL = 'Todo';

export const TRACKS: readonly Track[] = [
  {
    id: 'danzas-latinoamericanas',
    title: 'Danzas Latinoamericanas',
    composer: 'José Elizondo',
    categoryId: 'latam',
    durationSeconds: 264,
    file: 'Danzas Latinoamericanas I. Otoño en Buenos Aires by José Elizondo (for string quartet).mp3',
  },
  {
    id: 'fuga-y-misterio',
    title: 'Fuga y Misterio',
    composer: 'Astor Piazzolla',
    categoryId: 'latam',
    durationSeconds: 299,
    file: 'Astor Piazzolla - Fuga y Misterio - Cuarteto Austral.mp3',
  },
  {
    id: 'borodin-cuarteto-2',
    title: 'Cuarteto núm. 2 en Re mayor',
    composer: 'Alexander Borodin',
    categoryId: 'clasico',
    durationSeconds: 493,
    file: 'Borodin Quartet No. 2 in D major for Strings, I. Allegro moderato.mp3',
  },
  {
    id: 'schubert-cuarteto-14',
    title: 'Cuarteto núm. 14 «La muerte y la doncella»',
    composer: 'Franz Schubert',
    categoryId: 'clasico',
    durationSeconds: 858,
    file: 'Franz Schubert La muerte y la doncella - 2. Andante con moto.mp3',
  },
  {
    id: 'viva-la-vida',
    title: 'Viva la Vida',
    composer: 'Coldplay',
    categoryId: 'pop',
    durationSeconds: 91,
    file: 'Promusic Barcelona - Cuarteto de Cuerda - Coldplay Viva la Vida.mp3',
  },
  {
    id: 'skyfall',
    title: 'Skyfall',
    composer: 'Adele',
    categoryId: 'pop',
    durationSeconds: 273,
    file: 'Skyfall - James Bond - Stringspace String Quartet.mp3',
  },
  {
    id: 'love-story',
    title: 'Love Story',
    composer: 'Taylor Swift',
    categoryId: 'bodas',
    durationSeconds: 238,
    file: 'Taylor Swift - Love Story String Quartet Cover by The Misc. Strings.mp3',
  },
  {
    id: 'por-una-cabeza',
    title: 'Por una cabeza',
    composer: 'Carlos Gardel',
    categoryId: 'bodas',
    durationSeconds: 212,
    file: 'Carlos Gardel - Por una Cabeza String Quartet Cover by The Misc. Strings.mp3',
  },
];

/** The recording of a work on the production site. */
export function audioUrl(track: Pick<Track, 'file'>): string {
  return AUDIO_BASE + encodeURIComponent(track.file);
}

/** The long name of a category, as the record's card shows it. */
export function categoryLabel(id: CategoryId): string {
  return CATEGORIES.find((category) => category.id === id)?.label ?? '';
}

export interface Filter {
  /** `null` is «Todo»: no filtering. */
  value: CategoryId | null;
  label: string;
}

/** The chips: «Todo» first, then one per category in order. */
export const FILTERS: readonly Filter[] = [
  { value: null, label: ALL_LABEL },
  ...CATEGORIES.map((category) => ({ value: category.id, label: category.shortLabel })),
];
