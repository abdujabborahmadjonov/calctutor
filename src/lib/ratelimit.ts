import "server-only";

type Bucket = {
  tokens: number;
  updatedAt: number;
};

export type RateLimitResult =
  | { allowed: true; retryAfterSeconds: 0 }
  | { allowed: false; retryAfterSeconds: number };

const buckets = new Map<string, Bucket>();

export function consumeRateLimit(
  key: string,
  capacity: number,
  now = Date.now(),
): RateLimitResult {
  const refillPerMillisecond = capacity / (60 * 60 * 1_000);
  const previous = buckets.get(key) ?? { tokens: capacity, updatedAt: now };
  const elapsed = Math.max(0, now - previous.updatedAt);
  const available = Math.min(
    capacity,
    previous.tokens + elapsed * refillPerMillisecond,
  );

  if (available < 1) {
    buckets.set(key, { tokens: available, updatedAt: now });
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((1 - available) / refillPerMillisecond / 1_000),
      ),
    };
  }

  buckets.set(key, { tokens: available - 1, updatedAt: now });
  return { allowed: true, retryAfterSeconds: 0 };
}
