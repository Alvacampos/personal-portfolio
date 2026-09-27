import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { isRouteErrorResponse, Link, useLoaderData, useRouteError } from 'react-router';

import Card from '~/components/Card';
import PieChart from '~/components/PieChart';
import {
  FIXTURE_CATEGORIES,
  FIXTURE_TRIP,
  FIXTURE_TRIP_PLANNED,
  FIXTURE_TRIPS,
} from '~/data/admin-fixtures';
import type { PlannedItem, TripResponse } from '~/data/admin-schema';
import type { Locale } from '~/intl';
import { adminMeta } from '~/utils/admin-meta';
import { getCategoryColor } from '~/utils/category-colors';
import { getDateFnsLocale } from '~/utils/date-fns-locale';
import { formatDateRange } from '~/utils/format-date-range';
import { formatArs, formatUsd } from '~/utils/format-money';
import { getCategoryLabel } from '~/utils/get-category-label';
import { getTripStatusLabel } from '~/utils/get-trip-status-label';
import { useCategoryIsolation } from '~/utils/use-category-isolation';
import { getClassMaker } from '~/utils/utils';

import styles from './style.css?url';

export const links = () => [{ rel: 'stylesheet', href: styles }];

const BLOCK = 'admin-trip-route';
const getClasses = getClassMaker(BLOCK);

// Phase F stands in for the real backend with fixtures
// (docs/finance-frontend.md §12) — Bariloche and Mendoza have
// "populated" data (transactions and planned items respectively), every
// other real trip in the list demonstrates the empty state (a trip that
// exists but has no synced expenses yet). Unlike month/year params, a
// tripId has no universal valid-format — it's either a real trip or it
// isn't, so an unknown one is a 404 (education.$slug's pattern), not a 400.
function getTripFixture(tripId: string): TripResponse {
  if (tripId === FIXTURE_TRIP.id) return FIXTURE_TRIP;
  if (tripId === FIXTURE_TRIP_PLANNED.id) return FIXTURE_TRIP_PLANNED;
  const summary = FIXTURE_TRIPS.find((trip) => trip.id === tripId);
  // The loader already 404s before this runs for any tripId not in
  // FIXTURE_TRIPS, so `summary` is always defined here — this is just
  // satisfying the type, not a real runtime fallback.
  return {
    ...summary!,
    total: { ars: 0, usd: 0 },
    categories: [],
    transactions: [],
    plannedItems: [],
  };
}

