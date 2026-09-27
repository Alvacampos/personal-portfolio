import { format, parseISO } from 'date-fns';

// Shared by the trips list and trip detail routes — the only two places
// that need to render a YYYY-MM-DD date range as a human string. Not
// locale-aware (react-intl is deliberately skipped for /admin, same
// reasoning as everywhere else there — see docs/finance-frontend.md §1).
export function formatDateRange(startDate: string, endDate: string | null): string {
  const start = format(parseISO(startDate), 'MMM d, yyyy');
  if (!endDate) return `${start} — ongoing`;
  return `${start} – ${format(parseISO(endDate), 'MMM d, yyyy')}`;
}
