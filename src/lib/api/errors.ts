import "server-only";

import { UpstreamError } from "@/lib/ai/errors";

export type ApiErrorBody = { error: { code: string; message: string } };

export type ApiFailure = { status: number; body: ApiErrorBody };

export function errorResponse(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
) {
  const body = { error: { code, message } } satisfies ApiErrorBody;
  return Response.json(body, { status, headers });
}

export function failureResponse(failure: ApiFailure) {
  return Response.json(failure.body, { status: failure.status });
}

export function clientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "local";
}

export function rateLimitedResponse(retryAfterSeconds: number) {
  return errorResponse(
    429,
    "rate_limited",
    `You've hit the hourly limit; try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
    { "Retry-After": String(retryAfterSeconds) },
  );
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

// Maps a failure from lib/ai to the status and typed body the spec requires.
export function describeAiFailure(error: unknown, route: string): ApiFailure {
  const failure = (status: number, code: string, message: string) => ({
    status,
    body: { error: { code, message } },
  });

  if (
    error instanceof Error &&
    error.message === "DAILY_TOKEN_BUDGET_EXHAUSTED"
  ) {
    return failure(
      503,
      "budget_exhausted",
      "Today's budget is used up; back tomorrow.",
    );
  }

  if (error instanceof Error && error.message.includes("ANTHROPIC_API_KEY")) {
    return failure(
      503,
      "ai_not_configured",
      "The solver is not configured with an Anthropic API key.",
    );
  }

  if (error instanceof UpstreamError) {
    return failure(
      502,
      error.code,
      error.message || "Something went wrong on our side.",
    );
  }

  console.error(`[CalcTutor] Unexpected ${route} failure`, error);
  return failure(502, "unexpected_error", "Something went wrong on our side.");
}

// Returns a 400 response when the course or covered-up-to topic is unknown.
export function invalidCourseResponse(
  validate: () => unknown,
): Response | undefined {
  try {
    validate();
    return undefined;
  } catch (error) {
    return errorResponse(
      400,
      "invalid_course",
      error instanceof Error ? error.message : "Choose a valid course topic.",
    );
  }
}
