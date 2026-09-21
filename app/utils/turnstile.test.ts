import { afterEach, describe, expect, it, vi } from 'vitest';

import { getTurnstileConfig, verifyTurnstile } from './turnstile';

const okResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), { status: 200, ...init });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('getTurnstileConfig', () => {
  it('is disabled when the site key is missing or blank', () => {
    expect(getTurnstileConfig({})).toEqual({ enabled: false });
    expect(getTurnstileConfig({ TURNSTILE_SITE_KEY: '' })).toEqual({ enabled: false });
    expect(getTurnstileConfig({ TURNSTILE_SITE_KEY: '   ' })).toEqual({ enabled: false });
  });

  it('is enabled once a site key is set, carrying the secret through', () => {
    expect(getTurnstileConfig({ TURNSTILE_SITE_KEY: '0x4AAA', TURNSTILE_SECRET_KEY: 's' })).toEqual(
      { enabled: true, siteKey: '0x4AAA', secret: 's' }
    );
  });

  it('stays enabled (so callers can fail closed) when the secret is missing', () => {
    expect(getTurnstileConfig({ TURNSTILE_SITE_KEY: '0x4AAA' })).toEqual({
      enabled: true,
      siteKey: '0x4AAA',
      secret: undefined,
    });
  });
});

describe('verifyTurnstile', () => {
  it('rejects a missing, non-string, empty, or oversized token without calling Cloudflare', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await verifyTurnstile({ token: undefined, secret: 's' })).toBe(false);
    expect(await verifyTurnstile({ token: new File([], 'x'), secret: 's' })).toBe(false);
    expect(await verifyTurnstile({ token: '', secret: 's' })).toBe(false);
    expect(await verifyTurnstile({ token: 'x'.repeat(2049), secret: 's' })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts a token Cloudflare confirms, posting secret + response + remoteip', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ success: true }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await verifyTurnstile({ token: 'tok', secret: 'sec', ip: '203.0.113.7' })).toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(init.method).toBe('POST');
    const body = init.body as FormData;
    expect(body.get('secret')).toBe('sec');
    expect(body.get('response')).toBe('tok');
    expect(body.get('remoteip')).toBe('203.0.113.7');
  });

  it('omits remoteip for the local-dev sentinel', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ success: true }));
    vi.stubGlobal('fetch', fetchMock);

    await verifyTurnstile({ token: 'tok', secret: 'sec', ip: 'local-dev' });

    expect((fetchMock.mock.calls[0][1].body as FormData).has('remoteip')).toBe(false);
  });

  it('rejects when Cloudflare says success: false (e.g. a replayed token)', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(okResponse({ success: false, 'error-codes': ['timeout-or-duplicate'] }))
    );

    expect(await verifyTurnstile({ token: 'tok', secret: 'sec' })).toBe(false);
  });

  it('fails closed on a non-2xx response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 500 })));

    expect(await verifyTurnstile({ token: 'tok', secret: 'sec' })).toBe(false);
  });

  it('fails closed when the request itself throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')));

    expect(await verifyTurnstile({ token: 'tok', secret: 'sec' })).toBe(false);
  });
});
