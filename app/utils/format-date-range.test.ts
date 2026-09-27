import { describe, expect, it } from 'vitest';

import { formatDateRange } from './format-date-range';

describe('formatDateRange', () => {
  it('formats a range with both dates', () => {
    expect(formatDateRange('2026-01-10', '2026-01-17')).toBe('Jan 10, 2026 – Jan 17, 2026');
  });

  it('formats an open-ended range as "ongoing"', () => {
    expect(formatDateRange('2026-01-10', null)).toBe('Jan 10, 2026 — ongoing');
  });
});
