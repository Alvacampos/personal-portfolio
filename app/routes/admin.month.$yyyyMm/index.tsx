import { addMonths, format, parse, parseISO } from 'date-fns';
import { useState } from 'react';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { isRouteErrorResponse, Link, useLoaderData, useRouteError } from 'react-router';

import Card from '~/components/Card';
import { FIXTURE_ANALYSIS_READY, FIXTURE_MONTH, FIXTURE_MONTH_EMPTY } from '~/data/admin-fixtures';
import type { MonthlyAnalysisResponse, MonthResponse } from '~/data/admin-schema';
import { formatArs, formatUsd } from '~/utils/format-money';
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

function formatMonthLabel(yyyyMm: string): string {
  return format(parseYearMonth(yyyyMm), 'MMMM yyyy');
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
      <h1 className={getClasses('error-title')}>That month doesn&apos;t look right</h1>
      <p className={getClasses('error-body')}>Expected a URL like /admin/month/2026-08.</p>
      <Link to="/admin/dashboard" className={getClasses('error-action')}>
        <span aria-hidden="true">←</span> Back to current month
      </Link>
    </div>
  );
}

export default function AdminMonth() {
  const { month, analysis, prevMonth, nextMonth } = useLoaderData<typeof loader>();
  const [showUsd, setShowUsd] = useState(false);
  const hasData = month.categories.length > 0;

  return (
    <div className={getClasses()}>
      <header className={getClasses('header')}>
        <div className={getClasses('month-nav')}>
          <Link
            to={`/admin/month/${prevMonth}`}
            aria-label={`Previous month, ${formatMonthLabel(prevMonth)}`}
            className={getClasses('month-nav-arrow')}
          >
            <span aria-hidden="true">‹</span>
          </Link>
          <h1 className={getClasses('month-title')}>{formatMonthLabel(month.month)}</h1>
          <Link
            to={`/admin/month/${nextMonth}`}
            aria-label={`Next month, ${formatMonthLabel(nextMonth)}`}
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
          {showUsd ? formatUsd(month.total.usd) : formatArs(month.total.ars)}
          <span className={getClasses('total-hint')}>
            {showUsd ? 'tap for ARS' : 'tap for USD'}
          </span>
        </button>
        {month.deltaPercent !== null && (
          <p
            className={getClasses('delta', {
              up: month.deltaPercent > 0,
              down: month.deltaPercent < 0,
            })}
          >
            <span aria-hidden="true">
              {month.deltaPercent > 0 ? '▲' : month.deltaPercent < 0 ? '▼' : '–'}
            </span>{' '}
            {Math.abs(month.deltaPercent)}% vs last month
          </p>
        )}
      </header>

      {!hasData ? (
        <p className={getClasses('empty-state')} role="status">
          Nothing logged for this month yet.
        </p>
      ) : (
        <>
          <section className={getClasses('categories')} aria-labelledby="categories-heading">
            <h2 id="categories-heading" className={getClasses('section-title')}>
              Categories
            </h2>
            {/* Static rows for Phase A — Phase B (docs/finance-frontend.md
             * §7/§8) upgrades these to buttons that isolate the pie chart
             * slice and filter the transaction list below. */}
            <ul className={getClasses('category-list')}>
              {month.categories.map((category) => (
                <li key={category.categoryId} className={getClasses('category-row')}>
                  <span className={getClasses('category-name')}>{category.categoryName}</span>
                  <span className={getClasses('category-total')}>
                    {formatArs(category.total.ars)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className={getClasses('transactions')} aria-labelledby="transactions-heading">
            <h2 id="transactions-heading" className={getClasses('section-title')}>
              Transactions
            </h2>
            <div className={getClasses('transaction-list')}>
              {month.transactions.map((tx) => (
                <Card key={tx.id} title={tx.description}>
                  <p className={getClasses('transaction-meta')}>
                    {tx.categoryName} · {format(parseISO(tx.occurredOn), 'MMM d')} · {tx.paidBy}
                  </p>
                  <p className={getClasses('transaction-amount')}>{formatArs(tx.amount.ars)}</p>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}

      <section className={getClasses('analysis')} aria-labelledby="analysis-heading">
        <h2 id="analysis-heading" className={getClasses('section-title')}>
          Claude&apos;s analysis
        </h2>
        {analysis.status === 'ready' ? (
          <>
            <p className={getClasses('analysis-text')}>{analysis.analysis}</p>
            <p className={getClasses('analysis-meta')}>
              Generated {format(parseISO(analysis.generatedAt), 'MMM d, yyyy')}
            </p>
          </>
        ) : (
          <p className={getClasses('analysis-empty')}>Available once this month ends.</p>
        )}
      </section>
    </div>
  );
}
