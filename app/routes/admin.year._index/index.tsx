import type { LoaderFunctionArgs } from 'react-router';
import { redirect } from 'react-router';

// Always redirects — a stable nav link target ("go to whatever year
// matters right now") mirroring admin.dashboard's role for the month
// view (docs/finance-frontend.md §2).
export function loader({ request }: LoaderFunctionArgs) {
  // UTC, not Argentina's ART — same reasoning as admin.dashboard: this
  // only decides which year's URL to land on, not any data bucketing.
  const currentYear = new Date().getUTCFullYear();
  // Forward the query string (notably `?lang=`) — see admin.dashboard's
  // loader for why dropping it is a real bug, not a cosmetic one.
  const search = new URL(request.url).search;
  return redirect(`/admin/year/${currentYear}${search}`);
}
