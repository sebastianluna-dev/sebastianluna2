import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { Rail } from '@demos/shared/Rail';
import '../tokens.css';
import record from '../assets/record-cuarteto.webp';
import { PLAYER_DEMO_COPY, type DemoLocale } from './copy';
import {
  INITIAL_PLAYER,
  RAIL_STEPS,
  filterTracks,
  formatTrackPosition,
  formatTrackTime,
  grooveDrawing,
  pageCount,
  pageItems,
  railStepOf,
  reducePlayer,
  type PlayerAction,
  type PlayerState,
} from './player-logic';
import { FILTERS, TRACKS, audioUrl, categoryLabel, type CategoryId } from './tracks';
import { useMarquee } from './use-marquee';
import styles from './player.module.css';

const DURATIONS = TRACKS.map((track) => track.durationSeconds);

/** Rows per page: the site's six beside the record; fewer under it on the phone column. */
const PAGE_SIZE = { wide: 6, narrow: 3, narrowMini: 6 } as const;
/** The demo takes the phone layout at or under this width (as its container queries do). */
const NARROW_MAX = 480;
/** How long a recording may take to sound before the timer stands in for it. */
const STALL_MS = 8000;
const TICK_MS = 250;

// The site's fixed Spanish copy of the player (constants/repertoire.const.ts).
const UI = {
  play: 'Reproducir',
  pause: 'Pausar',
  toggle: 'Reproducir o pausar',
  previous: 'Obra anterior',
  next: 'Obra siguiente',
  previousLabel: 'Anterior',
  nextLabel: 'Siguiente',
  position: 'Posición en la pista',
  filters: 'Filtrar repertorio',
  pages: 'Páginas del repertorio',
  previousPage: 'Página anterior',
  nextPage: 'Página siguiente',
  playingStatus: 'Sonando ahora',
  programme: 'Repertorio',
} as const;

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

interface PlayerProps {
  locale: DemoLocale;
}

/**
 * The «Repertorio» section of the quartet's site: the record and its programme. It plays the
 * site's real recordings, streamed from production through one `<audio>` that loads nothing until
 * the reader's first click; when a file cannot load or play, a timer runs the clocks over the
 * work's length instead, without a word of error. The rail walks idle, playing, paused and the
 * mini player, and follows the reader when they use the player itself.
 */
