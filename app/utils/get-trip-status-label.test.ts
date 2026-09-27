import type { IntlShape } from 'react-intl';
import { describe, expect, it } from 'vitest';

import { getTripStatusLabel } from './get-trip-status-label';

const formatMessage = (({ id }: { id: string }) =>
  `translated:${id}`) as IntlShape['formatMessage'];

describe('getTripStatusLabel', () => {
  it('translates "completed"', () => {
    expect(getTripStatusLabel('completed', formatMessage)).toBe(
      'translated:ADMIN_TRIP_STATUS_COMPLETED'
    );
  });

  it('translates "planned"', () => {
    expect(getTripStatusLabel('planned', formatMessage)).toBe(
      'translated:ADMIN_TRIP_STATUS_PLANNED'
    );
  });

  it('translates "active" via the shared ongoing key, not a status-specific one', () => {
    expect(getTripStatusLabel('active', formatMessage)).toBe('translated:ADMIN_TRIP_ONGOING');
  });
});
