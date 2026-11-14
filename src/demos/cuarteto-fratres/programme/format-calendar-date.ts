const MONTHS_SHORT_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const;

const WEEKDAYS_ES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const;

/** The pieces of the calendar leaf of the event window. */
export interface CalendarDate {
  /** "Sábado". */
  weekday: string;
  /** Day of the month with its zero: "05". */
  day: string;
  /** "Dic". */
  month: string;
  /** "2026". */
  year: string;
}

/**
 * "2026-12-05" → weekday "Sábado", day "05", month "Dic", year "2026": the calendar leaf of the
 * quartet's event window (the site's `formatEventCalendarDate`). Parsed by hand and the weekday
 * worked out in UTC, so the result never depends on the time zone of the machine.
 */
export function formatCalendarDate(isoDate: string): CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error(`Invalid date: "${isoDate}" (expected YYYY-MM-DD)`);
  const [, year = '', month = '', day = ''] = match;
  const monthIndex = Number(month) - 1;
  const monthName = MONTHS_SHORT_ES[monthIndex];
  if (!monthName) throw new Error(`Month out of range in "${isoDate}"`);
  const date = new Date(Date.UTC(Number(year), monthIndex, Number(day)));
  if (date.getUTCMonth() !== monthIndex) throw new Error(`Day out of range in "${isoDate}"`);
  const weekday = WEEKDAYS_ES[date.getUTCDay()];
  if (!weekday) throw new Error(`Invalid date: "${isoDate}"`);
  return { weekday, day, month: monthName, year };
}
