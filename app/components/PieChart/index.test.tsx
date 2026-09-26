import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PieChart from './index';

const DATA = [
  { id: 'groceries', label: 'Groceries', value: 320000 },
  { id: 'transport', label: 'Transport', value: 90000 },
];

describe('PieChart', () => {
  // Recharts' <ResponsiveContainer> needs real measured layout to render
  // its inner SVG — happy-dom doesn't provide that, so actual sector
  // rendering is only verified by the e2e suite (a real browser). This
  // just confirms the accessibility contract: the whole chart is
  // aria-hidden, since the category list is the real source of truth
  // (docs/finance-frontend.md §10).
  it('hides the whole chart from assistive tech', () => {
    const { container } = render(<PieChart data={DATA} />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('does not throw when no click handler is provided', () => {
    expect(() => render(<PieChart data={DATA} activeId="groceries" />)).not.toThrow();
  });

  it('accepts an onSliceClick handler without crashing on render', () => {
    const onSliceClick = vi.fn();
    expect(() => render(<PieChart data={DATA} onSliceClick={onSliceClick} />)).not.toThrow();
  });
});
