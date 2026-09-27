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
constraint, it's just correctly applying what's already there).

**Reconsidered after the first draft: charts use Recharts, not hand-rolled
SVG.** The original reasoning leaned on this repo's `.size-limit.json`
budget discipline, but that doesn't actually transfer here — those budgets
protect the **public**, recruiter-facing Lighthouse score, and `/admin` is
private, authenticated, and lazy-loaded the same way `TenureHeatmap` and
`TechTree` already are for `/skills` — none of it touches the public
routes' bundles. The other leg of the original reasoning ("hand-rolling is
good practice") doesn't hold either: the frontend was explicitly scoped as
work Claude does, not one of the stated Python/SQL/Claude-API learning
goals this whole project exists for. See §7 for what Recharts buys.

**Reversed after Phases A–F shipped: `/admin` gets the full portfolio
chrome, not a stripped-down one.** Two decisions below were made early,
before there was a real screen to look at — once Phase F's actual pages
existed side by side with the public site, it was clear both had
under-shot what "keep the core style" should have meant:

- **`react-intl` is back in scope.** The original reasoning ("an audience
  of exactly two people who both speak Spanish, translating for no one")
  wasn't wrong about the audience — it undervalued match-the-portfolio
  consistency as its own goal, and this project's explicit ask
  ("this app needs to support spanish, very similar to the portfolio app")
  overrides it directly. Every route shipped in Phases A–F has hardcoded
  English copy that needs retrofitting to message keys — 10 route/component
  files, comparable in size to the public site's existing 99-key
  `en-US.json`/`es-ES.json`. This is real, scoped work, not a footnote —
  see Phase G in §12.
- **`/admin` gets its own nav component, but shaped like `NavBar`, not a
  flat top bar.** The original plan's "own small nav" (right call — a
  GitHub icon has no place here) got built as a single top-of-page bar
  with inline links (Phase A). That underused "sharing the same design
  tokens and theme system" — the public site's actual defining visual
  trait is the **fixed side rail on desktop / bottom tab bar on mobile**
  layout (`app/components/NavBar/`, driven by the `$bp-*` breakpoint
  tokens), not just its color palette. `/admin` reuses that exact
  responsive layout pattern and the same breakpoint tokens, with its own
  content (Home / Year / Trips / Calendar + theme and locale toggles +
  sign-out) — a new `AdminNavBar` component, not `NavBar` itself (still
  no GitHub/Contact/CV items; the two navs share a layout skeleton, not a
  component). See Phase G in §12.

Keep, unchanged: dark/light theming (free via existing CSS custom
properties, and genuinely useful for checking finances at night), `Card`,
the skeleton pattern, route-local `ErrorBoundary`s, BEM everywhere, the
own-layout-route pattern already established in `app/routes/admin/index.tsx`.

---

## 2. Sections / routes

| Route                     | Purpose                                                    |
| ------------------------- | ---------------------------------------------------------- |
| `/admin`                  | Login — "Sign in with Google" button                       |
| `/admin/dashboard`        | **Home** (§13) — this year's months as cards, tap into one |
| `/admin/month/:yyyyMm`    | Month view (§4) — the core screen                          |
| `/admin/year`             | Redirects to the current year                              |
| `/admin/year/:year`       | Yearly review (§5)                                         |
| `/admin/calendar`         | Redirects to the current month's calendar                  |
| `/admin/calendar/:yyyyMm` | Calendar view (§14) — one month, day-by-day                |
| `/admin/trips`            | Vacation list                                              |
| `/admin/trips/:tripId`    | A single trip's spend (§6)                                 |

Matches the flat-route convention already in `app/routes/` (per the backend
doc's §6.1, refined here with the trips/calendar routes added).
`/admin/dashboard` changed meaning from Phase A's plan (redirect-to-
current-month) to an actual landing page once Home (§13) was added —
the nav's "Home" entry still points at the same URL, so nothing that
already links there needs to change, only what that URL renders.

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
2. **Pie chart** (Recharts, §7) — one arc per category.
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
- Month-by-month bar chart (Recharts, §7) — this is also where the
  `TenureHeatmap`-style year × month grid idea from the backend doc's §6.3
  fits naturally, as a "spending intensity" alternative view.
