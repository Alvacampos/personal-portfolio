import type { LoaderFunctionArgs } from 'react-router';
import { redirect } from 'react-router';

// Always redirects — there's no dashboard view of its own, just a
// stable link target ("go to whatever month matters right now") per
// docs/finance-frontend.md §2.
export function loader({ request }: LoaderFunctionArgs) {
  const now = new Date();
  // UTC, not Argentina's ART (UTC-3) — this only decides which month's
  // URL to land on, not any actual data bucketing (that's the backend's
  // job, in ART, per finance-tracker-backend-kickoff.md Phase 2). Worst
  // case near a month boundary: it lands one month off, trivially fixed
  // with the month view's own prev/next controls.
  const yyyyMm = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  // Forward the query string (notably `?lang=`) — dropping it would
  // silently revert an explicit language choice back to the cookie/
  // Accept-Language default for anyone landing here directly (a
  // bookmark, a shared link) rather than clicking through from a page
  // that already resolved the locale.
  const search = new URL(request.url).search;
  return redirect(`/admin/month/${yyyyMm}${search}`);
}
