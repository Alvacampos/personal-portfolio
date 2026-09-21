// The action runs server-side in a Worker, so test it in the Node
// environment. happy-dom's `Request` follows browser rules and silently
// strips the forbidden `Origin` header, which would make every request
// look like a cross-site POST and fail the CSRF check for the wrong reason.
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppLoadContext } from '~/utils/load-context';

import { action, loader } from './index';

// Exercises the /contact action's *enforcement order* — Origin → rate
// limit → Turnstile → honeypot → validation → send. The point of these
// tests is that a bot which gets past the cheap checks still can't reach
// Resend without a verified Turnstile token.

const SITE_ORIGIN = 'https://gonzalo-alvarez-campos-cv.com';
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RESEND = 'https://api.resend.com/emails';

const VALID_FIELDS = {
  name: 'Test User',
  email: 'test@example.com',
  subject: 'Hello there',
  message: 'A perfectly reasonable message body.',
};

type EnvOverrides = Record<string, unknown>;

function makeContext(envOverrides: EnvOverrides = {}) {
  const store = new Map<string, string>();
  const env = {
    RATELIMIT_KV: {
      get: async (k: string) => store.get(k) ?? null,
      put: async (k: string, v: string) => void store.set(k, v),
    },
    CONTACT_FROM: 'from@example.com',
    CONTACT_TO: 'to@example.com',
    RESEND_API_KEY: 'resend-key',
    TURNSTILE_SITE_KEY: '',
    ...envOverrides,
  };
  return createAppLoadContext(
    {
      env: env as unknown as Env,
      ctx: { waitUntil: () => undefined, passThroughOnException: () => undefined } as never,
    },
    ''
  );
}

function makeRequest(fields: Record<string, string>, origin: string | null = SITE_ORIGIN) {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  const headers: Record<string, string> = { 'CF-Connecting-IP': '203.0.113.9' };
  if (origin !== null) headers.Origin = origin;
  return new Request(`${SITE_ORIGIN}/contact`, { method: 'POST', headers, body });
}

const run = (request: Request, context: ReturnType<typeof makeContext>) =>
  action({ request, context, params: {} } as unknown as Parameters<typeof action>[0]);

// `data()` results carry the payload on `.data` and the status on `.init`.
const payloadOf = (result: unknown) => (result as { data: unknown }).data;
const statusOf = (result: unknown) => (result as { init?: { status?: number } }).init?.status;

let fetchMock: ReturnType<typeof vi.fn>;
const callsTo = (url: string) => fetchMock.mock.calls.filter(([u]) => u === url);

