import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { IntlShape } from 'react-intl';

// Inclusive day count — a trip from day 1 to day 7 is "7 days", not 6.
// Falls back to the same open-ended label formatDateRange uses when
// there's no end date yet (a planned or active trip might not have one).
export function getTripDurationLabel(
  startDate: string,
  endDate: string | null,
  formatMessage: IntlShape['formatMessage']
): string {
  if (!endDate) return formatMessage({ id: 'ADMIN_TRIP_ONGOING' });
  const days = differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1;
  return days === 1
    ? formatMessage({ id: 'ADMIN_TRIP_DURATION_ONE_DAY' })
    : formatMessage({ id: 'ADMIN_TRIP_DURATION_DAYS' }, { count: days });
}
