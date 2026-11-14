import { useId, useRef, useState, type ChangeEvent, type SubmitEvent } from 'react';
import { Rail } from '@demos/shared/Rail';
import '../tokens.css';
import { LETTER_COPY, LETTER_STATES, type DemoLocale, type LetterState } from './copy';
import {
  CONTACT_ERROR_NOTICE,
  CONTACT_LIMITS,
  EMPTY_CONTACT,
  errorsToShow,
  validateContact,
  type ContactFieldErrors,
  type ContactKey,
  type ContactValues,
} from './validate-contact';
import styles from './letter.module.css';

// The site's fixed copy (cuartetofratres, constants/contact.const.ts and contact-form.comp.tsx):
// the reproduced UI stays in Spanish in both locales.
const SITE = {
  submit: 'Enviar solicitud',
  sentTitle: 'Gracias.',
  sentText:
    'Te respondemos al correo o WhatsApp que dejaste, con propuesta de programa y duración.',
  fields: [
    { key: 'name', label: 'Nombre', autoComplete: 'name' },
    { key: 'contact', label: 'Correo o WhatsApp', autoComplete: 'email' },
    { key: 'details', label: 'Detalles', multiline: true },
  ] as const satisfies readonly {
    key: ContactKey;
    label: string;
    autoComplete?: string;
    multiline?: boolean;
  }[],
};

/** The errors of an empty sheet: the ghost below sizes the sheet with them. */
const EMPTY_ERRORS = errorsToShow(EMPTY_CONTACT);

interface LetterFormProps {
  values: ContactValues;
  errors: ContactFieldErrors;
  notice: string | null;
  /** Prefix of the error ids, unique per form on the page. */
  idPrefix: string;
  /** A copy that only reserves the height of the errors: no names, no handlers, not reachable. */
  ghost?: boolean;
  hidden?: boolean;
  onChange?: (key: ContactKey, value: string) => void;
  onSubmit?: (event: SubmitEvent<HTMLFormElement>) => void;
}

/**
 * The letter's form as the site draws it: three captions, each beside its rule (several for the
 * details), and the button with its notice on the last line. Each label wraps its control.
 */
function LetterForm({
  values,
  errors,
  notice,
  idPrefix,
  ghost = false,
  hidden = false,
  onChange,
  onSubmit,
}: LetterFormProps) {
  const className = [
    styles.demo__form,
    ghost ? styles.demo__form_role_ghost : '',
    hidden ? styles.demo__form_hidden : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <form
      className={className}
      noValidate
      onSubmit={onSubmit}
      aria-hidden={ghost || hidden || undefined}
      inert={ghost || hidden}
    >
      {SITE.fields.map((field) => {
        const error = errors[field.key];
        const errorId = `${idPrefix}-${field.key}-error`;
        const multiline = 'multiline' in field && field.multiline;
        const control = {
          name: ghost ? undefined : field.key,
          maxLength: CONTACT_LIMITS[field.key],
          value: values[field.key],
          'aria-invalid': Boolean(error),
          'aria-describedby': error ? errorId : undefined,
          onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            onChange?.(field.key, event.target.value),
        };
        return (
          <label
            key={field.key}
            className={[
              styles.demo__field,
              multiline ? styles.demo__field_kind_multiline : '',
              error ? styles.demo__field_invalid : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className={styles.demo__label}>{field.label}</span>
            {multiline ? (
              <textarea
                {...control}
                rows={4}
                className={`${styles.demo__control} ${styles.demo__control_kind_textarea}`}
              />
            ) : (
              <input
                {...control}
                type="text"
                autoComplete={'autoComplete' in field ? field.autoComplete : undefined}
                className={styles.demo__control}
              />
            )}
            {error && (
              <span id={ghost ? undefined : errorId} className={styles.demo__error}>
                {error}
              </span>
            )}
          </label>
        );
      })}

      <div className={styles.demo__footer}>
        <button type="submit" className={styles.demo__submit}>
          {SITE.submit}
          <svg
            className={styles.demo__arrow}
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M4 12h15M13 6l6 6-6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <p className={styles.demo__notice} aria-live={ghost ? undefined : 'polite'}>
          {notice}
        </p>
      </div>
    </form>
  );
}

interface LetterProps {
  locale: DemoLocale;
}

/**
 * The quartet's contact form, a letter on ruled paper, working but sending nothing: the reader
 * writes, sends, and sees the site's own validation (same rules, same Spanish messages) or its
 * thanks. The rail and the form drive each other.
 */
export function Letter({ locale }: LetterProps) {
  const copy = LETTER_COPY[locale];
  const idPrefix = useId();
  const sentRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<LetterState>('empty');
  const [values, setValues] = useState<ContactValues>(EMPTY_CONTACT);
  const [errors, setErrors] = useState<ContactFieldErrors>({});

  function choose(next: LetterState) {
    setState(next);
    if (next === 'empty') {
      setValues(EMPTY_CONTACT);
      setErrors({});
    } else if (next === 'errors') {
      setErrors(errorsToShow(values));
    }
  }

  function onChange(key: ContactKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  // As the site's server action: every error at once and the notice beside the button, focus left
  // on the button; a valid request swaps the form for the thanks. Nothing is sent anywhere.
  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateContact(values);
    if (result.ok) {
      setErrors({});
      setState('sent');
      // The button the focus was on goes away with the form: keep the focus on the thanks.
      requestAnimationFrame(() => sentRef.current?.focus());
    } else {
      setErrors(result.fields);
      setState('errors');
    }
  }

  const sent = state === 'sent';
  const shownErrors = state === 'errors' ? errors : {};

  return (
    <div className={styles.demo} data-ground="light">
      <div className={styles.demo__desk}>
        {/* A second sheet under the letter, slightly turned. */}
        <div className={styles.demo__under} aria-hidden="true" />
        <div className={styles.demo__sheet}>
          <LetterForm
            ghost
            values={EMPTY_CONTACT}
            errors={EMPTY_ERRORS}
            notice={CONTACT_ERROR_NOTICE}
            idPrefix={idPrefix}
          />
          <LetterForm
            hidden={sent}
            values={values}
            errors={shownErrors}
            notice={state === 'errors' ? CONTACT_ERROR_NOTICE : null}
            idPrefix={idPrefix}
            onChange={onChange}
            onSubmit={onSubmit}
          />
          <div ref={sentRef} className={styles.demo__sent} role="status" tabIndex={-1}>
            {sent && (
              <>
                <h3 className={styles['demo__sent-title']}>{SITE.sentTitle}</h3>
                <p className={styles['demo__sent-text']}>{SITE.sentText}</p>
              </>
            )}
          </div>
        </div>
      </div>
      <Rail
        label={copy.rail}
        options={LETTER_STATES.map((id) => ({ id, label: copy.states[id].label }))}
        value={state}
        onChange={choose}
        status={copy.states[state].caption}
      />
    </div>
  );
}
