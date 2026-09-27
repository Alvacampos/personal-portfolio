import { format, parse, parseISO } from 'date-fns';
import { useState } from 'react';
import { DayFlag, DayPicker, SelectionState, UI } from 'react-day-picker';
import { es as dayPickerEs } from 'react-day-picker/locale';
import { FormattedMessage, useIntl } from 'react-intl';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import {
  isRouteErrorResponse,
  Link,
  useLoaderData,
  useNavigate,
  useRouteError,
} from 'react-router';

import Card from '~/components/Card';
import type { Transaction } from '~/data/admin-schema';
import type { Locale } from '~/intl';
import { adminMeta } from '~/utils/admin-meta';
import { formatDayLabel } from '~/utils/format-day-label';
import { formatArs } from '~/utils/format-money';
import { formatMonthLabel } from '~/utils/format-month-label';
import { getCalendarDayTiers } from '~/utils/get-calendar-day-tiers';
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
  return { month: getMonthFixture(yyyyMm) };
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
  const { month } = useLoaderData<typeof loader>();
  const { formatMessage, locale } = useIntl();
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const monthDate = parse(month.month, 'yyyy-MM', new Date());
  const tiers = getCalendarDayTiers(month.transactions);
  const transactionsByDay = groupByDay(month.transactions);
  const selectedTransactions = selectedDay ? (transactionsByDay.get(selectedDay) ?? []) : [];

  function handleMonthChange(newMonth: Date) {
    navigate(`/admin/calendar/${format(newMonth, 'yyyy-MM')}`);
  }

  function handleSelect(date: Date | undefined) {
    setSelectedDay(date ? format(date, 'yyyy-MM-dd') : null);
  }

  function handleDatePick(event: React.ChangeEvent<HTMLInputElement>) {
    const iso = event.target.value;
    if (!iso) return;
    setSelectedDay(iso);
    const targetMonth = iso.slice(0, 7);
    if (targetMonth !== month.month) navigate(`/admin/calendar/${targetMonth}`);
  }

  return (
    <div className={getClasses()}>
      <header className={getClasses('header')}>
        <h1 className={getClasses('title')}>
          <FormattedMessage id="ADMIN_NAV_CALENDAR" />
        </h1>
        <label className={getClasses('date-jump')}>
          <span className={getClasses('date-jump-label')}>
            <FormattedMessage id="ADMIN_CALENDAR_JUMP_TO_DATE_LABEL" />
          </span>
          <input
            type="date"
            className={getClasses('date-jump-input')}
            onChange={handleDatePick}
            value={selectedDay ?? ''}
          />
        </label>
      </header>

      {/* react-day-picker (docs/finance-tracker-ledger.md's "Phase I
       * rebuilt on react-day-picker" 2026-09-27 entry has the reasoning)
       * — renders a real <table>/<th>/<td> internally, restyled
       * entirely through `classNames` to fit this
       * app's BEM system rather than importing its own stylesheet.
       * `modifiers`/`modifiersClassNames` color each day by its relative
       * spend tier — the "airline calendar" request — on top of the
       * library's own keyboard navigation and date selection. */}
      <DayPicker
        mode="single"
        month={monthDate}
        onMonthChange={handleMonthChange}
        selected={selectedDay ? parseISO(selectedDay) : undefined}
        onSelect={handleSelect}
        weekStartsOn={1}
        locale={locale === 'es' ? dayPickerEs : undefined}
        modifiers={{ tierLow: tiers.low, tierMid: tiers.mid, tierHigh: tiers.high }}
        modifiersClassNames={{
          tierLow: getClasses('day', 'tier-low'),
          tierMid: getClasses('day', 'tier-mid'),
          tierHigh: getClasses('day', 'tier-high'),
        }}
        classNames={{
          [UI.Root]: getClasses('picker'),
          [UI.Months]: getClasses('months'),
          [UI.Month]: getClasses('month'),
          [UI.MonthCaption]: getClasses('caption'),
          [UI.CaptionLabel]: getClasses('caption-label'),
          [UI.Nav]: getClasses('nav'),
          [UI.PreviousMonthButton]: getClasses('nav-button'),
          [UI.NextMonthButton]: getClasses('nav-button'),
          [UI.Chevron]: getClasses('chevron'),
          [UI.MonthGrid]: getClasses('grid'),
          [UI.Weekdays]: getClasses('weekdays'),
          [UI.Weekday]: getClasses('weekday'),
          [UI.Weeks]: getClasses('weeks'),
          [UI.Week]: getClasses('week'),
          [UI.Day]: getClasses('day'),
          [UI.DayButton]: getClasses('day-button'),
          [DayFlag.today]: getClasses('day', 'today'),
          [SelectionState.selected]: getClasses('day', 'selected'),
        }}
      />

      {selectedDay && (
        <section className={getClasses('day-detail')} aria-labelledby="calendar-day-detail-heading">
          <h2 id="calendar-day-detail-heading" className={getClasses('section-title')}>
            <FormattedMessage
              id="ADMIN_CALENDAR_DAY_HEADING"
              values={{ date: formatDayLabel(selectedDay, locale as Locale) }}
            />
          </h2>
          {selectedTransactions.length === 0 ? (
            <p className={getClasses('empty-state')} role="status">
              <FormattedMessage id="ADMIN_CALENDAR_DAY_EMPTY" />
            </p>
          ) : (
            <div className={getClasses('transaction-list')}>
              {selectedTransactions.map((tx) => (
                <Card key={tx.id} title={tx.description}>
                  <p className={getClasses('transaction-meta')}>
                    {getCategoryLabel(tx.categoryId, tx.categoryName, formatMessage)} · {tx.paidBy}
                  </p>
                  <p className={getClasses('transaction-amount')}>{formatArs(tx.amount.ars)}</p>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
