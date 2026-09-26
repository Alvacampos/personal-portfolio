import type { Meta, StoryObj } from '@storybook/react-vite';

import BarChart from './index';

const meta: Meta<typeof BarChart> = {
  title: 'Components/BarChart',
  component: BarChart,
};
export default meta;

type Story = StoryObj<typeof BarChart>;

export const Default: Story = {
  args: {
    data: [
      { month: '2025-01', value: 700000 },
      { month: '2025-02', value: 720000 },
      { month: '2025-03', value: 680000 },
      { month: '2025-04', value: 750000 },
      { month: '2025-05', value: 800000 },
      { month: '2025-06', value: 770000 },
      { month: '2025-07', value: 810000 },
      { month: '2025-08', value: 830000 },
      { month: '2025-09', value: 850000 },
      { month: '2025-10', value: 860000 },
      { month: '2025-11', value: 880000 },
      { month: '2025-12', value: 900000 },
    ],
  },
};

export const PartialYear: Story = {
  args: {
    data: [
      { month: '2026-01', value: 780000 },
      { month: '2026-02', value: 800000 },
      { month: '2026-03', value: 820000 },
    ],
  },
};
