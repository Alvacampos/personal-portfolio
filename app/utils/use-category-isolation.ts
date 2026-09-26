import { useState } from 'react';

import type { CategoryBreakdown } from '~/data/admin-schema';

// Shared by every view that uses the category-list-isolates-a-category
// interaction (docs/finance-frontend.md §4/§5/§8) — the month view, the
// yearly view, and (Phase F) the trip view all need the identical
// isolate/toggle/reset behavior against the same CategoryBreakdown[]
// shape, so it lives here once rather than being copy-pasted three times.
export function useCategoryIsolation(categories: CategoryBreakdown[], resetKey: string) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // The route component doesn't remount when resetKey changes (same
  // matched route, just new loader data) — without this, isolating a
  // category would silently carry over to the next month/year/trip.
  // Adjusted during render (React's own recommended pattern for "reset
  // state when a prop changes"), not in an effect — an effect would
  // commit a stale render first and only clear the isolation on the
  // render after (react-hooks/set-state-in-effect flags exactly this).
  const [lastSeenKey, setLastSeenKey] = useState(resetKey);
  if (resetKey !== lastSeenKey) {
    setLastSeenKey(resetKey);
    setActiveCategoryId(null);
  }

  const activeCategory =
    categories.find((category) => category.categoryId === activeCategoryId) ?? null;

  function toggleCategory(categoryId: string) {
    setActiveCategoryId((current) => (current === categoryId ? null : categoryId));
  }

  function clearCategory() {
    setActiveCategoryId(null);
  }

  return { activeCategoryId, activeCategory, toggleCategory, clearCategory };
}
