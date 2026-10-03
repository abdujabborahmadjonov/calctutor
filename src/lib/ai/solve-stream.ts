import "server-only";

import { env } from "@/lib/env";

import { getAnthropicClient } from "./client";
import { UpstreamError } from "./errors";
import { getMockSolution } from "./mock";
import { type SolveRequest, validateSolution } from "./schemas";
import { buildSolveParams } from "./solve";
import type { SolveStreamEvent } from "./stream-events";
import { abandonStream, assertTokenBudget, logUsage } from "./usage";

const MOCK_CHUNK_SIZE = 48;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function* mockSolveStream(
  request: SolveRequest,
  chunkDelayMs: number,
): AsyncGenerator<SolveStreamEvent> {
  const startedAt = performance.now();
  console.warn("[CalcTutor] MOCK_AI=true; streaming a fixture solution");
  yield { type: "start", source: "mock", model: "mock-fixture" };

  const solution = getMockSolution(request.problemLatex);
  const text = JSON.stringify(solution);

  for (let offset = 0; offset < text.length; offset += MOCK_CHUNK_SIZE) {
    await sleep(chunkDelayMs);
    yield { type: "delta", text: text.slice(offset, offset + MOCK_CHUNK_SIZE) };
  }

  yield {
    type: "done",
    solution,
    model: "mock-fixture",
    usage: { inputTokens: 0, outputTokens: 0 },
    latencyMs: Math.round(performance.now() - startedAt),
    source: "mock",
  };
}

async function* anthropicSolveStream(
  request: SolveRequest,
): AsyncGenerator<SolveStreamEvent> {
  const startedAt = performance.now();
  assertTokenBudget();
  const client = getAnthropicClient();
  let maxTokens = 8_000;

  yield {
    type: "start",
    source: "anthropic",
    model: env.ANTHROPIC_MODEL_SOLVE,
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0) yield { type: "reset" };

    try {
      const stream = client.messages.stream(
        buildSolveParams(request, maxTokens),
      );
      let message;

      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            yield { type: "delta", text: event.delta.text };
          }
        }
        message = await stream.finalMessage();
      } finally {
        if (!message) abandonStream(stream);
      }

      // Every finished attempt counts against the budget, including one cut
      // off at max_tokens or refused.
      logUsage(
        "solve-stream",
        message.model,
        message.usage,
        Math.round(performance.now() - startedAt),
      );

      if (message.stop_reason === "max_tokens") {
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

      if (message.stop_reason === "refusal") {
        throw new UpstreamError(
          "refused",
          "The model declined to solve this problem.",
          { retryable: false },
        );
      }

      if (!message.parsed_output) {
        throw new UpstreamError(
          "invalid_output",
          "The model returned no structured solution.",
          { retryable: attempt === 0 },
        );
      }

      const solution = validateSolution(message.parsed_output);
      const latencyMs = Math.round(performance.now() - startedAt);

      yield {
        type: "done",
        solution,
        model: message.model,
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
        },
        latencyMs,
        source: "anthropic",
      };
      return;
    } catch (error) {
      if (error instanceof UpstreamError && !error.retryable) throw error;

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
}

export function solveStream(
  request: SolveRequest,
  options: { mockChunkDelayMs?: number } = {},
): AsyncGenerator<SolveStreamEvent> {
  return env.MOCK_AI
    ? mockSolveStream(request, options.mockChunkDelayMs ?? 20)
    : anthropicSolveStream(request);
}
