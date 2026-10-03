import "server-only";

import partsSignError from "@/fixtures/check-work/parts-sign-error.json";
import { buildCourseBlock } from "@/lib/curriculum/allowed";
import { env } from "@/lib/env";

import {
  buildCheckWorkUserMessage,
  CHECK_WORK_SYSTEM_PROMPT,
} from "./prompts/check-work";
import {
  type CheckWork,
  type CheckWorkRequest,
  CheckWorkSchema,
} from "./schemas";
import { callStructured } from "./structured";

const mockCheckWork = CheckWorkSchema.parse(partsSignError);

export async function checkWork(
  request: CheckWorkRequest,
): Promise<{ result: CheckWork; source: "mock" | "anthropic" }> {
  if (env.MOCK_AI) {
    console.warn("[CalcTutor] MOCK_AI=true; serving a fixture work check");
    return { result: mockCheckWork, source: "mock" };
  }

  const course = buildCourseBlock(request.courseId, request.coveredUpTo);
  const result = await callStructured({
    route: "check-work",
    model: env.ANTHROPIC_MODEL_SOLVE,
    maxTokens: 8_000,
    effort: "high",
    system: CHECK_WORK_SYSTEM_PROMPT,
    content: buildCheckWorkUserMessage(
      course,
      request.problemLatex,
      request.studentWork,
    ),
    schema: CheckWorkSchema,
    subject: "work check",
  });

  return { result: result.data, source: "anthropic" };
}
