import { useId, useState } from 'react';
import { Rail } from '@demos/shared/Rail';
import '../tokens.css';
import {
  BRAND_COPY,
  BRAND_STEPS,
  type BrandStep,
  type DemoLocale,
  type LockupGround,
} from './copy';
import {
  LETTERS,
  MONOGRAM_PATHS,
  MONOGRAM_VIEW_BOX,
  SPECIMEN_DIGITS,
  SPECIMEN_LETTERS,
  TESTER_MAX,
  testerText,
  type Letter,
} from './monogram';
import { pathAnchors, type Anchor } from './path-anchors';
import styles from './brand.module.css';

const ANCHORS: Record<Letter, Anchor[]> = {
  C: pathAnchors(MONOGRAM_PATHS.C),
  F: pathAnchors(MONOGRAM_PATHS.F),
};

const { x, y, width, height } = MONOGRAM_VIEW_BOX;
const MARK_VIEW_BOX = `${x} ${y} ${width} ${height}`;
// The canvas leaves room around the mark so the anchors on its edges are never cut.
const PAD = 22;
const CANVAS_VIEW_BOX = `${x - PAD} ${y - PAD} ${width + PAD * 2} ${height + PAD * 2}`;
const ANCHOR_SIZE = 7;

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

interface BrandProps {
  locale: DemoLocale;
}

/**
 * The identity of the quartet in its pieces: the CF monogram on the canvas of an invented vector
 * editor (outlined with its anchors and handles, then filled), the lockup with the name, and a
 * tester of Fratres Display, the face drawn for it.
 */
