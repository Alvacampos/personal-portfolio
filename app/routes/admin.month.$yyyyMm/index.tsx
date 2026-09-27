import { addMonths, format, parse, parseISO } from 'date-fns';
import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { isRouteErrorResponse, Link, useLoaderData, useRouteError } from 'react-router';

import Card from '~/components/Card';
import PieChart from '~/components/PieChart';
import { FIXTURE_ANALYSIS_READY, FIXTURE_MONTH, FIXTURE_MONTH_EMPTY } from '~/data/admin-fixtures';
import type { MonthlyAnalysisResponse, MonthResponse } from '~/data/admin-schema';
import type { Locale } from '~/intl';
import { getCategoryColor } from '~/utils/category-colors';
import { getDateFnsLocale } from '~/utils/date-fns-locale';
import { formatArs, formatUsd } from '~/utils/format-money';
import { formatMonthLabel } from '~/utils/format-month-label';
import { useCategoryIsolation } from '~/utils/use-category-isolation';
import { getClassMaker } from '~/utils/utils';

import styles from './style.css?url';

export const links = () => [{ rel: 'stylesheet', href: styles }];

const BLOCK = 'admin-month-route';
const getClasses = getClassMaker(BLOCK);

const YEAR_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// Phase A stands in for the real backend with fixtures
// (docs/finance-frontend.md §12) — only 2026-08 has "populated" data, so
// navigating to any other month demonstrates the empty state (§4's
// "blank slate, not a broken-looking chart" requirement) for free.
// Phase C replaces both of these with a real fetch to
// GET /api/months/{yyyy-mm} and GET /api/months/{yyyy-mm}/analysis
// (docs/finance-tracker-backend-kickoff.md §6.1).
const FIXTURE_MONTH_KEY = '2026-08';

function getMonthFixture(yyyyMm: string): MonthResponse {
  if (yyyyMm === FIXTURE_MONTH_KEY) return FIXTURE_MONTH;
  return { ...FIXTURE_MONTH_EMPTY, month: yyyyMm };
}

function getAnalysisFixture(yyyyMm: string): MonthlyAnalysisResponse {
  if (yyyyMm === FIXTURE_MONTH_KEY) return FIXTURE_ANALYSIS_READY;
  // Real backend logic decides "not available" from whether the month
  // has actually elapsed (finance-frontend.md §9) — this fixture stage
  // just always shows the same reason for every non-demo month.
  return { status: 'not_available', month: yyyyMm, reason: 'month_in_progress' };
}

function parseYearMonth(yyyyMm: string): Date {
  return parse(yyyyMm, 'yyyy-MM', new Date());
}

function toYearMonth(monthDate: Date): string {
  return format(monthDate, 'yyyy-MM');
}

export async function loader({ params }: LoaderFunctionArgs) {
  const yyyyMm = params.yyyyMm;
  if (!yyyyMm || !YEAR_MONTH_RE.test(yyyyMm)) {
    throw new Response(`Invalid month: ${yyyyMm}`, { status: 400 });
  }
  const monthDate = parseYearMonth(yyyyMm);
  return {
    month: getMonthFixture(yyyyMm),
    analysis: getAnalysisFixture(yyyyMm),
    prevMonth: toYearMonth(addMonths(monthDate, -1)),
    nextMonth: toYearMonth(addMonths(monthDate, 1)),
  };
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: loaderData ? `${formatMonthLabel(loaderData.month.month)} — Admin` : 'Admin' },
];

export function ErrorBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 'Error';
  return (
    <div className={getClasses('error')}>
      <p className={getClasses('error-code')}>{status}</p>
      <h1 className={getClasses('error-title')}>
        <FormattedMessage id="ADMIN_MONTH_ERROR_TITLE" />
      </h1>
      <p className={getClasses('error-body')}>
        <FormattedMessage id="ADMIN_MONTH_ERROR_BODY" />
      </p>
      <Link to="/admin/dashboard" className={getClasses('error-action')}>
        <span aria-hidden="true">←</span> <FormattedMessage id="ADMIN_BACK_TO_HOME" />
      </Link>
    </div>
  );
}

