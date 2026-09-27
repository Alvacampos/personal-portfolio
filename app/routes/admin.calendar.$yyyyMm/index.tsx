import { format, parse, parseISO } from 'date-fns';
import type { Locale as DateFnsLocale } from 'date-fns/locale';
import { useState } from 'react';
import type { Modifiers } from 'react-day-picker';
import { DayFlag, DayPicker, SelectionState, UI } from 'react-day-picker';
import { es as dayPickerEs } from 'react-day-picker/locale';
import type { IntlShape } from 'react-intl';
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
import { getDateFnsLocale } from '~/utils/date-fns-locale';
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

const TIER_LABEL_IDS = {
  tierHigh: 'ADMIN_CALENDAR_TIER_HIGH',
  tierMid: 'ADMIN_CALENDAR_TIER_MID',
  tierLow: 'ADMIN_CALENDAR_TIER_LOW',
} as const;

// The tier color alone was the only signal a day was expensive — no
// legend explained the shades, and a screen reader got nothing from the
// feature at all. Folding the tier into the day button's own accessible
// name (in addition to the visible legend below the grid) fixes both.
// Mirrors react-day-picker's own default `labelDayButton` (date +
// today/selected suffixes) rather than reusing it — the library exports
// it for reference but a custom `labels.labelDayButton` fully replaces
// the default, so extending it means reimplementing it — then appends
// the spend tier, the one new piece of information.
function getDayButtonLabel(
  date: Date,
  modifiers: Modifiers,
  dfLocale: DateFnsLocale | undefined,
  formatMessage: IntlShape['formatMessage']
): string {
  let label = format(date, 'PPPP', { locale: dfLocale });
  if (modifiers.today) label = `Today, ${label}`;
  if (modifiers.selected) label = `${label}, selected`;
  const tierKey = (['tierHigh', 'tierMid', 'tierLow'] as const).find((key) => modifiers[key]);
  if (tierKey) label += ` — ${formatMessage({ id: TIER_LABEL_IDS[tierKey] })}`;
  return label;
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
  const dfLocale = getDateFnsLocale(locale as Locale);
  const hasTieredDays = tiers.low.length + tiers.mid.length + tiers.high.length > 0;

  function handleMonthChange(newMonth: Date) {
    // Prev/next (or keyboard paging) browse to a different month — clear
    // the selection rather than leaving the panel showing a stale date
    // from the month just left, re-looked-up against the new month's
    // transactions (wrong day, and often a false "nothing logged" for a
    // day that actually has data in its own month). The date-jump input
    // is a separate path (handleDatePick, below) and intentionally keeps
    // its own target day selected across the jump.
    setSelectedDay(null);
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
        labels={{
          labelDayButton: (date, modifiers) =>
            getDayButtonLabel(date, modifiers, dfLocale, formatMessage),
        }}
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

      {hasTieredDays && (
        <ul className={getClasses('legend')}>
          <li className={getClasses('legend-item')}>
            <span className={getClasses('legend-swatch', 'low')} aria-hidden="true" />
            <FormattedMessage id="ADMIN_CALENDAR_TIER_LOW" />
          </li>
          <li className={getClasses('legend-item')}>
            <span className={getClasses('legend-swatch', 'mid')} aria-hidden="true" />
            <FormattedMessage id="ADMIN_CALENDAR_TIER_MID" />
          </li>
          <li className={getClasses('legend-item')}>
            <span className={getClasses('legend-swatch', 'high')} aria-hidden="true" />
            <FormattedMessage id="ADMIN_CALENDAR_TIER_HIGH" />
          </li>
        </ul>
      )}

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
