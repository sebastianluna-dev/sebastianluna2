import { describe, expect, it } from 'vitest';
import { CONTACT_LIMITS, EMPTY_CONTACT, errorsToShow, validateContact } from './validate-contact';

describe('validateContact', () => {
  it('reports the name and the contact of an empty sheet at once; the details are optional', () => {
    expect(validateContact(EMPTY_CONTACT)).toEqual({
      ok: false,
      fields: {
        name: 'Escribe tu nombre.',
        contact: 'Deja un correo o un WhatsApp para responderte.',
      },
    });
  });

  it('treats blank spaces as empty', () => {
    const result = validateContact({ name: '   ', contact: '\n', details: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.fields)).toEqual(['name', 'contact']);
  });

  it('accepts a name and a contact, trimmed', () => {
    expect(validateContact({ name: ' Ana ', contact: ' ana@correo.mx ', details: '' })).toEqual({
      ok: true,
      value: { name: 'Ana', contact: 'ana@correo.mx', details: '' },
    });
  });

  it('caps every field at the site limits', () => {
    const result = validateContact({
      name: 'a'.repeat(CONTACT_LIMITS.name + 1),
      contact: 'b'.repeat(CONTACT_LIMITS.contact + 1),
      details: 'c'.repeat(CONTACT_LIMITS.details + 1),
    });
    expect(result).toEqual({
      ok: false,
      fields: {
        name: 'Máximo 120 caracteres.',
        contact: 'Máximo 160 caracteres.',
        details: 'Máximo 2000 caracteres.',
      },
    });
  });

  it('accepts values exactly at the limits', () => {
    const result = validateContact({
      name: 'a'.repeat(CONTACT_LIMITS.name),
      contact: 'b'.repeat(CONTACT_LIMITS.contact),
      details: 'c'.repeat(CONTACT_LIMITS.details),
    });
    expect(result.ok).toBe(true);
  });
});

describe('errorsToShow', () => {
  it('shows the errors of what was typed', () => {
    expect(errorsToShow({ name: 'Ana', contact: '', details: '' })).toEqual({
      contact: 'Deja un correo o un WhatsApp para responderte.',
    });
  });

  it('falls back to the errors of an empty sheet when what was typed is valid', () => {
    expect(errorsToShow({ name: 'Ana', contact: '5512345678', details: '' })).toEqual({
      name: 'Escribe tu nombre.',
      contact: 'Deja un correo o un WhatsApp para responderte.',
    });
  });
});
