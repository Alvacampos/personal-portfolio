import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';

import Card from '~/components/Card';
import SearchFilterBar from '~/components/SearchFilterBar';
import { FIXTURE_TRIPS } from '~/data/admin-fixtures';
import type { Locale } from '~/intl';
import { adminMeta } from '~/utils/admin-meta';
import { formatDateRange } from '~/utils/format-date-range';
import { formatArs } from '~/utils/format-money';
import { getTripDurationLabel } from '~/utils/get-trip-duration-label';
import { getTripStatusLabel } from '~/utils/get-trip-status-label';
import { getClassMaker } from '~/utils/utils';

import styles from './style.css?url';

export const links = () => [{ rel: 'stylesheet', href: styles }];

export const meta: MetaFunction = () => adminMeta('Trips — Admin');

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

  const [tripSearch, setTripSearch] = useState('');
  const normalizedSearch = tripSearch.trim().toLowerCase();
  const filteredTrips = normalizedSearch
    ? trips.filter((trip) => trip.name.toLowerCase().includes(normalizedSearch))
    : trips;

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
        <>
          <SearchFilterBar
            value={tripSearch}
            onChange={setTripSearch}
            onClear={() => setTripSearch('')}
            label={formatMessage({ id: 'ADMIN_SEARCH_TRIPS_LABEL' })}
            hasActiveFilter={tripSearch !== ''}
          />
          {filteredTrips.length === 0 ? (
            <p className={getClasses('empty-state')} role="status">
              <FormattedMessage id="ADMIN_NO_MATCHING_TRIPS" />
            </p>
          ) : (
            <div className={getClasses('list')}>
              {filteredTrips.map((trip) => (
                <Link
                  key={trip.id}
                  to={`/admin/trips/${trip.id}`}
                  className={getClasses('card-link')}
                >
                  <Card title={trip.name}>
                    <div className={getClasses('badge-row')}>
                      {/* getClasses('badge', { [trip.status]: true }) — the object-modifier
                       * form attaches the modifier to the bare block, not the element
                       * (TECH-DEBT.md T19), so the CSS uses a compound selector:
                       * .admin-trips-route__badge.admin-trips-route--completed etc. */}
                      <span className={getClasses('badge', { [trip.status]: true })}>
                        {getTripStatusLabel(trip.status, formatMessage)}
                      </span>
                      <span className={getClasses('badge', { duration: true })}>
                        {getTripDurationLabel(trip.startDate, trip.endDate, formatMessage)}
                      </span>
                    </div>
                    <p className={getClasses('date-range')}>
                      {formatDateRange(
                        trip.startDate,
                        trip.endDate,
                        locale as Locale,
                        ongoingLabel
                      )}
                    </p>
                    <p className={getClasses('total')}>{formatArs(trip.total.ars)}</p>
                    {trip.budget && (
                      <p className={getClasses('budget')}>
                        <FormattedMessage
                          id="ADMIN_TRIP_BUDGET"
                          values={{ amount: formatArs(trip.budget.ars) }}
                        />
                      </p>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
