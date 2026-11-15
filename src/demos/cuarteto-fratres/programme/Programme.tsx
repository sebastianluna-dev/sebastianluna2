import { useId, useState, type MouseEvent } from 'react';
import { Rail } from '@demos/shared/Rail';
import '../tokens.css';
import photo from '../assets/event-temporada.webp';
import { PROGRAMME_COPY, PROGRAMME_STATES, type DemoLocale, type ProgrammeState } from './copy';
import { BILL_TITLE, EVENT_LABELS, PROGRAMME_EVENTS } from './events';
import { formatCalendarDate } from './format-calendar-date';
import styles from './programme.module.css';

interface ProgrammeProps {
  locale: DemoLocale;
}

/** The site's arrow: `right` moves on within the page, `up-right` opens another site. */
function Arrow({ direction }: { direction: 'right' | 'up-right' }) {
  return (
    <svg className={styles.demo__icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
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

// In the demo nothing leaves the page: the actions keep their hover and focus and do nothing else.
function stay(event: MouseEvent) {
  event.preventDefault();
}

/**
 * The window that opens from a date of the quartet's bill, a printed concert programme: calendar
 * leaf and photo on the left, the works with a dotted leader to their composer on the right. The
 * rail swaps the event it shows; at the phone width it is the site's sheet risen from the bottom.
 */
export function Programme({ locale }: ProgrammeProps) {
  const copy = PROGRAMME_COPY[locale];
  const [state, setState] = useState<ProgrammeState>('tickets');
  // The window is already open when the demo appears; it only plays its entrance on a new event.
  const [reopened, setReopened] = useState(false);
  const event = PROGRAMME_EVENTS[state];
  const calendar = formatCalendarDate(event.date);
  const titleId = useId();
  const prices = event.tickets?.prices ?? [];

  return (
    <div data-demo-shell data-ground="page">
      <div className={styles.demo} data-ground="ink">
        <div className={styles.demo__stage}>
          {/* The bill behind, dimmed by the window's backdrop. */}
          <div className={styles.demo__bill} aria-hidden="true">
            <span className={styles['demo__bill-title']}>{BILL_TITLE}</span>
            <span className={styles['demo__bill-card']} />
            <span className={styles['demo__bill-card']} />
            <span
              className={`${styles['demo__bill-card']} ${styles['demo__bill-card_tone_cream']}`}
            />
          </div>

          {/* Keyed by state so each event opens the window again, as a click on the bill does. */}
          <section
            key={state}
            className={styles.demo__sheet}
            data-reopened={reopened || undefined}
            aria-labelledby={titleId}
          >
            <span className={styles.demo__handle} aria-hidden="true" />
            <button
              type="button"
              className={styles.demo__close}
              aria-label={EVENT_LABELS.close}
              aria-disabled="true"
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
                <img className={styles.demo__photo} src={photo.src} alt="" />
              </div>
            </div>

            <div className={styles.demo__body}>
              <p className={styles.demo__city}>{event.city}</p>
              <h3 id={titleId} className={styles.demo__title}>
                {event.title}
              </h3>
              <p className={styles.demo__description}>{event.description}</p>

              <section className={styles['demo__program-block']} aria-label={EVENT_LABELS.program}>
                <h4 className={styles['demo__program-label']}>{EVENT_LABELS.program}</h4>
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
                  <h4 className={styles['demo__fact-label']}>{EVENT_LABELS.venue}</h4>
                  <p className={styles['demo__fact-main']}>{event.venue.name}</p>
                  <p className={styles['demo__fact-detail']}>{event.venue.address}</p>
                  <a href="#" className={styles.demo__link} onClick={stay}>
                    {EVENT_LABELS.directions}
                  </a>
                </section>
                {prices.length > 0 && (
                  <section className={styles.demo__fact} aria-label={EVENT_LABELS.ticketsHeading}>
                    <h4 className={styles['demo__fact-label']}>{EVENT_LABELS.ticketsHeading}</h4>
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
                  <Arrow direction={event.tickets ? 'up-right' : 'right'} />
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
      <Rail
        label={copy.rail}
        options={PROGRAMME_STATES.map((id) => ({ id, label: copy.states[id].label }))}
        value={state}
        onChange={(next) => {
          setReopened(true);
          setState(next);
        }}
        status={copy.states[state].caption}
      />
    </div>
  );
}