- **Decided: same-months-last-year comparison is a fast-follow, not v1.**
  Genuinely useful in Argentina's inflation context (the backend doc's §10
  caveat about ARS totals not being comparable month-to-month without the
  USD-equivalent applies doubly here) — but ship the simpler single-year
  view first and add the second overlapping series once that's proven out,
  rather than taking on the extra fetch and legend complexity from day one.
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
- **Shipped: read-only planned-vs-actual, not a write UI (Phase J).**
  "Plan/add vacation expenses" is answered by showing the trip's own
  `budget` (nullable — not every trip has one set, a distinct state from
  a zero budget) alongside its actual total, a plain CSS progress bar,
  and an over/under delta — the real expense entries still only ever
  arrive via Telegram, same as every other number in this app. This
  keeps the write-boundary principle intact (finance-tracker.md §6.6:
  "the real write-boundary is who's in the Telegram group") rather than
  opening a second, much bigger exception than the already-approved
  "Regenerate analysis" button (which only recomputes a derived summary
  and can't create or alter a financial record the way a real write UI
  here would have). A `planned` trip with no actual spend yet shows its
  budget with a "$0 spent so far" actual — same empty-state discipline
  as everywhere else, not a special case. The comparison always uses the
  trip's own total, never a category-isolated one, so isolating a
  category on the detail view doesn't make the budget appear to change.
  No invented warning/danger color for the over-budget state — same
  reasoning as the month view's over-last-month delta (§4): a neutral
  filled bar + bold text instead.
- No Claude analysis on the trip view for v1 (that's specifically a
  _monthly_ feature per the brief) — worth reconsidering once monthly
  analysis is proven out, not before.
