import { getAllowedCurriculum } from "@/lib/curriculum/allowed";
import { env } from "@/lib/env";
import { consumeRateLimit } from "@/lib/ratelimit";
import { UpstreamError } from "@/lib/ai/errors";
import { SolveRequestSchema } from "@/lib/ai/schemas";
import { solve } from "@/lib/ai/solve";

type ErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

function errorResponse(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
) {
  return Response.json<ErrorBody>(
    { error: { code, message } },
    { status, headers },
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Send a valid JSON request.");
  }

  const parsed = SolveRequestSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(
      400,
      "validation_error",
      parsed.error.issues[0]?.message ?? "Check the problem and try again.",
    );
  }

  try {
    getAllowedCurriculum(parsed.data.courseId, parsed.data.coveredUpTo);
  } catch (error) {
    return errorResponse(
      400,
      "invalid_course",
      error instanceof Error ? error.message : "Choose a valid course topic.",
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "local";
  const limit = consumeRateLimit(`solve:${ip}`, env.RATE_LIMIT_SOLVES_PER_HOUR);

  if (!limit.allowed) {
    return errorResponse(
      429,
      "rate_limited",
      `You've hit the hourly limit; try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  try {
    const result = await solve(parsed.data);

    return Response.json(result.solution, {
      headers: {
        "Cache-Control": "no-store",
        "X-CalcTutor-AI-Mode": result.source,
        "X-CalcTutor-Model": result.model,
        "X-CalcTutor-Latency-Ms": String(result.latencyMs),
        "X-CalcTutor-Input-Tokens": String(result.usage.inputTokens),
        "X-CalcTutor-Output-Tokens": String(result.usage.outputTokens),
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "DAILY_TOKEN_BUDGET_EXHAUSTED"
    ) {
      return errorResponse(
        503,
        "budget_exhausted",
        "Today's budget is used up; back tomorrow.",
      );
    }

    if (error instanceof Error && error.message.includes("ANTHROPIC_API_KEY")) {
      return errorResponse(
        503,
        "ai_not_configured",
        "The solver is not configured with an Anthropic API key.",
      );
    }

    if (error instanceof UpstreamError) {
      return errorResponse(
        502,
        error.code,
        error.message || "Something went wrong on our side.",
      );
    }

    console.error("[CalcTutor] Unexpected solve failure", error);
    return errorResponse(
      502,
      "unexpected_error",
      "Something went wrong on our side.",
    );
  }
}
