import { format, parse } from 'date-fns';
import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { isRouteErrorResponse, Link, useLoaderData, useRouteError } from 'react-router';

import BarChart from '~/components/BarChart';
import PieChart from '~/components/PieChart';
import { FIXTURE_YEAR, FIXTURE_YTD } from '~/data/admin-fixtures';
import type { YearResponse } from '~/data/admin-schema';
import type { Locale } from '~/intl';
import { getCategoryColor } from '~/utils/category-colors';
import { getDateFnsLocale } from '~/utils/date-fns-locale';
import { formatArs, formatUsd } from '~/utils/format-money';
import { useCategoryIsolation } from '~/utils/use-category-isolation';
import { getClassMaker } from '~/utils/utils';

import styles from './style.css?url';

export const links = () => [{ rel: 'stylesheet', href: styles }];

const BLOCK = 'admin-year-route';
const getClasses = getClassMaker(BLOCK);

const YEAR_RE = /^\d{4}$/;

// Phase D stands in for the real backend with fixtures
// (docs/finance-frontend.md §12) — 2025 demonstrates a completed
// calendar year, 2026 (the real "current" year) demonstrates YTD
// (fewer months than 12, same shape — finance-tracker-backend-kickoff.md
// §6 says `/api/ytd` is "same shape as /years, bounded at today"), and
// every other year demonstrates the empty state. Phase C replaces this
// with a real fetch to GET /api/years/{yyyy} or GET /api/ytd.
function formatMonthLabel(yyyyMm: string, locale?: Locale): string {
  return format(parse(yyyyMm, 'yyyy-MM', new Date()), 'MMMM yyyy', {
    locale: locale ? getDateFnsLocale(locale) : undefined,
  });
}

function getYearFixture(year: number): YearResponse {
  if (year === 2025) return FIXTURE_YEAR;
  if (year === 2026) return FIXTURE_YTD;
  return { year, total: { ars: 0, usd: 0 }, monthlyTotals: [], categories: [] };
}

export async function loader({ params }: LoaderFunctionArgs) {
  const yearParam = params.year;
  if (!yearParam || !YEAR_RE.test(yearParam)) {
    throw new Response(`Invalid year: ${yearParam}`, { status: 400 });
  }
  const year = Number(yearParam);
  return {
    year: getYearFixture(year),
    prevYear: year - 1,
    nextYear: year + 1,
  };
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: loaderData ? `${loaderData.year.year} — Admin` : 'Admin' },
];

export function ErrorBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 'Error';
  return (
    <div className={getClasses('error')}>
      <p className={getClasses('error-code')}>{status}</p>
      <h1 className={getClasses('error-title')}>
        <FormattedMessage id="ADMIN_YEAR_ERROR_TITLE" />
      </h1>
      <p className={getClasses('error-body')}>
        <FormattedMessage id="ADMIN_YEAR_ERROR_BODY" />
      </p>
      <Link to="/admin/year" className={getClasses('error-action')}>
        <span aria-hidden="true">←</span> <FormattedMessage id="ADMIN_BACK_TO_CURRENT_YEAR" />
      </Link>
    </div>
  );
}

export default function AdminYear() {
  const { year, prevYear, nextYear } = useLoaderData<typeof loader>();
  const { formatMessage, locale } = useIntl();
  const [showUsd, setShowUsd] = useState(false);
  const hasData = year.categories.length > 0;

  const { activeCategoryId, activeCategory, toggleCategory, clearCategory } = useCategoryIsolation(
    year.categories,
    String(year.year)
  );
  const displayedTotal = activeCategory ? activeCategory.total : year.total;

  return (
    <div className={getClasses()}>
      <header className={getClasses('header')}>
        <div className={getClasses('year-nav')}>
          <Link
            to={`/admin/year/${prevYear}`}
            aria-label={formatMessage({ id: 'ADMIN_PREV_YEAR' }, { year: prevYear })}
            className={getClasses('year-nav-arrow')}
          >
            <span aria-hidden="true">‹</span>
          </Link>
          <h1 className={getClasses('year-title')}>{year.year}</h1>
          <Link
            to={`/admin/year/${nextYear}`}
            aria-label={formatMessage({ id: 'ADMIN_NEXT_YEAR' }, { year: nextYear })}
            className={getClasses('year-nav-arrow')}
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
        {activeCategory && (
          <p className={getClasses('active-category')}>
            <FormattedMessage
              id="ADMIN_SHOWING_CATEGORY_ONLY"
              values={{ category: activeCategory.categoryName }}
            />{' '}
            <button type="button" className={getClasses('clear-filter')} onClick={clearCategory}>
              <FormattedMessage id="ADMIN_SHOW_ALL" />
            </button>
          </p>
        )}
      </header>

      {!hasData ? (
        <p className={getClasses('empty-state')} role="status">
          <FormattedMessage id="ADMIN_YEAR_EMPTY" />
        </p>
      ) : (
        <>
          <section className={getClasses('monthly')} aria-labelledby="monthly-heading">
            <h2 id="monthly-heading" className={getClasses('section-title')}>
              <FormattedMessage id="ADMIN_MONTHLY_HEADING" />
            </h2>
            <BarChart
              data={year.monthlyTotals.map((entry) => ({
                month: entry.month,
                value: entry.total.ars,
              }))}
              locale={locale as Locale}
            />
            {/* Accessible equivalent of the chart above — visually hidden,
             * real content for screen readers. Unlike the pie chart, the
             * bar chart has no on-screen list acting as its accessible
             * source of truth, so it needs one of its own rather than
             * leaving screen reader users with nothing for this section. */}
            <ul className={getClasses('monthly-table')}>
              {year.monthlyTotals.map((entry) => (
                <li key={entry.month}>
                  {formatMonthLabel(entry.month, locale as Locale)}: {formatArs(entry.total.ars)}
                </li>
              ))}
            </ul>
          </section>

          <PieChart
            data={year.categories.map((category) => ({
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
            <ul className={getClasses('category-list')}>
              {year.categories.map((category, index) => {
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
        </>
      )}
    </div>
  );
}
