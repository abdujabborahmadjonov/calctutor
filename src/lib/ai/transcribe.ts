import "server-only";

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import problemSetPhoto from "@/fixtures/transcriptions/problem-set-photo.json";
import { env } from "@/lib/env";

import { getAnthropicClient } from "./client";
import { UpstreamError } from "./errors";
import {
  TRANSCRIBE_SYSTEM_PROMPT,
  TRANSCRIBE_USER_TEXT,
} from "./prompts/transcribe";
import {
  type TranscribeRequest,
  type Transcription,
  TranscriptionSchema,
} from "./schemas";
import { assertTokenBudget, logUsage } from "./usage";

export type TranscribeResult = {
  transcription: Transcription;
  model: string;
  latencyMs: number;
  source: "mock" | "anthropic";
};

const mockTranscription = TranscriptionSchema.parse(problemSetPhoto);

// The image is sent to Claude for this one call and is never logged or stored.
export async function transcribe(
  request: TranscribeRequest,
): Promise<TranscribeResult> {
  const startedAt = performance.now();

  if (env.MOCK_AI) {
    console.warn("[CalcTutor] MOCK_AI=true; serving a fixture transcription");
    return {
      transcription: mockTranscription,
      model: "mock-fixture",
      latencyMs: Math.round(performance.now() - startedAt),
      source: "mock",
    };
  }

  assertTokenBudget();
  const client = getAnthropicClient();
  let maxTokens = 2_000;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await client.messages.parse({
      model: env.ANTHROPIC_MODEL_TRANSCRIBE,
      max_tokens: maxTokens,
      system: [
        {
          type: "text",
          text: TRANSCRIBE_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: request.mediaType,
                data: request.data,
              },
            },
            { type: "text", text: TRANSCRIBE_USER_TEXT },
          ],
        },
      ],
      output_config: {
        effort: "medium",
        format: zodOutputFormat(TranscriptionSchema),
      },
    });

    if (response.stop_reason === "max_tokens" && attempt === 0) {
      maxTokens = 4_000;
      continue;
    }
    if (response.stop_reason === "max_tokens") {
      throw new UpstreamError(
        "truncated",
        "The transcription was cut off before it finished.",
        { retryable: true },
      );
    }
    if (response.stop_reason === "refusal") {
      throw new UpstreamError(
        "refused",
        "The model declined to read this image.",
        { retryable: false },
      );
    }

    const transcription = TranscriptionSchema.parse(response.parsed_output);
    const latencyMs = Math.round(performance.now() - startedAt);
    logUsage("transcribe", response.model, response.usage, latencyMs);

    return {
      transcription,
      model: response.model,
      latencyMs,
      source: "anthropic",
    };
  }

  throw new UpstreamError(
    "upstream_failure",
    "Anthropic could not read this image.",
    { retryable: false },
  );
}