export function Player({ locale }: PlayerProps) {
  const copy = PLAYER_DEMO_COPY[locale];
  const rootRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<PlayerState>(INITIAL_PLAYER);
  const stateRef = useRef<PlayerState>(INITIAL_PLAYER);
  // The work whose file the element holds, and whether it ever started to sound.
  const loadedRef = useRef<number | null>(null);
  const heardRef = useRef(false);
  // The timer stands in for the file of the loaded work.
  const [simulated, setSimulatedState] = useState(false);
  const simulatedRef = useRef(false);
  const setSimulated = useCallback((value: boolean) => {
    simulatedRef.current = value;
    setSimulatedState(value);
  }, []);

  const [narrow, setNarrow] = useState(false);
  const [categoryId, setCategoryId] = useState<CategoryId | null>(null);
  const [page, setPage] = useState(0);
  const [listChanges, setListChanges] = useState(0);

  /**
   * Every change of the transport goes through here, so the audio is told to play inside the
   * reader's own click (a browser lets a page sound only then).
   */
  const act = useCallback(
    (action: PlayerAction) => {
      const previous = stateRef.current;
      const next = reducePlayer(previous, action, DURATIONS);
      if (next === previous) return;
      stateRef.current = next;
      setState(next);
      if (action.type === 'tick') return;

      const audio = audioRef.current;
      if (!audio) return;
      if (next.status !== 'playing') {
        audio.pause();
        if (next.status === 'idle' && loadedRef.current !== null) {
          audio.removeAttribute('src');
          audio.load();
          loadedRef.current = null;
          setSimulated(false);
        } else if (loadedRef.current === next.selected && next.elapsed !== previous.elapsed) {
          audio.currentTime = next.elapsed;
        }
        return;
      }

      if (loadedRef.current !== next.selected) {
        const track = TRACKS[next.selected];
        if (!track) return;
        audio.src = audioUrl(track);
        loadedRef.current = next.selected;
        heardRef.current = false;
        setSimulated(false);
        audio.currentTime = next.elapsed;
      } else if (next.selected !== previous.selected || next.elapsed !== previous.elapsed) {
        audio.currentTime = next.elapsed;
      }
      if (simulatedRef.current) return;
      const selected = next.selected;
      audio.play().catch((error: unknown) => {
        // A pause that lands before the play settles is not a failure.
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (stateRef.current.status === 'playing' && stateRef.current.selected === selected) {
          setSimulated(true);
        }
      });
    },
    [setSimulated],
  );

  // The element's clock drives the transport while it sounds.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      if (!simulatedRef.current && stateRef.current.status === 'playing') {
        act({ type: 'tick', elapsed: audio.currentTime });
      }
    };
    const onPlaying = () => {
      heardRef.current = true;
    };
    const onEnded = () => act({ type: 'ended' });
    const onError = () => {
      if (loadedRef.current === null) return;
      audio.pause();
      if (stateRef.current.status === 'playing') setSimulated(true);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
    };
  }, [act, setSimulated]);

  // A file that never starts (a stalled network) hands over to the timer.
  useEffect(() => {
    if (state.status !== 'playing' || simulated) return;
    const timer = setTimeout(() => {
      if (heardRef.current || stateRef.current.status !== 'playing') return;
      audioRef.current?.pause();
      setSimulated(true);
    }, STALL_MS);
    return () => clearTimeout(timer);
  }, [state.status, state.selected, simulated, setSimulated]);

  // The timer: the clocks over the work's length when its file cannot sound.
  useEffect(() => {
    if (state.status !== 'playing' || !simulated) return;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = stateRef.current.elapsed + (now - last) / 1000;
      last = now;
      const duration = DURATIONS[stateRef.current.selected] ?? 0;
      act(elapsed >= duration ? { type: 'ended' } : { type: 'tick', elapsed });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [state.status, simulated, act]);

  // The music stops when the demo leaves the screen; the width picks the layout.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const visibility = new IntersectionObserver(([entry]) => {
      if (entry && !entry.isIntersecting) act({ type: 'pause' });
    });
    visibility.observe(root);
    const size = new ResizeObserver(([entry]) => {
      if (entry) setNarrow(entry.contentRect.width <= NARROW_MAX);
    });
    size.observe(root);
    return () => {
      visibility.disconnect();
      size.disconnect();
    };
  }, [act]);

  const mini = state.view === 'mini';
  const playing = state.status === 'playing';
  const chosen = state.status !== 'idle';
  const track = TRACKS[state.selected] ?? TRACKS[0]!;
  const duration = track.durationSeconds;
  const fraction = duration > 0 ? state.elapsed / duration : 0;

  const size = narrow ? (mini ? PAGE_SIZE.narrowMini : PAGE_SIZE.narrow) : PAGE_SIZE.wide;
  const rows = filterTracks(TRACKS, categoryId);
  const pages = pageCount(rows.length, size);
  const shownPage = Math.min(page, pages - 1);
  const visible = pageItems(rows, shownPage, size);

  const changeFilter = (next: CategoryId | null) => {
    setCategoryId(next);
    setPage(0);
    setListChanges((count) => count + 1);
  };
  const changePage = (next: number) => {
    setPage(next);
    setListChanges((count) => count + 1);
  };

  const transport = {
    playing,
    elapsed: state.elapsed,
    duration,
    onToggle: () => act({ type: 'toggle' }),
    onStep: (delta: number) => act({ type: 'step', delta }),
    onSeek: (value: number) => act({ type: 'seek', fraction: value }),
  };

  const step = railStepOf(state);

  return (
    <div data-demo-shell data-ground="page">
      <div ref={rootRef} className={styles.demo} data-ground="light">
        <section
          className={cx(styles.demo__scene, mini && styles.demo__scene_view_mini)}
          aria-label={UI.programme}
        >
          <div
            className={cx(styles.now, playing && styles.now_playing)}
            inert={mini}
            aria-hidden={mini || undefined}
          >
            <div className={styles.now__disc}>
              <div className={styles.now__spin} aria-hidden="true">
                <img className={styles.now__photo} src={record.src} alt="" />
                <span className={styles.now__grooves} />
              </div>
              <span className={styles.now__label} aria-hidden="true">
                <span className={styles.now__hole} />
              </span>
              <button
                type="button"
                className={styles['now__disc-toggle']}
                aria-label={playing ? UI.pause : UI.play}
                aria-pressed={playing}
                onClick={transport.onToggle}
              >
                <span
                  className={cx(
                    styles.now__glyph,
                    playing ? styles.now__glyph_pause : styles.now__glyph_play,
                  )}
                  aria-hidden="true"
                />
              </button>
            </div>

            <p className={styles.now__category}>{categoryLabel(track.categoryId)}</p>
            <p className={styles.now__title}>{track.title}</p>
            <MarqueeTitle text={track.title} />
            <p className={styles.now__composer}>{track.composer}</p>

            <div className={styles.now__progress}>
              <LineProgress
                fraction={fraction}
                onSeek={transport.onSeek}
                valueText={formatTrackPosition(state.elapsed, duration)}
              />
              <div className={styles.now__clocks}>
                <span>{formatTrackTime(state.elapsed)}</span>
                <span>−{formatTrackTime(duration - state.elapsed)}</span>
              </div>
            </div>

            <div className={styles.now__transport}>
              <button
                type="button"
                className={styles.now__step}
                aria-label={UI.previous}
                onClick={() => transport.onStep(-1)}
              >
                {UI.previousLabel}
              </button>
              <span className={styles.now__dot} aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                className={cx(styles.now__step, styles.now__step_main)}
                aria-label={UI.toggle}
                aria-pressed={playing}
                onClick={transport.onToggle}
              >
                <span className={cx(styles.now__word, playing && styles.now__word_hidden)}>
                  {UI.play}
                </span>
                <span className={cx(styles.now__word, !playing && styles.now__word_hidden)}>
                  {UI.pause}
                </span>
              </button>
              <span className={styles.now__dot} aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                className={styles.now__step}
                aria-label={UI.next}
                onClick={() => transport.onStep(1)}
              >
                {UI.nextLabel}
              </button>
            </div>
          </div>

          <div className={styles.demo__list}>
            <div className={styles.filters} role="group" aria-label={UI.filters}>
              {FILTERS.map((filter) => {
                const active = filter.value === categoryId;
                return (
                  <button
                    key={filter.value ?? 'todo'}
                    type="button"
                    className={cx(styles.filters__pill, active && styles.filters__pill_active)}
                    aria-pressed={active}
                    onClick={() => changeFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            <ol
              key={listChanges}
              className={cx(styles.list, listChanges > 0 && styles.list_entering)}
            >
              {visible.map(({ track: row, index }, order) => {
                const selected = chosen && index === state.selected;
                const sounding = selected && playing;
                return (
                  <li
                    key={row.id}
                    className={cx(
                      styles.track,
                      selected && styles.track_selected,
                      sounding && styles.track_playing,
                    )}
                    style={{ '--order': order } as CSSProperties}
                  >
                    <button
                      type="button"
                      className={styles.track__button}
                      aria-pressed={selected}
                      onClick={() => act({ type: 'select', index })}
                    >
                      <span className={styles.track__state} aria-hidden="true">
                        <span className={styles.track__number}>{shownPage * size + order + 1}</span>
                        <span className={styles.track__equalizer}>
                          <span className={styles.track__bar} />
                          <span className={styles.track__bar} />
                          <span className={styles.track__bar} />
                        </span>
                        <span className={styles.track__play} />
                        <span className={styles.track__pause} />
                      </span>
                      <StaffTile />
                      <span className={styles.track__text}>
                        <span className={styles.track__title}>{row.title}</span>
                        <span className={styles.track__composer}>{row.composer}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className={styles.demo__pager}>
              {pages > 1 && (
                <nav className={styles.pager} aria-label={UI.pages}>
                  <button
                    type="button"
                    className={styles.pager__step}
                    aria-label={UI.previousPage}
                    disabled={shownPage === 0}
                    onClick={() => changePage(shownPage - 1)}
                  >
                    <svg className={styles.pager__icon} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M15 6l-6 6 6 6" />
                    </svg>
                  </button>
                  {Array.from({ length: pages }, (_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={cx(
                        styles.pager__page,
                        index === shownPage && styles.pager__page_current,
                      )}
                      aria-current={index === shownPage ? 'page' : undefined}
                      onClick={() => changePage(index)}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={styles.pager__step}
                    aria-label={UI.nextPage}
                    disabled={shownPage === pages - 1}
                    onClick={() => changePage(shownPage + 1)}
                  >
                    <svg className={styles.pager__icon} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                </nav>
              )}
            </div>
          </div>

          {mini && <MiniPlayer title={track.title} composer={track.composer} {...transport} />}
        </section>

        <audio ref={audioRef} preload="none" />
      </div>
      <Rail
        label={copy.rail}
        options={RAIL_STEPS.map((id) => ({ id, label: copy.steps[id].label }))}
        value={step}
        onChange={(next) => act({ type: 'rail', step: next })}
        status={copy.steps[step].caption}
      />
    </div>
  );
}

/** The phone's title: one line that slides sideways when it does not fit. */
function MarqueeTitle({ text }: { text: string }) {
  const ref = useMarquee<HTMLParagraphElement>(text, styles.marquee_scrolling ?? '');
  return (
    <div className={styles['now__line-box']}>
      <p ref={ref} className={cx(styles.marquee, styles.now__line)}>
        <span className={styles.marquee__copy}>{text}</span>
        <span
          className={cx(styles.marquee__copy, styles.marquee__copy_role_echo)}
          aria-hidden="true"
        >
          {text}
        </span>
      </p>
    </div>
  );
}

/** A bit of staff as the cover of each row: three lines and two notes. */
function StaffTile() {
  return (
    <span className={styles.tile} aria-hidden="true">
      <svg width="44" height="44" viewBox="0 0 44 44">
        <g stroke="currentColor" strokeWidth="1" opacity="0.45" fill="none">
          <line x1="0" y1="15" x2="44" y2="15" />
          <line x1="0" y1="22" x2="44" y2="22" />
          <line x1="0" y1="29" x2="44" y2="29" />
        </g>
        <g fill="currentColor" opacity="0.85">
          <rect x="12" y="18" width="7" height="7" transform="rotate(-3 15 21)" />
          <rect x="27" y="11" width="7" height="7" transform="rotate(3 30 14)" opacity="0.6" />
        </g>
      </svg>
    </span>
  );
}

const KEY_STEP = 0.05;

interface LineProgressProps {
  fraction: number;
  onSeek: (fraction: number) => void;
  valueText: string;
}

/** A thin line that fills in ink, with a dot as the playhead: click to seek, or a slider by keys. */
function LineProgress({ fraction, onSeek, valueText }: LineProgressProps) {
  const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 1000) / 10;

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onSeek((event.clientX - rect.left) / rect.width);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') onSeek(fraction + KEY_STEP);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') onSeek(fraction - KEY_STEP);
    else if (event.key === 'Home') onSeek(0);
    else if (event.key === 'End') onSeek(1);
    else return;
    event.preventDefault();
  };

  return (
    <div
      className={styles.line}
      role="slider"
      tabIndex={0}
      aria-label={UI.position}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-valuetext={valueText}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <span className={styles.line__track}>
        <span className={styles.line__played} style={{ width: `${percent}%` }} />
      </span>
      <span className={styles.line__dot} style={{ left: `${percent}%` }} />
    </div>
  );
}

interface MiniPlayerProps {
  title: string;
  composer: string;
  playing: boolean;
  elapsed: number;
  duration: number;
  onToggle: () => void;
  onStep: (delta: number) => void;
  onSeek: (fraction: number) => void;
}

/**
 * The record of the card, small, pinned in the corner while a work plays and the card has scrolled
 * away. The record is the play/pause button and its grooves are the progress; the paper card with
 * the work slides out to its left under the pointer or the keyboard focus.
 */
function MiniPlayer({
  title,
  composer,
  playing,
  elapsed,
  duration,
  onToggle,
  onStep,
  onSeek,
}: MiniPlayerProps) {
  const fraction = duration > 0 ? elapsed / duration : 0;
  const grooves = grooveDrawing(fraction);

  return (
    <div
      className={cx(styles.mini, playing && styles.mini_playing)}
      role="region"
      aria-label={UI.playingStatus}
    >
      <button
        type="button"
        className={styles.mini__record}
        aria-label={UI.toggle}
        aria-pressed={playing}
        onClick={onToggle}
      >
        <span className={styles.mini__disc} aria-hidden="true">
          <span className={styles.mini__spin}>
            <img className={styles.mini__photo} src={record.src} alt="" />
            <span className={styles.mini__texture} />
          </span>
          <svg className={styles.mini__grooves} viewBox="0 0 100 100">
            {grooves.band && (
              <circle
                className={styles.mini__band}
                cx="50"
                cy="50"
                r={grooves.band.radius}
                strokeWidth={grooves.band.width}
              />
            )}
            {grooves.grooves.map((radius) => (
              <circle key={radius} className={styles.mini__groove} cx="50" cy="50" r={radius} />
            ))}
            <circle className={styles.mini__needle} cx="50" cy="50" r={grooves.needle} />
            <circle
              className={cx(styles.mini__needle, styles.mini__needle_light)}
              cx="50"
              cy="50"
              r={grooves.needle - 1}
            />
            <circle className={styles.mini__tip} cx="50" cy={50 - grooves.needle} r="2" />
          </svg>
          <span className={styles.mini__label}>
            <span className={styles.mini__glyph} />
          </span>
        </span>
      </button>

      <div className={styles.mini__card}>
        <span className={styles.mini__status}>{UI.playingStatus}</span>
        <p className={styles.mini__title} title={title}>
          {title}
        </p>
        <span className={styles.mini__composer}>{composer}</span>
        <div className={styles.mini__time}>
          <span className={styles.mini__clock}>{formatTrackTime(elapsed)}</span>
          <LineProgress
            fraction={fraction}
            onSeek={onSeek}
            valueText={formatTrackPosition(elapsed, duration)}
          />
          <span className={styles.mini__clock}>−{formatTrackTime(duration - elapsed)}</span>
        </div>
        <div className={styles.mini__transport}>
          <button
            type="button"
            className={styles.mini__step}
            aria-label={UI.previous}
            onClick={() => onStep(-1)}
          >
            {UI.previousLabel}
          </button>
          <span className={styles.mini__dot} aria-hidden="true">
            ·
          </span>
          <button
            type="button"
            className={styles.mini__step}
            aria-label={UI.next}
            onClick={() => onStep(1)}
          >
            {UI.nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
