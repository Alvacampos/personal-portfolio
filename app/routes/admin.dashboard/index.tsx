import { FormattedMessage, useIntl } from 'react-intl';
import type { MetaFunction } from 'react-router';
import { Link, useLoaderData } from 'react-router';

import Card from '~/components/Card';
import type { Locale } from '~/intl';
import { formatArs } from '~/utils/format-money';
import { formatMonthLabel } from '~/utils/format-month-label';
import { getYearFixture } from '~/utils/get-year-fixture';
import { getClassMaker } from '~/utils/utils';

import styles from './style.css?url';

export const links = () => [{ rel: 'stylesheet', href: styles }];

export const meta: MetaFunction = () => [{ title: 'Home — Admin' }];

const BLOCK = 'admin-home-route';
const getClasses = getClassMaker(BLOCK);

// Home (docs/finance-frontend.md §13) — this year's months as a
// tappable card grid, reusing the exact data `GET /api/years/{yyyy}`'s
// `monthlyTotals` already returns. No new backend surface: Home for the
// current year IS that year's `monthlyTotals`, read the same way the
// yearly view already does.
export async function loader() {
  // UTC, not Argentina's ART (UTC-3) — this only decides which year's
  // months to show, not any actual data bucketing (that's the
  // backend's job, in ART, per finance-tracker-backend-kickoff.md
  // Phase 2).
  const year = new Date().getUTCFullYear();
  const { monthlyTotals } = getYearFixture(year);
  // Newest first — Home is a "what's the latest" browse menu, not a
  // chronological read (§13).
  return { months: [...monthlyTotals].reverse() };
}

export default function AdminHome() {
  const { months } = useLoaderData<typeof loader>();
  const { locale } = useIntl();

  return (
    <div className={getClasses()}>
      <h1 className={getClasses('title')}>
        <FormattedMessage id="ADMIN_HOME_HEADING" />
      </h1>
      {months.length === 0 ? (
        <p className={getClasses('empty-state')} role="status">
          <FormattedMessage id="ADMIN_HOME_EMPTY" />
        </p>
      ) : (
        <div className={getClasses('list')}>
          {months.map((entry) => (
            <Link
              key={entry.month}
              to={`/admin/month/${entry.month}`}
              className={getClasses('card-link')}
            >
              <Card
                title={formatMonthLabel(entry.month, locale as Locale)}
                texts={[formatArs(entry.total.ars)]}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
