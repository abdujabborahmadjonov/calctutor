// @vitest-environment node

import { describe, expect, it } from "vitest";

import { getAnthropicApiKey, parseEnv } from "./env";

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

  it("does not require or validate a key at parse time", () => {
    expect(() =>
      parseEnv({ MOCK_AI: "false", ANTHROPIC_API_KEY: "not-a-key" }),
    ).not.toThrow();
  });

  it("validates the key lazily, preferring CALCTUTOR_ANTHROPIC_API_KEY", () => {
    const both = parseEnv({
      CALCTUTOR_ANTHROPIC_API_KEY: "sk-ant-app",
      ANTHROPIC_API_KEY: "sk-ant-other",
    });
    expect(getAnthropicApiKey(both)).toBe("sk-ant-app");
    expect(
      getAnthropicApiKey(parseEnv({ ANTHROPIC_API_KEY: "sk-ant-fallback" })),
    ).toBe("sk-ant-fallback");
    expect(() => getAnthropicApiKey(parseEnv({}))).toThrow(
      "CALCTUTOR_ANTHROPIC_API_KEY",
    );
    expect(() =>
      getAnthropicApiKey(parseEnv({ ANTHROPIC_API_KEY: "not-a-key" })),
    ).toThrow("sk-ant-");
  });

  it("treats a blank API key line as unset", () => {
    const parsed = parseEnv({
      MOCK_AI: "true",
      ANTHROPIC_API_KEY: "",
      CALCTUTOR_ANTHROPIC_API_KEY: "",
    });
    expect(parsed.ANTHROPIC_API_KEY).toBeUndefined();
    expect(parsed.CALCTUTOR_ANTHROPIC_API_KEY).toBeUndefined();
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
