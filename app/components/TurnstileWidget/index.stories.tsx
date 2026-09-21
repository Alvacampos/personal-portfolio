import type { Meta, StoryObj } from '@storybook/react-vite';

import TurnstileWidget from './index';

const meta: Meta<typeof TurnstileWidget> = {
  title: 'Components/TurnstileWidget',
  component: TurnstileWidget,
};

export default meta;

type Story = StoryObj<typeof TurnstileWidget>;

// Cloudflare's published dummy site keys — they work on any hostname and
// never touch a real widget config. Needs network access to render.
// https://developers.cloudflare.com/turnstile/troubleshooting/testing/

// Visible checkbox that always passes. In production the default is
// `interaction-only` (invisible unless a challenge is needed); `always`
// is used here so there is something to look at.
export const VisibleAlwaysPasses: Story = {
  args: {
    siteKey: '1x00000000000000000000AA',
    appearance: 'always',
    onToken: () => undefined,
  },
};

// Forces the interactive challenge — what a suspicious visitor sees.
export const ForcedInteractive: Story = {
  args: {
    siteKey: '3x00000000000000000000FF',
    appearance: 'always',
    onToken: () => undefined,
  },
};
