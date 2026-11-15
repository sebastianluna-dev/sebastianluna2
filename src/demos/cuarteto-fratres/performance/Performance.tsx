import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Rail } from '@demos/shared/Rail';
import { useReducedMotion } from '@demos/shared/use-reduced-motion';
import '../tokens.css';
import { PERF_STATES, PERFORMANCE_COPY, type DemoLocale, type PerfState } from './copy';
import {
  axisShare,
  countUp,
  COUNT_UP_MS,
  DISCARDED,
  formatFigure,
  KB_AXIS,
  LIGHTHOUSE,
  PAINT,
  SECONDS_AXIS,
  WEIGHT,
} from './figures';
import styles from './performance.module.css';

type Copy = (typeof PERFORMANCE_COPY)[DemoLocale];

const SECOND_TICKS = [0, 1, 2, 3];
const KB_TICKS = [0, 100, 200, 300, 400, 500];

interface PerformanceProps {
  locale: DemoLocale;
}

/**
 * The measured speed work on the quartet's site as a small data display in the site's own
 * language: the reader walks the rail through the gain, its cause, the audit and what was tried and
 * dropped. Entering a state grows the bars and counts the figures up to their exact values.
 */
export function Performance({ locale }: PerformanceProps) {
  const copy = PERFORMANCE_COPY[locale];
  const reduced = useReducedMotion();
  const [state, setState] = useState<PerfState>('paint');
  // How many times a state has been entered from the rail: 0 is the first render, shown at rest.
  const [entry, setEntry] = useState(0);
  const [progress, setProgress] = useState(1);

  function choose(next: PerfState) {
    if (next === state) return;
    setState(next);
    setEntry((count) => count + 1);
    setProgress(reduced ? 1 : 0);
  }

  useEffect(() => {
    if (entry === 0 || reduced) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_UP_MS);
      setProgress(t);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [entry, reduced]);

  const shown = reduced ? 1 : progress;
  const figure = (value: number, decimals: number) => formatFigure(countUp(value, shown), decimals);

  return (
    <div data-demo-shell data-ground="page">
      <div
        className={styles.demo}
        data-ground="ink"
        data-animate={entry > 0 && !reduced ? 'true' : 'false'}
      >
        <div className={styles.demo__scene}>
          <p className={styles.demo__kicker}>{copy.states[state].title}</p>
          <div key={`${state}-${entry}`} className={styles.demo__chart}>
            <p className={styles.demo__alt}>{copy.alt[state]}</p>
            <div className={styles.demo__visual} aria-hidden="true">
              {state === 'paint' && <PaintChart copy={copy} figure={figure} />}
              {state === 'weight' && <WeightChart copy={copy} figure={figure} />}
              {state === 'lighthouse' && <LighthouseChart copy={copy} figure={figure} />}
              {state === 'discarded' && <DiscardedChart copy={copy} figure={figure} />}
            </div>
          </div>
          <p className={styles.demo__method}>
            {state === 'lighthouse' ? copy.lighthouseNote : copy.method}
          </p>
        </div>
      </div>
      <Rail
        label={copy.rail}
        options={PERF_STATES.map((id) => ({ id, label: copy.states[id].label }))}
        value={state}
        onChange={choose}
        status={copy.states[state].caption}
      />
    </div>
  );
}

interface ChartProps {
  copy: Copy;
  figure: (value: number, decimals: number) => string;
}

interface BarProps {
  value: number;
  max: number;
  shown: string;
  unit: string;
  tone: 'before' | 'after';
  size: 'large' | 'medium' | 'small';
  prefix?: string;
  children?: ReactNode;
}

/** One bar on its axis with its value right after its end, the value in the site's display face. */
function Bar({ value, max, shown, unit, tone, size, prefix, children }: BarProps) {
  return (
    <div className={`${styles.bar} ${styles[`bar_size_${size}`]}`}>
      <div
        className={`${styles.bar__fill} ${styles[`bar__fill_tone_${tone}`]}`}
        style={{ '--share': axisShare(value, max) } as CSSProperties}
      >
        {children}
      </div>
      <span className={styles.bar__value}>
        {prefix && <span className={styles.bar__prefix}>{prefix}</span>}
        <span className={styles.bar__number}>{shown}</span>
        <span className={styles.bar__unit}>{unit}</span>
      </span>
    </div>
  );
}

/** The axis under a chart, from zero, in the same coordinates as the bars, with faint gridlines. */
function Axis({ ticks, max, unit }: { ticks: number[]; max: number; unit: string }) {
  return (
    <>
      <div className={styles.grid}>
        {ticks.map((tick) => (
          <span
            key={tick}
            className={styles.grid__line}
            style={{ '--share': axisShare(tick, max) } as CSSProperties}
          />
        ))}
      </div>
      <div className={styles.axis}>
        {ticks.map((tick) => (
          <span
            key={tick}
            className={styles.axis__tick}
            style={{ '--share': axisShare(tick, max) } as CSSProperties}
          >
            {tick}
            {unit && ` ${unit}`}
          </span>
        ))}
      </div>
    </>
  );
}

