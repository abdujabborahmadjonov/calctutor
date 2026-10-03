import "server-only";

type Bucket = {
  tokens: number;
  updatedAt: number;
};

export type RateLimitResult =
  | { allowed: true; retryAfterSeconds: 0 }
  | { allowed: false; retryAfterSeconds: number };

const HOUR_MS = 60 * 60 * 1_000;
const buckets = new Map<string, Bucket>();

export function consumeRateLimit(
  key: string,
  capacity: number,
  now = Date.now(),
): RateLimitResult {
  // Multiply before dividing: capacity / HOUR_MS * elapsed loses precision,
  // so a full refill period could leave 0.999... tokens and refuse a client
  // that waited exactly the advertised Retry-After.
  const previous = buckets.get(key) ?? { tokens: capacity, updatedAt: now };
  const elapsed = Math.max(0, now - previous.updatedAt);
  const available = Math.min(
    capacity,
    previous.tokens + (elapsed * capacity) / HOUR_MS,
  );

  if (available < 1) {
    buckets.set(key, { tokens: available, updatedAt: now });
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil(((1 - available) * HOUR_MS) / capacity / 1_000),
      ),
    };
  }

  buckets.set(key, { tokens: available - 1, updatedAt: now });
  return { allowed: true, retryAfterSeconds: 0 };
}
