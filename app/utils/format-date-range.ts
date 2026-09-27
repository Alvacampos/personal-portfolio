import { format, parseISO } from 'date-fns';

import type { Locale } from '~/intl';

import { getDateFnsLocale } from './date-fns-locale';

// Shared by the trips list and trip detail routes — the only two places
// that need to render a YYYY-MM-DD date range as a human string.
// `ongoingLabel` is pre-resolved by the caller via useIntl().formatMessage
// rather than this module calling react-intl itself, matching how
// app/utils/utils.tsx's own formatDate takes a Locale param instead of
// reading intl context — keeps this a plain, component-free utility.
export function formatDateRange(
  startDate: string,
  endDate: string | null,
  locale: Locale,
  ongoingLabel: string
): string {
  const dfLocale = getDateFnsLocale(locale);
  const start = format(parseISO(startDate), 'MMM d, yyyy', { locale: dfLocale });
  if (!endDate) return `${start} — ${ongoingLabel}`;
  return `${start} – ${format(parseISO(endDate), 'MMM d, yyyy', { locale: dfLocale })}`;
}
