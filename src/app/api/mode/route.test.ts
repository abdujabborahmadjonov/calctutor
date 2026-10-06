// @vitest-environment node

import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/mode", () => {
  it("reports mock mode without caching", async () => {
    const response = GET();

    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ mockAi: true });
  });
});
