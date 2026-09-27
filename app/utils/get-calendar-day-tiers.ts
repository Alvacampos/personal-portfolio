import { parseISO } from 'date-fns';

import type { Transaction } from '~/data/admin-schema';

export type CalendarDayTiers = {
  low: Date[];
  mid: Date[];
  high: Date[];
};

// Buckets each day that has at least one transaction into a relative
// spend tier against this month's single highest-spending day — the
// "color mark on dates with expenses, similar to airline calendars"
// request: a quick-glance sense of which days were expensive, not just
// a binary "something happened here" dot.
export function getCalendarDayTiers(transactions: Transaction[]): CalendarDayTiers {
  const totalsByDay = new Map<string, number>();
  transactions.forEach((tx) => {
    totalsByDay.set(tx.occurredOn, (totalsByDay.get(tx.occurredOn) ?? 0) + tx.amount.ars);
  });

  const tiers: CalendarDayTiers = { low: [], mid: [], high: [] };
  const max = Math.max(0, ...totalsByDay.values());
  if (max === 0) return tiers;

  totalsByDay.forEach((total, iso) => {
    const ratio = total / max;
    const date = parseISO(iso);
    if (ratio > 0.66) tiers.high.push(date);
    else if (ratio > 0.33) tiers.mid.push(date);
    else tiers.low.push(date);
  });
  return tiers;
}
