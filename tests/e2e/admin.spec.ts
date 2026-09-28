import { expect, test } from '@playwright/test';

test.describe('Admin login (/admin)', () => {
  test('shows a sign-in button and no public NavBar', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('link', { name: /sign in with google/i })).toBeVisible();
    // The public site's NavBar (GitHub/LinkedIn icons, CV/Projects/etc.
    // links) must not render on /admin — docs/finance-frontend.md §1.
    await expect(page.getByRole('link', { name: /github profile/i })).toHaveCount(0);
  });

  test('sign-in leads to Home', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('link', { name: /sign in with google/i }).click();
    await expect(page).toHaveURL('/admin/dashboard');
  });
});

test.describe('Admin Home (/admin/dashboard)', () => {
  test('shows this year as a grid of month cards, newest first', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();
    // The year sits underneath the heading as a subtitle, not standing
    // in for the page's own name.
    await expect(page.getByText(/^\d{4}$/)).toBeVisible();
    // Fixture-backed for the current year (docs/finance-frontend.md
    // §12/§13) — like the month view's own populated-vs-empty fixture
    // split, this degrades to the empty-state assertion below once the
    // fixture year rolls past what admin-fixtures.ts covers.
    const monthLinks = page.getByRole('link').filter({ hasText: /\d{4}/ });
    await expect(monthLinks.first()).toBeVisible();
  });

  test('clicking a month card navigates to its month view', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.getByRole('link').filter({ hasText: /\d{4}/ }).first().click();
    await expect(page).toHaveURL(/\/admin\/month\/\d{4}-\d{2}$/);
  });

  test('links to the full year view, resolving the overlap with Year', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.getByRole('link', { name: /View year in detail/ }).click();
    await expect(page).toHaveURL(/\/admin\/year\/\d{4}$/);
  });
});

test.describe('Admin nav', () => {
  test('has no sign-out control — real sign-out only happens via credential expiration', async ({
    page,
  }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByRole('link', { name: /sign out/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /sign out/i })).toHaveCount(0);
  });
});

