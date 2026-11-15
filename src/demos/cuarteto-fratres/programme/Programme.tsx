import {
  useEffect,
  useId,
  useRef,
  useState,
  type AnimationEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import '../tokens.css';
import { BILL_COPY, EVENT_LABELS, PROGRAMME_EVENTS, type ProgrammeEvent } from './events';
import { formatCalendarDate } from './format-calendar-date';
import { POSTER_STAFF } from './poster-staff';
import styles from './programme.module.css';

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

/** The site's arrow: `right` moves on within the page, `up-right` opens something. */
function Arrow({ direction, className }: { direction: 'right' | 'up-right'; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d={direction === 'right' ? 'M4 12h15M13 6l6 6-6 6' : 'M7 17 17 7M9 7h8v8'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// In the demo nothing leaves the page: the links keep their hover and focus and do nothing else.
function stay(event: MouseEvent) {
  event.preventDefault();
}

interface PosterProps {
  /** `graphite` is the dark ground of a date; `cream` is the invitation. */
  palette: 'graphite' | 'cream';
  /** The big figure of the corner and the line under it. */
  top: ReactNode;
  topNote: string;
  /** Read up the right edge. */
  side: string;
  title: { kicker: string; lines: readonly string[] };
  where: string;
  note: string;
  photo?: { src: string; position: string };
  action: ReactNode;
}

/** A poster of the bill (the site's `Poster`): the date in a corner, the title at the foot. */
function Poster({ palette, top, topNote, side, title, where, note, photo, action }: PosterProps) {
  return (
    <article className={cx(styles.demo__poster, styles[`demo__poster_palette_${palette}`])}>
      {photo && (
        <div className={styles['demo__poster-photo']}>
          <img
            className={styles['demo__poster-image']}
            src={photo.src}
            alt=""
            style={{ objectPosition: photo.position }}
          />
        </div>
      )}
      <div className={styles['demo__poster-staff']} aria-hidden="true">
        <svg viewBox={POSTER_STAFF.viewBox} preserveAspectRatio="none" focusable="false">
          {POSTER_STAFF.paths.map((d) => (
            <path key={d} d={d} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
      </div>

      <div className={styles['demo__poster-top']}>
        <p className={styles['demo__poster-date']}>
          <span className={styles['demo__poster-day']}>{top}</span>
          <span className={styles['demo__poster-month']}>{topNote}</span>
        </p>
        <span className={styles['demo__poster-side']}>{side}</span>
      </div>

      <div className={styles['demo__poster-bottom']}>
        <h4 className={styles['demo__poster-title']}>
          <span className={styles['demo__poster-kicker']}>{title.kicker} </span>
          <span className={styles['demo__poster-syllables']}>
            {title.lines.map((line) => (
              <span key={line} className={styles['demo__poster-syllable']}>
                {line}
              </span>
            ))}
          </span>
        </h4>
        <p className={styles['demo__poster-where']}>{where}</p>
        <p className={styles['demo__poster-note']}>{note}</p>
        {action}
      </div>
    </article>
  );
}

interface SheetProps {
  event: ProgrammeEvent;
  closing: boolean;
  onClose: () => void;
  onClosed: () => void;
}

/**
 * The window of a date, a printed concert programme: calendar leaf and photo on the left, the works
 * with a dotted leader to their composer on the right. It opens inside the demo's scene, so it is a
 * plain dialog and not the page's modal; focus goes to its close button when it appears.
 */
function Sheet({ event, closing, onClose, onClosed }: SheetProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const calendar = formatCalendarDate(event.date);
  const prices = event.tickets?.prices ?? [];

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, []);

  function onKeyDown(keyEvent: KeyboardEvent) {
    if (keyEvent.key !== 'Escape') return;
    keyEvent.stopPropagation();
    onClose();
  }

  // Only the sheet's own exit unmounts it, not an animation of something inside it.
  function onAnimationEnd(animationEvent: AnimationEvent) {
    if (closing && animationEvent.target === animationEvent.currentTarget) onClosed();
  }

  return (
    <section
      role="dialog"
      className={cx(styles.demo__sheet, closing && styles.demo__sheet_closing)}
      aria-labelledby={titleId}
      inert={closing}
      onKeyDown={onKeyDown}
      onAnimationEnd={onAnimationEnd}
    >
      <span className={styles.demo__handle} aria-hidden="true" />
      <button
        ref={closeRef}
        type="button"
        className={styles.demo__close}
        aria-label={EVENT_LABELS.close}
        onClick={onClose}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>

      <div className={styles.demo__side}>
        <time className={styles.demo__calendar} dateTime={`${event.date}T${event.time}`}>
          <span className={styles.demo__weekday}>{calendar.weekday}</span>
          <span className={styles.demo__day}>{calendar.day}</span>
          <span className={styles.demo__month}>
            {calendar.month} <span className={styles.demo__year}>{calendar.year}</span>
          </span>
          <span className={styles.demo__hour}>{event.time} h</span>
        </time>
        <div className={styles.demo__media}>
          <img
            className={styles.demo__photo}
            src={event.photo.src}
            alt=""
            style={{ objectPosition: event.photo.position }}
          />
        </div>
      </div>

      <div className={styles.demo__body}>
        <p className={styles.demo__city}>{event.city}</p>
        <h4 id={titleId} className={styles.demo__title}>
          {event.title}
        </h4>
        <p className={styles.demo__description}>{event.description}</p>

        <section className={styles['demo__program-block']} aria-label={EVENT_LABELS.program}>
          <h5 className={styles['demo__program-label']}>{EVENT_LABELS.program}</h5>
          <ol className={styles.demo__program}>
            {event.program.map((work) => (
              <li key={work.title} className={styles['demo__program-item']}>
                <span className={styles['demo__program-title']}>{work.title}</span>
                <span className={styles['demo__program-leader']} aria-hidden="true" />
                <span className={styles['demo__program-composer']}>{work.composer}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className={styles.demo__facts}>
          <section className={styles.demo__fact} aria-label={EVENT_LABELS.venue}>
            <h5 className={styles['demo__fact-label']}>{EVENT_LABELS.venue}</h5>
            <p className={styles['demo__fact-main']}>{event.venue.name}</p>
            <p className={styles['demo__fact-detail']}>{event.venue.address}</p>
            <a href="#" className={styles.demo__link} onClick={stay}>
              {EVENT_LABELS.directions}
            </a>
          </section>
          {prices.length > 0 && (
            <section className={styles.demo__fact} aria-label={EVENT_LABELS.ticketsHeading}>
              <h5 className={styles['demo__fact-label']}>{EVENT_LABELS.ticketsHeading}</h5>
              <ul className={styles.demo__prices}>
                {prices.map((price) => (
                  <li key={price.label}>
                    <span className={styles['demo__fact-main']}>{price.amount}</span>
                    <span className={styles['demo__fact-detail']}>{price.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className={styles.demo__actions}>
          <a href="#" className={styles.demo__button} onClick={stay}>
            {event.tickets ? EVENT_LABELS.tickets : EVENT_LABELS.inquire}
            <Arrow direction={event.tickets ? 'up-right' : 'right'} className={styles.demo__icon} />
          </a>
        </div>
      </div>
    </section>
  );
}

/**
 * The «Cartelera» section of the quartet's site, to be used: two dates as posters and the
 * invitation that closes the row. A poster's button opens the window of its date over the bill,
 * inside the scene, which keeps one height whether the window is open or not.
 */
export function Programme() {
  const titleId = useId();
  // The date whose window is on the scene, and whether that window is on its way out.
  const [openId, setOpenId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  // Counts the openings: each one is a new window, even of the date that was just closing.
  const [opening, setOpening] = useState(0);
  const opener = useRef<HTMLButtonElement | null>(null);
  const openEvent = PROGRAMME_EVENTS.find((event) => event.id === openId);
  const { invitation } = BILL_COPY;

  function open(event: ProgrammeEvent, button: HTMLButtonElement) {
    opener.current = button;
    setOpenId(event.id);
    setClosing(false);
    setOpening((count) => count + 1);
  }

  // The bill is usable again at once, with focus back on the button that opened the window; the
  // window itself leaves when its exit ends.
  function close() {
    setClosing(true);
    const button = opener.current;
    // After React has lifted `inert` from the bill, or the focus would not land.
    requestAnimationFrame(() => button?.focus({ preventScroll: true }));
  }

  function closed() {
    setOpenId(null);
    setClosing(false);
  }

  return (
    <div className={styles.demo} data-ground="light">
      <div className={styles.demo__stage}>
        <section
          className={styles.demo__bill}
          aria-labelledby={titleId}
          inert={openEvent !== undefined && !closing}
        >
          <h3 id={titleId} className={styles['demo__bill-title']}>
            {BILL_COPY.title}
          </h3>
          <ul className={styles.demo__posters}>
            {PROGRAMME_EVENTS.map((event) => {
              const date = formatCalendarDate(event.date);
              return (
                <li key={event.id} className={styles['demo__posters-item']}>
                  <Poster
                    palette="graphite"
                    top={<time dateTime={event.date}>{date.day}</time>}
                    topNote={`${date.month} · ${date.weekdayShort}`}
                    side={event.city.split(',')[0] ?? event.city}
                    title={event.poster}
                    where={`${event.city} | ${event.time} h`}
                    note={event.composers}
                    photo={event.photo}
                    action={
                      <button
                        type="button"
                        className={styles['demo__poster-action']}
                        aria-haspopup="dialog"
                        onClick={(click) => open(event, click.currentTarget)}
                      >
                        {BILL_COPY.program}
                        <Arrow direction="up-right" className={styles['demo__poster-icon']} />
                      </button>
                    }
                  />
                </li>
              );
            })}
            <li className={styles['demo__posters-item']}>
              <Poster
                palette="cream"
                top={invitation.top}
                topNote={invitation.topNote}
                side={invitation.side}
                title={invitation.title}
                where={invitation.where}
                note={invitation.note}
                action={
                  <a href="#" className={styles['demo__poster-action']} onClick={stay}>
                    {invitation.action}
                    <Arrow direction="right" className={styles['demo__poster-icon']} />
                  </a>
                }
              />
            </li>
          </ul>
        </section>

        {openEvent && (
          <>
            <div
              className={cx(styles.demo__backdrop, closing && styles.demo__backdrop_closing)}
              onClick={close}
            />
            <Sheet
              key={opening}
              event={openEvent}
              closing={closing}
              onClose={close}
              onClosed={closed}
            />
          </>
        )}
      </div>
    </div>
  );
}
