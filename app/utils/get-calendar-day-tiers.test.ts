import { describe, expect, it } from 'vitest';

import type { Transaction } from '~/data/admin-schema';

import { getCalendarDayTiers } from './get-calendar-day-tiers';

function tx(occurredOn: string, ars: number): Transaction {
  return {
    id: `${occurredOn}-${ars}`,
    occurredOn,
    categoryId: 'other',
    categoryName: 'Other',
    description: 'test',
    amount: { ars, usd: 0 },
    currency: 'ARS',
    paidBy: 'You',
    tripId: null,
  };
}

describe('getCalendarDayTiers', () => {
  it('buckets days relative to the month’s highest-spending day', () => {
    const tiers = getCalendarDayTiers([
      tx('2026-08-01', 100000), // 100% of max -> high
      tx('2026-08-05', 40000), // 40% -> mid
      tx('2026-08-10', 20000), // 20% -> low
    ]);
    expect(tiers.high.map((d) => d.getDate())).toEqual([1]);
    expect(tiers.mid.map((d) => d.getDate())).toEqual([5]);
    expect(tiers.low.map((d) => d.getDate())).toEqual([10]);
  });

  it('sums multiple transactions on the same day before bucketing', () => {
    const tiers = getCalendarDayTiers([
      tx('2026-08-01', 30000),
      tx('2026-08-01', 30000), // same day totals 60000, the month max
      tx('2026-08-02', 10000), // ~17% of 60000 -> low
    ]);
    expect(tiers.high.map((d) => d.getDate())).toEqual([1]);
    expect(tiers.low.map((d) => d.getDate())).toEqual([2]);
  });

  it('returns empty tiers for a month with no transactions', () => {
    expect(getCalendarDayTiers([])).toEqual({ low: [], mid: [], high: [] });
  });
});
