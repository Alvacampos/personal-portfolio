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
];

const BLOCKING_IMPACTS = ['serious', 'critical'];

test.describe('Accessibility (axe)', () => {
  for (const { name, path } of ROUTES) {
    test(`${name} has no serious or critical violations`, async ({ page }) => {
      await page.goto(path);
      // Use the same `networkidle` settle as visual.spec.ts so axe runs
      // against the fully-hydrated page, not a partial render.
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page }).analyze();

      const blocking = results.violations.filter(
        (v) => v.impact && BLOCKING_IMPACTS.includes(v.impact)
      );

      // Print every blocking violation's rule + selector so CI logs
      // surface the diagnosis without forcing a dev to open the report.
      if (blocking.length > 0) {
        const summary = blocking
          .map((v) => {
            const nodes = v.nodes.map((n) => n.target.join(' ')).join('\n      ');
            return `  - [${v.impact}] ${v.id}: ${v.help}\n      ${nodes}`;
          })
          .join('\n');

        console.error(`axe found ${blocking.length} blocking violation(s) on ${path}:\n${summary}`);
      }

      expect(blocking).toEqual([]);
    });
  }
});
