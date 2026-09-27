import type { IntlShape } from 'react-intl';

import type { TripSummary } from '~/data/admin-schema';

// 'active' reuses ADMIN_TRIP_ONGOING — the same "still happening"
// concept formatDateRange's open-ended suffix already uses — rather
// than a separate status-specific key that would just say the same
// thing twice.
const STATUS_LABEL_IDS: Record<TripSummary['status'], string> = {
  planned: 'ADMIN_TRIP_STATUS_PLANNED',
  active: 'ADMIN_TRIP_ONGOING',
  completed: 'ADMIN_TRIP_STATUS_COMPLETED',
};

export function getTripStatusLabel(
  status: TripSummary['status'],
  formatMessage: IntlShape['formatMessage']
): string {
  return formatMessage({ id: STATUS_LABEL_IDS[status] });
}
