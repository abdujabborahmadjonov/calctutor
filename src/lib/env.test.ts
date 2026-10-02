// @vitest-environment node

import { describe, expect, it } from "vitest";

import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("applies safe local defaults in mock mode", () => {
    const result = parseEnv({ MOCK_AI: "true" });

    expect(result).toMatchObject({
      MOCK_AI: true,
      AI_STREAMING: false,
      DAILY_TOKEN_BUDGET: 2_000_000,
      RATE_LIMIT_SOLVES_PER_HOUR: 30,
      RATE_LIMIT_TRANSCRIBES_PER_HOUR: 30,
    });
  });

  it("requires an Anthropic key outside mock mode", () => {
    expect(() => parseEnv({ MOCK_AI: "false" })).toThrow(
      "ANTHROPIC_API_KEY: is required when MOCK_AI is false",
    );
  });

  it("reports invalid numeric limits clearly", () => {
    expect(() =>
      parseEnv({
        MOCK_AI: "true",
        DAILY_TOKEN_BUDGET: "0",
      }),
    ).toThrow("DAILY_TOKEN_BUDGET");
  });
});
