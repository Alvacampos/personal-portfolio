import { describe, expect, it } from 'vitest';

import { buildCsp } from './csp';

// Byte-for-byte snapshots of the policies `workers/app.ts` shipped
// before buildCsp was extracted. If a refactor changes these, it changed
// the security posture — that should be a deliberate edit, not a side
// effect.
const BASELINE_WITH_NONCE =
  "default-src 'none'; script-src 'self' 'nonce-abc123'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; " +
  "base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'";

const BASELINE_STATIC =
  "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; " +
  "base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'";

describe('buildCsp', () => {
  it('reproduces the pre-refactor nonce policy exactly', () => {
    expect(buildCsp('abc123')).toBe(BASELINE_WITH_NONCE);
  });

  it('reproduces the pre-refactor static-asset policy exactly', () => {
    expect(buildCsp('')).toBe(BASELINE_STATIC);
  });

  it('adds Cloudflare Turnstile to script-src and frame-src only when asked', () => {
    const csp = buildCsp('abc123', { turnstile: true });
    expect(csp).toContain("script-src 'self' 'nonce-abc123' https://challenges.cloudflare.com;");
    expect(csp).toContain('frame-src https://challenges.cloudflare.com;');
    // Nothing else is loosened.
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("connect-src 'self';");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('does not mention Turnstile by default', () => {
    expect(buildCsp('abc123')).not.toContain('cloudflare.com');
    expect(buildCsp('abc123')).not.toContain('frame-src');
  });
});
