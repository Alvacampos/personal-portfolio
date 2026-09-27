import { addDays, format, getDate, getDay, getDaysInMonth, parse } from 'date-fns';
import type { Locale as DateFnsLocale } from 'date-fns/locale';

export type CalendarDay = {
  // YYYY-MM-DD
  iso: string;
  dayOfMonth: number;
};

// Monday-start weeks for both locales — the household this app serves
// expects that convention regardless of displayed language, and
// switching the grid's own shape by locale would be more inconsistent
// than useful (docs/finance-frontend.md §14 doesn't specify either way).
export function buildCalendarWeeks(yyyyMm: string): (CalendarDay | null)[][] {
  const monthStart = parse(yyyyMm, 'yyyy-MM', new Date());
  const daysInMonth = getDaysInMonth(monthStart);
  // date-fns' getDay is 0=Sun..6=Sat; shift so 0=Mon..6=Sun.
  const leadingBlanks = (getDay(monthStart) + 6) % 7;

  const days: (CalendarDay | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const date = addDays(monthStart, index);
      return { iso: format(date, 'yyyy-MM-dd'), dayOfMonth: getDate(date) };
    }),
  ];
  // Pad the last week to a full 7 columns too, so every row is the same
  // table shape (a screen reader announces a consistent column count).
  while (days.length % 7 !== 0) days.push(null);

  const weeks: (CalendarDay | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

// Short weekday header labels, Monday first — locale-aware (e.g. "Mon"
// vs "lun") but the column order itself stays fixed regardless of
// locale, matching buildCalendarWeeks above. 2024-01-01 is a known
// Monday; any Monday works equally well as the reference date.
export function getWeekdayLabels(dfLocale: DateFnsLocale | undefined): string[] {
  const monday = new Date(2024, 0, 1);
  return Array.from({ length: 7 }, (_, index) =>
    format(addDays(monday, index), 'EEE', { locale: dfLocale })
  );
}
