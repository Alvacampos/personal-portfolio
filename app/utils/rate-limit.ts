import { hashIp } from './hash-ip';

// Soft per-IP hourly counter on the shared `RATELIMIT_KV` namespace.
// Used by the Worker for `.data` reads and CV PDF downloads. See
// docs/security.md § "`RATELIMIT_KV` keys".
//
// KV is eventually consistent, so this is a cap on *casual* abuse (a
// `curl` loop from one address), not a hard guarantee — and it does
// nothing against a botnet that spreads requests across many IPs. That
// is what Cloudflare's edge rules are for (see docs/security.md).

type RateLimitArgs = {
  kv: KVNamespace;
  ctx: Pick<ExecutionContext, 'waitUntil'>;
  // Key prefix; new limited surfaces MUST pick a distinct one.
  purpose: string;
  ip: string;
  limit: number;
};

// Returns true when the caller is already at the cap (respond 429).
// Otherwise records this request and returns false.
export async function isOverLimit({
  kv,
  ctx,
  purpose,
  ip,
  limit,
}: RateLimitArgs): Promise<boolean> {
  const key = `ratelimit:${purpose}:${await hashIp(ip)}`;
  const current = await kv.get(key);
  const count = current ? Number.parseInt(current, 10) || 0 : 0;
  if (count >= limit) return true;
  // waitUntil lets the response race the KV write; worst-case
  // undercount is 1-2 extra requests per warm-worker window.
  ctx.waitUntil(kv.put(key, String(count + 1), { expirationTtl: 3600 }));
  return false;
}