test.describe('Admin month view (/admin/month/:yyyyMm)', () => {
  test('shows a populated month with categories, transactions, and analysis', async ({ page }) => {
    await page.goto('/admin/month/2026-08');
    await expect(page.getByRole('heading', { name: 'August 2026', level: 1 })).toBeVisible();
    await expect(page.getByText('Groceries').first()).toBeVisible();
    await expect(page.getByText('Streaming subscription')).toBeVisible();
    await expect(page.getByRole('heading', { name: /claude's analysis/i })).toBeVisible();
    await expect(page.getByText(/august spending came in/i)).toBeVisible();
  });

  test('toggles the total between ARS and USD', async ({ page }) => {
    await page.goto('/admin/month/2026-08');
    // Fixture totals: 850,280 ARS / 621 USD — matching on the digits
    // sidesteps any ambiguity in how Intl.NumberFormat renders the
    // currency symbol for each locale.
    const total = page.getByRole('button', { name: /850/ });
    await expect(total).toBeVisible();
    await total.click();
    await expect(page.getByRole('button', { name: /621/ })).toBeVisible();
  });

  test('shows the empty state and "not available" analysis for a month with no data', async ({
    page,
  }) => {
    await page.goto('/admin/month/2026-09');
    await expect(page.getByText(/nothing logged for this month yet/i)).toBeVisible();
    await expect(page.getByText(/available once this month ends/i)).toBeVisible();
  });

  test('prev/next navigate between months', async ({ page }) => {
    await page.goto('/admin/month/2026-08');
    await page.getByRole('link', { name: /next month/i }).click();
    await expect(page).toHaveURL('/admin/month/2026-09');
    await page.getByRole('link', { name: /previous month/i }).click();
    await expect(page).toHaveURL('/admin/month/2026-08');
  });

  test('renders the ErrorBoundary for a malformed month param', async ({ page }) => {
    await page.goto('/admin/month/not-a-month', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/that month doesn't look right/i)).toBeVisible();
    await page.getByRole('link', { name: /back to home/i }).click();
    await expect(page).toHaveURL('/admin/dashboard');
  });

  test('renders the pie chart with one slice per category', async ({ page }) => {
    await page.goto('/admin/month/2026-08');
    await page.waitForLoadState('networkidle');
    // Recharts' <ResponsiveContainer> needs a real browser layout pass to
    // render its SVG — this is the one place that actually happens.
    await expect(page.locator('.recharts-pie-sector')).toHaveCount(6);
  });

  test('isolating a category via the list filters the transaction list and swaps the total', async ({
    page,
  }) => {
    await page.goto('/admin/month/2026-08');
    const groceriesRow = page.getByRole('button', { name: /Groceries/ }).first();

    await groceriesRow.click();
    await expect(groceriesRow).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Showing Groceries only')).toBeVisible();
    await expect(page.getByText('Coto — weekly shop')).toBeVisible();
    await expect(page.getByText('Monthly rent + expensas')).toHaveCount(0);
    // Category total (320,000 ARS), not the month total (850,280). Scoped
    // to the total button specifically — the active Groceries row's own
    // total also contains "320" and would otherwise match too.
    await expect(page.locator('.admin-month-route__total')).toContainText('320');

    await groceriesRow.click();
    await expect(groceriesRow).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('Monthly rent + expensas')).toBeVisible();
  });

  test('isolating a category persists across the ARS/USD toggle but resets on month navigation', async ({
    page,
  }) => {
    await page.goto('/admin/month/2026-08');
    await page
      .getByRole('button', { name: /Groceries/ })
      .first()
      .click();
    await expect(page.getByText('Showing Groceries only')).toBeVisible();

    // Toggling currency display is independent state — isolating a
    // category shouldn't get reset by it.
    await page.locator('.admin-month-route__total').click();
    await expect(page.getByText('Showing Groceries only')).toBeVisible();

    await page.getByRole('link', { name: /next month/i }).click();
    await expect(page).toHaveURL('/admin/month/2026-09');
    await expect(page.getByText(/Showing .* only/)).toHaveCount(0);
  });

  test('clicking a pie slice isolates the same category as clicking its list row', async ({
    page,
  }) => {
    await page.goto('/admin/month/2026-08');
    await page.waitForLoadState('networkidle');
    // Recharts layers an invisible hover-tracking surface over the
    // sectors for its own tooltip handling, which fails Playwright's
    // actionability check even though a real click on the same spot
    // works fine for an actual user — force bypasses that check.
    await page.locator('.recharts-pie-sector').first().click({ force: true });
    await expect(page.getByText(/Showing .* only/)).toBeVisible();
  });
});

test.describe('Admin year index (/admin/year)', () => {
  test('redirects to the current year', async ({ page }) => {
    await page.goto('/admin/year');
    await expect(page).toHaveURL(/\/admin\/year\/\d{4}$/);
  });
});

test.describe('Admin year view (/admin/year/:year)', () => {
  test('shows a completed year with the bar chart, pie chart, and categories', async ({ page }) => {
    await page.goto('/admin/year/2025');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: '2025', level: 1 })).toBeVisible();
    await expect(page.locator('.recharts-bar-rectangle')).toHaveCount(12);
    await expect(page.locator('.recharts-pie-sector')).toHaveCount(6);
    await expect(page.getByText('Groceries').first()).toBeVisible();
  });

  test('the bar chart has a real accessible equivalent, not just a hidden chart', async ({
    page,
  }) => {
    await page.goto('/admin/year/2025');
    // The chart itself is aria-hidden (decorative, like the pie chart) —
    // this is the actual content a screen reader gets for "month by
    // month," so it has to exist in the DOM even though it's visually
    // hidden, not merely absent.
    const monthlyTable = page.locator('.admin-year-route__monthly-table');
    await expect(monthlyTable).toBeAttached();
    await expect(monthlyTable.getByText(/January 2025/i)).toBeAttached();
  });

  test('clicking a bar navigates to that month’s own page', async ({ page }) => {
    await page.goto('/admin/year/2025');
    await page.waitForLoadState('networkidle');
    // Bars render oldest-first (Jan..Dec) — the 3rd bar is March.
    await page.locator('.recharts-bar-rectangle').nth(2).click({ force: true });
    await expect(page).toHaveURL('/admin/month/2025-03');
  });

  test('the month dropdown is a keyboard-usable equivalent to clicking a bar', async ({ page }) => {
    await page.goto('/admin/year/2025');
    await page.waitForLoadState('networkidle');
    // `.selectOption()` can otherwise race hydration on a freshly-loaded
    // page and get silently ignored — same settle this suite's search
    // tests already use for the same class of problem.
    await page.waitForTimeout(200);
    await page.selectOption('.admin-year-route__month-jump', '2025-03');
    await expect(page).toHaveURL('/admin/month/2025-03');
  });

  test('shows fewer bars for the partial (YTD) year', async ({ page }) => {
    await page.goto('/admin/year/2026');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.recharts-bar-rectangle')).toHaveCount(7);
  });

  test('shows the empty state for a year with no data', async ({ page }) => {
    await page.goto('/admin/year/2020');
    await expect(page.getByText(/nothing logged for this year yet/i)).toBeVisible();
  });

  test('isolating a category swaps the total and resets on year navigation', async ({ page }) => {
    await page.goto('/admin/year/2025');
    const groceriesRow = page.getByRole('button', { name: /Groceries/ }).first();

    await groceriesRow.click();
    await expect(groceriesRow).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Showing Groceries only')).toBeVisible();
    // Category total (3,600,000 ARS), not the year total (9,550,000).
    await expect(page.locator('.admin-year-route__total')).toContainText('3.600.000');

    await page.getByRole('link', { name: /next year/i }).click();
    await expect(page).toHaveURL('/admin/year/2026');
    await expect(page.getByText(/Showing .* only/)).toHaveCount(0);
  });

  test('prev/next navigate between years', async ({ page }) => {
    await page.goto('/admin/year/2025');
    await page.getByRole('link', { name: /next year/i }).click();
    await expect(page).toHaveURL('/admin/year/2026');
    await page.getByRole('link', { name: /previous year/i }).click();
    await expect(page).toHaveURL('/admin/year/2025');
  });

  test('searching categories narrows the list; clear filters resets search and isolation', async ({
    page,
  }) => {
    await page.goto('/admin/year/2025');
    await page.waitForLoadState('networkidle');
    // `networkidle` doesn't guarantee hydration has attached React's
    // input listeners yet — same settle this suite's visual spec uses,
    // otherwise `.fill()` can race hydration and get silently
    // overwritten by the not-yet-hydrated controlled input.
    await page.waitForTimeout(200);
    const clearFilters = page.getByRole('button', { name: /clear filters/i });
    await expect(clearFilters).toBeDisabled();

    await page.getByRole('searchbox', { name: /search categories/i }).fill('groc');
    await expect(page.getByRole('button', { name: /Groceries/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Transport/ })).toHaveCount(0);
    await expect(clearFilters).toBeEnabled();

    await page.getByRole('button', { name: /Groceries/ }).click();
    await expect(page.getByText('Showing Groceries only')).toBeVisible();

    await clearFilters.click();
    await expect(page.getByRole('searchbox', { name: /search categories/i })).toHaveValue('');
    await expect(page.getByText(/Showing .* only/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Transport/ })).toBeVisible();
  });

  test('renders the ErrorBoundary for a malformed year param', async ({ page }) => {
    await page.goto('/admin/year/not-a-year', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/that year doesn't look right/i)).toBeVisible();
    await page.getByRole('link', { name: /back to current year/i }).click();
    await expect(page).toHaveURL(/\/admin\/year\/\d{4}$/);
  });
});

