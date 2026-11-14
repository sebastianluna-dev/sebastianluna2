import { describe, expect, it } from 'vitest';
import { formatCalendarDate } from './format-calendar-date';

describe('formatCalendarDate', () => {
  it('splits the date into the pieces of the calendar leaf', () => {
    expect(formatCalendarDate('2026-12-05')).toEqual({
      weekday: 'Sábado',
      day: '05',
      month: 'Dic',
      year: '2026',
    });
  });

  it('keeps the zero of the day and names the weekday in full', () => {
    expect(formatCalendarDate('2026-11-08')).toEqual({
      weekday: 'Domingo',
      day: '08',
      month: 'Nov',
      year: '2026',
    });
    expect(formatCalendarDate('2026-10-21').weekday).toBe('Miércoles');
  });

  it('rejects a malformed or impossible date', () => {
    expect(() => formatCalendarDate('5/12/2026')).toThrow();
    expect(() => formatCalendarDate('2026-13-01')).toThrow();
    expect(() => formatCalendarDate('2026-02-30')).toThrow();
  });
});
