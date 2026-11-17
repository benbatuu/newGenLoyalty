/**
 * Rate limit store — in-memory fallback; Redis when REDIS_URL is set.
 */
import IORedis from 'ioredis';

type Bucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, Bucket>();

let redisClient: IORedis | null | undefined;

function getRedis(): IORedis | null {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    redisClient = null;
    return null;
  }
  redisClient = new IORedis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  return redisClient;
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const existing = memoryBuckets.get(key);

  if (!existing || now >= existing.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { ok: true };
}

export async function consumeRateLimitAsync(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const redis = getRedis();
  if (!redis) return consumeRateLimit(key, limit, windowMs);

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const redisKey = `rl:${key}`;

  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSec);
    }
    if (count > limit) {
      const ttl = await redis.ttl(redisKey);
      return {
        ok: false,
        retryAfterSec: Math.max(1, ttl > 0 ? ttl : windowSec),
      };
    }
    return { ok: true };
  } catch {
    return consumeRateLimit(key, limit, windowMs);
  }
}

/** Best-effort client IP for rate keys. */
export function clientIpFromRequest(req: {
  ip?: string;
  headers: { get(name: string): string | undefined };
}): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return req.ip?.trim() || 'unknown';
}
