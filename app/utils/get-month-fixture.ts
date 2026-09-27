import { FIXTURE_MONTH, FIXTURE_MONTH_EMPTY } from '~/data/admin-fixtures';
import type { MonthResponse } from '~/data/admin-schema';

// Phase A stands in for the real backend with fixtures
// (docs/finance-frontend.md §12) — only 2026-08 has "populated" data, so
// navigating to any other month demonstrates the empty state (§4's
// "blank slate, not a broken-looking chart" requirement) for free.
// Phase C replaces this with a real fetch to GET /api/months/{yyyy-mm}.
// Shared by the month view and the calendar view (§14), which both read
// the same month's transactions.
const FIXTURE_MONTH_KEY = '2026-08';

export function getMonthFixture(yyyyMm: string): MonthResponse {
  if (yyyyMm === FIXTURE_MONTH_KEY) return FIXTURE_MONTH;
  return { ...FIXTURE_MONTH_EMPTY, month: yyyyMm };
}
