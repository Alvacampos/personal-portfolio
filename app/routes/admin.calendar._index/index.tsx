import type { LoaderFunctionArgs } from 'react-router';
import { redirect } from 'react-router';

// Always redirects — a stable nav link target ("go to whatever month's
// calendar matters right now"), same role as admin.dashboard and
// admin.year._index play for their own views (docs/finance-frontend.md §2).
export function loader({ request }: LoaderFunctionArgs) {
  // UTC, not Argentina's ART — same reasoning as admin.dashboard: this
  // only decides which month's URL to land on, not any data bucketing.
  const now = new Date();
  const yyyyMm = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  // Forward the query string (notably `?lang=`) — see admin.dashboard's
  // loader for why dropping it is a real bug, not a cosmetic one.
  const search = new URL(request.url).search;
  return redirect(`/admin/calendar/${yyyyMm}${search}`);
}
