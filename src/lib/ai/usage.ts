import "server-only";

import { env } from "@/lib/env";

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