// Cloudflare's siteverify answer is per-test; Resend always accepts.
function stubFetch(siteverify: { success: boolean } | 'unused' = 'unused') {
  fetchMock = vi.fn(async (url: string) => {
    if (url === SITEVERIFY) {
      return new Response(
        JSON.stringify(siteverify === 'unused' ? { success: false } : siteverify)
      );
    }
    if (url === RESEND) return new Response('{}', { status: 200 });
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('contact action — Turnstile disabled (no site key)', () => {
  it('skips verification entirely and sends the message', async () => {
    stubFetch();
    const result = await run(makeRequest(VALID_FIELDS), makeContext());

    expect(payloadOf(result)).toEqual({ status: 'ok' });
    expect(callsTo(SITEVERIFY)).toHaveLength(0);
    expect(callsTo(RESEND)).toHaveLength(1);
  });
});

describe('contact action — Turnstile enabled', () => {
  const enabled = { TURNSTILE_SITE_KEY: '0x4AAA', TURNSTILE_SECRET_KEY: 'shh' };

  it('rejects a POST with no token and never reaches Cloudflare or Resend', async () => {
    stubFetch();
    const result = await run(makeRequest(VALID_FIELDS), makeContext(enabled));

    expect(payloadOf(result)).toEqual({ status: 'error', reason: 'captcha' });
    expect(statusOf(result)).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a token Cloudflare says is invalid', async () => {
    stubFetch({ success: false });
    const result = await run(
      makeRequest({ ...VALID_FIELDS, 'cf-turnstile-response': 'forged' }),
      makeContext(enabled)
    );

    expect(payloadOf(result)).toEqual({ status: 'error', reason: 'captcha' });
    expect(statusOf(result)).toBe(403);
    expect(callsTo(SITEVERIFY)).toHaveLength(1);
    expect(callsTo(RESEND)).toHaveLength(0);
  });

  it('sends the message when Cloudflare confirms the token, using the configured secret', async () => {
    stubFetch({ success: true });
    const result = await run(
      makeRequest({ ...VALID_FIELDS, 'cf-turnstile-response': 'good-token' }),
      makeContext(enabled)
    );

    expect(payloadOf(result)).toEqual({ status: 'ok' });
    const body = callsTo(SITEVERIFY)[0][1].body as FormData;
    expect(body.get('secret')).toBe('shh');
    expect(body.get('response')).toBe('good-token');
    expect(body.get('remoteip')).toBe('203.0.113.9');
    expect(callsTo(RESEND)).toHaveLength(1);
  });

  it('checks the token BEFORE the honeypot, so a bot that fills it gets no free pass', async () => {
    stubFetch();
    const result = await run(
      makeRequest({ ...VALID_FIELDS, website: 'http://spam.example' }),
      makeContext(enabled)
    );

    // Without a token it's rejected as a captcha failure, not silently
    // "accepted" the way an honeypot-only hit would be.
    expect(payloadOf(result)).toEqual({ status: 'error', reason: 'captcha' });
  });

  it('still silently drops a honeypot hit that carries a valid token', async () => {
    stubFetch({ success: true });
    const result = await run(
      makeRequest({ ...VALID_FIELDS, website: 'x', 'cf-turnstile-response': 'good-token' }),
      makeContext(enabled)
    );

    expect(payloadOf(result)).toEqual({ status: 'ok' });
    expect(callsTo(RESEND)).toHaveLength(0);
  });

  it('fails closed when a site key is configured but the secret is missing', async () => {
    stubFetch();
    const result = await run(
      makeRequest({ ...VALID_FIELDS, 'cf-turnstile-response': 'anything' }),
      makeContext({ TURNSTILE_SITE_KEY: '0x4AAA' })
    );

    expect(payloadOf(result)).toEqual({ status: 'error', reason: 'send-failed' });
    expect(statusOf(result)).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('contact action — checks that were already in place', () => {
  it('rejects a forged or missing Origin before doing anything else', async () => {
    stubFetch();
    const context = makeContext({ TURNSTILE_SITE_KEY: '0x4AAA', TURNSTILE_SECRET_KEY: 'shh' });

    expect(statusOf(await run(makeRequest(VALID_FIELDS, 'https://evil.example'), context))).toBe(
      403
    );
    expect(statusOf(await run(makeRequest(VALID_FIELDS, null), context))).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rate-limits after 3 accepted submissions from one IP', async () => {
    stubFetch();
    const context = makeContext();

    for (let i = 0; i < 3; i += 1) {
      expect(payloadOf(await run(makeRequest(VALID_FIELDS), context))).toEqual({ status: 'ok' });
    }
    const fourth = await run(makeRequest(VALID_FIELDS), context);
    expect(payloadOf(fourth)).toEqual({ status: 'error', reason: 'rate-limit' });
    expect(statusOf(fourth)).toBe(429);
  });
});

describe('contact loader', () => {
  const loadKey = async (env: EnvOverrides) =>
    loader({ context: makeContext(env) } as unknown as Parameters<typeof loader>[0]);

  it('exposes the public site key when Turnstile is configured', async () => {
    expect(await loadKey({ TURNSTILE_SITE_KEY: '0x4AAA' })).toEqual({ turnstileSiteKey: '0x4AAA' });
  });

  it('exposes null (no widget) when it is not', async () => {
    expect(await loadKey({ TURNSTILE_SITE_KEY: '' })).toEqual({ turnstileSiteKey: null });
  });

  it('never leaks the secret into loader data', async () => {
    const result = await loadKey({ TURNSTILE_SITE_KEY: '0x4AAA', TURNSTILE_SECRET_KEY: 'shh' });
    expect(JSON.stringify(result)).not.toContain('shh');
  });
});
