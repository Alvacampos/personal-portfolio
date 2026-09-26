import type { Meta, StoryObj } from '@storybook/react-vite';

import PieChart from './index';

const meta: Meta<typeof PieChart> = {
  title: 'Components/PieChart',
  component: PieChart,
};
export default meta;

type Story = StoryObj<typeof PieChart>;

const DATA = [
  { id: 'groceries', label: 'Groceries', value: 320000 },
  { id: 'rent_expensas', label: 'Rent / Expensas', value: 250000 },
  { id: 'transport', label: 'Transport', value: 90000 },
  { id: 'dining_out', label: 'Dining Out', value: 70000 },
  { id: 'utilities', label: 'Utilities', value: 60000 },
  { id: 'other', label: 'Other', value: 60280 },
];

export const Default: Story = {
  args: {
    data: DATA,
  },
};

export const WithIsolatedSlice: Story = {
  args: {
    data: DATA,
    activeId: 'groceries',
  },
};
