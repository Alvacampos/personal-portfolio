import type { IntlShape } from 'react-intl';
import { describe, expect, it } from 'vitest';

import { getTripDurationLabel } from './get-trip-duration-label';

const formatMessage = (({ id }: { id: string }, values?: { count?: number }) =>
  values ? `${values.count} days` : `translated:${id}`) as IntlShape['formatMessage'];

describe('getTripDurationLabel', () => {
  it('counts inclusively — a week-long trip is 8 days, not 7', () => {
    // Matches the 7-night hotel stay in admin-fixtures.ts's Bariloche trip.
    expect(getTripDurationLabel('2026-01-10', '2026-01-17', formatMessage)).toBe('8 days');
  });

  it('uses the singular-day key for a same-day trip', () => {
    expect(getTripDurationLabel('2026-01-10', '2026-01-10', formatMessage)).toBe(
      'translated:ADMIN_TRIP_DURATION_ONE_DAY'
    );
  });

  it('falls back to the ongoing label when there is no end date yet', () => {
    expect(getTripDurationLabel('2026-01-10', null, formatMessage)).toBe(
      'translated:ADMIN_TRIP_ONGOING'
    );
  });
});
