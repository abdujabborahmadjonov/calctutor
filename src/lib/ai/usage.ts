import "server-only";

import { env } from "@/lib/env";

export type TokenUsage = { inputTokens: number; outputTokens: number };

const NO_USAGE: TokenUsage = { inputTokens: 0, outputTokens: 0 };
export const mockUsage = () => ({ ...NO_USAGE });

let day = new Date().toISOString().slice(0, 10);
let usedTokens = 0;

function resetIfNeeded() {
  const today = new Date().toISOString().slice(0, 10);

  if (today !== day) {
    day = today;
    usedTokens = 0;
  }
}

export function assertTokenBudget() {
  resetIfNeeded();

  if (usedTokens >= env.DAILY_TOKEN_BUDGET) {
    throw new Error("DAILY_TOKEN_BUDGET_EXHAUSTED");
  }
}

export function recordTokenUsage(inputTokens: number, outputTokens: number) {
  resetIfNeeded();
  usedTokens += inputTokens + outputTokens;
}

export function logUsage(
  route: string,
  model: string,
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number | null;
  },
  latencyMs: number,
) {
  recordTokenUsage(usage.input_tokens, usage.output_tokens);
  console.info("[CalcTutor] AI usage", {
    route,
    model,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    latencyMs,
  });
}
