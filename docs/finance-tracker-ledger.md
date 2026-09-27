# Finance tracker — work ledger

> Single running record across **both** halves of the project — the backend
> (separate repo, not yet created) and the frontend (`/admin/*` in this
> repo). Two jobs: (1) a status table so you can pick up work at any time
> without re-deriving where things stand, (2) a dated log of what was tried,
> what got backed out, and why — so a reversed decision doesn't get
> silently re-tried later. Update both as work happens; this file is only
> useful if it stays current.
>
> Status legend (mirrors `TECH-DEBT.md`'s convention): `open` / `in-progress`
> / `done` / `parked` (deliberately not pursuing; reason recorded in the log)
> / `dropped` (decided not to do).

## Status

### Planning

| Item                                         | Status | Notes                                                                    |
| -------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| Backend investigation (`finance-tracker.md`) | done   | Investigation + roadmap, adversarial-reviewed, four open forks resolved. |
| Frontend plan (`finance-frontend.md`)        | done   | Adversarial-reviewed; all 4 open forks resolved (§11).                   |
| This ledger                                  | done   | Seeded with the decision history so far.                                 |

### Backend (separate repo — not yet created)

| Phase                                         | Status | Notes                                                                            |
| --------------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| Phase 0 — Scaffolding                         | open   | Not started.                                                                     |
| Phase 1 — Database & schema                   | open   | Blocked on Phase 0 only.                                                         |
| Phase 2 — Core read endpoints                 | open   |                                                                                  |
| Phase 3 — Telegram plumbing                   | open   |                                                                                  |
| Phase 4 — Claude integration                  | open   |                                                                                  |
| Phase 4B — Receipt photos                     | open   | Fast-follow after Phase 4.                                                       |
| Phase 4C — Monthly Claude analysis endpoint   | open   | Surfaced by the frontend plan §9; both endpoints now in `finance-tracker.md` §7. |
| Phase 5 — Auth (Google OAuth)                 | open   |                                                                                  |
| Phase 6 — Frontend integration (backend side) | open   |                                                                                  |
| Phase 7 — Hardening                           | open   |                                                                                  |

### Frontend (this repo, `/admin/*`)

| Phase                                   | Status | Notes                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase A — Static shell against fixtures | done   | Routes, `admin` layout + nav, month view (header/categories/transactions/analysis) against fixtures, e2e-covered. Chart + isolate interaction is Phase B.                                                                                                                                                                                                                                                 |
| Phase B — Charts (pie + category list)  | done   | Recharts pie chart + category-list isolate/filter interaction, e2e-covered. Bar chart is Phase D.                                                                                                                                                                                                                                                                                                         |
| Phase C — Auth + live integration       | open   | Blocked on backend Phase 5 existing for real, but the shell can be built against fixtures first.                                                                                                                                                                                                                                                                                                          |
| Phase D — Yearly view                   | done   | Bar chart + same pie/category isolate pattern as month view, e2e-covered. Same-year-over-year comparison remains a fast-follow, not v1.                                                                                                                                                                                                                                                                   |
| Phase E — Claude analysis section       | open   | Blocked on backend Phase 4C.                                                                                                                                                                                                                                                                                                                                                                              |
| Phase F — Vacations                     | done   | Trips list + detail (pie/category isolate, no analysis), e2e-covered. Trip/status/budget schema promoted from "future, not v1" to real endpoints — planning UI still deliberately deferred (frontend §6).                                                                                                                                                                                                 |
| Phase G — Portfolio-parity chrome       | done   | `AdminNavBar` (side rail desktop / bottom tabs mobile) + react-intl retrofit of Phases A–F, e2e + a11y-covered. PR #334.                                                                                                                                                                                                                                                                                  |
| Phase H — Home                          | done   | Repurposes `/admin/dashboard` into a real landing page — this year's months as cards, newest first, `getYearFixture` shared with the yearly view (frontend §13). e2e + a11y-covered. PR #335 (also folded in a real-browser review round: 4 root-cause layout bugs, category-name i18n, trip status/duration badges, Year click-to-month).                                                                |
| Phase I — Calendar                      | done   | Day-by-day view of a month. Shipped once as a hand-rolled `<table>` (PR #336), then rebuilt on `react-day-picker` the same day per user override — real keyboard/prev-next navigation, a native date-jump input, and amount-tier day coloring ("airline calendar" style). PR #337. No new backend surface, fully derived from the month endpoint's existing `occurredOn` field (frontend §14). e2e + a11y-covered. A pre-existing mobile layout bug (`SearchFilterBar`'s search input overflowing into the sibling "Jump to month"/trip-search control) found while reviewing #337 was fixed separately in PR #338, since it wasn't specific to Calendar. |
| Phase J — Vacation planning UI          | open   | Decided: read-only planned-vs-actual (frontend §6) — `budget` shown alongside actual total, no write endpoints/forms.                                                                                                                                                                                                                                                                                     |

## Decision log

Newest first. Each entry: what was decided or tried, and why — especially
the "we tried X and backed out" entries, which are the ones worth having a
record of.

### 2026-09-27 — Phase I rebuilt on `react-day-picker` after user override

PR #336 (the hand-rolled `<table>` calendar below) merged, then got
reopened the same day: asked what "select" should mean, the answer was
click-or-type date selection with a per-day expense list below the
grid. Two follow-up forks — should undated expenses be a real schema
case, and does a filtered "search in calendar" belong here — were both
resolved as no-ops (not a real case yet; the date-jump input already
covers the redirect-to-a-date need). Recommendation at that point was
still to keep the custom build — RDP's `<table>`/`<th>`/`<td>` output
wasn't yet known to be preservable and the deselect-on-reclick toggle
looked like more code either way.

Then a direct user correction: real prev/next + keyboard navigation
was wanted, not just the toggle-a-marked-day interaction the custom
build had, plus a color mark on each day scaled to that day's spend —
"similar to airline calendars" — not a binary dot. That's a materially
bigger navigation and rendering surface than the original spec, and
building it by hand would mean re-deriving month-grid math, focus
management, and keyboard handling that a maintained calendar package
already solves. Re-evaluated with that requirement in view and adopted
`react-day-picker` v10:

- Confirmed by reading its actual source (not assumed from docs) that
  it renders a genuine `<table>`/`<th scope="col">`/`<td>` grid — the
  same accessibility shape the hand-rolled version had, not a div-soup
  widget bolted onto ARIA roles.
- Restyled entirely through its `classNames`/`modifiersClassNames`
  props into this repo's own BEM classes — no `react-day-picker/style.css`
  import, so it reads as this app's component, not a third-party widget.
- `date-fns` (already a dependency) deduped cleanly against RDP's own
  `date-fns: ^4.1.0` peer range — confirmed via `npm ls date-fns`, no
  second copy shipped.
- New `getCalendarDayTiers` util buckets each day with transactions
  into low/mid/high relative to the month's single highest-spending
  day, fed to RDP as `modifiers`. Every day is now selectable (not just
  days with data) — selecting an empty day shows an explicit "nothing
  logged this day" state instead of being non-interactive, since a
  hidden "some days don't respond to taps" rule is worse UX than a
  day that opens to say nothing happened.
- `getClassMaker`'s known object-modifier bug (TECH-DEBT.md T19) is
  avoided throughout by only ever passing it string modifiers (e.g.
  `getClasses('day', 'tier-high')`) in this route.
- No `.size-limit.json` bump needed — both the CSS and JS-route budgets
  had enough headroom already (CSS 21.49/22.5 KB, route JS 165.3/170 KB
  post-build).
- `npm audit`'s 8 pre-existing high-severity findings all trace to the
  puppeteer/size-limit dev-dependency chain, confirmed unrelated to
  this addition.

### 2026-09-27 — Phase I (Calendar) built and shipped

Built per docs/finance-frontend.md §14 as specced, no open forks. A real
`<table>` (caption + `<th scope="col">` weekday headers) rather than a
decorative grid with a bolted-on accessible list — the grid itself is
the content here, unlike the bar/pie charts. Monday-start weeks for
both locales (the household this app serves expects that regardless of
displayed language; §14 didn't specify either way, and switching the
grid's own shape by locale seemed more inconsistent than useful).

Extracted three things that would otherwise have been duplicated a
third time: `getMonthFixture` and the prev/next-month calc
(`getAdjacentMonths`) out of the month route (now shared with
Calendar), and `capitalizeFirst` out of `formatDateRange` into its own
util so the calendar day heading could reuse the same
standalone-date-label capitalization `formatDayLabel` needed.

Same recurring CSS-budget bump as every phase that adds `/admin`
stylesheets (21 → 22.5 KB) — expected, not a new finding.

### 2026-09-27 — Year view: click-to-month, resolved via a genuine fork

"Selecting a month should autofilter by that month" had two materially
different readings: navigate to that month's own page (which already
has the full category/transaction breakdown), or isolate in place on
the Year page (which can't actually work — `YearResponse.categories`
is a year-wide aggregate with no per-month breakdown in the schema,
so there's nothing to filter the category list _with_). Asked rather
than guessed, since building the wrong one meant either a wasted
schema change or a half-working feature that looks like it filters but
doesn't. **Decided: navigate.**

Implemented as two ways to trigger the same navigation, mirroring
PieChart's existing onSliceClick + category-list division of labor:
`BarChart` gained an `onBarClick` prop (mouse/touch only, chart stays
`aria-hidden`) and a new "Jump to month" `<select>` next to the
category search bar serves as the keyboard/screen-reader-usable
equivalent — not optional decoration, the actual accessible path to
the same action. Both call the same `goToMonth` navigating to
`/admin/month/:yyyyMm`.

### 2026-09-27 — Trip cards: status + duration badges, capitalized dates

The trips list cards showed only a name, date range, and total —
`TripSummary.status` (`planned`/`active`/`completed`) has existed in the
schema since Phase F but was never actually surfaced anywhere in the UI.
Added a badge row to each card: a status badge (reusing the existing
`ADMIN_TRIP_ONGOING` key for `active`, since that's the same "still
happening" concept the date range's open-ended suffix already uses —
not a separate, redundant key) and a computed duration badge ("8 days"
for Bariloche's Jan 10–17 trip — inclusive day count, matching the 7
_nights_ in its own fixture transaction). Card markup switched from
`Card`'s `texts` prop to `children` to fit the badge row in.

Also fixed: date ranges rendered with lowercase month abbreviations
under Spanish ("ene 10, 2026") — correct running-prose Spanish, but a
date range standing alone in a card reads as a label, not a sentence,
so it wants the same capitalized look English gets for free ("Jan").
`formatDateRange` now capitalizes both formatted date pieces
regardless of locale.

### 2026-09-27 — A fifth `width: 100%` overflow, plus two copy fixes

A follow-up round of screenshots (same DevTools-inspection method as the
entry below) found one more instance of the exact overflow pattern the
previous entry describes, in a different element:
`admin-nav-bar__nav-link`'s active state measured 240×40 in a 200px-wide
rail — `width: 100%` (of the `<li>`) plus the desktop rule's `padding:
12px 20px` (content-box, `<a>` tags don't get border-box by default)
added up to 40px over. First fix attempt dropped the redundant
`width: 100%` (mirroring the `admin-layout__content` fix) — this
compiled, typechecked, and looked right on desktop, but silently broke
mobile: every tab collapsed to its own text width and left-aligned
instead of centering in its column (caught in the very next screenshot
round, not by test coverage). Root cause: at mobile the parent `<li>`
is `display: flex`, making this link a flex **item**, whose main-axis
size defaults to content-size absent an explicit width — unlike a
plain block box (the desktop case), which defaults to filling its
container. The actual fix needed both together: `width: 100%` restored
_and_ `box-sizing: border-box` added, so the desktop padding is
subtracted from the 100% instead of added on top, while mobile (zero
horizontal padding there) is unaffected either way.

Checked the rest of the admin CSS proactively for the same shape after
finding this a second time — three other `width: 100%` + padding
combinations exist (the category-row buttons in month/year/trip
detail), but those are `<button>` elements, which get `box-sizing:
border-box` from the browser's default UA stylesheet, so they were
never actually at risk. Confirmed empirically (computed `box-sizing:
border-box` on one), not just assumed. Also checked whether the public
`NavBar` (the pattern `AdminNavBar` was copied from) has the identical
bug — it does (224px in a 201px rail), but it's invisibly masked by
`overflow: hidden` on `.navbar-component` (there for an unrelated
reason). Logged as TECH-DEBT T20, not fixed — out of scope on the live
public site.

Two copy fixes from the same review round:

- `ADMIN_CATEGORY_RENT_EXPENSAS` mixed languages under English
  ("Rent / Expensas") — the "Expensas" half only made sense as a
  deliberate ARS-locale term when the whole label was Spanish. Split to
  clean single-language labels: "Rent" (en) / "Alquiler" (es). The
  `rent_expensas` category id itself is unchanged — this only affects
  the two display strings.
- Home's heading dropped "Current Year"/"This year" entirely in favor
  of just the bare current year number, matching the yearly view's own
  `<h1>` exactly (`ADMIN_HOME_HEADING` removed from both intl files as
  now-unused). Simpler than solving the capitalization question the
  English/Spanish title-case mismatch had raised.

### 2026-09-27 — Real-browser review of PR #335 surfaced four root causes

Screenshots + DevTools inspection against the running `admin/phase-h-home`
branch (Chrome device-toolbar emulation, not just a resize) surfaced
several visual bugs the CI suite hadn't caught — all four traced back to
distinct root causes, not one bug wearing four costumes:

- **`/admin`'s mobile layout was silently rendering as desktop.** Every
  admin route's `meta()` returned a bare `[{ title }]`, and React Router
  doesn't merge a route's meta with its ancestors' by default — that
  silently dropped root's `<meta name="viewport">` tag too. Without it,
  a real phone (and Chrome's device-toolbar emulation, which honors the
  tag) falls back to a ~980px desktop layout viewport regardless of the
  device's actual width, so every `$bp-md` media query read "desktop."
  Fixed with a shared `adminMeta(title)` helper
  (`app/utils/admin-meta.ts`) every admin route now calls instead of
  returning a bare title array.
- **The public site's `body { padding-left: 200px }` (reserved for the
  public NavBar's desktop rail) applied unconditionally, including on
  `/admin`, which never renders that NavBar.** `AdminNavBar` is
  `position: fixed` and reserves its own clearance independently via
  `admin/style.css`, so this was 200px of pure dead space stacked on top
  of that on _every_ admin page, not just the login page (where it was
  most visible as an off-center panel). Fixed by giving `<body>` a
  `root--admin` modifier (computed once in `is-admin-path.ts`, shared
  between `root.tsx`'s `Layout` and `App`) and scoping the padding-left
  rule to skip it.
- **`admin-layout__content`'s explicit `width: 100%` overflowed its
  parent on mobile** once combined with `padding` in default
  content-box sizing (100% of the container, plus padding on top, is
  wider than the container — clipped content on the right edge). First
  fix attempt added `box-sizing: border-box`, which stopped the
  overflow but silently shrank the desktop reading column (the
  `max-width: 1024px` cap now included the nav-clearance
  `padding-left`, so the actual content area became ~800px instead of
  1024px — only caught by testing a genuinely wide viewport during the
  adversarial-review pass, since it wasn't visible at 1280px). The
  actual fix: just remove `width: 100%`. A block element's default
  `auto` width already fills the container exactly, subtracting
  padding as part of what "auto" means — the explicit `width: 100%`
  was both unnecessary and the real cause, and removing it fixes the
  overflow without touching how `max-width` interacts with padding.
- **The sign-out button's restyle (bordered pill, more padding) made the
  mobile fixed nav taller** without a matching bump to the content
  wrapper's bottom clearance — Playwright's mobile suite caught this for
  real (a category button was unclickable, covered by the fixed nav).
  Padding bumped to match the nav's measured height with a buffer.

Also fixed in the same pass, not root-cause bugs but real gaps: category
names (`Groceries`, `Rent / Expensas`, etc.) were never translated —
added a categoryId→label map (`get-category-label.ts`) since the six
categories are a fixed, developer-controlled taxonomy (unlike a
transaction's free-text description), not a wire-schema concern; Home's
heading changed from "This year" to "Current Year"; the sign-out link
got real button styling; a `SearchFilterBar` component was added to the
Year (searches categories) and Trips (searches by name) views, each with
a "Clear filters" button that resets both the search text and any
isolated category/trip.

One test-writing lesson worth keeping: two new Playwright tests
(category search, trip search) failed on the very first run every time
and passed instantly on retry — not the known Vite-cold-compile
flakiness this suite already has elsewhere, but `.fill()` racing
hydration on a freshly-loaded page. Fixed with the same `networkidle` +
short settle this suite's visual spec already uses for the same class of
problem, not a blind retry-and-hope.

### 2026-09-27 — Phase G merged (PR #334); Phase H (Home) built and shipped

Phase G's own build surfaced two loose ends beyond the nav/i18n retrofit
itself, both fixed before opening the PR:

- `BarChart` and `formatDateRange` both gained a required `locale` (and,
  for the latter, `ongoingLabel`) parameter as part of the retrofit, but
  their callers in `admin.year.$year` and both trip routes weren't
  updated in the same pass — the repo didn't typecheck for a stretch.
  Fixed by threading `locale` through every remaining call site.
- The admin intl JSON used curly `'` apostrophes in three error-title
  strings (copied from habit, not from the existing convention); the
  public site's `en-US.json` uses straight `'` throughout. Caught by the
  e2e suite (`admin.spec.ts`'s regexes expect straight quotes), not by
  eye — a reminder that "looks right" and "matches the file's actual
  bytes" aren't the same check.

Phase H (Home) followed immediately on a fresh branch off the merged
`main`: `/admin/dashboard` is now a real landing page — the current
year's `monthlyTotals` (same fixture `getYearFixture` reads for the
yearly view, extracted to `app/utils/get-year-fixture.ts` rather than
duplicated) as a tappable card grid, newest first, per frontend §13.
`formatMonthLabel` was also extracted (`app/utils/format-month-label.ts`)
once Home became its third identical call site alongside month/year.

One knock-on fix: the month view's `ErrorBoundary` used to link back to
`/admin/dashboard` under the label "Back to current month" — accurate
when that route redirected to the current month, wrong now that it's
Home. Relabeled to "Back to Home" (`ADMIN_BACK_TO_HOME`), caught by the
e2e suite's now-stale assertion rather than by inspection.

### 2026-09-27 — Two decisions reversed, two sections added, one fork reopened

After Phase F merged, its real pages got compared side by side against
the public site for the first time — that surfaced gaps neither the
original brief nor the adversarial-review pass caught, since there was no
actual screen to look at yet when those were written.

- **Reversed: `react-intl` is back in scope for `/admin`.** The original
  reasoning (an audience of two people who both speak Spanish, so
  translating is overhead with no one to serve) wasn't wrong about the
  audience, but explicit direction ("this app needs to support spanish,
  very similar to the portfolio app") makes match-the-portfolio
  consistency the deciding factor instead. Real, scoped work — 10 route/
  component files to retrofit, comparable to the public site's existing
  99-key intl files.
- **Reversed: `/admin` needs the portfolio's actual responsive nav
  shape** (fixed side rail desktop / bottom tab bar mobile,
  `app/components/NavBar/`'s pattern), not the flat top bar Phase A
  actually built. The original plan's "own small nav, not the public
  NavBar" call was right about content, just under-specified about
  layout — a new `AdminNavBar` component reuses the same `$bp-*`
  breakpoint tokens and responsive skeleton, with admin-only content.
- **Two new sections designed**: Home (`/admin/dashboard` repurposed from
  a redirect into a real landing page — this year's months as cards,
  reusing `GET /api/years/{yyyy}`'s existing `monthlyTotals`, no new
  backend endpoint) and Calendar (a new day-by-day view of a month,
  fully derivable from data `GET /api/months/{yyyy-mm}` already returns
  via each transaction's `occurredOn`). Full designs in
  finance-frontend.md §13/§14.
- **Reopened, then resolved same-day**: "plan/add vacation expenses"
  could have meant a read-only planned-vs-actual view or a real write UI
  on the frontend — asked directly rather than assumed, since the latter
  would have been a genuine, much bigger exception to the write-boundary
  principle than the already-approved "Regenerate analysis" button.
  **Decided: read-only.** The trip's existing `budget` column gets shown
  alongside its actual total; real entries still only ever arrive via
  Telegram. No new write endpoints, no forms.
- New phases recorded: G (the two reversals — blocks everything else,
  since H/I/J all render inside whatever nav Phase G builds), H (Home),
  I (Calendar), J (vacation planning, shape TBD by the reopened question).

### 2026-09-26 — PR #333 adversarially reviewed: DRY fixes + a copy fix

Reviewed the pushed diff fresh. Three findings:

- `formatDateRange` was copy-pasted identically across both trip routes
  — a real mini-algorithm (the null-`endDate` "ongoing" branch), not
  "three similar lines," and exactly the kind of thing that's easy to
  fix in one file and forget in the other. Extracted to
  `app/utils/format-date-range.ts` with its own unit tests.
- `TripResponseSchema` repeated `tripSummary`'s six fields by hand
  instead of extending it — a later change to one could silently drift
  from the other. Rewritten as `tripSummary.extend({ categories,
transactions })`.
- The trip detail's empty-state copy said "Nothing logged for this trip
  **yet**" — but a trip can be `completed` with genuinely nothing
  recorded, and "yet" wrongly implies more data is still coming, the way
  it legitimately does for a month/year. Dropped the word.

### 2026-09-26 — Phase F shipped: trips list + detail

- Promoted trips from "future, not v1" (backend kickoff §3.7/§6) to real
  schema: `TripsResponseSchema` (list) and `TripResponseSchema` (detail —
  same shape as `MonthResponseSchema` minus `previousMonthTotal`/
  `deltaPercent`/analysis, none of which apply to a trip) in
  `app/data/admin-schema.ts`, plus fixtures (Bariloche populated,
  Cataratas del Iguazú demonstrating the empty state — a trip that
  exists but has no synced expenses yet).
- Routes: `admin.trips._index` (a plain list, Card-per-trip, no redirect
  needed — unlike month/year there's no "current" trip to default to)
  and `admin.trips.$tripId` (total with ARS/USD toggle, pie chart +
  category list isolate/filter via the shared hook, transaction list, no
  analysis section). No prev/next nav — trips aren't chronologically
  sequential the way months/years are, so a "back to trips" link
  (education.$slug's pattern) replaces it.
- **Genuine, considered difference from month/year's error handling**:
  those routes 400 on a malformed param (a real format exists to
  validate) and treat any well-formed-but-unknown value as the empty
  state. A `tripId` has no such format — it's either a real trip or it
  isn't — so an unknown one 404s instead (education.$slug's precedent),
  while a real trip with no data yet still renders the empty state.
- Added "Trips" to the admin nav — all three sections now exist.
- Same recurring CSS-budget bump as every phase that's added `/admin`
  stylesheets (16 → 19 KB) — expected, not a new finding; the root cause
  (the bucket can't discriminate by route) was already diagnosed and
  accepted in Phase B/D.

### 2026-09-26 — PR #332 adversarially reviewed: a real a11y gap + a stale comment

Reviewed the pushed diff fresh. Two more findings:

- **Real accessibility gap**: the pie chart has the category list as its
  accessible source of truth, but the bar chart's month-by-month data had
  no equivalent anywhere — a screen reader user got the "Month by month"
  heading and then nothing, since the chart itself is `aria-hidden`.
  Added a visually-hidden list (same technique as `Input`'s `__label`)
  with the actual month/total pairs, plus a test asserting the content
  is genuinely attached — axe wouldn't have flagged the _absence_ of
  content, only violations in what's present, so this needed its own
  check, not just a passing a11y gate.
- On a second pass over the same diff: `BarChart`'s own doc comment
  claimed "the month-by-month totals are already visible as plain
  numbers wherever this chart is used" — the exact false assumption the
  fix above just disproved. Corrected the comment to state the real
  contract (this component provides no fallback of its own; the
  consumer is responsible for one) instead of leaving it actively wrong.

### 2026-09-26 — Phase D shipped: yearly view (bar chart + same isolate pattern)

- Extracted `app/utils/use-category-isolation.ts` out of the month
  route's inline state logic — the year view needed the exact same
  isolate/toggle/reset behavior, and Phase F's trip view will too, so
  three usages was the signal to share it rather than keep copy-pasting.
  Retrofitted the month route onto the same hook so there's one source of
  truth, not two copies that can drift.
- New `app/components/BarChart/` for the month-by-month totals. Applied
  `accessibilityLayer={false}` from the start (learned from Phase B's
  real a11y bug on PieChart) — the axe gate passed clean on the first
  try this time, confirming the lesson actually transferred.
- Routes: `admin.year._index` (redirect to the current year, mirroring
  `admin.dashboard`) + `admin.year.$year` (the actual view — total with
  ARS/USD toggle, bar chart, pie chart + category list, empty state, 400
  ErrorBoundary). No transactions or Claude-analysis section — the
  `YearResponse` schema has neither at this granularity. Added "Year" to
  the admin nav.
- Verified (not assumed) that `fill="var(--accent)"` / `fill="var(--fg-muted)"`
  as raw SVG attribute strings actually resolve the live CSS custom
  property in a real browser — checked computed styles via Playwright
  before trusting the theme-reactive approach for the bar chart.
- **Real gap caught in this phase's own tooling**: adding a second
  Recharts-consumer route changed which chunk Vite's automatic
  code-splitting picked as the "shared" bundle — the whole
  recharts-containing chunk got renamed from something `index-*.js`
  (which Phase B's new size-limit bucket matched) to
  `use-category-isolation-*.js` (which it didn't), silently dropping the
  measured total from ~110 KB to ~29 KB without the code actually
  shrinking. Fixed by rewriting that bucket as an exclusion list (every
  known-fixed-name chunk subtracted out) instead of a name it has to
  guess — the true total (152 KB) is now what's actually gated, with a
  170 KB budget.

### 2026-09-26 — PR #331 adversarially reviewed: two more real findings

Reviewed the pushed diff fresh (not the build-time findings above, which
were already fixed before the first push). Two more:

- The a11y route loop only ever does goto-and-scan — the new isolated-
  category markup (`aria-pressed`, the active row's background/border)
  had never actually been rendered when axe ran against it, so it was
  "probably fine by analogy to Card's existing bg-elevated usage" rather
  than actually checked. Added a one-off test that clicks a category
  first, then scans — passed, confirming the analogy, but confirmed
  rather than assumed.
- The transaction list would render silently empty if an isolated
  category ever had zero matching transactions. Not reachable with
  today's fixtures (a category only appears in the list if it has at
  least one transaction), but a real backend response is the first thing
  that gets to disagree with that assumption — added a defensive empty
  state.

### 2026-09-26 — Phase B shipped: Recharts pie chart + category isolate/filter

- Installed `recharts` (real prod dependency, React 19-compatible). Built
  `app/components/PieChart/` as a thin wrapper (component conventions,
  AGENTS.md §14) plus `app/utils/category-colors.ts` — a new categorical
  color palette (Okabe–Ito, colorblind-safe) this repo didn't have before,
  since every existing token set only ever needed one accent hue.
- Category list rows upgraded from static text to real buttons: tapping
  one (or a pie slice — same handler either way) isolates that category,
  dimming the other slices, filtering the transaction list, and swapping
  the header's total for the category's own total. Tapping the active
  one again clears it. State resets on month navigation (adjusted during
  render, not in an effect — the render-time "derived state" pattern
  React's own docs recommend, not the cascading-render-prone effect
  version the lint rule `react-hooks/set-state-in-effect` caught).
- **Real accessibility bug caught by the a11y gate, not assumed away**:
  Recharts' default `accessibilityLayer` adds its own `tabindex="0"`
  keyboard scaffolding to the SVG surface and pie group — since the whole
  chart is `aria-hidden` (the category list is the actual accessible
  interaction), that left silent, focusable-but-invisible tab stops.
  Fixed with `accessibilityLayer={false}` + `rootTabIndex={-1}`.
- **Real UX bug caught in review**: the delta color-polarity fix from the
  Phase A review pass wasn't retested until now — confirmed still correct
  (spending decrease = accent green).
- Recharts' weight (~100 KB gzip) lands entirely in the
  `/admin/month/:yyyyMm` route's own chunk — confirmed by grepping the
  build output, not assumed — so it never touches the public bundles
  size-limit already gates. Added a new `.size-limit.json` bucket ("total
  route JS, all chunks") anyway, mirroring the existing "total CSS"
  bucket's same-glob-can't-discriminate-by-route limitation, as a coarse
  safety net against any route's JS growing unbounded unnoticed.

### 2026-09-26 — PR #330: CI's bundle-size gate failed, fixed; branch synced with main

CI's "Bundle size" job failed after the review-fixes push:
`.size-limit.json`'s "total CSS" bucket globs every route's compiled
`style-*.css` chunk indiscriminately (Vite's hashed chunk names don't
encode which route they belong to, so admin's stylesheets can't be
excluded from the glob without a riskier build reconfiguration) — the
three new `/admin` stylesheets pushed the shared bucket 1.04 KB over its
14 KB budget. Not a real regression: React Router only emits `<link>`
tags for matched routes, so a visitor to any public page never actually
downloads `/admin`'s CSS — only this shared build-wide sum grew. Raised
the budget to 16 KB and renamed the entry to make the now-broader scope
("public + /admin") explicit.

Also merged several dependency-bump PRs the user merged directly to
main (react-intl 10→12, `@size-limit/preset-app` 12→14, vitest 4→5,
eslint-plugin-simple-import-sort) into this branch, plus the automated
post-merge Lighthouse-report commit — clean merge, no conflicts.
Re-verified typecheck/lint/unit tests (142 passing)/full Playwright
suite (53 passing) all still clean against the new dependency set. All
10 CI checks on #330 now pass.

### 2026-09-26 — PR #330 opened for docs + Phase A; adversarially reviewed

New standing workflow (recorded in Claude's memory as `phase-branch-workflow`):
every phase gets its own branch, pushed, opened as a PR, and adversarially
reviewed before being called done. Applied retroactively here since the
planning docs + Phase A had accumulated on one branch without ever going
through a PR. Pushed `docs/finance-tracker-plan`, opened
[#330](https://github.com/Alvacampos/personal-portfolio/pull/330), then
reviewed the full diff fresh (not just recalling having written it) and
found three real issues, all fixed before considering it done:

- `workers/app.ts`'s noindex check used a bare `startsWith('/admin')` —
  would also catch a hypothetical future `/adminfoo` route. Tightened to
  match `root.tsx`'s exact-or-prefix-with-slash check.
- The month view's spending delta had the color polarity backwards —
  "spending went up" was rendered in the accent (green/positive) color.
  Fixed so "down" gets it instead, since a decrease is the actually-good
  outcome for a budget.
- `tests/e2e/a11y.spec.ts` had zero coverage of the new `/admin` routes
  despite `finance-frontend.md` §10 committing to the same a11y bar as
  the public site. Added both routes to the gate, which immediately
  caught a real WCAG AA contrast failure (`--fg-faint` at 12px against
  the light-mode background) — swapped to `--fg-muted`.

### 2026-09-26 — Phase A shipped: admin shell + month view against fixtures

- Built the routes from `finance-frontend.md` §2/§12: `admin` layout
  (own small nav — Month link, ThemeToggle, sign-out placeholder; no
  public NavBar), `admin._index` (login placeholder — Phase C wires
  real Google OAuth), `admin.dashboard` (redirects to the current
  month), `admin.month.$yyyyMm` (header with prev/next + ARS/USD
  toggle + delta, static category list, Card-based transaction list,
  Claude analysis section, empty state, 400 ErrorBoundary for a
  malformed month param). All against `app/data/admin-fixtures.ts` — no
  network calls yet.
- Resolved the fs-routes layout-naming unknown flagged in
  `finance-frontend.md` §1 by reading the installed
  `@react-router/fs-routes@8.4.0` source directly: a leading underscore
  makes a route segment a _pathless_ layout (invisible in the URL),
  which is wrong for `/admin` (it must appear in the URL) — so the
  right shape is a plain `admin/index.tsx` layout with `admin.*` child
  routes, no underscore.
- Caught and fixed two integration gaps that only showed up once real
  `/admin` routes existed: `app/root.tsx`'s `<NavBar />` rendered
  unconditionally on every route, including `/admin` — now skipped via
  a `useLocation()` check. `PendingBoundary`'s skeleton registry had no
  `/admin` rule and would have fallen back to the public `HomeSkeleton`
  during slow navigations (dormant today since fixtures resolve
  instantly, but a real bug once Phase C adds live network latency) —
  added a rule that renders nothing for `/admin/*` instead.
- Applied `finance-tracker.md` §6.4's noindex requirement now that
  `/admin` routes exist for the first time: `Disallow: /admin` in
  `robots.txt`, and `X-Robots-Tag: noindex` on every `/admin*` HTML
  response in `workers/app.ts` (verified against the real Worker via
  `wrangler dev`, not just the Vite dev server, since dev mode skips
  `workers/app.ts` entirely).
- Added `tests/e2e/admin.spec.ts` (8 tests, all passing) covering the
  login → dashboard redirect → populated month → empty month → prev/next
  → malformed-param ErrorBoundary flow. Full existing suite re-run
  clean (one pre-existing flaky unrelated test self-recovered on retry).

### 2026-09-26 — Backend kickoff doc adversarially reviewed; API contract built as real code

- Ran an adversarial pass on `finance-tracker-backend-kickoff.md`. Real
  finds, fixed inline: the doc never explained how the session JWT
  crosses from the backend's domain (where the OAuth dance runs) to the
  frontend's domain — fixed by specifying a `Domain=.<registrable-domain>`
  cookie, which only works because both services share a registrable
  domain (already the plan per the costs table) — and flagged what
  breaks it if that ever changes. Also added: a `state`-param CSRF check
  on the OAuth flow, a callout that the JWT-signing secret is shared
  state across two separately-deployed repos, and a correction that the
  FX-rate API's terms only need confirming at Phase 4 (when ingestion
  first calls it), not Phase 1.
- **Categories are a normalized `categories` table with an FK from
  `expenses.category_id`, not a free-text column or enum** — surfaced by
  noticing `GET /api/categories` only makes sense as an endpoint if
  categories are a real backend-owned dataset, and a free-text field
  would let a typo silently fragment a category in every report. Matches
  the project's stated SQL-learning goal better too.
- Since the two repos are being built in parallel (backend by you,
  frontend here), wrote the actual API contract as code rather than
  leaving it as prose: `app/data/admin-schema.ts` (Zod schemas + inferred
  types for every endpoint response) and `app/data/admin-fixtures.ts`
  (hand-written fixtures validated against that schema in
  `admin-schema.test.ts`). The backend kickoff doc's new §6.1 inlines the
  same shapes as literal JSON, plus a note that the wire format is
  camelCase — FastAPI/Pydantic's default snake_case won't match unless
  the backend's response models use an alias generator. This is meant to
  be the actual target the backend implements against, not just
  illustrative.

### 2026-09-25 — Frontend plan's four open forks resolved

- **Charts use Recharts, not hand-rolled SVG** — reversing the original
  plan below. The original reasoning (protect the size-limit budget,
  practice hand-rolling) doesn't actually apply to a private, lazy-loaded
  `/admin` section that isn't one of the project's stated learning goals.
  Category list stays the primary accessible interaction regardless —
  that decision didn't depend on which library draws the pie.
- **"Regenerate analysis" gets a frontend button**, not a Telegram-only
  command. The one deliberate exception to "no write UI in the frontend"
  — it only recomputes a derived summary, it can't create or corrupt an
  expense. `finance-tracker.md`'s non-goals list and endpoint table (§7)
  now carry the carve-out and the new
  `POST /api/months/{yyyy-mm}/analysis/regenerate` endpoint.
- **Yearly same-months-last-year comparison is a fast-follow, not v1.**
  Ship the single-year view first; add the second overlapping series once
  that's proven out.
- **Trip planning: schema now, UI wait-and-see.** `trips` gets `status` and
  a nullable `budget` column now (cheap), but the planning UI itself waits
  until a couple of trips have been tracked retrospectively — build it
  once it's known to be wanted, not on the assumption it will be.

### 2026-09-25 — Frontend plan written and adversarially reviewed

- Charts will be hand-rolled SVG (pie + bar), not a charting library —
  matches this repo's existing minimal-dependency posture (no chart lib in
  `package.json` today; `TenureHeatmap` is already hand-built) and its
  size-limit budget discipline.
- The brief's "filter data" and "grey out sections" requirements turned out
  to be one feature, not two: tapping a category in a list both isolates
  it on the chart and filters the transaction list. No separate filter UI
  for v1.
- `/admin` will **not** use `react-intl` and will **not** reuse the public
  `NavBar` — both are public-site conventions that don't fit a two-person
  private tool; copying them would be applying "keep the core style" too
  literally rather than to what each convention is actually for.
- Real design gap caught: the brief didn't say _when_ the monthly Claude
  analysis gets generated. Decided: once per month, cached server-side, not
  regenerated per page view or per chart interaction — a live-per-tap
  analysis would mean a Claude call on every category tap, which is both
  slow and wasteful. Still open: whether a "regenerate" action belongs on
  the frontend at all, given the site's read-only principle (frontend
  plan §11).
- Monthly analysis will use a stronger (Sonnet-class) model than the
  Haiku-class ingestion parser — different task shape (generate insight
  from a month of data vs. extract structured fields from one message),
  different cost profile, deliberately not assumed to be "free" the way
  per-message parsing is.

### 2026-09-25 — Backend adversarial review, four forks resolved

Full detail in `finance-tracker.md` §1's "Decided already" table and §4/§6.
Summary:

- **Telegram group**: dedicated, expenses-only group — not the existing
  everyday chat. Keeps "is this an expense" unambiguous.
- **Admin login**: switched from a shared password to Google sign-in
  restricted to two email addresses. Reconsidered specifically because a
  password had already leaked once via screenshot earlier in this same
  project (during Turnstile setup, unrelated to finance) — removes the
  "a password exists to leak" risk entirely rather than managing it.
- **USD reference rate**: blue/informal, not oficial or MEP. Captured
  per-transaction at ingestion time so the choice never needs revisiting
  for historical data even if a different rate seems better later.
- **Receipt photos**: one categorized total per receipt, not itemized per
  product. Simpler, and means a receipt photo reuses the exact same
  `record_expense` tool a text message does — no separate schema.
- Real bug caught, not just a risk noted: the bot's own confirmation
  replies land back in the Telegram group as new messages. Must filter out
  the bot's own sender ID before forwarding anything to Claude, or it
  reprocesses its own replies in a loop.

### 2026-09-25 — Initial backend investigation written

`finance-tracker.md` created. Key call: Telegram instead of WhatsApp for
ingestion — WhatsApp's official Cloud API doesn't reliably support reading
group chats, and the unofficial alternative that does breaks WhatsApp's
ToS and risks the phone number being banned.
