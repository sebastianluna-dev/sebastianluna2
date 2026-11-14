import { useState, type CSSProperties } from 'react';
import { Rail } from '@demos/shared/Rail';
import '../tokens.css';
import musicPlainUrl from '../assets/music-hero-wide-plain.svg?url';
import musicUrl from '../assets/music-hero-wide.svg?url';
import staffUrl from '../assets/staff-hero.svg?url';
import alfonso from '../assets/stage-alfonso-perez.webp';
import jesus from '../assets/stage-jesus-medina.webp';
import jose from '../assets/stage-jose-sanchez.webp';
import lucia from '../assets/stage-lucia-paredes.webp';
import { HERO_LAYERS_COPY, HERO_STEPS, type DemoLocale, type HeroStep } from './copy';
import styles from './hero-layers.module.css';

interface Figure {
  src: string;
  /** Centre across the stage, top edge and height, in percent of the stage (the site's numbers). */
  x: number;
  top: number;
  height: number;
  layer: number;
  fade: { left: number; right: number; bottom: number };
}

// The four cut-outs as the site places them on its stage (cuartetofratres, hero-stage.const.ts):
// seating order left to right, the cellist in front because his is a much tighter shot.
const FIGURES: readonly Figure[] = [
  {
    src: jesus.src,
    x: 14.8,
    top: 6,
    height: 90,
    layer: 2,
    fade: { left: 7, right: 0, bottom: 34 },
  },
  {
    src: lucia.src,
    x: 37.9,
    top: 1.5,
    height: 100,
    layer: 3,
    fade: { left: 0, right: 0, bottom: 34 },
  },
  {
    src: jose.src,
    x: 62.1,
    top: 5.5,
    height: 94,
    layer: 2,
    fade: { left: 0, right: 0, bottom: 34 },
  },
  {
    src: alfonso.src,
    x: 85.2,
    top: 27,
    height: 68,
    layer: 4,
    fade: { left: 9, right: 9, bottom: 30 },
  },
];

interface HeroLayersProps {
  locale: DemoLocale;
}

/**
 * The hero of the site taken apart: the reader walks the rail from the empty hall to the finished
 * stage and sees each layer arrive. Up to «Musicians» the staves and the music are shown bright, to
 * be read; the last step is the hero as the site paints it.
 */
export function HeroLayers({ locale }: HeroLayersProps) {
  const copy = HERO_LAYERS_COPY[locale];
  const [step, setStep] = useState<HeroStep>('final');
  const reached = HERO_STEPS.indexOf(step);

  return (
    <div className={styles.demo} data-ground="ink">
      <div className={styles.demo__frame}>
        <div className={styles.demo__stage} data-reached={reached} aria-hidden="true">
          <div className={styles.demo__glow} />
          <img className={styles.demo__staff} src={staffUrl} alt="" />
          <img
            className={`${styles.demo__music} ${styles.demo__music_ink_plain}`}
            src={musicPlainUrl}
            alt=""
          />
          <img
            className={`${styles.demo__music} ${styles.demo__music_ink_thinned}`}
            src={musicUrl}
            alt=""
          />
          {FIGURES.map((figure, index) => (
            <div
              key={figure.src}
              className={styles.demo__figure}
              style={
                {
                  '--x': `${figure.x}%`,
                  '--top': `${figure.top}%`,
                  '--height': `${figure.height}%`,
                  '--layer': figure.layer,
                  '--order': index,
                  '--fade-left': `${figure.fade.left}%`,
                  '--fade-right': `${figure.fade.right}%`,
                  '--fade-bottom': `${figure.fade.bottom}%`,
                } as CSSProperties
              }
            >
              <img className={styles.demo__portrait} src={figure.src} alt="" />
            </div>
          ))}
          <div className={styles.demo__floor} />
        </div>
      </div>
      <Rail
        label={copy.rail}
        options={HERO_STEPS.map((id) => ({ id, label: copy.steps[id].label }))}
        value={step}
        onChange={setStep}
        status={copy.steps[step].caption}
      />
    </div>
  );
}
