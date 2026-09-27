import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Accessibility gate. One axe pass per route. Fails the build on any
// `serious` or `critical` violation — `moderate` and `minor` are
// informational only and don't gate (axe reports them all, but a
// production-blocking issue is by definition serious+).
//
// Add a route to ROUTES below to extend coverage. Each entry runs as
// its own test so the failure surface stays narrow (you see which
// route + which rule, not a bundled report).
const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'skills-index', path: '/skills' },
  { name: 'skills-detail', path: '/skills/3' },
  { name: 'education-index', path: '/education' },
  { name: 'education-detail', path: '/education/degree' },
  { name: 'projects-index', path: '/projects' },
  { name: 'projects-detail', path: '/projects/avant' },
  { name: 'contact', path: '/contact' },
  // /admin holds the same accessibility bar as the public site
  // (docs/finance-frontend.md §10), not a lower private-tool one.
  { name: 'admin-login', path: '/admin' },
  { name: 'admin-month', path: '/admin/month/2026-08' },
  { name: 'admin-year', path: '/admin/year/2025' },
  { name: 'admin-trips-index', path: '/admin/trips' },
  { name: 'admin-trip-detail', path: '/admin/trips/bariloche-2026-01' },
];

const BLOCKING_IMPACTS = ['serious', 'critical'];

// Shared by the route loop below and any one-off test that needs to
// interact with the page first (e.g. clicking into a state that only
// exists after a user action) before scanning it.
async function expectNoBlockingViolations(page: import('@playwright/test').Page, label: string) {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact && BLOCKING_IMPACTS.includes(v.impact)
  );

  // Print every blocking violation's rule + selector so CI logs surface
  // the diagnosis without forcing a dev to open the report.
  if (blocking.length > 0) {
    const summary = blocking
      .map((v) => {
        const nodes = v.nodes.map((n) => n.target.join(' ')).join('\n      ');
        return `  - [${v.impact}] ${v.id}: ${v.help}\n      ${nodes}`;
      })
      .join('\n');
    console.error(`axe found ${blocking.length} blocking violation(s) on ${label}:\n${summary}`);
  }

  expect(blocking).toEqual([]);
}

test.describe('Accessibility (axe)', () => {
  for (const { name, path } of ROUTES) {
    test(`${name} has no serious or critical violations`, async ({ page }) => {
      await page.goto(path);
      // Use the same `networkidle` settle as visual.spec.ts so axe runs
      // against the fully-hydrated page, not a partial render.
      await page.waitForLoadState('networkidle');
      await expectNoBlockingViolations(page, path);
    });
  }

  // The isolated-category state (docs/finance-frontend.md §4/§8) only
  // exists after a click — new markup (aria-pressed, the active row's
  // styling) that the plain goto-and-scan loop above never actually
  // renders, so it needs its own pass rather than being assumed clean
  // by analogy to the resting state.
  test('admin-month (category isolated) has no serious or critical violations', async ({
    page,
  }) => {
    await page.goto('/admin/month/2026-08');
    await page.waitForLoadState('networkidle');
    await page
      .getByRole('button', { name: /Groceries/ })
      .first()
      .click();
    await expectNoBlockingViolations(page, '/admin/month/2026-08 (Groceries isolated)');
  });

  test('admin-year (category isolated) has no serious or critical violations', async ({ page }) => {
    await page.goto('/admin/year/2025');
    await page.waitForLoadState('networkidle');
    await page
      .getByRole('button', { name: /Groceries/ })
      .first()
      .click();
    await expectNoBlockingViolations(page, '/admin/year/2025 (Groceries isolated)');
  });

  test('admin-trip-detail (category isolated) has no serious or critical violations', async ({
    page,
  }) => {
    await page.goto('/admin/trips/bariloche-2026-01');
    await page.waitForLoadState('networkidle');
    await page
      .getByRole('button', { name: /Transport/ })
      .first()
      .click();
    await expectNoBlockingViolations(page, '/admin/trips/bariloche-2026-01 (Transport isolated)');
  });
});