test.describe('Admin calendar index (/admin/calendar)', () => {
  test('redirects to the current month', async ({ page }) => {
    await page.goto('/admin/calendar');
    await expect(page).toHaveURL(/\/admin\/calendar\/\d{4}-\d{2}$/);
  });
});

test.describe('Admin calendar view (/admin/calendar/:yyyyMm)', () => {
  test('shows a full, navigable month grid with every day selectable', async ({ page }) => {
    await page.goto('/admin/calendar/2026-08');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Calendar', level: 1 })).toBeVisible();
    // react-day-picker renders a real <table>. The weekday header row is
    // `aria-hidden` (each day button's own accessible name already
    // spells out its weekday, e.g. "Saturday, August 1st, 2026") but
    // still visible sighted users; the caption is a live region.
    await expect(page.locator('.admin-calendar-route__weekday').first()).toHaveText('Mo');
    // role=status only takes its accessible name from an explicit
    // aria-label/aria-labelledby, not its text content, so assert the
    // role and the visible text separately rather than via `name`.
    await expect(page.getByRole('status')).toHaveText('August 2026');
    // August 2026 has 31 days, every one of them a real button now that
    // date selection is handled by react-day-picker (mode="single").
    await expect(page.locator('.admin-calendar-route__day-button')).toHaveCount(31);
  });

  test('colors days by relative spend, airline-calendar style', async ({ page }) => {
    await page.goto('/admin/calendar/2026-08');
    await page.waitForLoadState('networkidle');
    // FIXTURE_MONTH (admin-fixtures.ts): Aug 5 (250000 ARS) is the
    // month's single highest-spending day -> tier-high.
    await expect(page.locator('.admin-calendar-route__day--tier-high')).toHaveCount(1);
    await expect(
      page.locator('.admin-calendar-route__day--tier-high .admin-calendar-route__day-button')
    ).toHaveText('5');
    await expect(page.locator('.admin-calendar-route__day--tier-mid')).toHaveCount(3);
    await expect(page.locator('.admin-calendar-route__day--tier-low')).toHaveCount(6);
  });

  test('the tier colors have a visible legend and an accessible equivalent', async ({ page }) => {
    await page.goto('/admin/calendar/2026-08');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.admin-calendar-route__legend')).toContainText('Low-spending day');
    await expect(page.locator('.admin-calendar-route__legend')).toContainText(
      'Moderate-spending day'
    );
    await expect(page.locator('.admin-calendar-route__legend')).toContainText('High-spending day');
    // The color isn't the only signal — the day button's own accessible
    // name carries the same information a screen reader can't see.
    await expect(
      page.getByRole('button', { name: /August 5th, 2026 — High-spending day/ })
    ).toBeVisible();

    // A month with no data at all shouldn't grow an empty legend
    // explaining colors that don't appear anywhere on its grid.
    await page.goto('/admin/calendar/2026-09');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.admin-calendar-route__legend')).toHaveCount(0);
  });

  test('selecting a day shows its transactions; selecting again collapses', async ({ page }) => {
    await page.goto('/admin/calendar/2026-08');
    await page.waitForLoadState('networkidle');
    const aug1 = page.getByRole('button', { name: /Saturday, August 1st, 2026/ });

    await aug1.click();
    await expect(page.getByRole('heading', { name: /Transactions — Aug 1, 2026/i })).toBeVisible();
    await expect(page.getByText('SUBE top-up')).toBeVisible();
    await expect(page.getByText('Transport · Partner')).toBeVisible();

    await aug1.click();
    await expect(page.getByText('SUBE top-up')).toHaveCount(0);
  });

  test('selecting an empty day shows the empty state', async ({ page }) => {
    await page.goto('/admin/calendar/2026-08');
    await page.waitForLoadState('networkidle');
    // August 3rd has no transactions in the fixture.
    await page.getByRole('button', { name: /Monday, August 3rd, 2026/ }).click();
    await expect(page.getByText(/nothing logged this day/i)).toBeVisible();
  });

  test('prev/next navigate between months', async ({ page }) => {
    await page.goto('/admin/calendar/2026-08');
    await page.getByRole('button', { name: /next month/i }).click();
    await expect(page).toHaveURL('/admin/calendar/2026-09');
    await page.getByRole('button', { name: /previous month/i }).click();
    await expect(page).toHaveURL('/admin/calendar/2026-08');
  });

  test('prev/next navigation clears a selected day rather than leaving it stale', async ({
    page,
  }) => {
    await page.goto('/admin/calendar/2026-08');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /August 5th, 2026/ }).click();
    await expect(page.getByRole('heading', { name: /Transactions — Aug 5, 2026/i })).toBeVisible();

    await page.getByRole('button', { name: /next month/i }).click();
    await expect(page).toHaveURL('/admin/calendar/2026-09');
    // No day-detail panel at all — not the previous month's date paired
    // with the new month's (empty) transaction list, which would read
    // as "Aug 5 had nothing logged" even though it did.
    await expect(page.getByRole('heading', { name: /Transactions —/i })).toHaveCount(0);
    await expect(page.getByLabel(/jump to date/i)).toHaveValue('');
  });

  test('the jump-to-date input selects a day and crosses months', async ({ page }) => {
    await page.goto('/admin/calendar/2026-08');
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/jump to date/i).fill('2026-09-15');
    await expect(page).toHaveURL('/admin/calendar/2026-09');
    await expect(page.getByRole('heading', { name: /Transactions — Sep 15, 2026/i })).toBeVisible();
  });

  test('renders the ErrorBoundary for a malformed month param', async ({ page }) => {
    await page.goto('/admin/calendar/not-a-month', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/that month doesn't look right/i)).toBeVisible();
    await page.getByRole('link', { name: /back to home/i }).click();
    await expect(page).toHaveURL('/admin/dashboard');
  });
});

