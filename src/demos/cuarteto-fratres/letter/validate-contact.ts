/**
 * The contact form's rules, ported from the quartet's site (cuartetofratres,
 * services/contact/contact.validation.ts and constants/contact.const.ts): the same limits, the same
 * Spanish messages, every problem reported at once. Pure: it reads plain strings, not FormData.
 */

/** Upper bounds of the fields (the site's CONTACT_LIMITS). */
export const CONTACT_LIMITS = {
  name: 120,
  contact: 160,
  details: 2000,
} as const;

export type ContactKey = keyof typeof CONTACT_LIMITS;

export type ContactValues = Record<ContactKey, string>;

export type ContactFieldErrors = Partial<Record<ContactKey, string>>;

export type ContactValidation =
  { ok: true; value: ContactValues } | { ok: false; fields: ContactFieldErrors };

/** The message the site's server action puts beside the button when a field is wrong. */
export const CONTACT_ERROR_NOTICE = 'Revisa los campos marcados.';

export const EMPTY_CONTACT: ContactValues = { name: '', contact: '', details: '' };

export function validateContact(values: ContactValues): ContactValidation {
  const fields: ContactFieldErrors = {};

  const name = values.name.trim();
  if (!name) fields.name = 'Escribe tu nombre.';
  else if (name.length > CONTACT_LIMITS.name)
    fields.name = `Máximo ${CONTACT_LIMITS.name} caracteres.`;

  const contact = values.contact.trim();
  if (!contact) fields.contact = 'Deja un correo o un WhatsApp para responderte.';
  else if (contact.length > CONTACT_LIMITS.contact)
    fields.contact = `Máximo ${CONTACT_LIMITS.contact} caracteres.`;

  const details = values.details.trim();
  if (details.length > CONTACT_LIMITS.details)
    fields.details = `Máximo ${CONTACT_LIMITS.details} caracteres.`;

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, value: { name, contact, details } };
}

/**
 * What the «With errors» state of the demo shows: the errors of what the reader typed or, when that
 * happens to be valid, those of an empty sheet, so the state always has something to show.
 */
export function errorsToShow(values: ContactValues): ContactFieldErrors {
  const typed = validateContact(values);
  if (!typed.ok) return typed.fields;
  const empty = validateContact(EMPTY_CONTACT);
  return empty.ok ? {} : empty.fields;
}
