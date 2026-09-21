import { TURNSTILE_ORIGIN } from './turnstile';

// Content-Security-Policy builder. See docs/security.md § "CSP nonce".
//
// `style-src 'unsafe-inline'` is the one intentional relaxation — 40+
// inline `style={{ }}` sites (skeleton widths, heatmap grid vars) can't
// be hashed practically. Everything else uses strict allow-lists.
type CspOptions = {
  // Adds Cloudflare's challenge origin to `script-src` + `frame-src` so
  // the Turnstile widget can load. Site-wide on HTML rather than scoped
  // to /contact because the CSP that governs a page is the one from the
  // document that *first loaded* — a visitor who lands on /skills and
  // client-navigates to /contact would otherwise get a widget the
  // browser blocks.
  turnstile?: boolean;
};

// `nonce === ''` builds the nonce-less policy used for static assets
// (they carry no inline scripts).
export function buildCsp(nonce: string, { turnstile = false }: CspOptions = {}): string {
  const scriptSrc = ["'self'"];
  if (nonce) scriptSrc.push(`'nonce-${nonce}'`);
  if (turnstile) scriptSrc.push(TURNSTILE_ORIGIN);

  return [
    "default-src 'none'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    // `default-src 'none'` would otherwise block the widget's iframe.
    ...(turnstile ? [`frame-src ${TURNSTILE_ORIGIN}`] : []),
    "manifest-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}
