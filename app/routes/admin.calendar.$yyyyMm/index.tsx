import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { isRouteErrorResponse, Link, useLoaderData, useRouteError } from 'react-router';

import Card from '~/components/Card';
import type { Transaction } from '~/data/admin-schema';
import type { Locale } from '~/intl';
import { adminMeta } from '~/utils/admin-meta';
import { buildCalendarWeeks, getWeekdayLabels } from '~/utils/calendar-grid';
import { getDateFnsLocale } from '~/utils/date-fns-locale';
import { formatDayLabel } from '~/utils/format-day-label';
import { formatArs } from '~/utils/format-money';
import { formatMonthLabel } from '~/utils/format-month-label';
import { getAdjacentMonths } from '~/utils/get-adjacent-months';
import { getCategoryLabel } from '~/utils/get-category-label';
import { getMonthFixture } from '~/utils/get-month-fixture';
import { getClassMaker } from '~/utils/utils';

import styles from './style.css?url';

export const links = () => [{ rel: 'stylesheet', href: styles }];

const BLOCK = 'admin-calendar-route';
const getClasses = getClassMaker(BLOCK);

const YEAR_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function loader({ params }: LoaderFunctionArgs) {
  const yyyyMm = params.yyyyMm;
  if (!yyyyMm || !YEAR_MONTH_RE.test(yyyyMm)) {
    throw new Response(`Invalid month: ${yyyyMm}`, { status: 400 });
  }
  return {
    month: getMonthFixture(yyyyMm),
    ...getAdjacentMonths(yyyyMm),
  };
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) =>
  adminMeta(loaderData ? `${formatMonthLabel(loaderData.month.month)} — Admin` : 'Admin');

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
        <FormattedMessage id="ADMIN_CALENDAR_ERROR_BODY" />
      </p>
      <Link to="/admin/dashboard" className={getClasses('error-action')}>
        <span aria-hidden="true">←</span> <FormattedMessage id="ADMIN_BACK_TO_HOME" />
      </Link>
    </div>
  );
}

// Groups a month's transactions by day — the calendar's whole
// organizing axis, unlike month/year/trip's category-first views
// (docs/finance-frontend.md §14: "no isolate-a-category interaction
// here — a calendar's organizing axis is the day, not the category").
function groupByDay(transactions: Transaction[]): Map<string, Transaction[]> {
  const byDay = new Map<string, Transaction[]>();
  transactions.forEach((tx) => {
    const existing = byDay.get(tx.occurredOn);
    if (existing) existing.push(tx);
    else byDay.set(tx.occurredOn, [tx]);
  });
  return byDay;
}

export default function AdminCalendar() {
  const { month, prevMonth, nextMonth } = useLoaderData<typeof loader>();
  const { formatMessage, locale } = useIntl();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const dfLocale = getDateFnsLocale(locale as Locale);
  const weeks = buildCalendarWeeks(month.month);
  const weekdayLabels = getWeekdayLabels(dfLocale);
  const transactionsByDay = groupByDay(month.transactions);
  const expandedTransactions = expandedDay ? (transactionsByDay.get(expandedDay) ?? []) : [];

  function toggleDay(iso: string) {
    setExpandedDay((current) => (current === iso ? null : iso));
  }

  return (
    <div className={getClasses()}>
      <header className={getClasses('header')}>
        <div className={getClasses('month-nav')}>
          <Link
            to={`/admin/calendar/${prevMonth}`}
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
            to={`/admin/calendar/${nextMonth}`}
            aria-label={formatMessage(
              { id: 'ADMIN_NEXT_MONTH' },
              { month: formatMonthLabel(nextMonth, locale as Locale) }
            )}
            className={getClasses('month-nav-arrow')}
          >
            <span aria-hidden="true">›</span>
          </Link>
        </div>
      </header>

      {/* A real, navigable data table — the grid itself is the content
       * here, not a decorative chart with a hidden list bolted on the
       * side (docs/finance-frontend.md §14). The caption stays visually
       * hidden since the <h1> above already shows the same month/year
       * to sighted users; a screen reader landing inside table
       * navigation still gets it. */}
      <table className={getClasses('grid')}>
        <caption className={getClasses('grid-caption')}>
          {formatMonthLabel(month.month, locale as Locale)}
        </caption>
        <thead>
          <tr>
            {weekdayLabels.map((label) => (
              <th key={label} scope="col" className={getClasses('weekday')}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((day, dayIndex) => {
                if (!day) {
                  return (
                    <td
                      key={dayIndex}
                      className={getClasses('day-cell', { blank: true })}
                      aria-hidden="true"
                    />
                  );
                }
                const dayTransactions = transactionsByDay.get(day.iso) ?? [];
                const hasData = dayTransactions.length > 0;
                const isExpanded = expandedDay === day.iso;
                return (
                  <td key={day.iso} className={getClasses('day-cell')}>
                    {hasData ? (
                      <button
                        type="button"
                        className={getClasses('day-button', { active: isExpanded })}
                        onClick={() => toggleDay(day.iso)}
                        aria-expanded={isExpanded}
                        aria-controls="calendar-day-detail"
                        aria-label={formatDayLabel(day.iso, locale as Locale)}
                      >
                        <span aria-hidden="true">{day.dayOfMonth}</span>
                        <span className={getClasses('day-marker')} aria-hidden="true" />
                      </button>
                    ) : (
                      <span className={getClasses('day-number')}>{day.dayOfMonth}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {expandedDay && (
        <section
          id="calendar-day-detail"
          className={getClasses('day-detail')}
          aria-labelledby="calendar-day-detail-heading"
        >
          <h2 id="calendar-day-detail-heading" className={getClasses('section-title')}>
            <FormattedMessage
              id="ADMIN_CALENDAR_DAY_HEADING"
              values={{ date: formatDayLabel(expandedDay, locale as Locale) }}
            />
          </h2>
          <div className={getClasses('transaction-list')}>
            {expandedTransactions.map((tx) => (
              <Card key={tx.id} title={tx.description}>
                <p className={getClasses('transaction-meta')}>
                  {getCategoryLabel(tx.categoryId, tx.categoryName, formatMessage)} · {tx.paidBy}
                </p>
                <p className={getClasses('transaction-amount')}>{formatArs(tx.amount.ars)}</p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
