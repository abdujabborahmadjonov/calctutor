import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

import { getAnthropicClient } from "./client";
import { UpstreamError } from "./errors";
import { assertTokenBudget, logUsage, type TokenUsage } from "./usage";

type StructuredCall<Schema extends z.ZodType> = {
  route: string;
  model: string;
  maxTokens: number;
  effort?: "low" | "medium" | "high";
  system: string;
  content: Anthropic.MessageParam["content"];
  schema: Schema;
  subject: string;
};

// One non-streaming structured-output call with the spec's stop-reason rules:
// a max_tokens cut-off is retried once with double the limit, a refusal is
// final, and the parsed output is validated with the same Zod schema.
export async function callStructured<Schema extends z.ZodType>(
  call: StructuredCall<Schema>,
): Promise<{
  data: z.infer<Schema>;
  model: string;
  latencyMs: number;
  usage: TokenUsage;
}> {
  const startedAt = performance.now();
  assertTokenBudget();
  const client = getAnthropicClient();
  let maxTokens = call.maxTokens;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await client.messages.parse({
      model: call.model,
      max_tokens: maxTokens,
      system: [
        {
          type: "text",
          text: call.system,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: call.content }],
      output_config: {
        ...(call.effort ? { effort: call.effort } : {}),
        format: zodOutputFormat(call.schema),
      },
    });

    // Every finished attempt counts, including a truncated or refused one.
    logUsage(
      call.route,
      response.model,
      response.usage,
      Math.round(performance.now() - startedAt),
    );

    if (response.stop_reason === "max_tokens" && attempt === 0) {
      maxTokens *= 2;
      continue;
    }
    if (response.stop_reason === "max_tokens") {
      throw new UpstreamError(
        "truncated",
        `The ${call.subject} was cut off before it finished.`,
        { retryable: true },
      );
    }
    if (response.stop_reason === "refusal") {
      throw new UpstreamError(
        "refused",
        `The model declined to produce the ${call.subject}.`,
        { retryable: false },
      );
    }

    const data = call.schema.parse(response.parsed_output) as z.infer<Schema>;
    const latencyMs = Math.round(performance.now() - startedAt);
    return {
      data,
      model: response.model,
      latencyMs,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  throw new UpstreamError(
    "upstream_failure",
    `Anthropic could not return the ${call.subject}.`,
    { retryable: false },
  );
}
