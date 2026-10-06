import { SimilarRequestSchema } from "@/lib/ai/schemas";
import { similar } from "@/lib/ai/similar";
import {
  clientIp,
  describeAiFailure,
  errorResponse,
  failureResponse,
  invalidCourseResponse,
  rateLimitedResponse,
  readJson,
} from "@/lib/api/errors";
import { topicById } from "@/lib/curriculum/alberta";
import { getAllowedCurriculum } from "@/lib/curriculum/allowed";
import { env } from "@/lib/env";
import { consumeRateLimit } from "@/lib/ratelimit";

export async function POST(request: Request) {
  const json = await readJson(request);

  if (json === undefined) {
    return errorResponse(400, "invalid_json", "Send a valid JSON request.");
  }

  const parsed = SimilarRequestSchema.safeParse(json);

  if (!parsed.success) {
    return errorResponse(
      400,
      "validation_error",
      parsed.error.issues[0]?.message ?? "Check the request and try again.",
    );
  }

  // Topic-browser practice needs a course topic; practice from a solved
  // problem may use any subject topic the solver named.
  if (!topicById.has(parsed.data.topicId) && !parsed.data.problemLatex) {
    return errorResponse(
      400,
      "invalid_topic",
      "Choose a topic from the course map.",
    );
  }

  const courseError = invalidCourseResponse(() =>
    getAllowedCurriculum(parsed.data.courseId, parsed.data.coveredUpTo),
  );
  if (courseError) return courseError;

  const limit = consumeRateLimit(
    `similar:${clientIp(request)}`,
    env.RATE_LIMIT_SOLVES_PER_HOUR,
  );
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

  try {
    const result = await similar(parsed.data);
    return Response.json(result.similar, {
      headers: {
        "Cache-Control": "no-store",
        "X-CalcTutor-AI-Mode": result.source,
      },
    });
  } catch (error) {
    return failureResponse(describeAiFailure(error, "similar"));
  }
}
