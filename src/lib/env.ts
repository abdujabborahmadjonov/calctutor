import "server-only";

import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const positiveInteger = z.coerce.number().int().positive();

const EnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-").optional(),
    ANTHROPIC_MODEL_SOLVE: z.string().default("claude-sonnet-5-5"),
    ANTHROPIC_MODEL_TRANSCRIBE: z.string().default("claude-sonnet-5-5"),
    ANTHROPIC_MODEL_LIGHT: z.string().default("claude-haiku-4-5-20251001"),
    AI_STREAMING: booleanString.default(false),
    MOCK_AI: booleanString.default(false),
    LOG_PROBLEMS: booleanString.default(false),
    DAILY_TOKEN_BUDGET: positiveInteger.default(2_000_000),
    RATE_LIMIT_SOLVES_PER_HOUR: positiveInteger.default(30),
    RATE_LIMIT_TRANSCRIBES_PER_HOUR: positiveInteger.default(30),
  })
  .superRefine((value, context) => {
    if (!value.MOCK_AI && !value.ANTHROPIC_API_KEY) {
      context.addIssue({
        code: "custom",
        path: ["ANTHROPIC_API_KEY"],
        message: "is required when MOCK_AI is false",
      });
    }
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