export default function AdminMonth() {
  const { month, analysis, prevMonth, nextMonth } = useLoaderData<typeof loader>();
  const { formatMessage, locale } = useIntl();
  const [showUsd, setShowUsd] = useState(false);
  const hasData = month.categories.length > 0;

  const { activeCategoryId, activeCategory, toggleCategory, clearCategory } = useCategoryIsolation(
    month.categories,
    month.month
  );
  const displayedTotal = activeCategory ? activeCategory.total : month.total;
  const visibleTransactions = activeCategoryId
    ? month.transactions.filter((tx) => tx.categoryId === activeCategoryId)
    : month.transactions;
  const dfLocale = getDateFnsLocale(locale as Locale);

  return (
    <div className={getClasses()}>
      <header className={getClasses('header')}>
        <div className={getClasses('month-nav')}>
          <Link
            to={`/admin/month/${prevMonth}`}
            aria-label={formatMessage(
              { id: 'ADMIN_PREV_MONTH' },
              { month: formatMonthLabel(prevMonth, locale as Locale) }
            )}
            className={getClasses('month-nav-arrow')}
          >
            <span aria-hidden="true">‹</span>
          </Link>
          <h1 className={getClasses('month-title')}>
            {formatMonthLabel(month.month, locale as Locale)}
          </h1>
          <Link
            to={`/admin/month/${nextMonth}`}
            aria-label={formatMessage(
              { id: 'ADMIN_NEXT_MONTH' },
              { month: formatMonthLabel(nextMonth, locale as Locale) }
            )}
            className={getClasses('month-nav-arrow')}
          >
            <span aria-hidden="true">›</span>
          </Link>
        </div>
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
        {activeCategory ? (
          // Per-category delta isn't a figure the backend returns
          // (docs/finance-tracker-backend-kickoff.md §6.1 has no such
          // field) — showing the isolated category's own total already
          // covers "grey out sections for a cleaner analysis" (brief
          // point 5) without inventing data that doesn't exist.
          <p className={getClasses('active-category')}>
            <FormattedMessage
              id="ADMIN_SHOWING_CATEGORY_ONLY"
              values={{ category: activeCategory.categoryName }}
            />{' '}
            <button type="button" className={getClasses('clear-filter')} onClick={clearCategory}>
              <FormattedMessage id="ADMIN_SHOW_ALL" />
            </button>
          </p>
        ) : (
          month.deltaPercent !== null && (
            <p
              className={getClasses('delta', {
                up: month.deltaPercent > 0,
                down: month.deltaPercent < 0,
              })}
            >
              <span aria-hidden="true">
                {month.deltaPercent > 0 ? '▲' : month.deltaPercent < 0 ? '▼' : '–'}
              </span>{' '}
              <FormattedMessage
                id="ADMIN_MONTH_VS_LAST_MONTH"
                values={{ percent: Math.abs(month.deltaPercent) }}
              />
            </p>
          )
        )}
      </header>

      {!hasData ? (
        <p className={getClasses('empty-state')} role="status">
          <FormattedMessage id="ADMIN_MONTH_EMPTY" />
        </p>
      ) : (
        <>
          <PieChart
            data={month.categories.map((category) => ({
              id: category.categoryId,
              label: category.categoryName,
              value: category.total.ars,
            }))}
            activeId={activeCategoryId}
            onSliceClick={toggleCategory}
          />

          <section className={getClasses('categories')} aria-labelledby="categories-heading">
            <h2 id="categories-heading" className={getClasses('section-title')}>
              <FormattedMessage id="ADMIN_CATEGORIES_HEADING" />
            </h2>
            {/* The primary, always-reliable way to isolate a category —
             * the pie chart above is a visual complement to this, not the
             * only way to do the same thing (docs/finance-frontend.md §3,
             * §10). Tapping a row both isolates its pie slice and filters
             * the transaction list below; tapping the active row again
             * clears the isolation. */}
            <ul className={getClasses('category-list')}>
              {month.categories.map((category, index) => {
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
                      <span className={getClasses('category-name')}>{category.categoryName}</span>
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
                  values={{ category: activeCategory.categoryName }}
                />
              ) : (
                <FormattedMessage id="ADMIN_TRANSACTIONS_HEADING" />
              )}
            </h2>
            {/* A category only ever appears in the list if it has at
             * least one transaction, so this can't happen against
             * today's fixtures — kept as a defensive guard since a real
             * backend response is the first thing that gets to disagree
             * with that assumption. */}
            {visibleTransactions.length === 0 ? (
              <p className={getClasses('empty-state')} role="status">
                <FormattedMessage id="ADMIN_NO_TRANSACTIONS_IN_CATEGORY" />
              </p>
            ) : (
              <div className={getClasses('transaction-list')}>
                {visibleTransactions.map((tx) => (
                  <Card key={tx.id} title={tx.description}>
                    <p className={getClasses('transaction-meta')}>
                      {tx.categoryName} ·{' '}
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

      <section className={getClasses('analysis')} aria-labelledby="analysis-heading">
        <h2 id="analysis-heading" className={getClasses('section-title')}>
          <FormattedMessage id="ADMIN_ANALYSIS_HEADING" />
        </h2>
        {analysis.status === 'ready' ? (
          <>
            <p className={getClasses('analysis-text')}>{analysis.analysis}</p>
            <p className={getClasses('analysis-meta')}>
              <FormattedMessage
                id="ADMIN_ANALYSIS_GENERATED"
                values={{
                  date: format(parseISO(analysis.generatedAt), 'MMM d, yyyy', {
                    locale: dfLocale,
                  }),
                }}
              />
            </p>
          </>
        ) : (
          <p className={getClasses('analysis-empty')}>
            <FormattedMessage id="ADMIN_ANALYSIS_NOT_AVAILABLE" />
          </p>
        )}
      </section>
    </div>
  );
}
