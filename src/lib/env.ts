import "server-only";

import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const blankAsUnset = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional(),
);

const positiveInteger = z.coerce.number().int().positive();

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  // The app's key. CALCTUTOR_ANTHROPIC_API_KEY comes first so it cannot be
  // confused with a key that Claude Code itself reads; ANTHROPIC_API_KEY is
  // the fallback. A blank line (as in .env.example) means "not set". The
  // format is checked lazily by getAnthropicApiKey, so builds and CI never
  // need a key.
  CALCTUTOR_ANTHROPIC_API_KEY: blankAsUnset,
  ANTHROPIC_API_KEY: blankAsUnset,
  ANTHROPIC_MODEL_SOLVE: z.string().default("claude-sonnet-5-5"),
  ANTHROPIC_MODEL_TRANSCRIBE: z.string().default("claude-sonnet-5-5"),
  ANTHROPIC_MODEL_LIGHT: z.string().default("claude-haiku-4-5-20251001"),
  AI_STREAMING: booleanString.default(true),
  MOCK_AI: booleanString.default(false),
  LOG_PROBLEMS: booleanString.default(false),
  DAILY_TOKEN_BUDGET: positiveInteger.default(2_000_000),
  RATE_LIMIT_SOLVES_PER_HOUR: positiveInteger.default(30),
  RATE_LIMIT_TRANSCRIBES_PER_HOUR: positiveInteger.default(30),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(values: Record<string, string | undefined>): Env {
  const result = EnvSchema.safeParse(values);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid environment configuration:\n${details}`, {
      cause: result.error,
    });
  }

  return result.data;
}

export const env = parseEnv(process.env);

// Returns the app's Anthropic key, checked on the first AI call rather than at
// import time. The thrown messages name the variable so the API routes can
// report a configuration problem (describeAiFailure matches on it).
export function getAnthropicApiKey(source: Env = env): string {
  const key = source.CALCTUTOR_ANTHROPIC_API_KEY ?? source.ANTHROPIC_API_KEY;

  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY is required when real AI mode is enabled (set CALCTUTOR_ANTHROPIC_API_KEY)",
    );
  }
  if (!key.startsWith("sk-ant-")) {
    throw new Error(
      "ANTHROPIC_API_KEY is not a valid Anthropic key (it must start with sk-ant-)",
    );
  }
  return key;
}
