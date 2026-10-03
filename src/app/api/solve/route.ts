import { SolveRequestSchema, type SolveRequest } from "@/lib/ai/schemas";
import { solve } from "@/lib/ai/solve";
import { solveStream } from "@/lib/ai/solve-stream";
import {
  NDJSON_CONTENT_TYPE,
  type SolveStreamEvent,
} from "@/lib/ai/stream-events";
import {
  clientIp,
  describeAiFailure,
  errorResponse,
  failureResponse,
  rateLimitedResponse,
  readJson,
} from "@/lib/api/errors";
import { getAllowedCurriculum } from "@/lib/curriculum/allowed";
import { env } from "@/lib/env";
import { consumeRateLimit } from "@/lib/ratelimit";

async function solveJson(request: SolveRequest) {
  try {
    const result = await solve(request);

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
    return failureResponse(describeAiFailure(error, "solve"));
  }
}

async function solveNdjson(request: SolveRequest) {
  const events = solveStream(request);
  let first: IteratorResult<SolveStreamEvent>;

  // The first event comes after the budget and API-key checks, so pulling it
  // here lets those failures return a real HTTP status instead of a 200
  // stream that fails on its first line.
  try {
    first = await events.next();
  } catch (error) {
    return failureResponse(describeAiFailure(error, "solve"));
  }

  const encoder = new TextEncoder();
  const encode = (event: SolveStreamEvent) =>
    encoder.encode(`${JSON.stringify(event)}\n`);

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      if (first.done) controller.close();
      else controller.enqueue(encode(first.value));
    },
    async pull(controller) {
      try {
        const next = await events.next();
        if (next.done) {
          controller.close();
          return;
        }
        controller.enqueue(encode(next.value));
      } catch (error) {
        const failure = describeAiFailure(error, "solve");
        controller.enqueue(encode({ type: "error", ...failure.body }));
        controller.close();
      }
    },
    async cancel() {
      await events.return(undefined);
    },
  });

  const source =
    !first.done && first.value.type === "start"
      ? first.value.source
      : "anthropic";

  return new Response(body, {
    headers: {
      "Content-Type": NDJSON_CONTENT_TYPE,
      "Cache-Control": "no-store",
      "X-CalcTutor-AI-Mode": source,
    },
  });
}

export async function POST(request: Request) {
  const json = await readJson(request);

  if (json === undefined) {
    return errorResponse(400, "invalid_json", "Send a valid JSON request.");
  }

  const parsed = SolveRequestSchema.safeParse(json);

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

  const limit = consumeRateLimit(
    `solve:${clientIp(request)}`,
    env.RATE_LIMIT_SOLVES_PER_HOUR,
  );

  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

  return env.AI_STREAMING ? solveNdjson(parsed.data) : solveJson(parsed.data);
}
