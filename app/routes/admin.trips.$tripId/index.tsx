import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { isRouteErrorResponse, Link, useLoaderData, useRouteError } from 'react-router';

import Card from '~/components/Card';
import PieChart from '~/components/PieChart';
import { FIXTURE_TRIP, FIXTURE_TRIPS } from '~/data/admin-fixtures';
import type { TripResponse } from '~/data/admin-schema';
import type { Locale } from '~/intl';
import { adminMeta } from '~/utils/admin-meta';
import { getCategoryColor } from '~/utils/category-colors';
import { getDateFnsLocale } from '~/utils/date-fns-locale';
import { formatDateRange } from '~/utils/format-date-range';
import { formatArs, formatUsd } from '~/utils/format-money';
import { getCategoryLabel } from '~/utils/get-category-label';
import { useCategoryIsolation } from '~/utils/use-category-isolation';
import { getClassMaker } from '~/utils/utils';

import styles from './style.css?url';

export const links = () => [{ rel: 'stylesheet', href: styles }];

const BLOCK = 'admin-trip-route';
const getClasses = getClassMaker(BLOCK);

// Phase F stands in for the real backend with fixtures
// (docs/finance-frontend.md §12) — only the Bariloche trip has
// "populated" data, every other real trip in the list demonstrates the
// empty state (a trip that exists but has no synced expenses yet).
// Unlike month/year params, a tripId has no universal valid-format —
// it's either a real trip or it isn't, so an unknown one is a 404
// (education.$slug's pattern), not a 400.
function getTripFixture(tripId: string): TripResponse {
  if (tripId === FIXTURE_TRIP.id) return FIXTURE_TRIP;
  const summary = FIXTURE_TRIPS.find((trip) => trip.id === tripId);
  // The loader already 404s before this runs for any tripId not in
  // FIXTURE_TRIPS, so `summary` is always defined here — this is just
  // satisfying the type, not a real runtime fallback.
  return { ...summary!, total: { ars: 0, usd: 0 }, categories: [], transactions: [] };
}

export async function loader({ params }: LoaderFunctionArgs) {
  const tripId = params.tripId;
  const exists = tripId && FIXTURE_TRIPS.some((trip) => trip.id === tripId);
  if (!tripId || !exists) {
    throw new Response(`Trip not found: ${tripId}`, { status: 404 });
  }
  return { trip: getTripFixture(tripId) };
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) =>
  adminMeta(loaderData ? `${loaderData.trip.name} — Admin` : 'Admin');

export function ErrorBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 'Error';
  return (
    <div className={getClasses('error')}>
      <p className={getClasses('error-code')}>{status}</p>
      <h1 className={getClasses('error-title')}>
        <FormattedMessage id="ADMIN_TRIP_ERROR_TITLE" />
      </h1>
      <Link to="/admin/trips" className={getClasses('error-action')}>
        <span aria-hidden="true">←</span> <FormattedMessage id="ADMIN_BACK_TO_TRIPS" />
      </Link>
    </div>
  );
}

