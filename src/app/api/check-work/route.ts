import { checkWork } from "@/lib/ai/check-work";
import { CheckWorkRequestSchema } from "@/lib/ai/schemas";
import {
  clientIp,
  describeAiFailure,
  errorResponse,
  failureResponse,
  invalidCourseResponse,
  rateLimitedResponse,
  readJson,
} from "@/lib/api/errors";
import { getAllowedCurriculum } from "@/lib/curriculum/allowed";
import { env } from "@/lib/env";
import { consumeRateLimit } from "@/lib/ratelimit";

export async function POST(request: Request) {
  const json = await readJson(request);

  if (json === undefined) {
    return errorResponse(400, "invalid_json", "Send a valid JSON request.");
  }

  const parsed = CheckWorkRequestSchema.safeParse(json);

  if (!parsed.success) {
    return errorResponse(
      400,
      "validation_error",
      parsed.error.issues[0]?.message ?? "Check your work and try again.",
    );
  }

  const courseError = invalidCourseResponse(() =>
    getAllowedCurriculum(parsed.data.courseId, parsed.data.coveredUpTo),
  );
  if (courseError) return courseError;

  // A work check costs about as much as a solve, so it shares that limit.
  const limit = consumeRateLimit(
    `check-work:${clientIp(request)}`,
    env.RATE_LIMIT_SOLVES_PER_HOUR,
  );
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

  try {
    const result = await checkWork(parsed.data);
    return Response.json(result.result, {
      headers: {
        "Cache-Control": "no-store",
        "X-CalcTutor-AI-Mode": result.source,
      },
    });
  } catch (error) {
    return failureResponse(describeAiFailure(error, "check-work"));
  }
}
