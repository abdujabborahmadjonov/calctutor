import "server-only";

import problemSetPhoto from "@/fixtures/transcriptions/problem-set-photo.json";
import { env } from "@/lib/env";

import {
  TRANSCRIBE_SYSTEM_PROMPT,
  TRANSCRIBE_USER_TEXT,
} from "./prompts/transcribe";
import {
  type TranscribeRequest,
  type Transcription,
  TranscriptionSchema,
} from "./schemas";
import { callStructured } from "./structured";
import { mockUsage, type TokenUsage } from "./usage";

export type TranscribeResult = {
  transcription: Transcription;
  model: string;
  latencyMs: number;
  usage: TokenUsage;
  source: "mock" | "anthropic";
};

const mockTranscription = TranscriptionSchema.parse(problemSetPhoto);

// The image is sent to Claude for this one call and is never logged or stored.
export async function transcribe(
  request: TranscribeRequest,
): Promise<TranscribeResult> {
  if (env.MOCK_AI) {
    console.warn("[CalcTutor] MOCK_AI=true; serving a fixture transcription");
    return {
      transcription: mockTranscription,
      model: "mock-fixture",
      latencyMs: 0,
      usage: mockUsage(),
      source: "mock",
    };
  }

  const result = await callStructured({
    route: "transcribe",
    model: env.ANTHROPIC_MODEL_TRANSCRIBE,
    maxTokens: 2_000,
    effort: "medium",
    system: TRANSCRIBE_SYSTEM_PROMPT,
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
    schema: TranscriptionSchema,
    subject: "transcription",
  });

  return {
    transcription: result.data,
    model: result.model,
    latencyMs: result.latencyMs,
    usage: result.usage,
    source: "anthropic",
  };
}
