# Security posture

The site is a public CV — no auth, no user data, no session state. The
surface is essentially: the SSR HTML, the `.data` Single-Fetch endpoints
that back client-side nav, the `/contact` action, and the static assets
(including the CV PDF).
This doc records what's in place and why.

## CSP nonce

**Where.** `workers/app.ts` mints a fresh 128-bit url-safe base64 nonce
per request (`mintNonce()`), attaches it to the load context as
`context.cspNonce`, and echoes it into the
`Content-Security-Policy: script-src 'self' 'nonce-<val>'` header via
`withSecurityHeaders()`.

**Distribution to inline scripts.** `entry.server.tsx` reads it via
`getCspNonce(loadContext)`, wraps `<ServerRouter>` in
`<NonceProvider nonce={nonce}>`, and passes `nonce` to `ServerRouter`
directly. RR emits its hydration blocks with the nonce; our own inline
scripts in `app/root.tsx` (theme init, locale replay, JSON-LD) read via
`useNonce()`.

**Why React context, not loader data.** RR serializes loader data into
`window.__reactRouterContext` on hydration. A nonce returned from a
loader would land in the DOM as plain text, defeating the browser's
`getAttribute('nonce')` → `""` post-load hiding. React context that
only exists during SSR keeps the value server-side; the client just
receives already-attributed `<script nonce="…">` tags.

**`style-src 'unsafe-inline'`.** Retained because ~40 components use
inline `style={{ }}` attributes (skeleton widths, heatmap grid vars,
etc.). Hashing every inline style is impractical and the attack cost
of style-based data exfiltration on a public CV is low. Everything
else uses strict allow-lists.

