import { FormattedMessage, useIntl } from 'react-intl';
import type { MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';

import Card from '~/components/Card';
import { FIXTURE_TRIPS } from '~/data/admin-fixtures';
import type { Locale } from '~/intl';
import { formatDateRange } from '~/utils/format-date-range';
import { formatArs } from '~/utils/format-money';
import { getClassMaker } from '~/utils/utils';

import styles from './style.css?url';

export const links = () => [{ rel: 'stylesheet', href: styles }];

export const meta: MetaFunction = () => [{ title: 'Trips — Admin' }];

const BLOCK = 'admin-trips-route';
const getClasses = getClassMaker(BLOCK);

// Phase F stands in for the real backend with a fixture
// (docs/finance-frontend.md §12). Phase C replaces this with a real
// fetch to GET /api/trips (docs/finance-tracker-backend-kickoff.md §6).
export async function loader() {
  return { trips: FIXTURE_TRIPS };
}

export default function AdminTrips() {
  const { trips } = useLoaderData<typeof loader>();
  const { formatMessage, locale } = useIntl();
  const ongoingLabel = formatMessage({ id: 'ADMIN_TRIP_ONGOING' });

  return (
    <div className={getClasses()}>
      <h1 className={getClasses('title')}>
        <FormattedMessage id="ADMIN_TRIPS_TITLE" />
      </h1>
      {trips.length === 0 ? (
        <p className={getClasses('empty-state')} role="status">
          <FormattedMessage id="ADMIN_TRIPS_EMPTY" />
        </p>
      ) : (
        <div className={getClasses('list')}>
          {trips.map((trip) => (
            <Link key={trip.id} to={`/admin/trips/${trip.id}`} className={getClasses('card-link')}>
              <Card
                title={trip.name}
                texts={[
                  formatDateRange(trip.startDate, trip.endDate, locale as Locale, ongoingLabel),
                  formatArs(trip.total.ars),
                ]}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
