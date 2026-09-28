# Admin section review — 2026-09-27

> Tracking notes — committed (PR #341) so they stay in the repo, but not
> linked from AGENTS.md or the ledger's own doc index. Written after
> Phases A–J shipped (Phase J merged same day as this review), covering
> every route under `/admin` against fixtures. Method: read every
> route's code, browsed all sections in a real browser (light/dark,
> desktop/mobile, EN/ES), and reproduced the two bugs below live rather
> than inferring them from a screenshot.
>
> **Status update:** Bugs A and C, the calendar legend/a11y gap (Q5),
> the Home heading (Q3), and Phase K (design + shipped UI) all landed in
> PR #341 (merged). The Q1 Home/Year overlap was resolved separately —
> Home links to Year now rather than either duplicating or replacing
> the other (`finance-frontend.md` §13). Bug B is left alone, per this
> doc's own call. **Q6/Q7 correction**: this review initially
> mischaracterized who-owes-whom settlement as an overlooked gap — it's
> actually an explicit, already-recorded non-goal (`finance-tracker.md`
> §"Non-goals for v1": "shared-pot tracker, not a splitter"). Caught
> after the fact, not before writing the original findings — a reminder
> to check a project's own decided-non-goals list before flagging
> something as missing, not just its shipped feature set.

## Section map (what exists today)

| Section (nav label) | Route(s)                                     | What it actually does                                                                          |
| ------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Home                | `/admin/dashboard`                           | Current calendar year's months as cards, newest first. No chart, no categories.                |
| Year                | `/admin/year`, `/admin/year/:year`           | Any year: bar chart (month-by-month), pie chart, category list + search, jump-to-month.        |
| Calendar            | `/admin/calendar`, `/admin/calendar/:yyyyMm` | Day-by-day grid for one month, color-coded by spend tier, tap/jump a day for its transactions. |
| Trips               | `/admin/trips`, `/admin/trips/:tripId`       | Trip list + detail (pie/category breakdown, transactions, budget-vs-actual since Phase J).     |

Each of Month (`/admin/month/:yyyyMm`, reached only via Home or Year, not
its own nav item) and the four sections above share the same building
blocks: a pie or bar chart, a searchable/isolatable category list, and a
`Card`-based transaction list. That consistency is a real strength —
once you've learned one screen you've learned all of them.

## Answers to the 8 review questions

### 1. Are functionalities correctly grouped by sections?

Mostly — one real overlap, now resolved. **Home and Year duplicate each
other for the current year.** Home is "this year's months as cards";
Year is "this year's months as a bar chart + categories +
jump-to-month," which is a strict superset for the current year. There
was no affordance explaining _why_ you'd pick one over the other, and
Home can never show a past year the way Year can. **Fix**: kept both
(Home's fast tap-a-month menu is real, deliberate UX, not redundant on
its own terms) and added an explicit "View year in detail" link from
Home to Year, rather than merging or deleting a screen
(`finance-frontend.md` §13).

### 2. Are the functionalities useful?

The core loop (Telegram → auto-categorized → browse by month / year /
day / trip) is useful and low-friction. Two things undercut it:

- Search only matches **names** (category name, trip name) — never a
  transaction's description or amount. "Which dinner was $40,000 in
  March" isn't answerable without paging through months by hand.
- `paidBy` ("You" / "Partner") is recorded on every transaction but
  **never aggregated anywhere** — no running "who's owed what." For a
  two-person tracker this is the most obvious missing payoff of data
  that's already being collected.

### 3. Are section names proper and explicit?

You were right to flag this one:

- **"Home"'s own page has no heading that says "Home."** Its `<h1>` is
  the bare year number (`app/routes/admin.dashboard/index.tsx:47`,
  e.g. plain "2026") — desktop and mobile both. Nothing on the page
  itself orients you.
- **"Year" and "Home" read as near-synonyms** once you're inside the
  app, for the reason in Q1.
- "Calendar" and "Trips" are fine — explicit, no overlap with anything
  else.
