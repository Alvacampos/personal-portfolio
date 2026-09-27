import type { Meta, StoryObj } from '@storybook/react-vite';

import SearchFilterBar from './index';

const meta: Meta<typeof SearchFilterBar> = {
  title: 'Components/SearchFilterBar',
  component: SearchFilterBar,
  args: {
    label: 'Search categories',
  },
  argTypes: {
    onChange: { action: 'change' },
    onClear: { action: 'clear' },
  },
};

export default meta;

type Story = StoryObj<typeof SearchFilterBar>;

export const Empty: Story = {
  args: {
    value: '',
    hasActiveFilter: false,
  },
};

export const ActiveFilter: Story = {
  args: {
    value: 'groc',
    hasActiveFilter: true,
  },
};