**Turnstile allowance.** When (and only when) `TURNSTILE_SITE_KEY` is
set, `buildCsp()` ([app/utils/csp.ts](../app/utils/csp.ts)) adds
`https://challenges.cloudflare.com` to `script-src` and a
`frame-src` for the same origin (needed because `default-src 'none'`
would otherwise block the widget's iframe). It is applied to **all**
nonced HTML, not just `/contact`: the CSP that governs a page is the
one from the document that first loaded, so a visitor who lands on
`/skills` and client-navigates to `/contact` would otherwise get a
widget the browser blocks. Static assets never get it. With no site
key configured the policy is byte-for-byte the pre-Turnstile one
(pinned by `app/utils/csp.test.ts`).

**Other headers** (via `STATIC_SECURITY_HEADERS`):

- HSTS with `preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` disabling camera, mic, geolocation,
  interest-cohort, payment, USB, and the three motion sensors.

## `.data` rate limit

**Threat.** Single-Fetch `.data` endpoints return the destination
loader's JSON. A scraper looping every route lifts the entire CV
payload (including draft `_es` translations) faster and cleaner than
scraping rendered HTML.

**Cap.** 60/hour per hashed IP, stored in `RATELIMIT_KV`. Invisible to
real visitors; breaks `curl` in a for-loop after ~7 URLs.

**Fast-path exception.** Requests carrying all of:

- `Sec-Fetch-Site: same-origin`
- `Sec-Fetch-Dest: empty`
- `Sec-Fetch-Mode: cors`
- Same-origin `Referer`

skip the counter entirely (`isTrustedInternalNav()`). Real client-side
nav from the app matches all four; a scraper has to spoof all four to
bypass the cap — versus checking `Sec-Fetch-Site` alone which is a
one-header spoof if they read the source.

**KV key shape.** `ratelimit:data:<sha256(ip)>`. The digest keeps the
namespace from being a readable audit trail of visitors. Sentinel
`local-dev` fallback keeps the rule inert under `wrangler dev`.

## `/contact` action

Checks run in this order, cheapest first: Origin → rate limit →
**Turnstile** → honeypot → Zod → send. `app/routes/contact._index/action.test.ts`
pins the order.

**Why Turnstile.** The first three defences (Origin, honeypot, per-IP
rate limit) all fail against a scripted bot: `Origin` is just a header
a non-browser client sets to whatever it likes; a bot that never renders
the page never sees the honeypot; and a bot that sends one message per
IP (residential proxies) never trips a per-IP counter. Observed in
production: the same template message ("Newsletter subscription — I
would like more information…") arriving from different addresses.
Turnstile is the first check that requires a real browser to have run
Cloudflare's challenge.

**Turnstile.** Controlled by the `TURNSTILE_SITE_KEY` var in
`wrangler.jsonc` (public by design; non-empty = on — production has it
set — and empty = off). The token comes from an
explicitly-rendered `interaction-only` widget
([app/components/TurnstileWidget/](../app/components/TurnstileWidget/)) —
invisible to most visitors, a checkbox only when Cloudflare is
suspicious — and is verified server-side against `siteverify` with
`TURNSTILE_SECRET_KEY` (a Worker secret,
[app/utils/turnstile.ts](../app/utils/turnstile.ts)).

- **Fails closed.** A missing/oversized token, a non-2xx from
  Cloudflare, or a network error all reject the submission; a site key
  with no secret returns 500 and logs, rather than silently skipping
  verification. A Cloudflare outage means the form is briefly
  unavailable, not open to bots.
- **Tokens are single-use** (valid ~5 min). The form remounts the widget
  after every server response so a resubmit after a validation error
  carries a fresh token instead of a spent one.
- **Runs before the honeypot**, so a bot that fills the honeypot still
  has to pass the challenge; a token-less POST is rejected without a
  subrequest.
- The widget is told not to inject its own hidden input
  (`response-field: false`); the form's controlled input is the single
  source of truth for `cf-turnstile-response`.
- **Setting it up** (done once; repeat if the widget is recreated) —
  order matters: create the widget in the Cloudflare dashboard
  (Turnstile → Add widget, hostname `gonzalo-alvarez-campos-cv.com`,
  mode Managed), run `npx wrangler secret put TURNSTILE_SECRET_KEY`
  **first**, then set `TURNSTILE_SITE_KEY` in `wrangler.jsonc` and
  deploy. Key before secret makes `/contact` fail closed until the
  secret lands. In that command the argument is the secret's **name**;
  the value is pasted at the prompt. Pasting the value as the argument
  silently creates a secret _named_ after it (and leaves
  `TURNSTILE_SECRET_KEY` unset) — `npx wrangler secret list` shows
  names only, so check that `TURNSTILE_SECRET_KEY` is in it before
  deploying.
- **Rotating the secret.** Cloudflare allows one rotation per 2 hours
  and keeps the old secret valid while the new one is being activated.
  After rotating, re-run `npx wrangler secret put TURNSTILE_SECRET_KEY`
  with the new value. The site key does not change on rotation, so no
  code change or deploy is needed.
- **Local testing** with Cloudflare's published dummy keys (sitekey
  `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`
  always pass; secret `2x0000000000000000000000000000000AA` always
  fails) via `wrangler dev --var TURNSTILE_SITE_KEY:<key>` plus a
  gitignored `.dev.vars`. `npm run dev` (Vite) and the Playwright E2E
  suite leave Turnstile off (their stub env has no site key); `wrangler
dev` uses the committed site key, so without a secret in `.dev.vars`
  its contact form fails closed. The widget refuses to run on any
  hostname not in its allow-list, so `localhost` can only exercise it
  through the dummy keys above.

**CSRF.** Origin allow-list (`https://gonzalo-alvarez-campos-cv.com`,
`http://localhost:8788`). Cross-site form posts carry a different
origin (or `null` for stripped-privacy submissions) and get rejected
with a 403.

**Honeypot.** Hidden `website` field on the form; any submission with
a non-empty value is silently accepted (200) without actually sending —
bots think they succeeded, retry rate stays flat. Field is optional in
the schema so an omitted field and an empty field are indistinguishable
from the response side (both parse as OK).

**Rate limit.** 3/hour per hashed IP via `RATELIMIT_KV`. Same hashing
strategy as `.data`; different key prefix (`ratelimit:contact:`).

**Zod validation.** Body parsed by a `z.object({...})` schema at the
top of the action; invalid submissions get a 400 with a per-field
error map.

## CV / PDF download rate limit

**Threat.** The CV (and certificate) PDFs under `/assets/files/` carry
contact details, and a scraper looping over them costs Worker requests.
**Cap.** 60/hour per hashed IP, enforced in `workers/app.ts` before the
asset is fetched; over the cap gets a `429` with `Retry-After`. Real
visitors download the CV once or twice (the hover-prefetch plus the
click can count as two requests).

**Deliberately no captcha here.** The CV's audience is recruiters, and a
challenge on the download is friction on the one action the site exists
for. The address in the PDF is also already public (it's in
`wrangler.jsonc` in this public repo and on the profile pages), so
gating the file wouldn't protect it. The per-IP cap only stops a
single-address loop; anything distributed needs an edge rule (below).

## Edge-layer protections (Cloudflare dashboard — not in this repo)

The in-Worker limits above are soft (KV is eventually consistent) and
per-IP, so they don't stop a distributed bot. The real backstop is
Cloudflare's edge, configured per zone in the dashboard:

- **Bot Fight Mode** (Security → Bots) — free; challenges known-bad
  automation before it reaches the Worker.
- **A rate-limiting rule** (Security → WAF → Rate limiting) on
  `POST /contact` and on `/assets/files/*.pdf` — enforced at the edge
  across all of a client's requests, without KV.
- **Turnstile analytics** (Turnstile → the widget) — shows solve/fail
  rates, so a spike in failures is visible.

## `RATELIMIT_KV` keys

All rate limits share the `RATELIMIT_KV` namespace. New rate-limited
surfaces MUST add a purpose prefix so keys can't collide:

| Purpose       | Key shape                        | TTL   | Cap     |
| ------------- | -------------------------------- | ----- | ------- |
| `.data` reads | `ratelimit:data:<sha256(ip)>`    | 3600s | 60/hour |
| PDF downloads | `ratelimit:pdf:<sha256(ip)>`     | 3600s | 60/hour |
| `/contact`    | `ratelimit:contact:<sha256(ip)>` | 3600s | 3/hour  |

`.data` and PDF share the `isOverLimit()` helper in
[app/utils/rate-limit.ts](../app/utils/rate-limit.ts); `/contact` keeps
its own counter because it only increments after validation passes.
Hashing uses the shared helper in [app/utils/hash-ip.ts](../app/utils/hash-ip.ts).

## SSR HTML is `Cache-Control: private`

Route loaders emit `Cache-Control: public, max-age=3600, s-maxage=86400`
so the JSON `.data` payload edge-caches. But the SSR HTML for the same
routes embeds the per-request CSP nonce on every inline `<script>` —
if a shared cache served one visitor's HTML to another, they'd share
a nonce for `max-age`, defeating the DOM-inspection hiding.

`workers/app.ts` handles this by rewriting `Cache-Control: public →
private` on HTML responses (`isHtml=true` passed to
`withSecurityHeaders`). Browsers still cache per-visitor; the edge
doesn't hold nonced HTML. The `.data` path is unaffected and stays
edge-cacheable — its payload is nonce-free.

## Static assets

`workers/app.ts` delegates a small allow-list (`/assets/`, `/fonts/`,
`/.well-known/`, `/favicon.ico`, `/robots.txt`, `/sitemap.xml`) to
`env.ASSETS.fetch()`. Everything else — including `/data/*` — falls
through to the RR handler, which has no route for it and returns 404.
This is intentional: `public/data/*.json` holds the entire CV payload
and we don't want it lifted via a public URL.

## `X-Robots-Tag: noindex` on `.data`

Applied per response inside the `.data` branch of the fetch handler.
Search engines shouldn't index the JSON hydration endpoints — the HTML
versions of the same routes are the canonical indexable surfaces.

## Inline-script inventory

Every inline `<script>` in the SSR output. New inline scripts must be
added here and given a nonce via `useNonce()`.

- **RR hydration blocks** — `<Scripts nonce>`, `<ScrollRestoration
nonce>`, `<ServerRouter nonce>`. Emitted by RR itself; pass nonce
  through the prop.
- **Theme init** (`app/root.tsx`) — reads `localStorage.theme` and
  sets `documentElement.dataset.theme` before hydration to avoid a
  light/dark flash.
- **Locale replay** (`app/root.tsx`) — reads `localStorage.locale`
  from pre-cookie sessions and writes it into a `locale` cookie so
  the next SSR request can `pickLocale()` from it.
- **JSON-LD** (`app/root.tsx`) — one `<script type="application/ld+json">`
  block carrying a `@graph` with Person + WebSite entries for
  search-engine structured-data markup.
