# Tech debt & roadmap

> Single tracker for what's open across the whole project. Three sections:
> **Technical** (infra, build, perf, CI), **Cleanup** (doc drift, data
> inconsistency, dead code), **UI / Features** (what's missing from a
> senior-IC CV site). Items are ticked off as PRs land.
>
> Priority scale (effort × impact):
>
> - **P0** — high impact, low effort. Ship first.
> - **P1** — high impact, medium effort.
> - **P2** — high effort, high payoff. Multi-PR.
> - **P3** — nice-to-have / low impact.

## Active bundles (investigation → plan → apply)

Remaining work is grouped into four substantive bundles. Each bundle
runs in three phases — **investigate** (research the surface area
without touching code), **plan** (decide the concrete sequence), then
**apply** (one or more PRs). Order is intentional: foundational tokens
first, then the last `/skills` quality gap, then a real feature, then
the framework cutover.

| #   | Bundle                | Items          | Phase | Notes                                                      |
| --- | --------------------- | -------------- | ----- | ---------------------------------------------------------- |
| 1   | Style-system overhaul | T16 + T10      | done  | Token sweep across `constants.js` + every CSS callsite     |
| 2   | `/skills` quality     | T5 + T11 + C13 | done  | Perf investigation + visual-gate decision + README refresh |
| 3   | Contact + CF infra    | U6 + T12       | done  | Pages Function + KV bindings                               |
| 4   | Framework future      | T9             | done  | React Router v7 migration + CF Pages → Workers cutover     |

All four bundles are shipped. The tracker is effectively closed — remaining
UI ideas (U10–U24) are **parked** under a decision noted below; the last
open technical item (C10) landed with the same PR that added this note.

### Bundle 1 — Style-system overhaul (T16 + T10)

**Why bundle.** Both touch [app/styles/constants.js](app/styles/constants.js) and every CSS callsite. Sequencing them in one workstream means tokens get sweep-edited once instead of twice.

- **Investigate — DONE.** `var(--token)` cannot be used inside `@media`
  queries. The MQL5 grammar (`<mf-value> = <number> | <dimension> |
<ident> | <ratio>`) admits no function tokens, and custom properties
  resolve per-element at computed-value time — there's no element
  context for `@media` evaluation. MDN states it directly: _"Variables
  do not work inside media queries and container queries"_ ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)).
  Confirmed unsupported in every mainstream browser; this is
  spec-level, not a vendor gap. Workaround options:
  - Stay on a preprocessor (postcss-simple-vars, Sass) for media-query
    tokens — build-time substitution, works everywhere.
  - `@custom-media` rule (MQL5 working draft Feb 2026) via
    `postcss-custom-media` — native support is essentially 0% in 2026,
    so this is still build-time anyway, just with different syntax.
  - JS-emitted token generators (Style Dictionary, etc.) — overkill
    for ~5 breakpoints.

  **Decision: keep `postcss-simple-vars` for breakpoint tokens only;
  migrate every other token to CSS custom properties.** This unifies
  the system with the existing `:root { --bg-*, --fg-*, --accent }`
  setup that already powers dark/light theming in [app/styles/style.css](app/styles/style.css)
  — there's already a CSS-custom-property layer there, we're just
  rolling the rest of the tokens into it. Breakpoints stay on
  simple-vars (which is what they already use today) so we don't have
  to invent a separate mechanism just for `@media`.

