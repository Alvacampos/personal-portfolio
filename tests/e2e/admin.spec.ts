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
    // Bare year number heading, matching the yearly view's own <h1>.
    await expect(page.getByRole('heading', { name: /^\d{4}$/, level: 1 })).toBeVisible();
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

test.describe('Admin trips list (/admin/trips)', () => {
  test('shows both trips and links to their detail pages', async ({ page }) => {
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
