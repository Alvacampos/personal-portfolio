import { redirect } from 'react-router';

// Always redirects — a stable nav link target ("go to whatever year
// matters right now") mirroring admin.dashboard's role for the month
// view (docs/finance-frontend.md §2).
export function loader() {
  // UTC, not Argentina's ART — same reasoning as admin.dashboard: this
  // only decides which year's URL to land on, not any data bucketing.
  const currentYear = new Date().getUTCFullYear();
  return redirect(`/admin/year/${currentYear}`);
}
