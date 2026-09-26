import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { getCategoryColor } from '~/utils/category-colors';
import { formatArs } from '~/utils/format-money';
import { getClassMaker } from '~/utils/utils';

// PieChart CSS is inlined into the consuming route's style.css via
// postcss-import — no links() export (app/components conventions,
// AGENTS.md §14).

const BLOCK = 'pie-chart-component';
const getClasses = getClassMaker(BLOCK);

export type PieChartDatum = {
  id: string;
  label: string;
  value: number;
};

type PieChartProps = {
  data: PieChartDatum[];
  // Isolates one slice (full opacity) and dims the rest. `null` = no
  // isolation, every slice full opacity. Controlled from the parent —
  // the category list (docs/finance-frontend.md §4/§8), not this
  // component, is the source of truth for which category is active.
  activeId?: string | null;
  onSliceClick?: (id: string) => void;
};

// Decorative visual complement to the category list, which is the real,
// accessible source of truth for the same information (docs/finance-frontend.md
// §7/§10) — screen readers and keyboard users never need this chart.
export default function PieChart({
  data,
  activeId = null,
  onSliceClick = undefined,
}: PieChartProps) {
  return (
    <div className={getClasses()} aria-hidden="true">
      <ResponsiveContainer width="100%" height={220}>
        {/* accessibilityLayer=false: Recharts' own keyboard-navigation
         * scaffolding (tabIndex=0 on the SVG surface and the pie group)
         * defaults to on, which leaves silent, focusable-but-hidden tab
         * stops inside this aria-hidden subtree — a real bug axe-core
         * catches (WCAG 4.1.2). The category list is the actual
         * keyboard/screen-reader interaction, so this chart needs none
         * of its own. */}
        <RechartsPieChart accessibilityLayer={false}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="55%"
            outerRadius="90%"
            paddingAngle={2}
            stroke="none"
            rootTabIndex={-1}
            onClick={onSliceClick ? (_, index) => onSliceClick(data[index].id) : undefined}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.id}
                fill={getCategoryColor(index)}
                fillOpacity={activeId === null || activeId === entry.id ? 1 : 0.25}
                cursor={onSliceClick ? 'pointer' : undefined}
              />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatArs(Number(value))} />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