- Suggestion: rename Home's heading to something that isn't just a
  number ("Overview", or "This year" plus the number as a subtitle),
  and consider whether Home should exist as a separate nav item at all
  versus being Year's default/landing state.

### 4. Bugs (reproduced live, not guessed)

**Bug A — the calendar's day-detail panel goes stale on prev/next
navigation.**
Repro: open `/admin/calendar/2026-08`, select Aug 5 (shows "Monthly
rent + expensas"), click the **next-month** arrow. The grid correctly
advances to September, but the panel below still reads
**"Transactions — Aug 5, 2026 / Nothing logged this day"** — a date
that isn't even in the visible month, and which _did_ have a
transaction (the panel is lying about it having none, because it's
now looking up Aug 5 inside September's transaction map). The
"Jump to date" input is left showing the stale date too.
Root cause: `app/routes/admin.calendar.$yyyyMm/index.tsx` —
`handleMonthChange` only calls `navigate()`; it never resets
`selectedDay`. Only the date-jump input's own handler
(`handleDatePick`) clears/reassigns it — prev/next arrows don't go
through that path.
Fix shape: clear `selectedDay` (or re-derive it against the new
month's transaction map) inside `handleMonthChange`.

**Bug B — Home and the current-year view are both missing the most
recent real month.**
Today is 2026-09-27. `FIXTURE_YTD` (`app/data/admin-fixtures.ts`)
hardcodes `monthlyTotals` stopping at **July 2026** — August is absent
from both `/admin/dashboard` and `/admin/year/2026`, even though
`/admin/month/2026-08` is the richest fixture in the app (10
transactions, a Claude analysis dated "Sep 1, 2026"). This is fixture
drift, not a logic bug — low priority to fix as a fixture, and not
worth chasing every time "today" moves forward. It's worth keeping as
a **regression check for Phase C**, though: this is exactly the shape
of bug a real backend could reintroduce (an off-by-one or timezone
mistake in "which months count as YTD" bucketing), so re-verify "is
last month visible on Home/Year" specifically once real data replaces
this fixture.

**Bug C — a trip's status is invisible once you're on its detail
page.**
The list card shows a "Completed" / "Planned" / "Active" badge; the
detail page (`app/routes/admin.trips.$tripId/index.tsx`) never reads
`trip.status` at all. Confirmed still true after Phase J merged.
Landing directly on Mendoza's page (the new `planned` fixture trip)
gives zero visual cue that it's upcoming rather than a completed trip
that simply has no data yet — the $0 total and the budget bar look
identical to what an about-to-start trip and a "we forgot to log
anything" completed trip would both look like. This is more than
cosmetic now that vacation _planning_ is an actual goal (see the new
idea below) — the planning surface needs to visibly say "this hasn't
happened yet."

### 5. What can we improve?

- Fix Bugs A and C above.
- **Calendar tiers have no legend and no accessible equivalent.** The
  low/mid/high color coding (`getCalendarDayTiers`) is the _only_
  signal that a day was expensive — there's no key explaining what the
  shades mean, no amount on the cell itself, and the day button's
  aria-label ("Saturday, August 1st, 2026") never mentions spend. A
  screen-reader user gets nothing from the whole feature; sighted users
  have to click every colored day to learn by how much. The "low" tier
  tint is also faint enough it's easy to miss at a glance.
- **Month has a "▲7.6% vs last month" delta; Year has no year-over-year
  equivalent.** Already tracked as a deliberate fast-follow
  (`finance-tracker-ledger.md`), just flagging it's the one place two
  sibling views feel inconsistent.

### 6. What functionality are we missing?

- ~~Who-owes-whom / settlement.~~ **Correction, not actually missing**:
  this is an explicit non-goal (`finance-tracker.md`, "Non-goals for
  v1": "Debt-settling / 'who owes whom' splitting (Splitwise-style).
  This is a shared-pot tracker, not a splitter — revisit only if that
  assumption turns out to be wrong in practice"). `paidBy` is tracked
  per transaction for the record, deliberately not summed into a
  balance — a considered decision this review should have checked for
  before calling it a gap, not an oversight to fix.
- **Global transaction search** (description / amount / date range),
  not just category or trip name.
- **Category-level budgets for regular months.** Phase J gave _trips_
  a budget; groceries/dining/etc. have no monthly cap or alert.
- **Recurring-transaction awareness** — rent is identical every month
  with no "expected vs. actual" framing.
- **Cross-period trend for a single category** ("Groceries over the
  last 6 months") — every screen today is siloed to one month, year,
  or trip at a time.

### 7. Do we mimic well-known finance trackers?

Partially, and deliberately so. The categorized-feed + pie/bar
breakdown + monthly narrative shape mirrors **Mint/Monarch** well, and
the calendar is a nicer touch than most budgeting apps bother with.
It doesn't do **Splitwise's** core loop (splitting/settling between two
people) — correctly so, per Q6's correction: a shared-pot tracker
deliberately isn't a splitter, not a gap. It's still missing
**YNAB/Monarch's** core loop, though: category budgets with over/under
alerts, not just a trip-level budget (Q6). That's a defensible scope
choice for what's explicitly a lightweight two-person expense log
rather than a full personal-finance suite — worth being explicit about
which one this is, since right now it borrows some of the _look_ of a
budgeting app without the category-level _budgeting_.

### 8. Is the calendar + per-day listing correctly implemented?

Functionally yes for the core interaction (react-day-picker grid,
click-or-jump-to-date, per-day transaction list, empty state) — with
the two real defects above (Bug A's stale panel, the tier
legend/accessibility gap). Fix those and this is solid.

## New idea from this conversation: manual input for vacation planning

Raised after this review: the Vacation section (§6 of
`finance-frontend.md`) was deliberately built read-only —
`budget` vs. `total` display only, real expenses still only arrive via
Telegram (`finance-tracker.md` §6.6: "the real write-boundary is who's
in the Telegram group"). The idea now on the table: since a _planned_ trip has no
expenses yet by definition, let the two of you **manually add planned
line items** to a trip before it happens (e.g. "flights: ~$180,000
(estimate)", "hotel: ~$300,000 (estimate)") — a real, if narrow,
exception to the write-boundary principle, scoped specifically to
_before-the-fact vacation planning_ rather than expense-logging in
general.

This is bigger than it first looks and needs its own design pass
before building, not a quick bolt-on:

- **Needs a way to tell a manually-planned line apart from a real,
  Telegram-sourced transaction.** They can't share the same
  `transactions` list unchanged, or the trip's "actual total" silently
  starts including money that was never actually spent — a schema
  change (e.g. a `source: 'telegram' | 'manual'` field, or a distinct
  `plannedItems` array Bariloche-style trips never have but Mendoza
  does), not just a new form.
- **Needs a decision on what happens when a planned line item is later
  matched by a real expense** — does it get replaced, does it double-count,
  does the user manually delete the estimate once the real one lands?
  This is exactly the kind of "we tried X and backed out" question this
  project's ledger convention exists to capture _before_ building, not
  after.
- **Reopens the write-boundary decision** from `finance-frontend.md` §6
  on purpose, not by accident — worth writing that reopening down
  explicitly (with the narrower scope: planning-only, not general
  expense entry) so it doesn't read like a silent reversal later.
- Ties directly into Bug C above: a manually-planned trip is exactly
  the case where the page most needs to visibly say "this is a plan,
  not a record."

Recommendation: treat this as its own phase (call it **Phase K**) with
a short design note in `finance-frontend.md` before writing code — the
schema/double-counting question in particular is worth resolving on
paper first.

## Things worth a second pass later, not covered above

- Phase C (real Google auth) and Phase E (Claude analysis section) are
  both still fixture-only / blocked on the backend — didn't review
  either in depth since real auth/session edge cases are a different
  risk class than UI polish, and there's nothing real to click yet.
- No data export/backup path exists once real data exists.
- No bill/due-date reminder for fixed obligations like rent.