export default function AdminTrip() {
  const { trip } = useLoaderData<typeof loader>();
  const { formatMessage, locale } = useIntl();
  const [showUsd, setShowUsd] = useState(false);
  const hasData = trip.categories.length > 0;

  const { activeCategoryId, activeCategory, toggleCategory, clearCategory } = useCategoryIsolation(
    trip.categories,
    trip.id
  );
  const displayedTotal = activeCategory ? activeCategory.total : trip.total;
  const visibleTransactions = activeCategoryId
    ? trip.transactions.filter((tx) => tx.categoryId === activeCategoryId)
    : trip.transactions;
  const dfLocale = getDateFnsLocale(locale as Locale);
  const ongoingLabel = formatMessage({ id: 'ADMIN_TRIP_ONGOING' });

  // Always compared against the trip's own total, never `displayedTotal`
  // — isolating a category swaps that to a category-scoped figure, but
  // a budget is a whole-trip concept and shouldn't appear to change
  // just because a category filter is active.
  const { budget } = trip;
  const isOverBudget = budget != null && trip.total.ars > budget.ars;
  const budgetPercent =
    budget && budget.ars > 0 ? Math.min(100, (trip.total.ars / budget.ars) * 100) : 0;

  return (
    <div className={getClasses()}>
      <Link to="/admin/trips" className={getClasses('back-link')}>
        <span aria-hidden="true">←</span> <FormattedMessage id="ADMIN_BACK_TO_TRIPS" />
      </Link>

      <header className={getClasses('header')}>
        <h1 className={getClasses('title')}>{trip.name}</h1>
        <p className={getClasses('date-range')}>
          {formatDateRange(trip.startDate, trip.endDate, locale as Locale, ongoingLabel)}
        </p>
        <button
          type="button"
          className={getClasses('total')}
          onClick={() => setShowUsd((v) => !v)}
          aria-pressed={showUsd}
        >
          {showUsd ? formatUsd(displayedTotal.usd) : formatArs(displayedTotal.ars)}
          <span className={getClasses('total-hint')}>
            <FormattedMessage id={showUsd ? 'ADMIN_TAP_FOR_ARS' : 'ADMIN_TAP_FOR_USD'} />
          </span>
        </button>
        {budget && (
          // Read-only planned-vs-actual (frontend §6, Phase J) — the
          // real expense entries still only ever arrive via Telegram,
          // this is display only, no editing.
          <div className={getClasses('budget')}>
            <p className={getClasses('budget-label')}>
              <FormattedMessage id="ADMIN_TRIP_BUDGET" values={{ amount: formatArs(budget.ars) }} />
            </p>
            <div className={getClasses('budget-bar')} aria-hidden="true">
              <div
                className={getClasses('budget-bar-fill', { over: isOverBudget })}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
            <p className={getClasses('budget-delta', { over: isOverBudget })}>
              <FormattedMessage
                id={isOverBudget ? 'ADMIN_TRIP_BUDGET_OVER' : 'ADMIN_TRIP_BUDGET_LEFT'}
                values={{ amount: formatArs(Math.abs(budget.ars - trip.total.ars)) }}
              />
            </p>
          </div>
        )}
        {activeCategory && (
          <p className={getClasses('active-category')}>
            <FormattedMessage
              id="ADMIN_SHOWING_CATEGORY_ONLY"
              values={{
                category: getCategoryLabel(
                  activeCategory.categoryId,
                  activeCategory.categoryName,
                  formatMessage
                ),
              }}
            />{' '}
            <button type="button" className={getClasses('clear-filter')} onClick={clearCategory}>
              <FormattedMessage id="ADMIN_SHOW_ALL" />
            </button>
          </p>
        )}
      </header>

      {!hasData ? (
        // No "yet" — unlike a month/year, which is always either the
        // current period or a past one, a trip can be `completed` with
        // genuinely nothing recorded, and "yet" would wrongly imply more
        // data is still coming.
        <p className={getClasses('empty-state')} role="status">
          <FormattedMessage id="ADMIN_TRIP_EMPTY" />
        </p>
      ) : (
        <>
          <PieChart
            data={trip.categories.map((category) => ({
              id: category.categoryId,
              label: getCategoryLabel(category.categoryId, category.categoryName, formatMessage),
              value: category.total.ars,
            }))}
            activeId={activeCategoryId}
            onSliceClick={toggleCategory}
          />

          <section className={getClasses('categories')} aria-labelledby="categories-heading">
            <h2 id="categories-heading" className={getClasses('section-title')}>
              <FormattedMessage id="ADMIN_CATEGORIES_HEADING" />
            </h2>
            <ul className={getClasses('category-list')}>
              {trip.categories.map((category, index) => {
                const isActive = category.categoryId === activeCategoryId;
                return (
                  <li key={category.categoryId}>
                    <button
                      type="button"
                      className={getClasses('category-row', { active: isActive })}
                      onClick={() => toggleCategory(category.categoryId)}
                      aria-pressed={isActive}
                    >
                      <span
                        className={getClasses('category-swatch')}
                        style={{ backgroundColor: getCategoryColor(index) }}
                        aria-hidden="true"
                      />
                      <span className={getClasses('category-name')}>
                        {getCategoryLabel(
                          category.categoryId,
                          category.categoryName,
                          formatMessage
                        )}
                      </span>
                      <span className={getClasses('category-total')}>
                        {formatArs(category.total.ars)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={getClasses('transactions')} aria-labelledby="transactions-heading">
            <h2 id="transactions-heading" className={getClasses('section-title')}>
              {activeCategory ? (
                <FormattedMessage
                  id="ADMIN_TRANSACTIONS_HEADING_FILTERED"
                  values={{
                    category: getCategoryLabel(
                      activeCategory.categoryId,
                      activeCategory.categoryName,
                      formatMessage
                    ),
                  }}
                />
              ) : (
                <FormattedMessage id="ADMIN_TRANSACTIONS_HEADING" />
              )}
            </h2>
            {visibleTransactions.length === 0 ? (
              <p className={getClasses('empty-state')} role="status">
                <FormattedMessage id="ADMIN_NO_TRANSACTIONS_IN_CATEGORY" />
              </p>
            ) : (
              <div className={getClasses('transaction-list')}>
                {visibleTransactions.map((tx) => (
                  <Card key={tx.id} title={tx.description}>
                    <p className={getClasses('transaction-meta')}>
                      {getCategoryLabel(tx.categoryId, tx.categoryName, formatMessage)} ·{' '}
                      {format(parseISO(tx.occurredOn), 'MMM d', { locale: dfLocale })} · {tx.paidBy}
                    </p>
                    <p className={getClasses('transaction-amount')}>{formatArs(tx.amount.ars)}</p>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
