import { describe, expect, it, vi } from 'vitest';

import { hashIp } from './hash-ip';
import { isOverLimit } from './rate-limit';

// Minimal in-memory KV: just the get/put surface the limiter uses.
function makeKv(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    kv: {
      get: vi.fn(async (k: string) => store.get(k) ?? null),
      put: vi.fn(async (k: string, v: string) => {
        store.set(k, v);
      }),
    } as unknown as KVNamespace,
  };
}

// waitUntil that actually awaits, so tests can assert on the write.
function makeCtx() {
  const pending: Promise<unknown>[] = [];
  return {
    pending,
    ctx: { waitUntil: (p: Promise<unknown>) => void pending.push(p) },
  };
}

describe('isOverLimit', () => {
  it('lets the first request through and records it under ratelimit:<purpose>:<sha256(ip)>', async () => {
    const { kv, store } = makeKv();
    const { ctx, pending } = makeCtx();

    expect(await isOverLimit({ kv, ctx, purpose: 'data', ip: '203.0.113.7', limit: 3 })).toBe(
      false
    );
    await Promise.all(pending);

    const key = `ratelimit:data:${await hashIp('203.0.113.7')}`;
    expect(store.get(key)).toBe('1');
    expect(kv.put).toHaveBeenCalledWith(key, '1', { expirationTtl: 3600 });
  });

  it('keeps counting up to the limit, then reports over-limit without writing', async () => {
    const key = `ratelimit:pdf:${await hashIp('198.51.100.1')}`;
    const { kv } = makeKv({ [key]: '2' });
    const { ctx, pending } = makeCtx();
    const args = { kv, ctx, purpose: 'pdf', ip: '198.51.100.1', limit: 3 };

    expect(await isOverLimit(args)).toBe(false); // 3rd request: still allowed
    await Promise.all(pending);
    expect(await isOverLimit(args)).toBe(true); // 4th: over
    expect(kv.put).toHaveBeenCalledTimes(1); // no write once blocked
  });

  it('counts each IP and each purpose separately', async () => {
    const { kv } = makeKv();
    const { ctx, pending } = makeCtx();

    await isOverLimit({ kv, ctx, purpose: 'data', ip: '203.0.113.7', limit: 1 });
    await Promise.all(pending);

    expect(await isOverLimit({ kv, ctx, purpose: 'data', ip: '203.0.113.7', limit: 1 })).toBe(true);
    expect(await isOverLimit({ kv, ctx, purpose: 'data', ip: '203.0.113.8', limit: 1 })).toBe(
      false
    );
    expect(await isOverLimit({ kv, ctx, purpose: 'pdf', ip: '203.0.113.7', limit: 1 })).toBe(false);
  });

  it('treats a corrupt stored value as zero rather than throwing', async () => {
    const key = `ratelimit:data:${await hashIp('203.0.113.7')}`;
    const { kv } = makeKv({ [key]: 'not-a-number' });
    const { ctx } = makeCtx();

    expect(await isOverLimit({ kv, ctx, purpose: 'data', ip: '203.0.113.7', limit: 3 })).toBe(
      false
    );
  });
});