export async function loader({ params }: LoaderFunctionArgs) {
  const tripId = params.tripId;
  const exists = tripId && FIXTURE_TRIPS.some((trip) => trip.id === tripId);
  if (!tripId || !exists) {
    throw new Response(`Trip not found: ${tripId}`, { status: 404 });
  }
  // The master category list, for the planned-item form's optional
  // category picker — a brand-new planned trip's own `categories`
  // breakdown is empty by definition (no real spend yet), so it can't
  // source the dropdown options the way an isolate-a-category button
  // elsewhere does.
  return { trip: getTripFixture(tripId), categories: FIXTURE_CATEGORIES };
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
  const { trip, categories } = useLoaderData<typeof loader>();
  const { formatMessage, locale } = useIntl();
  const [showUsd, setShowUsd] = useState(false);
  const hasData = trip.categories.length > 0;

  const { activeCategoryId, activeCategory, toggleCategory, clearCategory } = useCategoryIsolation(
    trip.categories,
    trip.id
  );

  // Phase K (finance-frontend.md §15) — against fixtures only, same as
  // every prior phase: add/edit/delete mutate local state, nothing
  // persists past a refresh. Real persistence is Phase C's job, once
  // the backend's planned-items endpoints exist.
  const [plannedItems, setPlannedItems] = useState(trip.plannedItems);
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');

  // Same "adjust state during render" reset as useCategoryIsolation
  // (above) — the route component doesn't remount when navigating from
  // one trip to another, so without this, Bariloche's (empty) planned
  // items would silently carry over onto Mendoza's page. Adjusted
  // during render, not in an effect, for the same reason documented in
  // use-category-isolation.ts.
  const [lastSeenTripId, setLastSeenTripId] = useState(trip.id);
  if (trip.id !== lastSeenTripId) {
    setLastSeenTripId(trip.id);
    setPlannedItems(trip.plannedItems);
    setNewDescription('');
    setNewAmount('');
    setNewCategoryId('');
  }

  const showPlanning =
    plannedItems.length > 0 || trip.status === 'planned' || trip.status === 'active';

  function getPlannedCategoryName(categoryId: string): string {
    return categories.find((category) => category.id === categoryId)?.name ?? categoryId;
  }

  function handleAddPlannedItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const description = newDescription.trim();
    const ars = Number(newAmount);
    if (!description || !Number.isFinite(ars) || ars <= 0) return;

    const item: PlannedItem = {
      id: crypto.randomUUID(),
      description,
      estimatedAmount: { ars, usd: 0 },
      categoryId: newCategoryId || null,
      done: false,
    };
    setPlannedItems((items) => [...items, item]);
    setNewDescription('');
    setNewAmount('');
    setNewCategoryId('');
  }

  function togglePlannedItemDone(itemId: string) {
    setPlannedItems((items) =>
      items.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item))
    );
  }

  function deletePlannedItem(itemId: string) {
    setPlannedItems((items) => items.filter((item) => item.id !== itemId));
  }
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
        {/* Previously only shown on the list card — landing directly on a
         * trip's own page gave no cue whether it was upcoming or done,
         * indistinguishable from a completed trip with nothing logged
         * yet (more than cosmetic now that Phase K's planning UI makes
         * "this hasn't happened yet" a meaningful thing to say). */}
        <span className={getClasses('status-badge', { [trip.status]: true })}>
          {getTripStatusLabel(trip.status, formatMessage)}
        </span>
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

      {showPlanning && (
        <section className={getClasses('planning')} aria-labelledby="planning-heading">
          <h2 id="planning-heading" className={getClasses('section-title')}>
            <FormattedMessage id="ADMIN_TRIP_PLANNING_HEADING" />
          </h2>
          {plannedItems.length > 0 && (
            <ul className={getClasses('planned-list')}>
              {plannedItems.map((item) => (
                <li key={item.id} className={getClasses('planned-item', { done: item.done })}>
                  <label className={getClasses('planned-item-label')}>
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => togglePlannedItemDone(item.id)}
                    />
                    <span className={getClasses('planned-item-description')}>
                      {item.description}
                    </span>
                    {item.categoryId && (
                      <span className={getClasses('planned-item-category')}>
                        {getCategoryLabel(
                          item.categoryId,
                          getPlannedCategoryName(item.categoryId),
                          formatMessage
                        )}
                      </span>
                    )}
                  </label>
                  <span className={getClasses('planned-item-amount')}>
                    {formatArs(item.estimatedAmount.ars)}
                  </span>
                  <button
                    type="button"
                    className={getClasses('planned-item-delete')}
                    onClick={() => deletePlannedItem(item.id)}
                    aria-label={formatMessage(
                      { id: 'ADMIN_TRIP_DELETE_PLANNED_ITEM' },
                      { description: item.description }
                    )}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form className={getClasses('planned-item-form')} onSubmit={handleAddPlannedItem}>
            <label className={getClasses('planned-item-form-field')}>
              <span className={getClasses('planned-item-form-label')}>
                <FormattedMessage id="ADMIN_TRIP_PLANNED_ITEM_DESCRIPTION_LABEL" />
              </span>
              <input
                type="text"
                className={getClasses('planned-item-form-input')}
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
              />
            </label>
            <label className={getClasses('planned-item-form-field')}>
              <span className={getClasses('planned-item-form-label')}>
                <FormattedMessage id="ADMIN_TRIP_PLANNED_ITEM_AMOUNT_LABEL" />
              </span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                className={getClasses('planned-item-form-input')}
                value={newAmount}
                onChange={(event) => setNewAmount(event.target.value)}
              />
            </label>
            <label className={getClasses('planned-item-form-field')}>
              <span className={getClasses('planned-item-form-label')}>
                <FormattedMessage id="ADMIN_TRIP_PLANNED_ITEM_CATEGORY_LABEL" />
              </span>
              <select
                className={getClasses('planned-item-form-input')}
                value={newCategoryId}
                onChange={(event) => setNewCategoryId(event.target.value)}
              >
                <option value="">{formatMessage({ id: 'ADMIN_TRIP_NO_CATEGORY' })}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {getCategoryLabel(category.id, category.name, formatMessage)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className={getClasses('planned-item-form-submit')}
              disabled={!newDescription.trim() || !newAmount}
            >
              <FormattedMessage id="ADMIN_TRIP_ADD_PLANNED_ITEM" />
            </button>
          </form>
        </section>
      )}

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
