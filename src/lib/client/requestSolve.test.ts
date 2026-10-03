import { afterEach, describe, expect, it, vi } from "vitest";

import fixture from "@/fixtures/solutions/integration-by-parts.json";

import { requestSolve } from "./requestSolve";

const request = {
  problemLatex: String.raw`\int x e^x\,dx`,
  courseId: "ualberta-math-146",
  coveredUpTo: "parametric-polar",
  mode: "full" as const,
};

function ndjsonResponse(lines: unknown[]) {
  const text = lines.map((line) => JSON.stringify(line)).join("\n") + "\n";
  // Split mid-line so the reader has to buffer partial lines.
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let offset = 0; offset < text.length; offset += 7) {
        controller.enqueue(encoder.encode(text.slice(offset, offset + 7)));
      }
      controller.close();
    },
  });
  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestSolve", () => {
  it("reports streamed text, honours a reset, and returns the final solution", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        ndjsonResponse([
          { type: "start", source: "anthropic", model: "test-model" },
          { type: "delta", text: '{"status":"sol' },
          { type: "reset" },
          { type: "delta", text: '{"status":' },
          { type: "delta", text: '"solved"' },
          {
            type: "done",
            solution: fixture,
            model: "test-model",
            usage: { inputTokens: 10, outputTokens: 20 },
            latencyMs: 1234,
            source: "anthropic",
          },
        ]),
      ),
    );
    const seen: string[] = [];

    const outcome = await requestSolve(request, (text) => seen.push(text));

    expect(seen).toEqual([
      '{"status":"sol',
      "",
      '{"status":',
      '{"status":"solved"',
    ]);
    expect(outcome).toMatchObject({
      source: "anthropic",
      model: "test-model",
      usage: { inputTokens: 10, outputTokens: 20 },
      latencyMs: 1234,
    });
    expect(outcome.solution.problem.topic_id).toBe("integration-by-parts");
  });

  it("surfaces an error event as a readable message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        ndjsonResponse([
          { type: "start", source: "anthropic", model: "test-model" },
          {
            type: "error",
            error: { code: "truncated", message: "The solution was cut off." },
          },
        ]),
      ),
    );

    await expect(requestSolve(request)).rejects.toThrow(
      "The solution was cut off.",
    );
  });

  it("uses the API error message for a failed request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: {
              code: "rate_limited",
              message: "You've hit the hourly limit",
            },
          },
          { status: 429 },
        ),
      ),
    );

    await expect(requestSolve(request)).rejects.toThrow(
      "You've hit the hourly limit",
    );
  });
});
