import { Allow, parse } from "partial-json";

import { type Solution, StepSchema, type Step } from "@/lib/ai/schemas";

export type PartialSolution = {
  status?: Solution["status"];
  strategy?: Solution["strategy"];
  steps: Step[];
};

const StrategyFields = ["method", "why_this_method", "alternatives"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Reads the solution JSON streamed so far and returns only the parts that are
// complete: the strategy once a later field has started, and every step that
// is followed by another step or by the end of the steps array.
export function readPartialSolution(text: string): PartialSolution {
  let value: unknown;

  try {
    value = parse(text, Allow.ALL);
  } catch {
    return { steps: [] };
  }

  if (!isRecord(value)) return { steps: [] };

  const keys = Object.keys(value);
  const startedAfter = (key: string) => {
    const index = keys.indexOf(key);
    return index !== -1 && index < keys.length - 1;
  };

  const status =
    value.status === "solved" ||
    value.status === "needs_clarification" ||
    value.status === "out_of_scope"
      ? value.status
      : undefined;

  const rawStrategy = value.strategy;
  const strategy =
    startedAfter("strategy") &&
    isRecord(rawStrategy) &&
    StrategyFields.every((field) => typeof rawStrategy[field] === "string")
      ? {
          method: String(rawStrategy.method),
          why_this_method: String(rawStrategy.why_this_method),
          alternatives: String(rawStrategy.alternatives),
        }
      : undefined;

  const rawSteps = Array.isArray(value.steps) ? value.steps : [];
  const completeCount = startedAfter("steps")
    ? rawSteps.length
    : Math.max(0, rawSteps.length - 1);
  const steps = rawSteps
    .slice(0, completeCount)
    .map((step) => StepSchema.safeParse(step))
    .flatMap((result) => (result.success ? [result.data] : []));

  return { status, strategy, steps };
}
