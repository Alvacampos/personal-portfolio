import { format, parseISO } from 'date-fns';

import type { Locale } from '~/intl';

import { capitalizeFirst } from './capitalize-first';
import { getDateFnsLocale } from './date-fns-locale';

// The calendar view's expanded-day heading — a single YYYY-MM-DD date
// as a standalone label, same capitalization reasoning as formatDateRange.
export function formatDayLabel(iso: string, locale: Locale): string {
  const dfLocale = getDateFnsLocale(locale);
  return capitalizeFirst(format(parseISO(iso), 'MMM d, yyyy', { locale: dfLocale }));
}