test.describe('Admin trips list (/admin/trips)', () => {
  test('shows all three trips and links to their detail pages', async ({ page }) => {
    await page.goto('/admin/trips');
    await expect(page.getByRole('heading', { name: 'Trips', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /Bariloche/ })).toHaveAttribute(
      'href',
      '/admin/trips/bariloche-2026-01'
    );
    await expect(page.getByRole('link', { name: /Cataratas del Iguazú/ })).toHaveAttribute(
      'href',
      '/admin/trips/iguazu-2025-11'
    );
    await expect(page.getByRole('link', { name: /Mendoza/ })).toHaveAttribute(
      'href',
      '/admin/trips/mendoza-2026-11'
    );
  });

  test('each card shows a status badge, duration, and a capitalized date range', async ({
    page,
  }) => {
    await page.goto('/admin/trips');
    const barilocheCard = page.getByRole('link', { name: /Bariloche/ });
    // Jan 10 – Jan 17 inclusive is 8 calendar days (matches the 7-night
    // hotel stay in the trip detail's own fixture transaction).
    await expect(barilocheCard.getByText('Completed')).toBeVisible();
    await expect(barilocheCard.getByText('8 days')).toBeVisible();
    await expect(barilocheCard.getByText('Jan 10, 2026 – Jan 17, 2026')).toBeVisible();
  });

  test('a card with a budget shows it alongside its actual total; one without doesn’t', async ({
    page,
  }) => {
    await page.goto('/admin/trips');
    await expect(
      page.getByRole('link', { name: /Bariloche/ }).getByText('Budget: $ 400.000')
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Cataratas del Iguazú/ }).getByText(/Budget:/)
    ).toHaveCount(0);
  });

  test('a planned trip shows its status badge and budget with a $0 actual', async ({ page }) => {
    await page.goto('/admin/trips');
    const mendozaCard = page.getByRole('link', { name: /Mendoza/ });
    await expect(mendozaCard.getByText('Planned')).toBeVisible();
    await expect(mendozaCard.getByText('$ 0', { exact: true })).toBeVisible();
    await expect(mendozaCard.getByText('Budget: $ 600.000')).toBeVisible();
  });

  test('clicking a trip navigates to its detail page', async ({ page }) => {
    await page.goto('/admin/trips');
    await page.getByRole('link', { name: /Bariloche/ }).click();
    await expect(page).toHaveURL('/admin/trips/bariloche-2026-01');
    await expect(page.getByRole('heading', { name: 'Bariloche', level: 1 })).toBeVisible();
  });

  test('searching filters by trip name; clear filters resets it', async ({ page }) => {
    await page.goto('/admin/trips');
    await page.waitForLoadState('networkidle');
    // See the equivalent wait in the Year search test — `.fill()` can
    // otherwise race hydration and get silently discarded.
    await page.waitForTimeout(200);
    const clearFilters = page.getByRole('button', { name: /clear filters/i });
    await expect(clearFilters).toBeDisabled();

    await page.getByRole('searchbox', { name: /search trips/i }).fill('bariloche');
    await expect(page.getByRole('link', { name: /Bariloche/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Cataratas del Iguazú/ })).toHaveCount(0);

    await clearFilters.click();
    await expect(page.getByRole('searchbox', { name: /search trips/i })).toHaveValue('');
    await expect(page.getByRole('link', { name: /Cataratas del Iguazú/ })).toBeVisible();
  });

  test('shows a no-match message when the search matches no trip', async ({ page }) => {
    await page.goto('/admin/trips');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(200);
    await page.getByRole('searchbox', { name: /search trips/i }).fill('nonexistent trip');
    await expect(page.getByText(/no trips match your search/i)).toBeVisible();
  });
});

