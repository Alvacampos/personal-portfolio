import { format, parse } from 'date-fns';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

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
};

function formatMonthTick(yyyyMm: string): string {
  return format(parse(yyyyMm, 'yyyy-MM', new Date()), 'MMM');
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
export default function BarChart({ data }: BarChartProps) {
  return (
    <div className={getClasses()} aria-hidden="true">
      <ResponsiveContainer width="100%" height={220}>
        <RechartsBarChart data={data} accessibilityLayer={false}>
          <XAxis
            dataKey="month"
            tickFormatter={formatMonthTick}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--fg-muted)' }}
          />
          <Tooltip
            formatter={(value) => formatArs(Number(value))}
            labelFormatter={(label) => formatMonthTick(String(label))}
          />
          <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
