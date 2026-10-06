import "server-only";

import practice from "@/fixtures/similar/practice.json";
import { topicById } from "@/lib/curriculum/alberta";
import { buildCourseBlock } from "@/lib/curriculum/allowed";
import { env } from "@/lib/env";

import {
  buildSimilarUserMessage,
  SIMILAR_SYSTEM_PROMPT,
} from "./prompts/similar";
import { type Similar, SimilarSchema, type SimilarRequest } from "./schemas";
import { callStructured } from "./structured";

const mockSimilar = SimilarSchema.parse(practice);

export async function similar(
  request: SimilarRequest,
): Promise<{ similar: Similar; source: "mock" | "anthropic" }> {
  if (env.MOCK_AI) {
    console.warn("[CalcTutor] MOCK_AI=true; serving fixture practice problems");
    return { similar: mockSimilar, source: "mock" };
  }

  const topic = topicById.get(request.topicId);
  const course = buildCourseBlock(request.courseId, request.coveredUpTo);

  // Haiku 4.5 does not support output_config.effort, so none is sent.
  const result = await callStructured({
    route: "similar",
    model: env.ANTHROPIC_MODEL_LIGHT,
    maxTokens: 2_000,
    system: SIMILAR_SYSTEM_PROMPT,
    content: buildSimilarUserMessage(
      course,
      topic?.name ?? request.topicId,
      request.problemLatex,
    ),
    schema: SimilarSchema,
    subject: "practice problems",
  });

  return { similar: result.data, source: "anthropic" };
}