- **Plan.**
  1. **T16 first.** Migration plan is already written (see [T16
     entry](#t16--standardise-breakpoints-legacy--tailwind-aligned-scale-p1--done));
     remaps 17 legacy `$mobile-small`/`$desktop-small`/`$desktop-medium`
     callsites to `$bp-sm`/`$bp-md`/`$bp-lg`/`$bp-xl`/`$bp-2xl`. No
     other token changes in that PR — keeps the diff reviewable and
     the visual-baseline regen scope bounded to layout shifts at the
     new breakpoint boundaries.
  2. **T10 second.** Sweep every non-breakpoint token in
     [constants.js](app/styles/constants.js) (~50 colour/spacing/border/
     radius/typography/shadow entries) into `:root` custom properties.
     Keep the JSON-keyed export only for the breakpoint subset that
     simple-vars consumes. Drop the simple-vars `unknown` callback for
     non-breakpoint tokens — `var(--foo)` typos read as inherited
     `unset` rather than a build warning, so we'll need stylelint's
     `declaration-property-value-no-unknown` (now re-enableable) +
     potentially `stylelint-use-defined-vars` or a small custom check
     to keep the typo-catcher coverage. T10 likely splits into 2 PRs
     by category (palette + theme first, then spacing/typography/
     borders) to keep visual-baseline regen scoped.
- **Apply.** T16 PR (visual baseline regen) → T10a PR (colour + theme
  tokens) → T10b PR (spacing + typography + borders + shadows). Final
  PR re-enables stylelint's `declaration-property-value-no-unknown`,
  `shorthand-property-no-redundant-values`, `color-function-alias-notation`
  per the §6 note in [AGENTS.md](AGENTS.md).

### Bundle 2 — `/skills` quality (T5 + T11 + C13)

**Why bundle.** T5 + T11 are the last open items about `/skills`'s end-user experience (one perf, one visual-regression coverage). Investigating together avoids relearning the route's render path twice. C13 (README refresh) rides along because the perf investigation touches the Lighthouse narrative the README already cites.

- **Investigate — DONE.** Mined the per-merge `lighthouse/skills-index-*.summary.json` files instead of a fresh WebPageTest run; we have 20+ data points across recent commits and the pattern is clear.

  **T5 perf (current state):**
  - The T5 entry claims 0.87 baseline with LCP 3.5s / FCP 2.5s. **Stale.** Across the last ~20 merges to main, `/skills` index has scored Performance **0.94–0.98** on Lighthouse mobile (Lantern simulator), with median **FCP 1.5s / LCP 2.4s**. The d93e747 run that prompted this investigation (0.93, FCP 2.3s, LCP 2.7s) sits on the noisy end of the band, not the median.
  - TBT 0ms · CLS 0 · TTFB 79ms · Speed Index 2.3s — all excellent. **JS payload and edge latency are not bottlenecks.**
  - The 4 failing audits on `/skills` are all critical-path shape, not weight: `render-blocking-insight` (0), `network-dependency-tree-insight` (0), `unused-javascript` (0), `cache-insight` (0.5).
  - Roboto IS preloaded at root level (rides every route). Monaspace IS preloaded on `/skills`. The route stylesheet is 20.78 KB raw / 3.66 KB gzip — small.
  - **Verdict:** T5's 0.95 target is essentially met. Whatever marginal gain remains is in critical-path shape (fewer chained requests, smaller render-blocking CSS for FCP), not in any single big win. Marking T5 as a wider scope than warranted; **dropping the entry to a smaller follow-up**.

  **T11 visual gate (was the premise still true?):**
  - The exclusion list in [visual.spec.ts](tests/e2e/visual.spec.ts) covers _three_ routes, for **two different reasons**:
    1. `/skills/:uuid` + `/education` index — local Docker regen captures a `useLocation()` hydration overlay instead of the page. **T7's CI-side regen workflow solves this** (the race only fires in the local Docker env, not on the GitHub runner — we just used it on T16 for the breakpoint baselines and again on T10b for the equal-height card change). These two routes can be re-added.
    2. `/skills` index — separate problem. The tenure-heatmap renders ~30 SVG cells × ~10 years, anti-aliased per pixel. The grid drifts ~0.4% across regen environments invisible to the eye but consistently above the 0.2% diff budget. **A different visual-regression tool wouldn't escape this** — Percy/Chromatic also pixel-diff SVG. The only fixes are (a) masking the chart entirely (defeats the gate's point for that route) or (b) raising `maxDiffPixelRatio` to ~0.005 (gate becomes useless for content shifts).
  - **Verdict on T11:** dissolve. Re-add `/skills/:uuid` + `/education` index to ROUTES (via T7's workflow for the baselines); keep `/skills` index out with the now-clarified rationale (SVG anti-aliasing, not hydration race, not tool-fixable). **No paid service needed.**

- **Plan.**
  1. **C13 README refresh + visual-baseline how-to** (own PR, doc-only). Sweeps the ~20 PRs of drift documented in the C13 entry and adds a "Visual baselines" section covering both flows (`npm run test:visual:update` locally vs `regen-baselines.yml` on CI). Lands first because it's reviewable independent of code changes.
  2. **T5 + T11 in one PR**:
     - Re-add `/skills/:uuid` + `/education` index to the visual-spec ROUTES list. Dispatch `regen-baselines.yml` for fresh PNGs (those two routes never had committed baselines because the local regen kept failing).
     - Update the in-file exclusion comment in `visual.spec.ts` so future readers understand `/skills` index stays out for a different reason than the others.
     - Flip T5 + T11 to `done` in TECH-DEBT, with the updated rationale captured in the long-form entries. No code change in the perf direction — the data shows we're already at target.

- **Apply.** C13 first (doc-only, fast review). Then T5+T11 combined PR. C13 lands the bundle table flip; T5+T11 closes it out.

### Bundle 3 — Contact + CF infra (U6 + T12)

**Why bundle.** U6 (`/contact`) is what motivates T12 (Cloudflare bindings); they ship together or T12 is just speculative scaffolding.

- **Investigate — DONE.** Four research streams:

  - **Email provider — Resend.** Free tier is 3,000 emails/month with 100/day cap, 1 verified sending domain, 30-day log retention ([resend.com pricing docs](https://resend.com/pricing)). The `resend` npm SDK runs in Pages Functions without `nodejs_compat` — it's fetch-only with guarded `process.env` access; Resend publishes an [official Cloudflare Workers quickstart](https://resend.com/docs/send-with-cloudflare-workers). Bare-`fetch` against `POST https://api.resend.com/emails` is also viable (5-line implementation) if we want to avoid SDK dep-risk. **Loops is the wrong fit:** its free tier is marketing-focused (1,000 contacts cap, "Powered by Loops" footer); transactional sending is paid-plan only. No Cloudflare Workers guide. The Loops API requires pre-created `transactionalId` templates, awkward for a single-form contact endpoint.
  - **Spam protection — honeypot only, no Turnstile (yet).** Honeypot field catches generic form-spam bots with ~5 lines of code, zero deps, zero external calls. Modern LLM-driven scrapers can defeat it but for a CV site with zero existing spam traffic that risk isn't real yet. Turnstile is a fine fallback (free, WCAG 2.2 AA, three modes; siteverify endpoint with 300s single-use tokens) — keep it documented as "add if spam arrives" rather than premature complexity. **Both = marginal gain at the cost of two failure paths.**
  - **Rate limit — per-IP per-hour via KV.** Key: `ratelimit:<sha256(ip)>`, TTL 3600s. Read on POST; if count > 3, return 429. Otherwise increment and continue. KV's eventual consistency is fine for a soft rate limit (~5–60s propagation). Cost: 1 read + 1 write per submission, well under the free-tier limits.
  - **CF Pages Function pattern — no separate function needed.** The catch-all `functions/[[path]].ts` already routes every request through the Remix server build. The `/contact` route's `action` export receives the form `Request` and can read bindings via `context.cloudflare.env.*`. No new function file, just a new route module + a binding declared in `wrangler.toml` + the `worker-configuration.d.ts` regen via `npm run cf-typegen`.

- **Plan.**

  1. **Bindings + secrets** (`wrangler.toml`, `worker-configuration.d.ts`):
     - `RATELIMIT_KV` — KV namespace, per-IP submission counter.
     - `RESEND_API_KEY` — Secret (set via `wrangler secret put` or the Pages dashboard, not committed).
     - `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` — plain vars (the recipient inbox and the verified sender address on `gonzalo-alvarez-campos-cv.com`).
  2. **Route**: `app/routes/contact.tsx` with:
     - `meta` via `mergeRouteMeta` (title "Contact — Gonzalo Alvarez Campos", description from intl).
     - `loader` returns `{ siteKey: null }` (placeholder for Turnstile if added later); cache via `Vary: Cookie, Accept-Language`.
     - Default export — a `<Form method="post">` with name + email + subject + message fields, an inline `<input type="text" name="website" tabIndex={-1} aria-hidden="true" autoComplete="off">` honeypot, `useNavigation` to surface submitting state, and `useActionData` to render success/error/rate-limited messages. All copy via `react-intl`.
     - `action` parses the form, validates via Zod (`ContactSchema` — required name 2–80 char, email RFC, subject 2–120, message 10–4000), rejects on filled honeypot (silent 200), reads `RATELIMIT_KV` for the client's IP (`request.headers.get('CF-Connecting-IP')`), increments + 429 if over 3/hr, otherwise sends via Resend and returns `{ status: 'ok' }`.
     - Local `ErrorBoundary` mirroring the `/skills/:uuid` shape.
  3. **Intl keys** (~12 new entries in `en-US.json` + `es-ES.json`):
     - `CONTACT_PAGE_TITLE`, `CONTACT_LEAD` (the intro paragraph)
     - `CONTACT_NAME_LABEL`, `CONTACT_EMAIL_LABEL`, `CONTACT_SUBJECT_LABEL`, `CONTACT_MESSAGE_LABEL`
     - `CONTACT_SUBMIT`, `CONTACT_SUBMITTING`
     - `CONTACT_SUCCESS`, `CONTACT_ERROR`, `CONTACT_RATE_LIMITED`
     - `CONTACT_VALIDATION_REQUIRED`, `CONTACT_VALIDATION_EMAIL`, `CONTACT_VALIDATION_LENGTH`
  4. **NavBar entry** in [app/components/NavBar/index.tsx](app/components/NavBar/index.tsx) `MAIN_NAV` — labelled `NAV_CONTACT` (already used elsewhere? check or add), pointing at `/contact`.
  5. **Styling**: per-route stylesheet `app/routes/contact/style.css` (form layout, label/input spacing, error-state borders, success card). Reuses `route-page-title` global.
  6. **Tests**:
     - `tests/e2e/contact.spec.ts` — happy path (form renders, validation surfaces, mocked success state). Don't actually send email in tests.
     - Add `/contact` to a11y route iteration in `tests/e2e/a11y.spec.ts`.
     - Add `/contact` to visual ROUTES in `tests/e2e/visual.spec.ts` and regen baselines via the CI workflow.
  7. **Docs**: README "Updating content" gets a brief "Contact form configuration" subsection covering the three env-var/secret values. AGENTS.md §10 (Cloudflare Pages) gets a mention that bindings are now real, not commented templates.

- **Apply.** Single PR is fine — it's all one concern, and reviewing the form code separately from the wiring would be more confusing than less. Sequence inside the PR: bindings + types → route + action → intl keys → NavBar + styles → tests → docs. Closes both U6 and T12.

### Bundle 4 — Framework future (T9) — DONE

**Migrated (2026-07-01).** Site is now on React Router v7 (7.18.x) with Cloudflare Workers + Static Assets, replacing Remix v2 + CF Pages.

The safety-net branch `remix-version-backup` remains on origin at the last known-good Remix v2 SHA. If any regression surfaces post-deploy that isn't fixable forward, the rollback is: flip DNS in the CF dashboard back to the Pages project (Cloudflare keeps both parallel for a while), then `git reset --hard remix-version-backup` on main.

**Migration notes captured for posterity** (record what the runbook didn't cover):

- The codemod's `package.json` output references `@react-router/cloudflare-pages@^7.0.0` — **this package does not exist on npm.** Delete it manually. Also the codemod pins everything at `^7.0.0`; bump to current `^7.18.1`.
- The codemod wraps `Layout`'s JSX return in an outer `(...)`. Syntactically valid, cosmetically weird — Prettier normalises it.
- `flatRoutes()` from `@react-router/fs-routes` scans **every** file in `app/routes/`, including `.css`. Under Remix v2, the shared home-route stylesheet lived at `app/routes/style.css`; under RR v7 that path made the route plugin try to parse the CSS as a route module and crash. **Fix:** moved home route into `app/routes/_index/` (folder) with `index.tsx` + `style.css` inside — the plugin now sees the CSS as a route-adjacent file, not a top-level route candidate.
- `data(payload, { headers })` in a loader **doesn't propagate response headers automatically** in RR v7 the way it did in Remix v2. You have to explicitly export a `headers` function from the route that returns the loader-set headers:

  ```ts
  export function headers({ loaderHeaders }: { loaderHeaders: Headers }) {
    return loaderHeaders;
  }
  ```

  Added to `app/routes/skills._index/index.tsx` so the 1h `Cache-Control` + `Vary: Accept-Language, Cookie` still ship. Any future route that wants edge-cache behaviour needs this export too.

- **Static assets need explicit `env.ASSETS.fetch(request)` delegation from `workers/app.ts`.** With `run_worker_first: true`, every request hits the Worker first — including `/assets/*`, `/fonts/*`, `/favicon.ico`, etc. The RR handler returns 404 for those. Workaround: `workers/app.ts` checks a small allowlist of static-prefix paths and hands them off to `env.ASSETS.fetch(request)` before the RR handler runs. This replaces the Pages `_routes.json` exclusion list.
- **`virtual:react-router/server-build`** is only resolvable inside Vite. `wrangler dev` chokes on it. Use the classic pattern instead: `import * as build from '../build/server'`.
- **`renderToReadableStream` doesn't exist on `react-dom/server` in Node.** The codemod leaves it there — works in Workers (V8) but blows up under `react-router dev` (Vite's Node SSR runtime treats `/server` as CJS-only, and the Node build doesn't export `renderToReadableStream` anyway). Original v7 fix: `import { renderToReadableStream } from 'react-dom/server.browser'` + `app/react-dom-server-browser.d.ts` shim. **Superseded by the RR v8 sweep** — the `.browser` subpath's scheduler calls `MessageChannel`, which Cloudflare Workers doesn't expose at our compat date. Current entry uses `react-dom/server.edge` + `app/react-dom-server-edge.d.ts`; see [docs/migrations/rr7-to-rr8.md](docs/migrations/rr7-to-rr8.md).
- **`workers/app.ts`'s `../build/server` import needs eslint-disable for `import/no-unresolved`.** The file only exists after `npm run build`; CI runs lint before build. Locally you might not notice if `build/` is present. Same pattern the old `functions/[[path]].ts` used.
- **Phase C (`Route.LoaderArgs` type migration) was skipped as unnecessary.** The pre-migration plan called for adopting the generated `Route.LoaderArgs` / `Route.ComponentProps` pattern because `useLoaderData<typeof loader>()` "silently lies" under Single Fetch's turbo-stream serialiser (which preserves `Date`/`Map`/`undefined` where JSON-narrowed types don't). Audited our loaders post-migration: none of them return those types in their payloads (Date is used internally to compute numbers; nothing exports Map or undefined). The classic typing is accurate for our codebase. Not worth the mechanical churn or the tsc-`.js`-extension fight in `.react-router/types/`. Re-open if a future loader returns a `Date` object.

**What the investigation surfaced** (record so future-self doesn't relearn it cold):

- **The codemod is a starting point, not a finished migration.** Running `npx codemod remix/2/react-router/upgrade` rewrites imports across the codebase but produces:
  - A `package.json` that references `@react-router/cloudflare-pages` — **this package does not exist on npm.** The codemod's template assumes a Pages adapter that was never published.
  - `functions/[[path]].ts` rewritten to import from the non-existent package — broken.
  - Stale `future:` flags left in `vite.config.ts` even though Single Fetch is the default in v7.
  - `package.json` scripts (`build`, `dev`, `start`, `preview`, `deploy`) not all updated.
  - `overrides.@remix-run/dev` block left in `package.json`.
  - The peer-dep on `react-router-dom@6.30.4` not removed.
- **Cloudflare's official 2026 stance is "RR v7 apps run on Workers, not Pages".** There is no first-party `@react-router/cloudflare-pages` adapter, and the "Pages-via-bridge" path I documented in the original investigation is fragile — the codemod doesn't support it cleanly, so the migration is effectively forced into a Pages → Workers deploy change in the same PR as the framework swap.
- **Scope estimate:** 30–50 files changed in one combined PR (codemod output + manual fixes + `workers/app.ts` + `wrangler.jsonc` + `_headers`/`_routes.json` port + `ci.yml` updates + `load-context.ts` + test-utils + Storybook preview). Multi-hour focused session, not "do it while we chat".

**Original three-PR plan** (kept for reference — actually shipped as a single combined PR + a follow-up docs commit, not the split originally imagined):

1. **PR 1 — Codemod + dep swap.** Run codemod, manually fix the bogus `@react-router/cloudflare-pages` reference, create `app/routes.ts` + `react-router.config.ts`, drop `app/single-fetch.d.ts`, delete the `react-router-dom` pin, drop all `v3_*` future flags. Keep deploying to CF Pages via the transitional bridge.
2. **PR 2 — Cloudflare Workers cutover.** Replace `functions/[[path]].ts` with `workers/app.ts`, port `_headers` + `_routes.json` into `wrangler.jsonc`, set `run_worker_first: true`, smoke-test against a `*.workers.dev` URL **before** flipping the custom-domain DNS. Highest-risk PR.
3. **PR 3 — Type cleanup.** _Dropped_ — the audit showed our loaders don't emit types Single Fetch would preserve differently. See the last bullet under "Migration notes captured for posterity" above.

The single-PR path ended up being cleaner because PRs 1 + 2 turned out to be entangled: the CF Pages bridge the plan assumed (`@react-router/cloudflare-pages`) doesn't exist on npm, so keeping the Pages deploy path alive between PR 1 and PR 2 wasn't actually feasible.

**Investigation findings** (kept verbatim since they're the substantive research output):

- **Investigate — DONE.** Walked the [official RR v7 upgrade guide](https://reactrouter.com/upgrading/remix), Cloudflare's [Workers + React Router framework guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/), and the [CF Pages → Workers migration docs](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/). Headline findings:

  **The boring parts (mostly automated).**

  - Package renames are handled by `npx codemod remix/2/react-router/upgrade`:
    - `@remix-run/react` → `react-router` (shared APIs — `Link`, hooks, `redirect`, `data`, etc.)
    - `@remix-run/cloudflare` → `@react-router/cloudflare`
    - `@remix-run/dev` → `@react-router/dev`
    - `react-router-dom@6.30.4` devDep → **delete** (v7 collapses the dual-package setup, finally resolving the T15-era pinning workaround)
  - Vite plugin renames: `vitePlugin as remix` → `reactRouter` from `@react-router/dev/vite`. `future:` block disappears entirely. Config moves to a new `react-router.config.ts` (`{ ssr: true }`).
  - **Single Fetch is default in v7** — `v3_singleFetch` flag and `app/single-fetch.d.ts` augmentation can both be deleted with no behaviour change.
  - Flat routes still work — `skills.$uuid/`, `_index.tsx`, `contact._index/` directory conventions all continue to function. Just add an `app/routes.ts` exporting `flatRoutes()` from `@react-router/fs-routes`.
  - `loader`/`action`/`meta` exports unchanged. `LoaderFunctionArgs` etc. move to `react-router`.

  **The real landmine — Cloudflare Pages → Workers cutover.**

  - There is **no first-party `@react-router/cloudflare-pages` adapter**. Cloudflare's official position in 2026 is that React Router v7 apps deploy to **Workers + Static Assets**, not Pages. `@remix-run/cloudflare-pages` has no v7 equivalent.
  - This means the catch-all `functions/[[path]].ts` + `createPagesFunctionHandler` pattern goes away. Replacement: a `workers/app.ts` exporting a `fetch` handler that calls `createRequestHandler` from `@react-router/cloudflare`.
  - `_headers` (1y immutable cache on `/assets/*`) and `_routes.json` (excludes `/data/*` from the Function) translate into `wrangler.jsonc` asset rules + `run_worker_first: true`.
  - The 1h `Cache-Control` on `/skills` and `Vary: Accept-Language, Cookie` segmentation need re-verification on the Workers path — semantics should be identical but worth a manual smoke test against prod.
  - **Bridge option:** `npx wrangler pages functions build` compiles the existing `functions/` folder into a Worker; Cloudflare explicitly documents this as transitional. For a 12-route SSR app it's only useful as a stopgap to keep the dep-rename PR small.

  **Type system upgrade — adjacent, optional, recommended.**

  - `useLoaderData<typeof loader>()` typing **silently degrades** under v7's default Single Fetch — the turbo-stream serialiser preserves `Date`, `Map`, `undefined`, but JSON-narrowed types lie about that. The fix is the new generated-types pattern: `import type { Route } from './+types/<route>'` → `Route.LoaderArgs`, `Route.ComponentProps`. Auto-generated into `.react-router/` (gitignore + add to `tsconfig.include`).
  - Replaces `useLoaderData<typeof loader>()` everywhere. Not a blocker, but the right way to land on v7.

  **Other heads-ups.**

  - `defer()` is deprecated — return Promises directly. We don't use `defer()`, so a non-issue.
  - Visual baselines will likely shift (different hydration script tags, possible `Layout` export pattern changes) — plan one CI regen pass.
  - Storybook 10 supports RR v7's `react-router` package; the preview decorator's `createMemoryRouter` usage stays the same.

- **Plan — three PRs, sequenced.**

  1. **PR 1 — Codemod + dep swap (low risk, biggest auto-changed footprint).** Run `npx codemod remix/2/react-router/upgrade`, manually review the diff, add the new `app/routes.ts` + `react-router.config.ts`, rename Vite plugin, rename entries (`ServerRouter`/`HydratedRouter`), delete `react-router-dom` pin, delete `app/single-fetch.d.ts`, drop all five `v3_*` future flags. **Keep deploying to Cloudflare Pages** via the `wrangler pages functions build` bridge so the deploy path doesn't change in the same PR as the framework swap. Gates green (typecheck, tests, lint, build, e2e behavioural). Visual baselines may need a single regen.
  2. **PR 2 — Cloudflare Workers cutover (highest risk, smallest dep diff).** Replace `functions/[[path]].ts` with `workers/app.ts`, port `_headers` + `_routes.json` into `wrangler.jsonc` asset rules, set `run_worker_first: true`, update `npm run deploy` to `wrangler deploy`, smoke-test the deploy against prod (including the 1h `/skills` cache + locale `Vary`). Lighthouse should be unchanged — same edge, same SSR runtime.
  3. **PR 3 — Type cleanup (low risk, mechanical).** Migrate loaders + components to `Route.LoaderArgs` / `Route.ComponentProps`, drop `LoaderFunctionArgs` imports, regen visual baselines if anything shifts. Closes the migration.

- **Apply.** Three PRs in sequence. Wait for each to merge + go green on prod before opening the next. **PR 2 is the one to be careful about** — if anything breaks the prod deploy it'll be that one, so consider doing it on a weekend and having `wrangler pages deploy` ready as the rollback path while the bridge is still in place.

**Sources** (Bundle 4 investigation):

- [React Router 7 upgrade guide](https://reactrouter.com/upgrading/remix) — canonical 9-step path + codemod command.
- [React Router framework Cloudflare guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/) — confirms Workers-only stance and `wrangler.jsonc` setup.
- [Cloudflare Pages → Workers migration](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/) — `wrangler pages functions build` bridge and `run_worker_first` requirement for SSR.
- [React Router framework installation](https://reactrouter.com/start/framework/installation) — confirms `@react-router/dev` Vite plugin + `@react-router/cloudflare` adapter shape.

## Status

| ID  | Section   | Priority | Item                                                           | Status |
| --- | --------- | -------- | -------------------------------------------------------------- | ------ |
| T1  | Technical | P0       | a11y test coverage in CI (axe-playwright)                      | done   |
| T2  | Technical | P0       | Lighthouse gating in CI                                        | done   |
| T3  | Technical | P0       | Stop serving `/data/*` publicly                                | done   |
| T4  | Technical | P0       | `fetchpriority="high"` on company logo (`/skills/:uuid`)       | done   |
| T5  | Technical | P1       | Recover `/skills` Lighthouse perf (0.87 → 0.95+)               | done   |
| T6  | Technical | P1       | Bundle visualizer audit                                        | done   |
| T7  | Technical | P1       | Move visual-baseline regen to CI workflow                      | done   |
| T8  | Technical | P1       | Remove `legacy-peer-deps=true`                                 | done   |
| T9  | Technical | P2       | React Router v7 migration                                      | done   |
| T10 | Technical | P2       | postcss-simple-vars → CSS custom properties                    | done   |
| T11 | Technical | P2       | Switch to Percy/Chromatic for `/skills` visual gate            | done   |
| T12 | Technical | P3       | Cloudflare KV / D1 / R2 bindings (for contact form)            | done   |
| T13 | Technical | P3       | Drop unused `@chromatic-com/storybook`                         | done   |
| T14 | Technical | P3       | Replace husky with simple-git-hooks                            | done   |
| T15 | Technical | P3       | `import/no-relative-parent-imports` ESLint rule                | done   |
| T16 | Technical | P1       | Standardise breakpoints (legacy → Tailwind-aligned scale)      | done   |
| T17 | Technical | P3       | Locale-split intl bundles                                      | parked |
| T18 | Technical | P3       | AST-precompile intl messages                                   | closed |
| C1  | Cleanup   | P0       | Doc drift: README locale claims                                | done   |
| C2  | Cleanup   | P0       | Doc drift: README "Future Plans" (Python/Django, contact form) | done   |
| C3  | Cleanup   | P0       | Doc drift: AGENTS.md cross-refs to README plans                | done   |
| C4  | Cleanup   | P1       | Data: `Mentoring` ranges (Endava + Qubika missing)             | done   |
| C5  | Cleanup   | P1       | Data: `Leadership` ranges (Qubika missing?)                    | done   |
| C6  | Cleanup   | P2       | Rename ambiguous `Programming` meta skill                      | done   |
| C7  | Cleanup   | P2       | Merge `getSkillsForJob` into `getSkillGroupsForJob`            | done   |
| C8  | Cleanup   | P3       | Move `mergeRouteMeta` out of `utils.tsx`                       | done   |
| C9  | Cleanup   | P3       | Move `FORWARD_GROUPS` out of TechTree component                | done   |
| C10 | Cleanup   | P3       | Validate `name_es` typos against a locale registry             | done   |
| C11 | Cleanup   | P3       | Verify `npm run build:og` still works                          | done   |
| C12 | Cleanup   | P3       | Audit `app/assets/icons/` for orphans                          | done   |
| C13 | Cleanup   | P1       | README refresh + visual-baseline how-to                        | done   |
| U1  | UI        | P0       | Real Home hero (value prop + metrics + CTAs)                   | done   |
| U2  | UI        | P0       | Print stylesheet (CV page printable)                           | done   |
| U3  | UI        | P0       | Promote in-progress Bachelor's on `/education`                 | done   |
| U4  | UI        | P0       | Locale-aware date format on `/education` (match `:slug`)       | done   |
| U5  | UI        | P0       | Match contrast fix on DownloadBtn hover state                  | done   |
| U6  | UI        | P1       | `/contact` route (CF Pages Function + Resend / Loops)          | done   |
| U7  | UI        | P1       | Case studies — `/projects/<slug>` (3-5 deep-dives)             | done   |
| U8  | UI        | P1       | Per-route OG images                                            | done   |
| U9  | UI        | P1       | 404 page polish (match `/skills/:uuid` error UI)               | done   |
| U10 | UI        | P1       | Spanish CV PDF (flip `HAS_ES_CV`)                              | parked |
| U11 | UI        | P2       | `/blog` or `/notes` — engineering write-ups                    | parked |
| U12 | UI        | P2       | Heatmap cell tooltips (hover detail)                           | parked |
| U13 | UI        | P2       | Cmd-K / `/` keyboard shortcut for skills filter                | parked |
| U14 | UI        | P2       | Realtime "viewers" badge (CF Durable Objects)                  | parked |
| U15 | UI        | P2       | Edge-side A/B testing on hero copy (CF Workers)                | parked |
| U16 | UI        | P3       | Second accent color (alongside GitHub Green)                   | parked |
| U17 | UI        | P3       | Display-weight typography for `h1`s                            | parked |
| U18 | UI        | P3       | Skill chip hover tooltips ("Used at: X · N years")             | parked |
| U19 | UI        | P3       | Mobile hamburger / FAB pattern                                 | parked |
| U20 | UI        | P3       | Endorsements / testimonials section                            | parked |
| U21 | UI        | P3       | GitHub activity stream (public contribs)                       | parked |
| U22 | UI        | P3       | Extended filter chips on `/skills` (by category)               | parked |
| U23 | UI        | P3       | Per-job duration totals as a stat strip                        | parked |
| U24 | UI        | P3       | `prefers-reduced-motion` sweep beyond LocaleToggle             | parked |

---

## 1. Technical

### T1 — a11y test coverage in CI (P0) — DONE

`@axe-core/playwright` is wired into [tests/e2e/a11y.spec.ts](tests/e2e/a11y.spec.ts) and runs on every route as part of the `e2e-tests` CI job. Serious/critical violations fail the build; other levels are surfaced as report annotations.

### T2 — Lighthouse gating in CI (P0) — DONE

`lighthouse-pr` job in [.github/workflows/ci.yml](.github/workflows/ci.yml) runs pre-merge against the wrangler-built preview and fails the PR on performance regressions. Post-merge scoring still commits summaries under `lighthouse/` for the trend view.

### T3 — Stop serving `/data/*` publicly (P0) — DONE

Superseded by the Pages → Workers migration. [workers/app.ts](workers/app.ts) delegates only a small allowlist to `env.ASSETS.fetch()` (`/assets/`, `/fonts/`, `/.well-known/`, `/favicon.ico`, `/robots.txt`, `/sitemap.xml`); everything else — including `/data/*` — falls through to the RR handler, which has no route and 404s. Vite bakes the JSON into the server bundle, so route loaders read it without an HTTP hop.

### T4 — `fetchpriority="high"` on company logo (P0) — DONE

Added `fetchPriority="high"` + `decoding="async"` on the `<img>` in [app/routes/skills.$uuid/index.tsx](app/routes/skills.$uuid/index.tsx).

### T5 — Recover `/skills` Lighthouse perf (P1) — DONE

The 0.87 baseline was already gone by the time this entry was investigated. Bundle 2's investigation mined the 20+ per-merge `lighthouse/skills-index-*.summary.json` summaries and found median Performance **0.94–0.98**, FCP **1.5s**, LCP **2.4s** — TBT 0, CLS 0, TTFB 79ms. Target (0.95+) is met on most runs. The remaining failing audits are critical-path shape (render-blocking, network dependency tree, unused JS, cache lifetimes) with no single big win available — bumping further would mean shaving milliseconds across each audit, not landing one fix. Closing this entry; if a future regression drops a route below 0.90, file a new perf entry rather than reopening this one.

### T6 — Bundle visualizer audit (P1) — DONE

Ran `npx vite-bundle-visualizer` on a fresh `npm run build`. **Total client JS: 393 KB raw / 127 KB gzip across all routes.** Per-route initial-page cost ≈ 115 KB gzip (components + root + utils + route chunk + entry.client). Findings:

- **`components-BRNNisoL.js` — 253 KB raw / 80 KB gzip.** React + ReactDOM + Remix runtime. The dominant chunk by far; no easy wins without dropping React itself.
- **`utils-BgqF83j_.js` — 76 KB raw / 21 KB gzip.** Mostly `date-fns` (`format`, `formatDuration`, `intervalToDuration`, `differenceInMonths`) + the Spanish locale data. Already using named imports — date-fns v3+ is fully tree-shakeable, so this is already the minimum cost for those 4 functions + ES locale.
- **`root-JC5yJIQD.js` — 31 KB raw / 11 KB gzip.** root.tsx + IntlProvider + react-intl runtime + @formatjs internals.
- **`react-vertical-timeline-component`** is in its own lazy chunk (`index-CZhEOpFy.js`, 8 KB) and only loads when `/skills` is visited. Not a bottleneck.
- Per-route chunks (0.6–5 KB each) are appropriately tiny.

**Conclusion: JS payload is not the perf bottleneck.** T5's 0.87 LCP on `/skills` is more likely CSS-side (route stylesheet bundling, font critical path) or server-response latency. Bundle audit findings reduced the T5 search space significantly.

### T7 — Move visual-baseline regen to CI workflow (P1) — DONE

[.github/workflows/regen-baselines.yml](.github/workflows/regen-baselines.yml) provides `workflow_dispatch`-triggered baseline regeneration in the CI environment. Commits the fresh PNGs back to the dispatched branch. The hydration race that plagued the local Docker path never reproduces here.

### T8 — Remove `legacy-peer-deps=true` (P1) — DONE

Resolved by the React 19 upgrade + the Remix v2 → RR v7 → RR v8 sweep. No `.npmrc` in the repo; peer-deps resolve cleanly under strict mode.

### T9 — React Router v7 migration (P2) — DONE

Migrated Remix v2 → RR v7 → RR v8. Landed alongside the CF Pages → Workers cutover. Framework notes in [docs/migrations/remix-to-rr7.md](docs/migrations/remix-to-rr7.md) and [docs/migrations/rr7-to-rr8.md](docs/migrations/rr7-to-rr8.md) — the RR v8 doc captures the property-based load-context handoff, the `.edge` SSR entry, and the nonce-via-React-context pattern that superseded the loader-data approach.

### T10 — postcss-simple-vars → CSS custom properties (P2) — DONE

Migrated in two PRs (T10a + T10b). End state: every non-breakpoint token in the system lives as a CSS custom property declared in [app/styles/style.css](app/styles/style.css)'s `:root` block. Only the 5 breakpoint tokens (`$bp-sm` through `$bp-2xl`) remain on postcss-simple-vars, because `var()` is invalid inside `@media` preludes (CSS spec — see Bundle 1 investigation). [app/styles/constants.js](app/styles/constants.js) shrank from ~150 lines (with palette, legacy aliases, spacing/typography/borders/weights/shadows) to ~40 lines (breakpoints + their doc comment).

- **T10a — DONE.** Migrated the color palette and semantic theme tokens (`--bg-*`, `--fg-*`, `--accent*`, `--border-default`, `--border-emphasis`). The 26 in-file `$gray-*`/`$green-*`/`$surface-*`/`$border-card-*` simple-vars references were replaced with raw hex values; 12 legacy color aliases (`$default-white`, `$success-green`, `$text-color`, etc.) were audit-confirmed unused and deleted. Consumption sites already used `var(--accent)` etc., so component CSS didn't need changes.
- **T10b — DONE.** Swept the remaining numeric scale tokens (`--space-*`, `--font-*`, `--border-N`, `--weight-*`) across 16 stylesheets in one mechanical pass. Dropped 4 unused tokens (`$space-24`, `$space-48`, `$space-60`, `$shadow-1`) during the sweep. Re-enabled the three stylelint rules that were disabled while simple-vars confused the parser (`declaration-property-value-no-unknown`, `shorthand-property-no-redundant-values`, `color-function-alias-notation`); the third surfaced 7 `rgba()` callsites which auto-fixed to modern `rgb(... / α)`. Added two typo-catchers to replace the simple-vars `unknown` callback: `custom-property-no-missing-var-function` (catches `--token: --otherToken` written without `var()`) and `custom-property-pattern` enforcing kebab-case.

### T11 — Switch to Percy/Chromatic for `/skills` visual gate (P2) — DONE (dissolved)

The original premise was that three routes were excluded for two reasons and a paid tool might fix both. The Bundle 2 investigation separated the two reasons:

1. **`/skills/:uuid` + `/education` index** were out because of a local-Docker `useLocation()` hydration race — not a tool problem, an environment problem. **T7's CI-side regen workflow already runs Playwright in the actual CI container where the race doesn't fire** (proven on T16 and T10b PRs). Both routes are gated again as of this PR. Baselines captured via `gh workflow run regen-baselines.yml`.
2. **`/skills` index** is excluded for a different reason: the tenure-heatmap renders ~30 SVG cells × ~10 years on a tight grid, and sub-pixel anti-aliasing drifts ~0.4% across environments. **Percy / Chromatic pixel-diff SVG the same way** — they wouldn't escape this. The only "fixes" are masking the chart (defeats the gate) or raising the diff budget to ~0.5% (gate becomes useless for content shifts).

So T11 dissolves: no tool switch needed, the visual gate now covers `/`, `/education`, `/education/:slug`, and `/skills/1` (a stable detail page), with `/skills` index documented out for a permanent reason rather than a fixable one. See [tests/e2e/README.md](tests/e2e/README.md#why-skills-index-isnt-gated) for the updated rationale.

### T12 — Cloudflare KV / D1 / R2 bindings (P3) — DONE

Landed with Bundle 3 (U6 `/contact` route). [wrangler.jsonc](wrangler.jsonc) now declares the `RATELIMIT_KV` binding + `CONTACT_FROM` / `CONTACT_TO` vars; [worker-configuration.d.ts](worker-configuration.d.ts) is regenerated via `npm run cf-typegen`, and the contact action reads them via `context.cloudflare.env.*`. Additional bindings (D1, R2, Durable Objects) can slot in the same file when a consumer lands.

### T13 — Drop unused `@chromatic-com/storybook` (P3) — DONE

Dep removed from `package.json`. Visual regression is covered by Playwright ([tests/e2e/visual.spec.ts](tests/e2e/visual.spec.ts)).

### T14 — Replace husky with simple-git-hooks (P3) — DONE

Replaced husky with `simple-git-hooks`. The pre-push script now lives at [scripts/pre-push.sh](scripts/pre-push.sh) (was [.husky/pre-push](.husky/pre-push)) and gets wired in via a new `simple-git-hooks` block in `package.json` plus a `prepare` script that invokes the binary. Migrating an existing clone requires `git config --unset core.hooksPath` once (husky set it to `.husky/_`); fresh clones don't need that step.

### T15 — `import/no-relative-parent-imports` ESLint rule (P3) — DONE

Implemented as a `no-restricted-imports` rule (the upstream `import/no-relative-parent-imports` rule resolves aliased paths to absolute paths, which false-positives on every `~/`-prefixed import in `app/`). The rule bans literal `../*` import specifiers and points authors at `~/*` (for `app/`) or the new `~data/*` alias (for `public/data/`). Added `~data/*` to both `tsconfig.json` and `jsconfig.json` so route loaders that read static JSON can use it. One escape hatch at `functions/[[path]].ts` (the Pages Function entrypoint legitimately imports the build output at `../build/server`).

### T16 — Standardise breakpoints (legacy → Tailwind-aligned scale) (P1) — DONE

All 17 legacy callsites swept to the Tailwind-aligned scale: `$mobile-small` (496) → `$bp-sm` (640); `$desktop-small` (1076) → `$bp-lg` (1024); `$desktop-medium` (1296) → `$bp-xl` (1280). Added `$bp-2xl: 1536px` for future ultrawide work. Deleted the three legacy keys from [constants.js](app/styles/constants.js). Also caught a hardcoded `(min-width: 1076px)` in [TenureHeatmap/index.tsx](app/components/TenureHeatmap/index.tsx) that mirrored the CSS breakpoint and updated it to `1024px` so JS and CSS gate at the same width.

**Original plan + current state for reference:**

[app/styles/constants.js](app/styles/constants.js) exports two parallel sets of breakpoint tokens:

| Token             | Value  | Usages | Origin                                                    |
| ----------------- | ------ | ------ | --------------------------------------------------------- |
| `$mobile-small`   | 496px  | 4      | Legacy — pre-Tailwind. Awkward; mid-phone-landscape band. |
| `$desktop-small`  | 1076px | 10     | Legacy — splits iPad Pro 11" landscape (1194) awkwardly.  |
| `$desktop-medium` | 1296px | 2      | Legacy — Tailwind `xl` (1280) + 16px noise.               |
| `$bp-sm`          | 640px  | —      | Tailwind-aligned. Currently unused in code.               |
| `$bp-md`          | 768px  | ~6     | iPad portrait, in use.                                    |
| `$bp-lg`          | 1024px | ~6     | iPad landscape / small laptops, in use.                   |
| `$bp-xl`          | 1280px | —      | Standard desktop. Currently unused.                       |

17 legacy usages across 10 stylesheets (4 routes + 4 components + 1 route shell + 1 helper) plus 12 new-token usages. The mixed scale makes it impossible to reason about a layout's break behaviour without opening the constants file.

**Goal.** Single mobile-first scale anchored to common device viewport widths, aligned with Tailwind v4 (also matches Bootstrap 5 and Material). Drop the three legacy tokens; add `$bp-2xl` for ultrawide content-max-width work.

**Target scale (`@media (min-width: $bp-*)`)**:

| Token     | Value  | Devices this catches                                          |
| --------- | ------ | ------------------------------------------------------------- |
| _(base)_  | < 640  | Every phone in portrait (320 SE → 430 Pro Max).               |
| `$bp-sm`  | 640px  | Phone landscape (~700-900 wide). Compact tablets.             |
| `$bp-md`  | 768px  | iPad portrait (744-834). Z Fold inner. Large phone landscape. |
| `$bp-lg`  | 1024px | iPad landscape (1024-1194). Small laptops.                    |
| `$bp-xl`  | 1280px | iPad Pro 12.9" landscape. Standard 13-15" laptops.            |
| `$bp-2xl` | 1536px | 27" external monitors. Cap content max-width above this.      |

Standardising on the Tailwind scale means future contributors (or AI agents) can map directly between Tailwind utility prefixes and our token names without translation.

**Migration plan (one PR, ~30 min):**

1. Add `$bp-2xl: 1536px` to [app/styles/constants.js](app/styles/constants.js).
2. Sweep all 17 legacy usages and remap:
   - `$mobile-small` (496) → `$bp-sm` (640). Affected: [Input](app/components/Input/style.css), [Timeline](app/components/Timeline/style.css), [skills.$uuid](app/routes/skills.$uuid/style.css), [skills.\_index](app/routes/skills._index/style.css). The +144px floor is intentional — modern phones in portrait now go up to 430px wide, so the legacy 496 fires mid-landscape on most flagships. Re-test each affected layout at 412-640 to confirm the new floor is comfortable.
   - `$desktop-small` (1076) → `$bp-lg` (1024). Affected: [Card](app/components/Card/style.css), [Input](app/components/Input/style.css), [TenureHeatmap](app/components/TenureHeatmap/style.css), [Timeline](app/components/Timeline/style.css), all four routes that use it. The -52px lift is small enough that most layouts should hold; the TenureHeatmap explicitly tuned for 1076 (see [TenureHeatmap/style.css#L139](app/components/TenureHeatmap/style.css#L139)) — verify the transposed grid still fits at 1024.
   - `$desktop-medium` (1296) → `$bp-xl` (1280). Affected: [Timeline](app/components/Timeline/style.css), [skills.\_index](app/routes/skills._index/style.css). The -16px shift is below visual noise.
3. Delete `mobile-small`, `desktop-small`, `desktop-medium` keys from [constants.js](app/styles/constants.js).
4. Regenerate visual baselines via the CI workflow ([.github/workflows/regen-baselines.yml](.github/workflows/regen-baselines.yml)) — every gated route (`/`, `/education/:slug`) likely shifts at the 768/1024/1280 boundaries.
5. Update [AGENTS.md §6](AGENTS.md#L6) and the doc comment in [constants.js](app/styles/constants.js#L122) to reflect the single scale.

**Out of scope.**

- **Sub-640 breakpoint** (e.g. 414 / 480 for large-phone-landscape). web.dev's mobile-first guidance is to let content dictate rather than chase devices; base styles should already cover this band cleanly. Revisit only if a real layout regression appears.
- **`prefers-reduced-motion` / `prefers-color-scheme` queries** — orthogonal to this work; tracked separately (U24).
- **Container queries** (`@container`). Worth piloting on a single component (e.g. Card) once we're off the legacy scale, but not a prereq for this migration.

**Devices on the bubble worth manually testing after migration:** iPhone SE 1st gen (320), Galaxy S24 (360), iPad mini portrait (744), iPad Pro 11" landscape (1194), 13" MacBook external (~1440). Chrome DevTools Responsive mode + the Pixel 7 Playwright project cover most of this.

Sources consulted:

- [Tailwind v4 responsive design](https://tailwindcss.com/docs/responsive-design) — sm/md/lg/xl/2xl = 640/768/1024/1280/1536.
- [MDN Responsive Design](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design) — prefer content-driven over device-driven breakpoints; rem/em over px.
- [web.dev — Responsive Web Design basics](https://web.dev/articles/responsive-web-design-basics) — let content dictate; minimise breakpoint count.

### T17 — Locale-split intl bundles (P3)

Currently both `en-US.json` (~10 KB) and `es-ES.json` (~10 KB) statically import into the root chunk, so English visitors ship the Spanish messages and vice-versa. Splitting into per-locale chunks with a `<link rel="preload" as="fetch">` for the resolved locale would save ~2 KB gz per visitor. Non-trivial: IntlProvider needs the messages synchronously at render, so this means either (a) an async loader ping before hydration completes, or (b) SSR emits the compiled locale as an inline JSON island and hydration reads it back. Deferred until the payload becomes a bottleneck.

### T18 — AST-precompile intl messages (P3) — INVESTIGATED, no win

Ran an experiment on 2026-07-08: `@formatjs/cli compile --ast --format simple` output at `app/intl/compiled/*.json`, wired into `IntlProvider` via a build step. Bundle-size delta on real chunks: **`root` +0.26 KB gz, `utils` unchanged**. The perf agent's ~8-10 KB gz claim assumed the ICU parser would tree-shake once messages arrive as AST — in practice `react-intl` v10 already tree-shakes the parser aggressively (source references to `icu-messageformat-parser` symbols don't appear in the built `utils` chunk), so precompile is a wash. Reverted the whole approach. Reopen only if a future react-intl major regresses the current tree-shake.

### T19 — `getClassMaker`'s object-modifier form ignores the element (P1)

Found 2026-09-27 while building `/admin`'s nav. `getClassMaker(block)(element, { key: bool })` appends `` `${block}--${key}` `` (the bare block, from the closure — see `app/utils/utils.tsx`'s `getClassMaker`), **not** `` `${block}__${element}--${key}` `` — so any call combining a non-empty `element` with an object modifier silently emits a block-level modifier class instead of an element-scoped one. CSS written as `.block__element--modifier` (the natural, expected form) never matches; the intended style silently never applies. Confirmed one real, pre-existing occurrence outside `/admin`: `app/components/Input/index.tsx`'s `getClasses('suggestion-item', { active, empty })` — `.input-component__suggestion-item--active`/`--empty` in `style.css` never match; the combobox's active-suggestion highlight has likely never actually rendered. Functionality isn't lost (`aria-selected` still drives real keyboard/screen-reader behavior), but the visual highlight is dead code that looks like it should work.

Not fixed here — `/admin`'s own six occurrences (introduced across Phases A/B/D/F/G) were fixed in place with compound selectors (`.block__element.block--modifier`) rather than changing the utility, since `getClassMaker` is used everywhere and changing its behavior risks unrelated breakage across the whole public site. `Input`'s occurrence is still broken and deserves its own fix — either the same compound-selector treatment, or fixing `getClassMaker` itself (bigger: would need auditing every existing `--modifier` CSS selector in the codebase for ones that already, coincidentally, rely on the current block-only behavior).

### T20 — Public `NavBar`'s active nav-link overflows its rail, masked by `overflow: hidden` (P3)

Found 2026-09-27 while fixing the identical bug in `/admin`'s own nav (`AdminNavBar`, copied from this component's structure): `.navbar-component__nav-link` sets `width: 100%` and, at `$bp-md`+, adds horizontal padding (`padding: 0 var(--space-12)`) with no `box-sizing: border-box` — the active link measures 224px in a 201px-wide rail (confirmed via `getBoundingClientRect()`), a real 24px overflow, not just a visual nit. It's invisible in practice because `.navbar-component` already has `overflow: hidden` for an unrelated reason (its own comment: "Stop hover/focus pills from overflowing the rail's right edge") — that same property happens to clip this overflow too, by coincidence rather than by design.

Not fixed here — this is the live public site, out of scope for the `/admin`-focused work that surfaced it, and the current behavior is harmless (nothing visibly breaks, `overflow: hidden` already contains it). The actual fix, if ever done, is the same one applied to `AdminNavBar`: add `box-sizing: border-box` to `.navbar-component__nav-link` so `width: 100%` correctly includes the padding instead of adding to it.

---

## 2. Cleanup / data / docs

### C1 — Doc drift: README locale claims (P0) — DONE

[README.md](README.md) describes the actual chain: `?lang=` URL param → `locale` cookie → `Accept-Language` header, with the visible NavBar toggle.

### C2 — Doc drift: README "Future Plans" (P0) — DONE

Section removed. Contact form shipped as U6; the Python/Django backend never happened and stays deleted.

### C3 — Doc drift: AGENTS.md cross-refs to README plans (P0) — DONE

AGENTS.md no longer references the removed "Future Plans" section; the intl description now matches the actual `?lang=` → cookie → header chain.

### C4 — Data: `Mentoring` ranges (P1) — DONE

Ranges now `[{ jobId: 3 }, { jobId: 4 }, { jobId: 6 }]` — Professor + Endava (internship program) + Qubika (senior internship + frontend mentor).

### C5 — Data: `Leadership` ranges (P1) — DONE

Ranges now `[{ jobId: 4 }, { jobId: 6 }]` — Endava + Qubika.

### C6 — Rename ambiguous `Programming` meta skill (P2) — DONE

Renamed to "Teaching Programming" (`Enseñanza de Programación`) in [public/data/skills.json](public/data/skills.json). The meta-skill is tagged on Professor + Teacher roles; the verb-first form reads naturally next to the existing "Teaching" chip and disambiguates from the literal act of writing code.

### C7 — Merge `getSkillsForJob` into `getSkillGroupsForJob` (P2) — DONE

Dropped `getSkillsForJob` from [app/utils/utils.tsx](app/utils/utils.tsx); its single consumer (`/skills` index timeline cards) now calls `getSkillGroupsForJob(SKILLS, item.id, locale).flatMap((g) => g.items)`. Side effects: timeline-card chips are now (a) locale-aware (previously always English for meta skills) and (b) deterministically ordered (`language → framework → tooling → infra → meta`, alphabetical within each) instead of SKILLS-array order. Test suite trimmed accordingly.

### C8 — Move `mergeRouteMeta` out of `utils.tsx` (P3) — DONE

Extracted `mergeRouteMeta`, `RouteMetaOverrides`, and the `SITE_URL` constant into [app/utils/meta.ts](app/utils/meta.ts). All 6 route consumers updated to import from `~/utils/meta`. `utils.tsx` now sits at ~340 lines, focused on layout/data helpers; the meta-tag concern lives in its own module.

### C9 — Move `FORWARD_GROUPS` out of TechTree component (P3) — DONE

Moved `FORWARD_GROUPS` + the `ForwardGroup` type into [app/components/TechTree/forward-groups.ts](app/components/TechTree/forward-groups.ts). The component now just imports the constant. Kept the data co-located with the component rather than promoting it to `skills.json` — these are aspirations (no SKILLS entry, no range), not job experiences, so the data shape doesn't match the skill-first schema.

### C10 — Validate `name_es` typos against a locale registry (P3) — DONE

`SKILL_NAME_ES_REGISTRY` in [app/data/skills-schema.ts](app/data/skills-schema.ts) is now the canonical map of English → Spanish skill names. The Zod `superRefine` on the skills payload checks each `SKILLS[].name_es` against the registry and throws a path-precise error on mismatch or on a `name_es` set for a skill with no registry entry. Committed with the tests in [app/data/skills-schema.test.ts](app/data/skills-schema.test.ts), including one that re-parses `public/data/skills.json` so a real drift between the file and the registry fails CI, not prod.

### C11 — Verify `npm run build:og` still works (P3) — DONE

Ran `npm run build:og` on `main` after the per-route OG PR landed. All four PNGs (`og-home.png`, `og-education.png`, `og-projects.png`, `og-skills.png`) re-rendered deterministically with no byte drift against the committed copies. The script reads `scripts/og/<slug>.svg`, swaps in the title/tagline at template time, and writes to `public/assets/img/og-<slug>.png` via `@resvg/resvg-js`. Repeatable + idempotent.

### C12 — Audit `app/assets/icons/` for orphans (P3) — DONE

Audited the 8 source SVGs against the codebase. All map to a real consumer: `Briefcase` (NavBar + Timeline), `Education` (NavBar + Timeline + both education routes), `GithubIcon`, `Home`, `LinkedinIcon`, `Paper` (all NavBar), `Sun` + `Moon` (ThemeToggle). No orphans to remove.

### C13 — README refresh + visual-baseline how-to (P1) — DONE

[README.md](README.md) has drifted across the last ~20 PRs. Concrete stale or missing items:

- **Stale claims to fix:**
  - "husky" pre-push hook → migrated to simple-git-hooks in T14.
  - `npm run build:og` writes `og.png` → now writes 4 per-route PNGs (`og-home`, `og-skills`, `og-education`, `og-projects`) via U8.
  - "Visual baselines for `/`, `/education`, `/education/:slug`" — `/education` index was excluded; current list is `/` + `/education/:slug`.
  - "Design tokens via simple-vars / unknown callback" — migrated to CSS custom properties in T10a/T10b with stylelint typo-catchers (`custom-property-no-missing-var-function`, `custom-property-pattern`).
  - Roadmap line about React Router / Next migration → currently tracked as T9 (React Router v7), Next.js no longer on the table.
- **Features shipped without README coverage:**
  - Lighthouse CI gating (T2) + the `lighthouse/` per-commit summary commit-back flow.
  - a11y testing via `@axe-core/playwright` (T1).
  - `/data/*` no longer publicly served — JSON only reaches the client via the rendered route (T3).
  - Per-route OG images (U8): `scripts/og/<slug>.svg` templates rendered by `npm run build:og`.
  - `/projects` index + `/projects/:slug` case studies (U7).
  - Print stylesheet for the CV pages (U2).
  - ESLint `~/`-alias enforcement + `~data/*` alias for `public/data` JSON imports (T15).
  - Standardised `.route-page-title` utility (recent doc PR).
  - Bundle 1 style-system overhaul: Tailwind-aligned breakpoint scale (T16), CSS custom properties migration (T10a + T10b).
- **Missing how-to sections:**
  - **Visual baselines** — two paths, both worth documenting in README rather than scattered across `tests/e2e/README.md` and AGENTS.md:
    - Local Docker: `npm run test:visual:update` (requires Docker Desktop, slower on Apple Silicon under amd64 emulation).
    - CI workflow: `gh workflow run regen-baselines.yml --ref <branch>` or the Actions UI dispatch. Runs in the exact CI environment so output is pixel-perfect; commits new PNGs back to the dispatched branch automatically.
  - **Updating content** — pointer to `public/data/skills.json` + `public/data/education.json` + the localisation pattern (`_es` siblings, `localized()` helper).
  - **Adding a locale** — pointer to `app/intl/index.ts`'s `SUPPORTED_LOCALES` list + `LocaleToggle` `--knob-index` math, with a 3-step recipe.

Bundled into Bundle 2 (`/skills` quality) because the perf investigation phase touches the lighthouse story anyway and the prose changes pair naturally with that.

---

## 3. UI / features

### U1 — Real Home hero (P0) — DONE

[app/routes/\_index/index.tsx](app/routes/_index/index.tsx) renders the hero: value prop, `yearsOfExp` chip, "Currently at Qubika" badge, and CTA row (CV download + primary section links).

### U2 — Print stylesheet (P0) — DONE

`@media print { ... }` block in [app/styles/style.css](app/styles/style.css) forces the light palette, hides the nav, and reflows the content column for A4.

### U3 — Promote in-progress Bachelor's on `/education` (P0) — DONE

Both `/education` index and `/education/:slug` render a "Currently studying" badge on any entry whose `endDate > todayYearMonth`. Detail-page parity added in [fix/minor-ux-and-size-budgets](.).

### U4 — Locale-aware date format on `/education` (P0) — DONE

Index now uses `formatDate(..., 'MMMM yyyy', locale)` for both degrees and certifications — "March 2024 → September 2027" / "marzo 2024 → septiembre 2027" — matching the detail page.

### U5 — Match contrast fix on DownloadBtn hover state (P0) — DONE

Hover state now resolves via the `--accent-on-muted` token in [app/components/DownloadBtn/style.css](app/components/DownloadBtn/style.css) — same primitive as the fixed LocaleToggle. Passes axe contrast checks in both palettes.

### U6 — `/contact` route (P1) — DONE

`/contact` action at [app/routes/contact.\_index/index.tsx](app/routes/contact._index/index.tsx) validates via Zod, rate-limits per hashed IP (`ratelimit:contact:<sha>` in `RATELIMIT_KV`, 3/hour), silent-drops honeypot fills (including non-string bypass attempts), and posts to Resend via bare fetch. See [docs/security.md](docs/security.md) for the full posture.

### U7 — Case studies — `/projects/<slug>` (P1) — DONE

`/projects` index + `/projects/<slug>` detail routes shipped with [app/data/projects-schema.ts](app/data/projects-schema.ts) driving the content. Each case study carries Problem / Constraints / Approach / Outcome sections, tech-stack chips, and `_es` sibling localization.

### U8 — Per-route OG images (P1) — DONE

`scripts/render-og-image.mjs` (invoked via `npm run build:og`) renders `og-home.png`, `og-skills.png`, `og-education.png`, `og-projects.png` from per-route SVG templates. `mergeRouteMeta` picks the right one via the `ogImage` prop on each route.

### U9 — 404 page polish (P1) — DONE

[app/routes/$.tsx](app/routes/$.tsx) is a splat that throws a 404 Response inside its loader, so the root `ErrorBoundary` runs with locale resolved. Shared 404 copy across every unknown URL.

### U10–U24 — Parked (2026-07-01)

The four active bundles delivered the site's core proposition (skill-first
model, tenure heatmap, /skills detail pages, /education timeline, /projects
case studies, /contact form on CF Workers + Resend, per-route OG, print
stylesheet, a11y + Lighthouse gates, RR v7 + Workers migration). The
remaining UI ideas below are **parked**, not open. Two reasons:

1. **The app is at its content density limit.** The mobile NavBar is
   already at the edge of what fits without a hamburger drawer, and the
   `/skills` page carries the tenure heatmap + TechTree + timeline +
   autocomplete on one route. Adding tooltips (U12, U18), stat strips
   (U23), or a Cmd-K modal (U13) makes each surface heavier for
   diminishing recruiter signal.
2. **The items are demo-driven, not user-driven.** U14 (Durable Objects
   viewer count), U15 (edge A/B on the tagline), U21 (GitHub activity
   feed) are CF Workers show-off features that visitors don't need.
   They belong in a separate demo project if the interviewing signal is
   what's wanted.

**Individually parked:**

- **U10** (Spanish CV PDF): the site already falls back cleanly to the
  English PDF for `es` visitors via `getCvUrl` in [app/utils/utils.tsx](app/utils/utils.tsx#L18).
  Not worth producing a translated design for a low-traffic asset.
- **U11** (`/blog` or `/notes`): the README "AI Assistance" section
  captures the useful write-up already. A blog surface would need
  ongoing content.
- **U12, U13, U17, U18, U22, U23** (heatmap tooltips, Cmd-K, display
  typography, chip tooltips, extended filter chips, stat strip): pure
  polish; the base UX is already at 0.95+ Lighthouse across routes.
- **U14, U15, U21** (viewers badge, edge A/B, GitHub feed): interview
  demo material that adds surface without user value.
- **U16, U19** (second accent, hamburger/FAB): visual identity changes;
  the current GitHub-green + sidebar+bottom-nav pattern is stable.
- **U20** (endorsements): friction is asking managers, not the code.
- **U24** (`prefers-reduced-motion` sweep beyond LocaleToggle): only
  ThemeToggle + Timeline animate meaningfully; both are under 300 ms
  and unlikely to trip vestibular sensitivity.

If any of these gets revisited, restore the individual `### Un — ...`
section and flip the row in the Status table back to `open`.

---

## How to use this file

1. Pick an open item (start with P0s).
2. Mark **status** column → `in-progress`, create the PR.
3. When merged → `done` (and check off the entry in any open PR description that referenced it).
4. New items get appended to the right section and added to the Status table.

Status legend: `open` / `in-progress` / `done` / `parked` (deliberately
not pursuing; reason recorded above) / `dropped` (decided not to do).
