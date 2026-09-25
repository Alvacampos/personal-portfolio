# Finance tracker — frontend plan

> Companion to [finance-tracker.md](finance-tracker.md) (the backend
> investigation) and [finance-tracker-ledger.md](finance-tracker-ledger.md)
> (the running work log). This file is frontend-only: the `/admin/*`
> section that lives in **this repo**. Status: **planned, not started** —
> already includes a self-adversarial-review pass, same as the backend doc
> got; genuine either-way forks are in §9, not silently decided.

## 1. Scope and what "keep the core style" actually means here

Reuse this repo's real conventions — BEM CSS via `getClassMaker`, design
tokens from `app/styles/constants.js`, `Card`/skeleton patterns, mobile-first
CSS (confirmed already the house style: `app/styles/constants.js` literally
says "Mobile-first min-width queries" — point 9 of the brief isn't a new
constraint, it's just correctly applying what's already there), and **no new
charting dependency** — this repo hand-rolls its one existing chart
(`TenureHeatmap` is a CSS grid, not a library), and pie/bar charts are
simple enough in raw SVG to keep that same minimal-dependency posture
rather than pulling in a charting package for two chart types.

**Two places where copying convention literally would be wrong, not
right**, caught by looking at what each convention is actually _for_:

- **Skip `react-intl` for `/admin`.** The public site is bilingual because
  it has two real visitor audiences. `/admin` has an audience of exactly
  two people who both speak Spanish — internationalizing a private tool
  nobody else will ever see is translation-maintenance overhead with no
  one to serve. Write the copy once, in whichever language you two
  actually think in Spanish/English for money (probably Spanish).
- **Don't reuse the public `NavBar`.** A "GitHub" icon and a "Contact" link
  have no place inside a private finance dashboard. `/admin/*` gets its own
  small nav (Month / Year / Vacations + a sign-out control), sharing the
  same design tokens and theme system, but not the same nav content. This
  likely wants its own layout route wrapping the admin pages (exact
  `@react-router/fs-routes` file-naming for a shared layout should be
  confirmed against the installed version at implementation time — the
  existing routes in this repo don't currently use a layout route, so this
  is a new pattern for this codebase, not precedent already in place).

Keep: dark/light theming (free via existing CSS custom properties, and
genuinely useful for checking finances at night), `Card`, the skeleton
pattern, route-local `ErrorBoundary`s, BEM everywhere.

---

## 2. Sections / routes

| Route                  | Purpose                              |
| ---------------------- | ------------------------------------ |
| `/admin`               | Login — "Sign in with Google" button |
| `/admin/dashboard`     | Redirects to the current month       |
| `/admin/month/:yyyyMm` | Month view (§4) — the core screen    |
| `/admin/year/:year`    | Yearly review (§5)                   |
| `/admin/trips`         | Vacation list                        |
| `/admin/trips/:tripId` | A single trip's spend (§6)           |

