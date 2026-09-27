import { format, parse } from 'date-fns';

import type { Locale } from '~/intl';

import { getDateFnsLocale } from './date-fns-locale';

// Locale is a plain param, not read from context — this runs both from
// components (real admin locale) and from route `meta` functions (no
// intl context available there, same as the public site never
// localizing <title>). Shared by the month, year, and Home views.
export function formatMonthLabel(yyyyMm: string, locale?: Locale): string {
  return format(parse(yyyyMm, 'yyyy-MM', new Date()), 'MMMM yyyy', {
    locale: locale ? getDateFnsLocale(locale) : undefined,
  });
}