test.describe('Admin trip detail (/admin/trips/:tripId)', () => {
  test('shows a populated trip with the pie chart, categories, and transactions', async ({
    page,
  }) => {
    await page.goto('/admin/trips/bariloche-2026-01');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Bariloche', level: 1 })).toBeVisible();
    await expect(page.locator('.recharts-pie-sector')).toHaveCount(3);
    await expect(page.getByText('Hotel — 7 nights')).toBeVisible();
  });

  test('shows the empty state for a trip with no synced expenses', async ({ page }) => {
    await page.goto('/admin/trips/iguazu-2025-11');
    await expect(page.getByText(/nothing logged for this trip\./i)).toBeVisible();
  });

  test('isolating a category filters the transaction list and swaps the total', async ({
    page,
  }) => {
    await page.goto('/admin/trips/bariloche-2026-01');
    const transportRow = page.getByRole('button', { name: /Transport/ }).first();

    await transportRow.click();
    await expect(transportRow).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Showing Transport only')).toBeVisible();
    await expect(page.getByText('Flights')).toBeVisible();
    await expect(page.getByText('Hotel — 7 nights')).toHaveCount(0);
    // Category total (150,000 ARS), not the trip total (450,000).
    await expect(page.locator('.admin-trip-route__total')).toContainText('150.000');
  });

  test('a trip over its budget shows the over-budget message, unaffected by category isolation', async ({
    page,
  }) => {
    await page.goto('/admin/trips/bariloche-2026-01');
    await expect(page.getByText('Budget: $ 400.000')).toBeVisible();
    await expect(page.getByText('$ 50.000 over budget')).toBeVisible();

    // Isolating a category swaps the big total to a category-scoped
    // figure (150,000) — the budget comparison is a whole-trip concept
    // and must keep comparing against the trip's actual total (450,000),
    // not silently recompute against the filtered total.
    await page
      .getByRole('button', { name: /Transport/ })
      .first()
      .click();
    await expect(page.getByText('$ 50.000 over budget')).toBeVisible();
  });

  test('a planned trip with nothing spent yet shows its full budget as remaining', async ({
    page,
  }) => {
    await page.goto('/admin/trips/mendoza-2026-11');
    await expect(page.getByRole('heading', { name: 'Mendoza', level: 1 })).toBeVisible();
    await expect(page.getByText('Budget: $ 600.000')).toBeVisible();
    await expect(page.getByText('$ 600.000 left')).toBeVisible();
    await expect(page.getByText(/nothing logged for this trip\./i)).toBeVisible();
  });

  test('a trip’s status is visible on its own detail page, not just the list card', async ({
    page,
  }) => {
    // Previously only shown on the list card — a planned trip with
    // nothing spent yet looked identical to a completed trip that
    // simply had no data, once you were on its own page.
    await page.goto('/admin/trips/mendoza-2026-11');
    await expect(page.getByText('Planned', { exact: true })).toBeVisible();

    await page.goto('/admin/trips/bariloche-2026-01');
    await expect(page.getByText('Completed', { exact: true })).toBeVisible();
  });

  test('a trip with no budget set shows no budget comparison', async ({ page }) => {
    await page.goto('/admin/trips/iguazu-2025-11');
    await expect(page.getByText(/^Budget:/)).toHaveCount(0);
  });

  test.describe('Phase K — manual planned items (against fixtures, not persisted)', () => {
    test('shows the planned items fixture, including an already-done one', async ({ page }) => {
      await page.goto('/admin/trips/mendoza-2026-11');
      await expect(page.getByRole('heading', { name: 'Planning' })).toBeVisible();
      await expect(page.locator('.admin-trip-route__planned-item')).toHaveCount(3);
      const insurance = page.locator('.admin-trip-route__planned-item', {
        hasText: 'Travel insurance',
      });
      await expect(insurance.getByRole('checkbox')).toBeChecked();
    });

    test('a completed trip that never used planning shows no Planning section', async ({
      page,
    }) => {
      await page.goto('/admin/trips/bariloche-2026-01');
      await expect(page.getByRole('heading', { name: 'Planning' })).toHaveCount(0);
    });

    test('adds a planned item via the form; toggling done strikes it through', async ({ page }) => {
      await page.goto('/admin/trips/mendoza-2026-11');
      // Otherwise `.fill()` can race hydration and get silently
      // discarded — same guard as the Year/Trips search tests.
      await page.waitForTimeout(200);
      await page.getByLabel('Description').fill('Car rental');
      await page.getByLabel('Estimated amount (ARS)').fill('90000');
      await page.getByLabel('Category (optional)').selectOption('transport');
      await page.getByRole('button', { name: 'Add planned item' }).click();

      const carRental = page.locator('.admin-trip-route__planned-item', { hasText: 'Car rental' });
      await expect(carRental).toContainText('$ 90.000');
      await expect(carRental).toContainText('Transport');
      // The form resets after a successful add, not left holding stale
      // values for the next item.
      await expect(page.getByLabel('Description')).toHaveValue('');

      await carRental.getByRole('checkbox').check();
      await expect(carRental.locator('.admin-trip-route__planned-item-description')).toHaveCSS(
        'text-decoration-line',
        'line-through'
      );
    });

    test('deletes a planned item', async ({ page }) => {
      await page.goto('/admin/trips/mendoza-2026-11');
      await page.getByRole('button', { name: /Delete Hotel — 7 nights/ }).click();
      await expect(page.getByText('Hotel — 7 nights')).toHaveCount(0);
      await expect(page.locator('.admin-trip-route__planned-item')).toHaveCount(2);
    });

    test('the add button stays disabled until both description and amount are filled', async ({
      page,
    }) => {
      await page.goto('/admin/trips/mendoza-2026-11');
      await page.waitForTimeout(200);
      const addButton = page.getByRole('button', { name: 'Add planned item' });
      await expect(addButton).toBeDisabled();
      await page.getByLabel('Description').fill('Souvenirs');
      await expect(addButton).toBeDisabled();
      await page.getByLabel('Estimated amount (ARS)').fill('15000');
      await expect(addButton).toBeEnabled();
    });

    test('local edits don’t leak onto a different trip’s page', async ({ page }) => {
      await page.goto('/admin/trips/mendoza-2026-11');
      await page.waitForTimeout(200);
      await page
        .locator('.admin-trip-route__planned-item', { hasText: 'Flights' })
        .getByRole('checkbox')
        .check();

      await page.goto('/admin/trips');
      await page.getByRole('link', { name: /Bariloche/ }).click();
      await page.getByRole('link', { name: /back to trips/i }).click();
      await page.getByRole('link', { name: /Mendoza/ }).click();

      const flights = page.locator('.admin-trip-route__planned-item', { hasText: 'Flights' });
      await expect(flights.getByRole('checkbox')).not.toBeChecked();
    });
  });

  test('back link returns to the trips list', async ({ page }) => {
    await page.goto('/admin/trips/bariloche-2026-01');
    await page.getByRole('link', { name: /back to trips/i }).click();
    await expect(page).toHaveURL('/admin/trips');
  });

  test('renders the ErrorBoundary for an unknown trip id', async ({ page }) => {
    await page.goto('/admin/trips/nope', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/that trip doesn't exist/i)).toBeVisible();
    await page.getByRole('link', { name: /back to trips/i }).click();
    await expect(page).toHaveURL('/admin/trips');
  });
});
