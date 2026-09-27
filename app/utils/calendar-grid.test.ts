import { describe, expect, it } from 'vitest';

import { buildCalendarWeeks, getWeekdayLabels } from './calendar-grid';

describe('buildCalendarWeeks', () => {
  it('leads with the right number of blanks for a month starting on Saturday', () => {
    // August 1, 2026 is a Saturday — Monday-start weeks need 5 leading
    // blanks (Mon-Fri) before it.
    const weeks = buildCalendarWeeks('2026-08');
    expect(weeks[0].slice(0, 5)).toEqual([null, null, null, null, null]);
    expect(weeks[0][5]).toEqual({ iso: '2026-08-01', dayOfMonth: 1 });
    expect(weeks[0][6]).toEqual({ iso: '2026-08-02', dayOfMonth: 2 });
  });

  it('every week has exactly 7 columns, padding the trailing week', () => {
    const weeks = buildCalendarWeeks('2026-08');
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    // 31 days + 5 leading blanks = 36 cells -> padded to 42 (6 weeks).
    expect(weeks).toHaveLength(6);
    expect(weeks.at(-1)?.at(-1)).toBeNull();
  });

  it('handles a month starting on Sunday with a 5-week grid', () => {
    // February 1, 2026 is a Sunday — 6 leading blanks (Mon-Sat), 28 days.
    // 6 + 28 = 34 cells, padded to 35 (5 weeks) with one trailing blank.
    const weeks = buildCalendarWeeks('2026-02');
    expect(weeks[0].slice(0, 6)).toEqual(Array(6).fill(null));
    expect(weeks[0][6]).toEqual({ iso: '2026-02-01', dayOfMonth: 1 });
    expect(weeks).toHaveLength(5);
    expect(weeks.at(-1)?.at(-2)).toEqual({ iso: '2026-02-28', dayOfMonth: 28 });
    expect(weeks.at(-1)?.at(-1)).toBeNull();
  });
});

describe('getWeekdayLabels', () => {
  it('returns 7 labels starting with Monday', () => {
    const labels = getWeekdayLabels(undefined);
    expect(labels).toHaveLength(7);
    expect(labels[0]).toBe('Mon');
    expect(labels[6]).toBe('Sun');
  });
});