Matches the flat-route convention already in `app/routes/` (per the backend
doc's §6.1, refined here with the trips routes added).

---

## 3. Mobile-first, made concrete

"Mobile first" as a slogan doesn't tell you what to build — these are the
actual rules this plan follows, since the app will overwhelmingly be opened
on a phone, standing in a kitchen or a checkout line, not at a desk:

- **The transaction list is a stacked card list, not a table.** An HTML
  table with category/amount/date/payer columns doesn't fit ~360px width
  without horizontal scrolling or unreadable truncation. Reuse `Card`.
- **No hover-dependent interaction, anywhere.** Touch has no hover state.
  Every interactive affordance (isolating a pie slice, opening a filter)
  needs a tap target, not a reveal-on-hover.
- **Touch targets are finger-sized, not cursor-sized.** A thin pie slice is
  easy to tap precisely with a mouse, not with a thumb. The category **list**
  (§4) is the primary, always-reliable way to isolate a category — the pie
  chart is a visual complement to it, not the only way to do the same thing.
  (This single decision also solves the accessibility problem below —
  same fix, two problems.)
- **Filters live in a bottom sheet / slide-up panel**, not a sidebar of
  checkboxes assuming spare horizontal space.
- **Desktop gets a reflow, not a redesign** — wider viewports can show the
  chart and the list side by side using the existing `$bp-*` breakpoint
  tokens, but the mobile single-column layout is the one actually designed
  first, with desktop as the enhancement, not the other way around.

---

## 4. Month view — the core screen

This is the screen from the brief's point 5, worked through in order:

1. **Header**: month name + ‹ prev / next › arrows, URL is the source of
   truth (`/admin/month/2026-09`) so back/forward and direct links work.
   Monthly total always visible here, in ARS with a tap-to-toggle
   USD-equivalent (the backend already returns both, per
   `finance-tracker.md` §4.5) — shown with a small vs.-last-month delta
   (e.g. "▲ 8%"), since a number in isolation isn't very meaningful and
   this is a cheap, high-value addition Claude's analysis (below) can
   reference too.
2. **Pie chart** (hand-rolled SVG, §7) — one arc per category.
3. **Category list below the chart** (not beside it, on mobile) — each row
   is tappable. Tapping a category **is** the filter (this is the same
   interaction as "grey out sections for a cleaner analysis" from the
   brief — there's no separate filter UI bolted on, see §8): it dims the
   other pie slices, filters the transaction list to just that category,
   and shows that category's own total in place of (or alongside) the
   monthly total. Tapping it again clears the isolation.
4. **Transaction list** — the (possibly filtered) list of individual
   expenses for the month, as cards.
5. **Claude's monthly analysis** (§9) — a short written summary, at the
   bottom, per the brief. Read-only text, generated once per month and
   cached, not regenerated live as you tap through categories (see §9 for
   why, and for the one real tension this creates with "the frontend has no
   writes").

**States this screen needs, beyond the happy path**: an empty state (no
expenses logged yet this month — a blank slate, not a broken-looking
chart with nothing in it), a loading state per the existing
`app/components/skeletons/` pattern (the Claude analysis specifically can
have real latency on first generation — see §9 — so it gets its own
skeleton/placeholder independent of the rest of the page loading), and a
route-level `ErrorBoundary` for when the backend is unreachable (free-tier
cold starts / outages are an accepted trade-off per the backend doc's
costs section, so the frontend needs to fail visibly and cleanly, not
silently).

---

## 5. Yearly review

- Total for the year (ARS + USD-equivalent), category breakdown (same
  pie + list pattern as the month view — consistent interaction, not a
  new one to learn).
- Month-by-month bar chart (hand-rolled SVG, §7) — this is also where the
  `TenureHeatmap`-style year × month grid idea from the backend doc's §6.3
  fits naturally, as a "spending intensity" alternative view.
- Optional (nice-to-have, not blocking): a same-months-last-year comparison
  — genuinely useful in Argentina's inflation context (the backend doc's
  §10 caveat about ARS totals not being comparable month-to-month without
  the USD-equivalent applies doubly here), but adds a second data fetch and
  a legend explaining two overlapping series — worth having, not worth
  blocking v1 on.
- YTD is the same view, bounded at today instead of Dec 31 (per the
  backend's `/api/ytd`, same shape as `/years`).

---

## 6. Vacation section

Per the brief: similar structure to the month view, one per trip, and
possibly planning ahead — not just after-the-fact tracking.

- `/admin/trips` — a simple list of trips (past and, if planning is used,
  upcoming), each with its date range and total spend so far.
- `/admin/trips/:tripId` — same pie chart + category list + transaction
  list pattern as the month view (deliberately consistent, not a new
  layout to learn), scoped to that trip's tagged expenses instead of a
  calendar month.
- **"Maybe even plan them" is real scope, flagged as a stretch, not
  dropped**: this implies a trip can exist _before_ any spending happens —
  with a planned budget, and later a comparison of actual vs. planned. The
  backend's `trips` table (finance-tracker.md §4.7) should get a `status`
  (`planned` | `active` | `completed`) and a nullable `budget` column now,
  even though the planning UI itself is a fast-follow — cheap to add to
  the schema today, same "schema now, feature later" pattern already used
  for currency and trips themselves in the backend doc.
- No Claude analysis on the trip view for v1 (that's specifically a
  _monthly_ feature per the brief) — worth reconsidering once monthly
  analysis is proven out, not before.

---

## 7. Charts: hand-rolled SVG, not a library

A pie chart is a handful of `<path>` arcs computed from category totals; a
bar chart is rectangles. Both are genuinely tractable without a dependency,
and keep this project's demonstrated minimal-dependency posture (bare
`fetch` instead of the Resend SDK, a hand-built heatmap instead of a chart
library already) plus this repo's own size-limit budget discipline —
pulling in a full charting package for two chart types would be a real,
avoidable bundle-size cost.

- **Pie/donut** (month + trip category breakdown): one arc per category,
  colored from the existing design-token palette (extend it with a
  category color mapping, don't invent a second palette).
- **Bar** (yearly month-by-month totals): one rect per month, height scaled
  to the max.
- Both live as small, focused, testable components
  (`app/components/PieChart/`, `app/components/BarChart/`) following the
  existing component pattern (§14 of `AGENTS.md`) — colocated `style.css`,
  `index.test.tsx`, `index.stories.tsx`.

If hand-rolling the arc math turns out to be more annoying in practice than
expected, the fallback is a single small, tree-shakeable primitive (not a
full charting suite) — worth deciding with real code in hand, not in
advance.

---

## 8. Filtering

The brief's point 3 ("be able to filter data") and point 5's "zoom (grey
out) sections" turn out to be **the same feature**, not two — tapping a
category in the list (§4) both isolates it visually and filters the
transaction list underneath. That's the whole filter UI for v1: no
separate filter panel, no date-range-within-a-month control (you're
already scoped to a month by the URL), no amount-range slider. For ~20-60
transactions a month, that's plenty; a text search box across
descriptions is a plausible fast-follow if it turns out to matter in
practice, not a v1 requirement.

---

## 9. Claude's monthly analysis — the real design questions

The brief's UX description (pie chart → list → totals → written analysis)
is clear. What it doesn't specify, and what an adversarial pass has to
settle, is _when the analysis text gets generated and by what_:

- **Not live, not per-click.** The analysis is a single piece of text
  about the whole month, generated once — it does **not** regenerate as
  you tap categories to isolate them (§4). A live-regenerating analysis
  would mean a fresh Claude call per tap, which is both slow (real
  latency on every tap) and needlessly expensive. The chart/list
  interaction is purely client-side; the analysis is a separate, static
  fetch.
- **Generated once, cached, not on every page view.** Without caching,
  opening last month's view twice costs two Claude calls for identical
  data. New backend surface needed (not yet in `finance-tracker.md`'s
  endpoint list — added there, see the cross-reference at the bottom of
  this section): a `monthly_analyses` table (month, analysis text,
  generated_at) and `GET /api/months/{yyyy-mm}/analysis`, which generates
  and caches on first request, then serves the cached copy after.
- **Model choice differs from the Telegram ingestion path.** Parsing a
  short expense message is simple structured extraction — Haiku-class,
  per `finance-tracker.md` §4.2. Writing a paragraph of actual financial
  insight from a month of transactions is a generative task that benefits
  from a stronger model — recommend **Sonnet-class** for this specific
  call. Still cheap at "once a month," but it's not the same
  near-zero-cost category as per-message parsing, and shouldn't be assumed
  to be.
- **A real tension worth surfacing, not quietly resolving**: a
  "regenerate analysis" button is the one plausible write action on an
  otherwise read-only frontend, directly bumping into the backend doc's
  stated non-goal ("any write UI in the frontend"). Two honest ways to
  resolve it, not decided here — see §9's open question below.
- **Mid-month handling**: viewing the _current_, still-incomplete month
  and showing "you're overspending on X!" from thirteen days of data
  would be misleading. Recommendation: only auto-generate the analysis
  once a month has fully elapsed; the current month's analysis slot shows
  "available once the month ends" instead of forcing a premature summary.

**Backend doc cross-reference**: `finance-tracker.md` needs a new
`GET /api/months/{yyyy-mm}/analysis` endpoint added to its §7 table and a
`monthly_analyses` table noted alongside its schema discussion — tracked in
the ledger, not yet applied, since it's this document's job to surface it
and the backend doc's job to own the actual endpoint list.

---

## 10. Accessibility

This repo already invests real effort here (axe-core in CI, ARIA combobox
patterns, live regions on the contact form) — `/admin` should hold the same
bar, not a lower private-app-nobody-else-sees one:

- The category **list** (§4, §3) being the primary interaction — not just
  the SVG pie chart — is already required for mobile touch-target reasons,
  and it happens to also be exactly what a keyboard/screen-reader user
  needs: a real, focusable, labeled list of buttons achieves the same
  "isolate a category" outcome the pie chart offers visually. One decision,
  two requirements satisfied.
- Chart arcs get `aria-hidden` (decorative, matching this repo's existing
  icon convention) since the list is the accessible source of truth for
  the same information.

---

## 11. Open questions (genuine either-way decisions from this review)

- **Does "regenerate analysis" get a frontend button, or stay
  Telegram-only** (e.g. `/analyze september`, consistent with "all writes
  go through chat")? A button is more convenient for something this
  low-risk (it recomputes a derived summary, it doesn't touch financial
  records) but is a genuine, if narrow, exception to a stated principle.
- **Comparison-to-last-year on the yearly view**: worth the second data
  fetch and legend complexity for v1, or a clean fast-follow once the
  single-year view is proven out?
- **Trip planning** (§6): build the `status`/`budget` schema fields now
  (cheap) but is the planning _UI_ itself worth scoping into an early
  phase, or should it wait until after a couple of trips have been
  tracked retrospectively first, to see if planning is actually wanted in
  practice rather than assumed?

---

## 12. Phased plan (frontend-specific)

Deliberately sequenced so real UI exists before the backend does — per the
earlier discussion, the frontend doesn't need to wait on backend
_implementation_, only on the API _contract_ (§4/§5/§6 above, plus the
backend doc's §7 endpoint list, are that contract).

- **Phase A — Static shell against fixtures.** Routes, layout, nav, the
  month view's structure, using a local JSON fixture standing in for the
  real API response. No backend calls yet. Gets the "does this look and
  feel right" question answered fast and cheaply.
- **Phase B — Charts.** Pie chart + category-list interaction (§7, §8)
  against the same fixtures — the trickiest visual/interaction piece,
  worth isolating before wiring anything real.
- **Phase C — Auth + live integration.** Google OAuth gate, swap the
  fixture fetch for the real backend URL once its Phase 2 endpoints exist.
- **Phase D — Yearly view.** Bar chart, reuses the month view's
  interaction patterns.
- **Phase E — Claude analysis section.** Depends on the backend's new
  analysis endpoint (§9) existing.
- **Phase F — Vacations.** List + detail view, reusing the month/trip
  pattern; planning UI only if §11's open question resolves toward
  building it now rather than later.
