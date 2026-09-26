import { expect, test } from '@playwright/test';

test.describe('Admin login (/admin)', () => {
  test('shows a sign-in button and no public NavBar', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('link', { name: /sign in with google/i })).toBeVisible();
    // The public site's NavBar (GitHub/LinkedIn icons, CV/Projects/etc.
    // links) must not render on /admin — docs/finance-frontend.md §1.
    await expect(page.getByRole('link', { name: /github profile/i })).toHaveCount(0);
  });

  test('sign-in leads to the dashboard redirect', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('link', { name: /sign in with google/i }).click();
    await expect(page).toHaveURL(/\/admin\/month\/\d{4}-\d{2}$/);
  });
});

test.describe('Admin dashboard (/admin/dashboard)', () => {
  test('redirects to the current month', async ({ page }) => {
    await page.goto('/admin/dashboard');
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
    await page.getByRole('link', { name: /back to current month/i }).click();
    await expect(page).toHaveURL(/\/admin\/month\/\d{4}-\d{2}$/);
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

  test('renders the ErrorBoundary for a malformed year param', async ({ page }) => {
    await page.goto('/admin/year/not-a-year', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/that year doesn't look right/i)).toBeVisible();
    await page.getByRole('link', { name: /back to current year/i }).click();
    await expect(page).toHaveURL(/\/admin\/year\/\d{4}$/);
  });
});
