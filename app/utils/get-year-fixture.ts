import { FIXTURE_YEAR, FIXTURE_YTD } from '~/data/admin-fixtures';
import type { YearResponse } from '~/data/admin-schema';

// Phase D stands in for the real backend with fixtures
// (docs/finance-frontend.md §12) — 2025 demonstrates a completed
// calendar year, 2026 (the real "current" year) demonstrates YTD
// (fewer months than 12, same shape — finance-tracker-backend-kickoff.md
// §6 says `/api/ytd` is "same shape as /years, bounded at today"), and
// every other year demonstrates the empty state. Phase C replaces this
// with a real fetch to GET /api/years/{yyyy} or GET /api/ytd. Shared by
// the yearly view and Home (§13), which both read the current year's
// `monthlyTotals` off the same fixture.
export function getYearFixture(year: number): YearResponse {
  if (year === 2025) return FIXTURE_YEAR;
  if (year === 2026) return FIXTURE_YTD;
  return { year, total: { ars: 0, usd: 0 }, monthlyTotals: [], categories: [] };
}