- **Reopened, narrowly, as Phase K: manual planned line items.** Phase
  J's read-only budget-vs-actual didn't cover actually _planning_ a
  trip before it happens — just displaying a single number set ahead of
  time. See §15 for the design (schema, write-boundary implications,
  what does and doesn't change from Phase J).

---

## 7. Charts: Recharts

**Decided** (reconsidered from the original hand-rolled-SVG plan, see §1):
[Recharts](https://recharts.org/). SVG-based, not canvas — canvas charts
(e.g. Chart.js) make individual slices/bars harder to expose to screen
readers, which matters given this repo's existing accessibility bar (§10).
React-idiomatic, handles animation, tooltips, legends, and responsive
sizing without building any of that by hand. Added as a real dependency
once Phase B (§12) actually starts, not before — this doc records the
decision, it doesn't install the package.

- **Pie chart** (month + trip category breakdown): Recharts' `PieChart` +
  `Pie`, colored from the existing design-token palette extended with a
  category color mapping (don't invent a second palette). The
  isolate-a-category interaction (§4, §8) is Recharts' `activeIndex` /
  per-slice `onClick`, dimming inactive slices via `fillOpacity` rather
  than hand-computing which arc got clicked.
- **Bar chart** (yearly month-by-month totals): Recharts' `BarChart` + `Bar`.
- **The category list stays the primary interaction, not the chart
  itself** (§3, §10) — that decision doesn't change just because the chart
  is now a library. It was originally driven by mobile touch-target size
  and keyboard/screen-reader access, both still true regardless of what
  renders the pie. Recharts' own accessibility isn't perfect by default
  (it renders fine as SVG but doesn't automatically wire up ARIA labels
  per slice) — the list remains the accessible source of truth; the chart
  is `aria-hidden`, same as originally planned.
- Both live as thin wrapper components
  (`app/components/PieChart/`, `app/components/BarChart/`) around the
  Recharts primitives, following the existing component pattern (§14 of
  `AGENTS.md`) — colocated `style.css`, `index.test.tsx`,
  `index.stories.tsx` — rather than reaching for Recharts components
  directly from page code, so the rest of the app doesn't need to know
  which charting library is behind the wrapper.

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
- **Decided: yes, a "Regenerate" button on the frontend** — the one
  deliberate, narrow exception to the site's read-only principle. It's a
  meaningfully different risk category from editing a financial record:
  it only recomputes a derived summary from data that already exists, it
  can't corrupt or fabricate an expense, and it's a much better experience
  than switching to Telegram to type a command for something this minor.
  `finance-tracker.md`'s non-goals list needs a one-line carve-out added
  for this, so the two docs don't contradict each other. Needs a second
  new backend endpoint beyond the read one below:
  `POST /api/months/{yyyy-mm}/analysis/regenerate` — session-gated like
  every other admin endpoint, since this is the one place a bug or an
  unlocked phone could rack up avoidable Claude calls if it weren't.
- **Mid-month handling**: viewing the _current_, still-incomplete month
  and showing "you're overspending on X!" from thirteen days of data
  would be misleading. Recommendation: only auto-generate the analysis
  once a month has fully elapsed; the current month's analysis slot shows
  "available once the month ends" instead of forcing a premature summary.
  The regenerate button only makes sense on already-elapsed months for the
  same reason.

**Backend doc cross-reference**: `finance-tracker.md` §7 already has
`GET /api/months/{yyyy-mm}/analysis` (added in the previous revision) — it
still needs the new `POST .../regenerate` endpoint above, plus the
non-goals carve-out mentioned there.

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

## 11. Open questions

All forks raised across both review passes are resolved — see
[finance-tracker-ledger.md](finance-tracker-ledger.md) for the dated log
entries, and the sections below for the reasoning behind each: charts use
Recharts (§1, §7), the monthly analysis gets a frontend "Regenerate"
button (§9), the yearly last-year comparison is a fast-follow not v1 (§5),
and — reopened after Phases A–F shipped, then resolved and later shipped
as Phase J — vacation planning is a read-only planned-vs-actual view, not
a write UI (§6, §12). Reopened again, narrowly, after Phase J shipped: a
trip's `budget` alone doesn't let you actually plan one out line by line,
so Phase K adds manual planned-item entry — a deliberate, scoped
exception to the read-only principle, not a reversal of it (§6, §15). No
open forks remain in this doc; new ones that come up during
implementation get added here rather than decided silently.

---

## 12. Phased plan (frontend-specific)

Deliberately sequenced so real UI exists before the backend does — per the
earlier discussion, the frontend doesn't need to wait on backend
_implementation_, only on the API _contract_ (§4/§5/§6 above, plus the
backend doc's §7 endpoint list, are that contract).

- **Phase A — Static shell against fixtures.** Routes, layout, nav, the
  month view's structure. The API contract already exists as real code,
  not just prose: `app/data/admin-schema.ts` (Zod schemas + types for
  every endpoint response) and `app/data/admin-fixtures.ts` (hand-written
  fixtures that satisfy them) — written specifically so this phase and
  the backend's implementation can proceed in parallel against the same
  shape. Route loaders import the fixtures directly; no backend calls
  yet. Gets the "does this look and feel right" question answered fast
  and cheaply.
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

Added after Phases A–F shipped and were compared side by side against the
public site (§1's reversals):

- **Phase G — Portfolio-parity chrome.** The two reversals from §1, done
  together since they touch the same files: build `AdminNavBar` (side
  rail desktop / bottom tabs mobile, `$bp-*` tokens, theme + locale
  toggle, sign-out) to replace Phase A's flat top bar, and retrofit every
  existing route/component's hardcoded copy to `react-intl` message keys
  (new `app/intl/admin-en-US.json` / `admin-es-ES.json` — kept separate
  from the public site's `en-US.json`/`es-ES.json` rather than merged in,
  so an admin-only key never accidentally ships in the public bundle's
  message file). Blocks every phase below — they'd otherwise all need
  their own nav update.
- **Phase H — Home.** Repurposes `/admin/dashboard` from "redirect to
  current month" into an actual page (§13).
- **Phase I — Calendar.** New section (§14), built entirely from data the
  month endpoint already returns — no new backend surface needed.
- **Phase J — Vacation planning UI.** Read-only planned-vs-actual (§6) —
  the trip detail view shows `budget` alongside the actual total when a
  trip has one set. No write endpoints, no forms; the frontend stays
  read-only apart from the existing regenerate-analysis exception.
- **Phase K — Manual planned line items (§15).** The first phase that
  needs new backend surface rather than just new views over existing
  data — a real, frontend-originated write, not something relayed from
  Telegram. Frontend UI ships against fixtures first (local state only,
  same as every prior phase), the real persistence lands once the
  backend adds the endpoints §15 describes.

---

## 13. Home (`/admin/dashboard`)

New section, added after using the shipped Phases A–F and noticing there
was no actual landing page — logging in dropped you straight into
whatever month happened to be current, with no sense of the data as a
browsable whole.

- **This year's months, as cards, newest first** — reusing the exact data
  `GET /api/years/{yyyy}`'s `monthlyTotals` already returns (§5), just
  rendered as a tappable `Card` grid instead of bar-chart bars. No new
  backend endpoint: Home for the current year _is_ that year's
  `monthlyTotals`, read the same way the yearly view already does.
  Deliberately not "all months across all years" for v1 — that's a
  pagination/infinite-scroll problem worth solving once it's clear it's
  wanted, not assumed up front (same "prove it out first" reasoning
  already used for the yearly-comparison and trip-planning forks).
- Each card: month name, total (ARS, matching the rest of the app's
  ARS-primary convention), and a lightweight sparkline-free number only —
  no per-card chart. `Card`'s existing `texts` prop covers this without a
  new component.
- Tapping a card navigates to `/admin/month/:yyyyMm` — Home is a menu, not
  a second place that duplicates the month view's own content.
- **Empty state**: a brand-new install with zero months of data yet needs
  its own message ("Nothing logged yet — send an expense in the Telegram
  group to get started" or similar), distinct from a single empty month
  (which already has its own copy on the month view itself).
- Nav: this is what the admin nav's first item ("Home") links to — see
  Phase G (§12). The month-view-specific prev/next month arrows stay on
  the month view itself; Home doesn't need them, it already shows every
  month in the year at once.

---

## 14. Calendar (`/admin/calendar/:yyyyMm`)

Fully derivable from data the month endpoint already returns — every
`Transaction` already carries `occurredOn` as an exact `YYYY-MM-DD`
(`docs/finance-tracker-backend-kickoff.md` §6.1) — so this is a new
_view_ of existing data, not a new API surface.

Shipped once as a hand-rolled `<table>` (the original version of this
section), then rebuilt the same day on `react-day-picker` after a user
override asked for real calendar navigation and an amount-scaled color
mark — see `docs/finance-tracker-ledger.md`'s "Phase I rebuilt on
react-day-picker" entry for the full reasoning. Current shape:

- **One month at a time**, same URL-is-the-source-of-truth prev/next
  pattern as the month view (`/admin/calendar/2026-08`) — consistent
  with the rest of the app rather than a new navigation idiom. Navigation
  itself (prev/next buttons, keyboard arrow keys within the grid) is
  `react-day-picker`'s, wired to `navigate()` via a controlled
  `month`/`onMonthChange`. A native `<input type="date">` "jump to date"
  control in the header covers picking an arbitrary date directly
  (including one outside the currently displayed month) without needing
  a separate search feature.
- **A calendar grid**, one cell per day of the month, every day
  selectable (not just days with data — an empty day selects too and
  shows an explicit "nothing logged this day" message, rather than being
  non-interactive). Days with at least one transaction are colored by
  that day's ARS total relative to the month's single highest-spending
  day (low/mid/high tiers via `getCalendarDayTiers`) — a color mark
  similar to an airline booking calendar, not a binary dot. Days with
  nothing stay visually quiet, same "blank slate, not a broken-looking
  chart" principle applied to the month view's empty state (§4).
- **Selecting a day** shows that day's transactions — inline, expanding
  below the grid (not a route change to a per-day URL). A calendar is
  inherently a browsing tool where you might select several different
  days in a row; a full navigation per tap would be slower and would
  litter browser history with single-day views nobody will ever
  deep-link to. Selecting the same day again deselects/collapses it —
  same toggle idiom already used for category isolation (§4/§8), and
  free behavior from `react-day-picker`'s `mode="single"` (`required`
  left unset).
- **Accessibility, the same discipline as the pie/bar charts (§10)**: a
  calendar grid is itself a visual layout, not just a decorative chart,
  so it can't simply be `aria-hidden` with a hidden list bolted on the
  side the way the bar chart's month-by-month data is — the grid _is_
  the content here. `react-day-picker` renders a real `<table role="grid"
aria-label="…">` with `<th scope="col">` weekday headers (visually
  abbreviated, `aria-hidden` as a row since each day button's own
  accessible name already spells out its full weekday, e.g. "Saturday,
  August 1st, 2026") — a screen reader gets a normal, navigable data
  table, not div soup. The expanded day's transaction list is a real,
  focusable region (not aria-hidden) right below the grid.
- No isolate-a-category interaction here — a calendar's organizing axis is
  the day, not the category; category breakdown stays the month/year/trip
  views' job.

---

## 15. Phase K — manual planned line items for vacation planning

Raised during an adversarial review of the shipped admin section
(`docs/finance-tracker-admin-review-2026-09-27.md`, tracking notes,
not committed): Phase J's `budget` field lets you set a single
target number for a trip, but doesn't let you actually plan one out —
there's no way to jot down "flights: ~$180,000, hotel: ~$300,000"
ahead of time and see it add up. This section resolves that on paper
before any code changes, per this project's own convention of writing
forks down rather than deciding them silently mid-implementation.

### Why this is a bigger decision than Phases A–J

Every phase so far — including Phase J's budget display — was "a new
_view_ over data the backend already returns" (§14's calendar is the
clearest example: zero new backend surface, purely derived). Manually
adding a planned item is categorically different: it's a **write the
frontend itself originates**, not something relayed from Telegram.
That's exactly the boundary `finance-tracker.md` §6.6 draws ("the real
write-boundary is who's in the Telegram group") — so this is a
deliberate, narrow exception to it, not an oversight, and it needs to
be scoped tightly enough that it can't be mistaken for reopening
expense-entry in general.

### What doesn't change

- **Real expense data still only ever arrives via Telegram.** Nothing
  here lets either of you log an actual, already-spent expense from
  the UI. That boundary stays exactly where Phase J left it.
- **`total`, `categories`, and the Phase J budget-vs-actual comparison
  stay scoped to real, Telegram-sourced `transactions` only.** A
  planned item never enters that math — see the schema below for how
  that's enforced structurally, not just by convention.

### What's new: `plannedItems`

A trip gains a new, additive array — `plannedItems`, sitting alongside
`transactions` on `TripResponse`, never merged into it:

```ts
type PlannedItem = {
  id: string;
  description: string;
  estimatedAmount: { ars: number; usd: number };
  categoryId: string | null; // optional — a rough breakdown while planning
  done: boolean; // manually toggled, never automatic — see reconciliation below
};
```

Rendered on `/admin/trips/:tripId` as a new "Planning" section, above
"Categories"/"Transactions" — its own list, its own add-item form
(description + estimated ARS amount + optional category), a done
checkbox and a delete action per row. The section only renders when
there's something to show (`plannedItems.length > 0`, or the trip is
`planned`/`active`) — a `completed` trip that never used planning
doesn't grow an empty section, same empty-state discipline as
everywhere else in this app.

### Reconciliation: no auto-matching, on purpose

The obvious next question: when the real Telegram-logged flight
expense eventually lands as a `transaction`, what happens to the
planned item that estimated it?

**Decided: nothing happens automatically.** No matching by
description, amount, or date — that's real complexity (fuzzy matching,
false positives) for a tool two people use directly and could just as
easily handle themselves. Instead: a planned item is a lightweight
**checklist entry**, not a second ledger. Once the real expense is
logged and shows up under "Transactions," whoever's looking at the
trip manually checks the planned item off (`done: true`) or deletes
it. The two lists coexist and can visibly disagree for a while (a
planned "~$180,000" next to a real "$175,000" once it lands) — that's
expected, not a bug, since the planned figure was always an estimate.

This is also what keeps double-counting structurally impossible rather
than merely unlikely: `plannedItems` is never summed into `total`, so
there's no code path where a planned line item could inflate the
trip's actual spend, regardless of its `done` state.

### New backend surface (the actual scope-widening part)

Because this is a real write, it needs real endpoints —
`finance-tracker-backend-kickoff.md` §6's contract gets three new
rows once the backend is built:

- `POST /api/trips/{id}/planned-items`
- `PATCH /api/trips/{id}/planned-items/{itemId}` (edit, or flip `done`)
- `DELETE /api/trips/{id}/planned-items/{itemId}`

All session-authed, same as every other `/api/trips` endpoint.
`GET /api/trips/{id}` gains `plannedItems` in its response shape.

**Until the backend exists** (you're building it last, per the current
plan), the frontend piece of Phase K ships the same way every prior
phase did: against fixtures, with add/edit/delete only mutating local
component state (`useState`, reset on refresh) — enough to validate
the interaction design and demo it, explicitly not persisted yet. This
is called out here so it doesn't get mistaken for a finished feature
once it's built — the real backend wiring is Phase C's job, same as
every other endpoint.

### Also fixes, as part of the same UI work

A trip's `status` (`planned` / `active` / `completed`) is currently
only shown on the `/admin/trips` list card — the detail page never
renders it (a real gap the same review found independently: a
`planned` trip with nothing spent yet is visually indistinguishable
from a `completed` trip that simply has no data). A planning UI is
pointless if the page it lives on doesn't first say "this hasn't
happened yet," so Phase K's detail-page work adds the status badge to
the header too.
