import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import BarChart from './index';

const DATA = [
  { month: '2026-01', value: 700000 },
  { month: '2026-02', value: 720000 },
];

describe('BarChart', () => {
  // Recharts' <ResponsiveContainer> needs real measured layout to render
  // its inner SVG — happy-dom doesn't provide that (same limitation as
  // PieChart's tests), so actual bar rendering is only verified by the
  // e2e suite (a real browser). This confirms the accessibility contract.
  it('hides the whole chart from assistive tech', () => {
    const { container } = render(<BarChart data={DATA} />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
