import { explainStep } from "@/lib/ai/explain-step";
import { ExplainStepRequestSchema } from "@/lib/ai/schemas";
import {
  clientIp,
  describeAiFailure,
  errorResponse,
  failureResponse,
  rateLimitedResponse,
  readJson,
} from "@/lib/api/errors";
import { env } from "@/lib/env";
import { consumeRateLimit } from "@/lib/ratelimit";

export async function POST(request: Request) {
  const json = await readJson(request);

  if (json === undefined) {
    return errorResponse(400, "invalid_json", "Send a valid JSON request.");
  }

  const parsed = ExplainStepRequestSchema.safeParse(json);

  if (!parsed.success) {
    return errorResponse(
      400,
      "validation_error",
      parsed.error.issues[0]?.message ?? "Check the request and try again.",
    );
  }

  if (parsed.data.stepIndex >= parsed.data.solution.steps.length) {
    return errorResponse(400, "validation_error", "That step does not exist.");
  }

  const limit = consumeRateLimit(
    `explain:${clientIp(request)}`,
    env.RATE_LIMIT_SOLVES_PER_HOUR,
  );

  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

  const chunks = explainStep(parsed.data);
  let first: IteratorResult<string>;

  // Pull the first chunk before responding so budget and configuration
  // failures return a real status code.
  try {
    first = await chunks.next();
  } catch (error) {
    return failureResponse(describeAiFailure(error, "explain-step"));
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      if (first.done) controller.close();
      else controller.enqueue(encoder.encode(first.value));
    },
    async pull(controller) {
      try {
        const next = await chunks.next();
        if (next.done) controller.close();
        else controller.enqueue(encoder.encode(next.value));
      } catch (error) {
        describeAiFailure(error, "explain-step");
        controller.error(error);
      }
    },
    async cancel() {
      await chunks.return(undefined);
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-store",
      "X-CalcTutor-AI-Mode": env.MOCK_AI ? "mock" : "anthropic",
    },
  });
}
