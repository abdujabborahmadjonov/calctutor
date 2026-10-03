// @vitest-environment node

import { describe, expect, it } from "vitest";

import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("applies safe local defaults in mock mode", () => {
    const result = parseEnv({ MOCK_AI: "true" });

    expect(result).toMatchObject({
      MOCK_AI: true,
      AI_STREAMING: true,
      DAILY_TOKEN_BUDGET: 2_000_000,
      RATE_LIMIT_SOLVES_PER_HOUR: 30,
      RATE_LIMIT_TRANSCRIBES_PER_HOUR: 30,
    });
  });

  it("validates the Anthropic key format when one is provided", () => {
    expect(() =>
      parseEnv({
        MOCK_AI: "false",
        ANTHROPIC_API_KEY: "not-an-anthropic-key",
      }),
    ).toThrow("ANTHROPIC_API_KEY");
  });

  it("treats a blank API key line as unset", () => {
    expect(
      parseEnv({ MOCK_AI: "true", ANTHROPIC_API_KEY: "" }).ANTHROPIC_API_KEY,
    ).toBeUndefined();
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
