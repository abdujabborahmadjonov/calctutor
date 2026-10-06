import "server-only";

import { env } from "@/lib/env";

import { getAnthropicClient } from "./client";
import { UpstreamError } from "./errors";
import {
  buildExplainStepUserMessage,
  EXPLAIN_STEP_SYSTEM_PROMPT,
} from "./prompts/explain-step";
import type { ExplainStepRequest } from "./schemas";
import { abandonStream, assertTokenBudget, logUsage } from "./usage";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function* mockExplainStep(
  request: ExplainStepRequest,
  chunkDelayMs: number,
): AsyncGenerator<string> {
  console.warn("[CalcTutor] MOCK_AI=true; streaming a fixture explanation");
  const step = request.solution.steps[request.stepIndex];
  const text = [
    "_Mock mode: this is a fixture, not a Claude explanation._",
    "",
    `**${step.rule}.** ${step.explanation}`,
    "",
    "$$",
    step.latex,
    "$$",
    "",
    step.common_mistake
      ? `Watch for this: ${step.common_mistake}`
      : "There is no common trap at this step; check each line of the algebra.",
  ].join("\n");

  for (const word of text.split(/(?<=\s)/)) {
    await sleep(chunkDelayMs);
    yield word;
  }
}

async function* anthropicExplainStep(
  request: ExplainStepRequest,
): AsyncGenerator<string> {
  const startedAt = performance.now();
  assertTokenBudget();
  const client = getAnthropicClient();

  // Haiku 4.5 does not support output_config.effort, so it is omitted here.
  const stream = client.messages.stream({
    model: env.ANTHROPIC_MODEL_LIGHT,
    max_tokens: 2_000,
    system: EXPLAIN_STEP_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildExplainStepUserMessage(
          request.problemLatex,
          JSON.stringify(request.solution),
          request.stepIndex + 1,
        ),
      },
    ],
  });

  let message;
  try {
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
    message = await stream.finalMessage();
  } finally {
    if (!message) abandonStream(stream);
  }

  logUsage(
    "explain-step",
    message.model,
    message.usage,
    Math.round(performance.now() - startedAt),
  );

  if (message.stop_reason === "refusal") {
    throw new UpstreamError(
      "refused",
      "The model declined to explain this step.",
      { retryable: false },
    );
  }
}

export function explainStep(
  request: ExplainStepRequest,
  options: { mockChunkDelayMs?: number } = {},
): AsyncGenerator<string> {
  return env.MOCK_AI
    ? mockExplainStep(request, options.mockChunkDelayMs ?? 15)
    : anthropicExplainStep(request);
}