function PaintChart({ copy, figure }: ChartProps) {
  const rows = [
    { label: copy.before, tone: 'before', lcp: PAINT.lcp.before, fcp: PAINT.fcp.before },
    { label: copy.after, tone: 'after', lcp: PAINT.lcp.after, fcp: PAINT.fcp.after },
  ] as const;
  return (
    <div className={styles.chart}>
      <div className={styles.chart__rows}>
        {rows.map((row) => (
          <div key={row.label} className={styles.chart__row}>
            <span className={styles.chart__label}>{row.label}</span>
            <Bar
              value={row.lcp}
              max={SECONDS_AXIS}
              shown={figure(row.lcp, 2)}
              unit="s"
              tone={row.tone}
              size="large"
            />
            <Bar
              value={row.fcp}
              max={SECONDS_AXIS}
              shown={figure(row.fcp, 2)}
              unit="s"
              tone={row.tone}
              size="small"
              prefix={copy.firstPaint}
            />
          </div>
        ))}
        <Axis ticks={SECOND_TICKS} max={SECONDS_AXIS} unit="s" />
      </div>
    </div>
  );
}

function WeightChart({ copy, figure }: ChartProps) {
  const musicShare = WEIGHT.music / WEIGHT.before;
  return (
    <div className={styles.chart}>
      <div className={styles.chart__rows}>
        <div className={styles.chart__row}>
          <span className={styles.chart__label}>{copy.before}</span>
          <Bar
            value={WEIGHT.before}
            max={KB_AXIS}
            shown={figure(WEIGHT.before, 0)}
            unit="KB"
            tone="before"
            size="large"
          >
            <span className={styles.bar__share} style={{ '--part': musicShare } as CSSProperties} />
          </Bar>
          <div
            className={styles.share}
            style={{ '--share': axisShare(WEIGHT.music, KB_AXIS) } as CSSProperties}
          >
            <span className={styles.share__bracket} />
          </div>
          <p className={styles.share__label}>
            <span className={styles.share__number}>≈ {figure(WEIGHT.music, 0)} KB</span>{' '}
            {copy.music}
          </p>
        </div>
        <div className={styles.chart__row}>
          <span className={styles.chart__label}>{copy.after}</span>
          <Bar
            value={WEIGHT.after}
            max={KB_AXIS}
            shown={figure(WEIGHT.after, 0)}
            unit="KB"
            tone="after"
            size="large"
          />
        </div>
        <Axis ticks={KB_TICKS} max={KB_AXIS} unit="" />
      </div>
      <dl className={styles.facts}>
        <div className={styles.facts__item}>
          <dt className={styles.facts__term}>{copy.gzipped}</dt>
          <dd className={styles.facts__value}>
            {WEIGHT.gzipBefore} KB → {WEIGHT.gzipAfter} KB
          </dd>
        </div>
        <div className={styles.facts__item}>
          <dt className={styles.facts__term}>{copy.fontFiles}</dt>
          <dd className={styles.facts__value}>
            {WEIGHT.fontsBefore} → {WEIGHT.fontsAfter}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function LighthouseChart({ copy, figure }: ChartProps) {
  const scores = [
    { id: 'performance', score: LIGHTHOUSE.performance },
    { id: 'accessibility', score: LIGHTHOUSE.accessibility },
    { id: 'bestPractices', score: LIGHTHOUSE.bestPractices },
    { id: 'seo', score: LIGHTHOUSE.seo },
  ] as const;
  return (
    <ul className={styles.rings}>
      {scores.map(({ id, score }) => (
        <li key={id} className={styles.rings__item}>
          <span className={styles.ring}>
            <svg className={styles.ring__svg} viewBox="0 0 100 100">
              <circle className={styles.ring__track} cx="50" cy="50" r="45" pathLength={100} />
              <circle
                className={styles.ring__arc}
                cx="50"
                cy="50"
                r="45"
                pathLength={100}
                style={{ '--score': score } as CSSProperties}
              />
            </svg>
            <span className={styles.ring__number}>{figure(score, 0)}</span>
          </span>
          <span className={styles.rings__label}>{copy.scores[id]}</span>
        </li>
      ))}
    </ul>
  );
}

function DiscardedChart({ copy, figure }: ChartProps) {
  const groups = [
    { id: 'fcp', title: copy.firstPaint, verdict: copy.better, pair: DISCARDED.fcp },
    { id: 'lcp', title: copy.largestPaint, verdict: copy.worse, pair: DISCARDED.lcp },
  ] as const;
  return (
    <div className={styles.chart}>
      <div className={styles.chart__rows}>
        {groups.map((group) => (
          <div key={group.id} className={styles.chart__group}>
            <span className={styles.chart__label}>
              {group.title}
              <span className={styles.chart__verdict} data-verdict={group.id}>
                {group.verdict}
              </span>
            </span>
            <Bar
              value={group.pair.shipped}
              max={SECONDS_AXIS}
              shown={figure(group.pair.shipped, 2)}
              unit="s"
              tone="after"
              size="medium"
              prefix={copy.shipped}
            />
            <Bar
              value={group.pair.inlined}
              max={SECONDS_AXIS}
              shown={figure(group.pair.inlined, 2)}
              unit="s"
              tone="before"
              size="medium"
              prefix={copy.inlined}
            />
          </div>
        ))}
        <Axis ticks={SECOND_TICKS} max={SECONDS_AXIS} unit="s" />
      </div>
      <p className={styles.stamp}>{copy.reverted}</p>
    </div>
  );
}
