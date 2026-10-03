import { TranscribeRequestSchema } from "@/lib/ai/schemas";
import { transcribe } from "@/lib/ai/transcribe";
import {
  clientIp,
  describeAiFailure,
  errorResponse,
  failureResponse,
  rateLimitedResponse,
  readJson,
} from "@/lib/api/errors";
import { env } from "@/lib/env";
import {
  detectMediaType,
  MAX_IMAGE_EDGE,
  readImageSize,
} from "@/lib/image/inspect";
import { consumeRateLimit } from "@/lib/ratelimit";

export async function POST(request: Request) {
  const json = await readJson(request);

  if (json === undefined) {
    return errorResponse(400, "invalid_json", "Send a valid JSON request.");
  }

  const parsed = TranscribeRequestSchema.safeParse(json);

  if (!parsed.success) {
    return errorResponse(
      400,
      "validation_error",
      parsed.error.issues[0]?.message ?? "Check the image and try again.",
    );
  }

  const bytes = Buffer.from(parsed.data.data, "base64");

  if (detectMediaType(bytes) !== parsed.data.mediaType) {
    return errorResponse(
      400,
      "unsupported_image",
      "Use a JPEG, PNG or WebP image.",
    );
  }

  const size = readImageSize(bytes, parsed.data.mediaType);

  if (!size || Math.max(size.width, size.height) > MAX_IMAGE_EDGE) {
    return errorResponse(
      400,
      "image_too_large",
      `Images must be at most ${MAX_IMAGE_EDGE} pixels on the long edge.`,
    );
  }

  const limit = consumeRateLimit(
    `transcribe:${clientIp(request)}`,
    env.RATE_LIMIT_TRANSCRIBES_PER_HOUR,
  );

  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

  try {
    const result = await transcribe(parsed.data);

    return Response.json(result.transcription, {
      headers: {
        "Cache-Control": "no-store",
        "X-CalcTutor-AI-Mode": result.source,
        "X-CalcTutor-Model": result.model,
        "X-CalcTutor-Latency-Ms": String(result.latencyMs),
      },
    });
  } catch (error) {
    return failureResponse(describeAiFailure(error, "transcribe"));
  }
}
