import { addMonths, format, parse } from 'date-fns';

function parseYearMonth(yyyyMm: string): Date {
  return parse(yyyyMm, 'yyyy-MM', new Date());
}

function toYearMonth(monthDate: Date): string {
  return format(monthDate, 'yyyy-MM');
}

// Shared by the month and calendar views, both of which page forward/
// backward one month at a time via the same URL-is-the-source-of-truth
// prev/next pattern.
export function getAdjacentMonths(yyyyMm: string): { prevMonth: string; nextMonth: string } {
  const monthDate = parseYearMonth(yyyyMm);
  return {
    prevMonth: toYearMonth(addMonths(monthDate, -1)),
    nextMonth: toYearMonth(addMonths(monthDate, 1)),
  };
}