export function Brand({ locale }: BrandProps) {
  const copy = BRAND_COPY[locale];
  const [step, setStep] = useState<BrandStep>('outline');
  const [drawRun, setDrawRun] = useState(0);
  const [selected, setSelected] = useState<Letter | null>(null);
  const [ground, setGround] = useState<LockupGround>('ink');
  const [text, setText] = useState(copy.defaultText);
  const inputId = useId();

  const editing = step === 'outline' || step === 'fill';

  function go(next: BrandStep) {
    if (next === 'outline' && step !== 'outline') setDrawRun((run) => run + 1);
    if (next !== 'outline') setSelected(null);
    setStep(next);
  }

  // Picking a layer is an edit: on the filled mark it goes back to the outline.
  function pick(letter: Letter) {
    if (step !== 'outline') go('outline');
    setSelected((current) => (current === letter && step === 'outline' ? null : letter));
  }

  const shown = testerText(text);

  return (
    <div className={styles.demo} data-ground="page">
      <div className={styles.demo__stage} data-step={step}>
        <section
          className={cx(styles.demo__scene, styles.demo__editor)}
          aria-label={copy.editor}
          inert={!editing}
        >
          <div className={styles.demo__titlebar}>
            <svg className={styles.demo__glyph} viewBox="0 0 12 14" aria-hidden="true">
              <path d="M1.5 .5h6l3 3v10h-9z M7.5 .5v3h3" />
            </svg>
            <span className={styles.demo__file}>cf-monogram.svg</span>
          </div>
          <div className={styles.demo__body}>
            <div className={styles.demo__tools} aria-hidden="true">
              <span className={cx(styles.demo__tool, step === 'fill' && styles.demo__tool_active)}>
                <svg viewBox="0 0 20 20">
                  <path d="M5 3 L5 16 L8.4 12.7 L10.7 17.6 L12.8 16.6 L10.5 11.8 L15 11.6 Z" />
                </svg>
              </span>
              <span
                className={cx(styles.demo__tool, step === 'outline' && styles.demo__tool_active)}
              >
                <svg viewBox="0 0 20 20">
                  <path d="M10 2.5 L15 9.5 L12.2 16 H7.8 L5 9.5 Z M10 2.5 V10.3 M7.6 17.6 H12.4" />
                  <circle cx="10" cy="11.4" r="1.2" />
                </svg>
              </span>
              <span className={styles.demo__tool}>
                <svg viewBox="0 0 20 20">
                  <rect x="4" y="4" width="12" height="12" rx="1" />
                </svg>
              </span>
            </div>
            <div className={styles.demo__canvas}>
              <svg
                key={drawRun}
                className={cx(styles.demo__art, drawRun > 0 && styles.demo__art_drawing)}
                viewBox={CANVAS_VIEW_BOX}
                preserveAspectRatio="xMidYMid meet"
                data-selected={selected ?? undefined}
                aria-hidden="true"
              >
                {LETTERS.map((letter) => (
                  <g key={letter} className={styles.demo__letter} data-letter={letter}>
                    <path className={styles.demo__path} d={MONOGRAM_PATHS[letter]} pathLength={1} />
                    <g className={styles.demo__points}>
                      {ANCHORS[letter].map((anchor) => (
                        <g key={`${anchor.x},${anchor.y}`}>
                          {[anchor.in, anchor.out].map(
                            (handle, side) =>
                              handle && (
                                <g key={side}>
                                  <line
                                    className={styles.demo__arm}
                                    x1={anchor.x}
                                    y1={anchor.y}
                                    x2={handle.x}
                                    y2={handle.y}
                                  />
                                  <circle
                                    className={styles.demo__handle}
                                    cx={handle.x}
                                    cy={handle.y}
                                    r={2.6}
                                  />
                                </g>
                              ),
                          )}
                          <rect
                            className={styles.demo__anchor}
                            x={anchor.x - ANCHOR_SIZE / 2}
                            y={anchor.y - ANCHOR_SIZE / 2}
                            width={ANCHOR_SIZE}
                            height={ANCHOR_SIZE}
                          />
                        </g>
                      ))}
                    </g>
                  </g>
                ))}
              </svg>
            </div>
            <div className={styles.demo__layers}>
              <p className={styles.demo__heading}>{copy.layers}</p>
              <ul className={styles.demo__list}>
                {LETTERS.map((letter) => (
                  <li key={letter}>
                    <button
                      type="button"
                      className={styles.demo__layer}
                      aria-pressed={selected === letter}
                      aria-label={copy.layer(letter)}
                      onClick={() => pick(letter)}
                    >
                      <svg
                        className={styles.demo__thumb}
                        viewBox={MARK_VIEW_BOX}
                        aria-hidden="true"
                      >
                        <path d={MONOGRAM_PATHS[letter]} />
                      </svg>
                      <span className={styles.demo__name}>{letter}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section
          className={cx(styles.demo__scene, styles.demo__card, styles.demo__lockup)}
          data-ground={ground === 'ink' ? 'ink' : 'light'}
          data-lockup={ground}
          aria-label={copy.steps.lockup.label}
          inert={step !== 'lockup'}
        >
          <div className={styles.demo__grounds} role="group" aria-label={copy.ground}>
            {(['ink', 'cream'] as const).map((id) => (
              <button
                key={id}
                type="button"
                className={styles.demo__option}
                aria-pressed={ground === id}
                onClick={() => setGround(id)}
              >
                {copy.grounds[id]}
              </button>
            ))}
          </div>
          <div className={styles.demo__sign}>
            <svg className={styles.demo__mark} viewBox={MARK_VIEW_BOX} aria-hidden="true">
              <path d={MONOGRAM_PATHS.C} />
              <path d={MONOGRAM_PATHS.F} />
            </svg>
            <p className={styles.demo__wordmark}>
              <span className={styles.demo__word}>Cuarteto </span>
              <span className={styles.demo__word}>Fratres</span>
            </p>
          </div>
        </section>

        <section
          className={cx(styles.demo__scene, styles.demo__card, styles.demo__tester)}
          data-ground="light"
          aria-label={copy.steps.typeface.label}
          inert={step !== 'typeface'}
        >
          <div className={styles.demo__field}>
            <label className={styles.demo__label} htmlFor={inputId}>
              {copy.testerLabel}
            </label>
            <input
              id={inputId}
              className={styles.demo__input}
              type="text"
              value={text}
              maxLength={TESTER_MAX}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setText(event.target.value)}
            />
            <span className={styles.demo__count} aria-hidden="true">
              {text.length}/{TESTER_MAX}
            </span>
          </div>
          <p className={styles.demo__sample} aria-hidden="true">
            {shown || ' '}
          </p>
          <p className={styles.demo__specimen}>
            <span>{SPECIMEN_LETTERS}</span>
            <span>{SPECIMEN_DIGITS}</span>
          </p>
        </section>
      </div>
      <Rail
        label={copy.rail}
        options={BRAND_STEPS.map((id) => ({ id, label: copy.steps[id].label }))}
        value={step}
        onChange={go}
        status={copy.steps[step].caption}
      />
    </div>
  );
}
