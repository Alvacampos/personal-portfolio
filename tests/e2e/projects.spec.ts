import { expect, test } from '@playwright/test';

test.describe('Projects (/projects)', () => {
  test('lists case-study cards with titles', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: /Case Studies/i, level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Avant$/i, level: 2 })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Adalabs AI Platform/i, level: 2 })
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Imprint$/i, level: 2 })).toBeVisible();
  });

  test('cards link to their detail pages', async ({ page }) => {
    await page.goto('/projects');
    await expect(
      page
        .getByRole('link')
        .filter({ hasText: /^Avant/ })
        .first()
    ).toHaveAttribute('href', '/projects/avant');
  });

  test('ongoing project (no endDate) sorts before ended projects', async ({ page }) => {
    // HaloMD is the only project with no `endDate` in projects.json,
    // so it should render first. Grabs the section's card headings in
    // DOM order and asserts HaloMD is at index 0.
    await page.goto('/projects');
    const titles = await page
      .locator('.projects-route__list')
      .getByRole('heading', { level: 2 })
      .allTextContents();
    expect(titles[0]).toMatch(/^HaloMD/);
  });
});

test.describe('Project detail (/projects/:slug)', () => {
  test('renders the four narrative sections + tech', async ({ page }) => {
    await page.goto('/projects/avant');
    await expect(page.getByRole('heading', { name: /^Avant$/i, level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Problem$/i, level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Constraints$/i, level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Approach$/i, level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Outcome$/i, level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Tech$/i, level: 2 })).toBeVisible();
  });

  test('back link returns to /projects', async ({ page }) => {
    await page.goto('/projects/avant');
    await page.getByRole('link', { name: /back to projects/i }).click();
    await expect(page).toHaveURL(/\/projects\/?$/);
  });

  test('renders the ErrorBoundary for an unknown slug', async ({ page }) => {
    const response = await page.goto('/projects/nope', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { name: /this case study isn't available/i })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /back to projects/i })).toBeVisible();
  });

  test('localizes the detail under es', async ({ page }) => {
    await page.goto('/projects/avant?lang=es');
    await expect(page.getByRole('heading', { name: /^Problema$/i, level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Restricciones$/i, level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Enfoque$/i, level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Resultado$/i, level: 2 })).toBeVisible();
  });
});
