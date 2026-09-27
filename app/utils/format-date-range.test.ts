import { describe, expect, it } from 'vitest';

import { formatDateRange } from './format-date-range';

describe('formatDateRange', () => {
  it('formats a range with both dates', () => {
    expect(formatDateRange('2026-01-10', '2026-01-17', 'en', 'ongoing')).toBe(
      'Jan 10, 2026 – Jan 17, 2026'
    );
  });

  it('formats an open-ended range using the given ongoing label', () => {
    expect(formatDateRange('2026-01-10', null, 'en', 'ongoing')).toBe('Jan 10, 2026 — ongoing');
  });

  it('formats month names in Spanish when given the es locale, capitalized', () => {
    expect(formatDateRange('2026-01-10', '2026-01-17', 'es', 'en curso')).toBe(
      'Ene 10, 2026 – Ene 17, 2026'
    );
  });

  it('uses the given ongoing label for an open-ended Spanish range', () => {
    expect(formatDateRange('2026-01-10', null, 'es', 'en curso')).toBe('Ene 10, 2026 — en curso');
  });
});
