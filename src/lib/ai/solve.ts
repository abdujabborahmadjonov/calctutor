import "server-only";

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { buildCourseBlock } from "@/lib/curriculum/allowed";
import { env } from "@/lib/env";

import { getAnthropicClient } from "./client";
import { UpstreamError } from "./errors";
import { getMockSolution } from "./mock";
import { TUTOR_SYSTEM_PROMPT } from "./prompts/tutor";
import {
  type Solution,
  SolutionSchema,
  type SolveRequest,
  validateSolution,
} from "./schemas";
import { assertTokenBudget, logUsage } from "./usage";

export type SolveResult = {
  solution: Solution;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
  source: "mock" | "anthropic";
};

export function buildSolveUserMessage(course: string, request: SolveRequest) {
  const avoid = request.avoidMethod
    ? `\n<avoid_method>${request.avoidMethod}</avoid_method>`
    : "";
  return `${course}\n<subject>${request.subject}</subject>\n<mode>${request.mode}</mode>${avoid}\n<problem>\n${request.problemLatex}\n</problem>`;
}

export function buildSolveParams(request: SolveRequest, maxTokens: number) {
  const course = buildCourseBlock(request.courseId, request.coveredUpTo);

  return {
    model: env.ANTHROPIC_MODEL_SOLVE,
    max_tokens: maxTokens,
    system: [
      {
        type: "text" as const,
        text: TUTOR_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [
      {
        role: "user" as const,
        content: buildSolveUserMessage(course, request),
      },
    ],
    output_config: {
      effort: "high" as const,
      format: zodOutputFormat(SolutionSchema),
    },
  };
}

export async function solve(request: SolveRequest): Promise<SolveResult> {
  const startedAt = performance.now();

  if (env.MOCK_AI) {
    console.warn("[CalcTutor] MOCK_AI=true; serving a fixture solution");
    return {
      solution: getMockSolution(request.problemLatex),
      model: "mock-fixture",
      usage: { inputTokens: 0, outputTokens: 0 },
      latencyMs: Math.round(performance.now() - startedAt),
      source: "mock",
    };
  }

  assertTokenBudget();
  const client = getAnthropicClient();
  let maxTokens = 8_000;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await client.messages.parse(
        buildSolveParams(request, maxTokens),
      );
      // Every finished attempt counts, including a truncated or refused one.
      logUsage(
        "solve",
        response.model,
        response.usage,
        Math.round(performance.now() - startedAt),
      );

      if (response.stop_reason === "max_tokens") {
        if (attempt === 0) {
          maxTokens = 12_000;
          continue;
        }
        throw new UpstreamError(
          "truncated",
          "The solution was cut off before it finished.",
          { retryable: true },
        );
      }

      if (response.stop_reason === "refusal") {
        throw new UpstreamError(
          "refused",
          "The model declined to solve this problem.",
          { retryable: false },
        );
      }

      if (!response.parsed_output) {
        throw new UpstreamError(
          "invalid_output",
          "The model returned no structured solution.",
          { retryable: attempt === 0 },
        );
      }

      const solution = validateSolution(response.parsed_output);
      const latencyMs = Math.round(performance.now() - startedAt);

      return {
        solution,
        model: response.model,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        latencyMs,
        source: "anthropic",
      };
    } catch (error) {
      if (error instanceof UpstreamError && !error.retryable) {
        throw error;
      }

      if (attempt === 1) {
        if (error instanceof UpstreamError) throw error;
        throw new UpstreamError(
          "upstream_failure",
          "Anthropic could not return a valid solution.",
          { retryable: false, cause: error },
        );
      }
    }
  }

  throw new UpstreamError(
    "upstream_failure",
    "Anthropic could not return a valid solution.",
    { retryable: false },
  );
}
