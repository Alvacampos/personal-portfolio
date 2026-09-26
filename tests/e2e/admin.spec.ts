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
});
