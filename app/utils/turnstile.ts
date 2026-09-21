// Cloudflare Turnstile helpers. See docs/security.md § "Turnstile".
//
// Turnstile is active only when the `TURNSTILE_SITE_KEY` var is
// non-empty in wrangler.jsonc (it is, for production). The Vite dev
// server and the Playwright E2E suite use a stub env with no key, so
// they run without a captcha; setting the var to "" turns it off.

export const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';
export const TURNSTILE_SCRIPT_SRC = `${TURNSTILE_ORIGIN}/turnstile/v0/api.js?render=explicit`;
const SITEVERIFY_URL = `${TURNSTILE_ORIGIN}/turnstile/v0/siteverify`;

// The name Turnstile's own widget uses for its hidden input. We mirror
// it in our controlled hidden input so a server that also accepts the
// implicit-render form keeps working.
export const TURNSTILE_FIELD = 'cf-turnstile-response';

// Cloudflare documents a 2048-char ceiling on tokens. Anything longer
// is garbage — reject before spending a subrequest on it.
const MAX_TOKEN_LENGTH = 2048;

type TurnstileEnv = {
  // Typed as a plain string on purpose: wrangler-generated types narrow
  // vars to their literal value (`""` today, `"0x4AAA…"` once set), and
  // both must satisfy this signature.
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
};

export type TurnstileConfig =
  { enabled: false } | { enabled: true; siteKey: string; secret: string | undefined };

export function getTurnstileConfig(env: TurnstileEnv): TurnstileConfig {
  const siteKey = env.TURNSTILE_SITE_KEY?.trim();
  if (!siteKey) return { enabled: false };
  // `enabled` with no secret is a misconfiguration; the caller fails
  // closed rather than silently skipping verification.
  return { enabled: true, siteKey, secret: env.TURNSTILE_SECRET_KEY || undefined };
}

type VerifyArgs = {
  token: unknown;
  secret: string;
  ip?: string;
};

// Returns true only when Cloudflare confirms the token. Every other
// outcome — missing token, oversized token, network error, non-2xx,
// `success: false` — is a rejection. Fails closed: a Cloudflare outage
// means the contact form is temporarily unavailable, not open to bots.
export async function verifyTurnstile({ token, secret, ip }: VerifyArgs): Promise<boolean> {
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return false;
  }

  const body = new FormData();
  body.set('secret', secret);
  body.set('response', token);
  // `remoteip` is optional and only a hint; skip the dev sentinel.
  if (ip && ip !== 'local-dev') body.set('remoteip', ip);

  try {
    const response = await fetch(SITEVERIFY_URL, { method: 'POST', body });
    if (!response.ok) {
      console.error('Turnstile siteverify HTTP', response.status);
      return false;
    }
    const result = (await response.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (result.success !== true) {
      // Error codes are enum strings (e.g. `timeout-or-duplicate`), not
      // visitor data — safe to log for diagnosing a misconfigured secret.
      console.info('Turnstile rejected token', result['error-codes']?.join(',') ?? 'unknown');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Turnstile siteverify failed', error instanceof Error ? error.name : 'unknown');
    return false;
  }
}
