import { format, parse } from 'date-fns';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

import type { Locale } from '~/intl';
import { getDateFnsLocale } from '~/utils/date-fns-locale';
import { formatArs } from '~/utils/format-money';
import { getClassMaker } from '~/utils/utils';

// BarChart CSS is inlined into the consuming route's style.css via
// postcss-import — no links() export (app/components conventions,
// AGENTS.md §14).

const BLOCK = 'bar-chart-component';
const getClasses = getClassMaker(BLOCK);

export type BarChartDatum = {
  // YYYY-MM — formatted to a short month label for display.
  month: string;
  value: number;
};

type BarChartProps = {
  data: BarChartDatum[];
  locale: Locale;
  // Navigates to the clicked month's own page — mouse/touch-only, since
  // the chart itself stays aria-hidden below. The month dropdown
  // rendered alongside this component (app/routes/admin.year.$year)
  // is the accessible equivalent for keyboard/screen-reader users,
  // same division of labor as PieChart's onSliceClick + category list.
  onBarClick?: (month: string) => void;
};

function formatMonthTick(yyyyMm: string, locale: Locale): string {
  return format(parse(yyyyMm, 'yyyy-MM', new Date()), 'MMM', { locale: getDateFnsLocale(locale) });
}

// Decorative — a single series (total spend per month), unlike PieChart
// there's no per-category breakdown at this granularity
// (docs/finance-tracker-backend-kickoff.md §6.1's YearResponse has no
// per-month-per-category figure), so this never responds to category
// isolation. Unlike PieChart, this component has no accessible fallback
// of its own (no category-list equivalent to point to) — whoever renders
// it is responsible for providing one alongside it, the way the yearly
// view's visually-hidden month/total list does
// (app/routes/admin.year.$year/index.tsx).
export default function BarChart({ data, locale, onBarClick = undefined }: BarChartProps) {
  return (
    <div className={getClasses()} aria-hidden="true">
      <ResponsiveContainer width="100%" height={220}>
        <RechartsBarChart data={data} accessibilityLayer={false}>
          <XAxis
            dataKey="month"
            tickFormatter={(value: string) => formatMonthTick(value, locale)}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--fg-muted)' }}
          />
          <Tooltip
            formatter={(value) => formatArs(Number(value))}
            labelFormatter={(label) => formatMonthTick(String(label), locale)}
          />
          <Bar
            dataKey="value"
            fill="var(--accent)"
            radius={[4, 4, 0, 0]}
            onClick={
              onBarClick ? (entry) => onBarClick((entry.payload as BarChartDatum).month) : undefined
            }
            cursor={onBarClick ? 'pointer' : undefined}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
