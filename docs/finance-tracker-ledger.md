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

| Phase                                   | Status      | Notes                                                                                                           |
| --------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| Phase A — Static shell against fixtures | in-progress | API contract + fixtures exist (`app/data/admin-schema.ts`, `admin-fixtures.ts`); routes/layout/nav not started. |
| Phase B — Charts (pie + category list)  | open        |                                                                                                                 |
| Phase C — Auth + live integration       | open        | Blocked on backend Phase 5 existing for real, but the shell can be built against fixtures first.                |
| Phase D — Yearly view                   | open        |                                                                                                                 |
| Phase E — Claude analysis section       | open        | Blocked on backend Phase 4C.                                                                                    |
| Phase F — Vacations                     | open        | Planning UI deliberately deferred (wait-and-see, frontend §6) — list/detail view only for v1.                   |

## Decision log

Newest first. Each entry: what was decided or tried, and why — especially
the "we tried X and backed out" entries, which are the ones worth having a
record of.

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
