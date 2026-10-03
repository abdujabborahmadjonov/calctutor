// @vitest-environment node

import { describe, expect, it } from "vitest";

import { consumeRateLimit } from "./ratelimit";

const HOUR = 60 * 60 * 1_000;

describe("consumeRateLimit", () => {
  it("allows the full capacity, then blocks with a retry time", () => {
    const now = 1_000_000;
    for (let index = 0; index < 3; index += 1) {
      expect(consumeRateLimit("drain", 3, now).allowed).toBe(true);
    }

    const blocked = consumeRateLimit("drain", 3, now);
    expect(blocked.allowed).toBe(false);
    // One token refills every 20 minutes at 3 per hour.
    expect(blocked.retryAfterSeconds).toBe(20 * 60);
  });

  it("refills over time", () => {
    const start = 5_000_000;
    consumeRateLimit("refill", 1, start);
    expect(consumeRateLimit("refill", 1, start).allowed).toBe(false);
    expect(consumeRateLimit("refill", 1, start + HOUR).allowed).toBe(true);
  });

  it("keeps separate buckets per key", () => {
    const now = 9_000_000;
    consumeRateLimit("a", 1, now);
    expect(consumeRateLimit("a", 1, now).allowed).toBe(false);
    expect(consumeRateLimit("b", 1, now).allowed).toBe(true);
  });
});

describe("consumeRateLimit retry time", () => {
  it("allows a client that waits exactly the advertised Retry-After", () => {
    const now = 20_000_000;
    consumeRateLimit("retry", 30, now);
    for (let index = 0; index < 29; index += 1) {
      consumeRateLimit("retry", 30, now);
    }
    const blocked = consumeRateLimit("retry", 30, now);
    expect(blocked.allowed).toBe(false);

    const later = now + blocked.retryAfterSeconds * 1_000;
    expect(consumeRateLimit("retry", 30, later).allowed).toBe(true);
  });
});
