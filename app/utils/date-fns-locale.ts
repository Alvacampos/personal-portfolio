import type { Locale as DateFnsLocale } from 'date-fns/locale';
import { es as dfEs } from 'date-fns/locale';

import type { Locale } from '~/intl';

// Shared by every /admin view that formats a month/day name with
// date-fns — mirrors app/utils/utils.tsx's own `dfLocale` pattern used
// for the public site's formatDate, so month/weekday names render in
// Spanish rather than staying hardcoded English once locale is 'es'.
export function getDateFnsLocale(locale: Locale): DateFnsLocale | undefined {
  return locale === 'es' ? dfEs : undefined;
}
